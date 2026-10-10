package sync

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"gopkg.in/yaml.v3"
)

type hugoFrontmatter struct {
	Title       string `yaml:"title"`
	LinkTitle   string `yaml:"linkTitle"`
	Weight      int    `yaml:"weight"`
	Description string `yaml:"description"`
}

type hugoPage struct {
	DirName string
	Title   string
	Weight  int
	Body    string
}

func (e *engine) syncLWS() error {
	if e.m.Sources.LWS.Remote.URL == "" {
		return nil
	}
	workloadApisDir := filepath.Join(e.docsDir, "architecture", "model-server-orchestration")
	if !dirExists(workloadApisDir) {
		return nil
	}

	fmt.Println("    Syncing LWS documentation...")

	branch := e.m.Sources.LWS.Remote.DefaultBranch
	if branch == "" {
		branch = "main"
	}

	var lwsRoot string
	if env := os.Getenv("LWS_REPO"); env != "" {
		lwsRoot = expandHome(env)
	} else {
		cache := e.opts.CacheDir
		if cache == "" {
			cache = filepath.Join(os.TempDir(), "llmd-site-cache")
		}
		if err := os.MkdirAll(cache, 0o755); err != nil {
			return err
		}
		dest := filepath.Join(cache, "lws-"+sanitizeBranch(branch))
		if e.opts.RefreshUpstream {
			_ = os.RemoveAll(dest)
		}
		if isGitRepo(dest) {
			if err := gitFetchReset(dest, branch); err != nil {
				fmt.Fprintf(os.Stderr, "    ! cached lws clone unusable, re-cloning: %v\n", err)
				_ = os.RemoveAll(dest)
				if err := cloneLWS(e.m.Sources.LWS.Remote.URL, branch, dest); err != nil {
					return err
				}
			}
		} else {
			_ = os.RemoveAll(dest)
			if err := cloneLWS(e.m.Sources.LWS.Remote.URL, branch, dest); err != nil {
				return err
			}
		}
		if err := materializeLWS(dest); err != nil {
			return err
		}
		lwsRoot = dest
	}

	lwsStaticDir := filepath.Join(lwsRoot, "site", "static")
	lwsStaticImagesDir := filepath.Join(lwsStaticDir, "images")
	docsAssetsLwsDir := filepath.Join(e.docsDir, "assets", "lws")
	if err := copyLWSImages(lwsStaticImagesDir, docsAssetsLwsDir); err != nil {
		return fmt.Errorf("copy lws images: %w", err)
	}

	conceptsDir := filepath.Join(lwsRoot, "site", "content", "en", "docs", "concepts")
	refDir := filepath.Join(lwsRoot, "site", "content", "en", "docs", "reference")

	// Read leaderworkerset root & child subpages
	lwsRootPage, err := readHugoPage(filepath.Join(conceptsDir, "leaderworkerset", "_index.md"), "")
	if err != nil {
		return fmt.Errorf("read leaderworkerset/_index.md: %w", err)
	}
	lwsPages, err := readHugoSubpages(filepath.Join(conceptsDir, "leaderworkerset"))
	if err != nil {
		return fmt.Errorf("read leaderworkerset subpages: %w", err)
	}

	// Read disaggregatedset root & child subpages
	dsRootPage, err := readHugoPage(filepath.Join(conceptsDir, "disaggregatedset", "_index.md"), "")
	if err != nil {
		return fmt.Errorf("read disaggregatedset/_index.md: %w", err)
	}
	dsPages, err := readHugoSubpages(filepath.Join(conceptsDir, "disaggregatedset"))
	if err != nil {
		return fmt.Errorf("read disaggregatedset subpages: %w", err)
	}

	// Read concepts/_index.md (for disaggregatedset: Architecture, Comparison Matrix, When to Use Which API)
	conceptsRootPage, _ := readHugoPage(filepath.Join(conceptsDir, "_index.md"), "")

	// Read labels reference page
	labelsPage, err := readHugoPage(filepath.Join(refDir, "labels-annotations-and-environment-variables.md"), "")
	if err != nil {
		return fmt.Errorf("read labels-annotations-and-environment-variables.md: %w", err)
	}

	// Build subpage slug maps
	lwsSubpageSlugs := make(map[string]string)
	for _, p := range lwsPages {
		lwsSubpageSlugs[p.DirName] = slugify(p.Title)
	}
	dsSubpageSlugs := make(map[string]string)
	for _, p := range dsPages {
		dsSubpageSlugs[p.DirName] = slugify(p.Title)
	}

	// 1. Assemble leaderworkerset.md
	lwsTrans := &lwsTransformer{
		lwsStaticDir:    lwsStaticDir,
		currentPage:     "leaderworkerset",
		lwsSubpageSlugs: lwsSubpageSlugs,
		dsSubpageSlugs:  dsSubpageSlugs,
	}

	var lwsSB strings.Builder
	lwsSB.WriteString("---\n")
	lwsSB.WriteString("title: LeaderWorkerSet (LWS)\n")
	lwsSB.WriteString("custom_edit_url: https://github.com/kubernetes-sigs/lws/tree/main/site/content/en/docs/concepts/leaderworkerset\n")
	lwsSB.WriteString("---\n\n")
	lwsSB.WriteString("# LeaderWorkerSet (LWS)\n\n")
	lwsSB.WriteString("> [!NOTE]\n")
	lwsSB.WriteString("> This page is automatically mirrored from the [LeaderWorkerSet documentation](https://lws.sigs.k8s.io/docs/concepts/leaderworkerset/) in [kubernetes-sigs/lws](https://github.com/kubernetes-sigs/lws).\n\n")

	lwsSB.WriteString(strings.TrimSpace(lwsTrans.transform(lwsRootPage.Body)))
	lwsSB.WriteString("\n\n")

	for _, p := range lwsPages {
		transformed := lwsTrans.transform(p.Body)
		shifted := shiftHeadings(transformed)
		lwsSB.WriteString("## " + p.Title + "\n\n")
		lwsSB.WriteString(strings.TrimSpace(shifted))
		lwsSB.WriteString("\n\n")
	}

	lwsSB.WriteString("## Labels, Annotations and Environment Variables\n\n")
	lwsSB.WriteString(strings.TrimSpace(lwsTrans.transform(transformLabelsRef(labelsPage.Body))))
	lwsSB.WriteString("\n")

	if err := os.WriteFile(filepath.Join(workloadApisDir, "leaderworkerset.md"), []byte(lwsSB.String()), 0o644); err != nil {
		return err
	}

	// 2. Assemble disaggregatedset.md
	dsTrans := &lwsTransformer{
		lwsStaticDir:    lwsStaticDir,
		currentPage:     "disaggregatedset",
		lwsSubpageSlugs: lwsSubpageSlugs,
		dsSubpageSlugs:  dsSubpageSlugs,
	}

	var dsSB strings.Builder
	dsSB.WriteString("---\n")
	dsSB.WriteString("title: DisaggregatedSet\n")
	dsSB.WriteString("custom_edit_url: https://github.com/kubernetes-sigs/lws/tree/main/site/content/en/docs/concepts/disaggregatedset\n")
	dsSB.WriteString("---\n\n")
	dsSB.WriteString("# DisaggregatedSet\n\n")
	dsSB.WriteString("> [!NOTE]\n")
	dsSB.WriteString("> This page is automatically mirrored from the [DisaggregatedSet documentation](https://lws.sigs.k8s.io/docs/concepts/disaggregatedset/) in [kubernetes-sigs/lws](https://github.com/kubernetes-sigs/lws). For day-2 operational guidance in llm-d (platform topology labels, router slice affinity, and Kueue), see [DisaggregatedSet Operations](../../operations/disaggregation/disaggregatedset.md).\n\n")

	dsSB.WriteString(strings.TrimSpace(dsTrans.transform(dsRootPage.Body)))
	dsSB.WriteString("\n\n")

	if conceptsRootPage != nil {
		dsSB.WriteString(strings.TrimSpace(dsTrans.transform(conceptsRootPage.Body)))
		dsSB.WriteString("\n\n")
	}

	for _, p := range dsPages {
		transformed := dsTrans.transform(p.Body)
		shifted := shiftHeadings(transformed)
		dsSB.WriteString("## " + p.Title + "\n\n")
		dsSB.WriteString(strings.TrimSpace(shifted))
		dsSB.WriteString("\n\n")
	}

	dsSB.WriteString("## Labels, Annotations and Environment Variables\n\n")
	dsSB.WriteString(strings.TrimSpace(dsTrans.transform(transformLabelsRef(labelsPage.Body))))
	dsSB.WriteString("\n")

	if err := os.WriteFile(filepath.Join(workloadApisDir, "disaggregatedset.md"), []byte(dsSB.String()), 0o644); err != nil {
		return err
	}

	return nil
}

func cloneLWS(url, branch, dest string) error {
	if !strings.HasSuffix(url, ".git") {
		url += ".git"
	}
	cmd := exec.Command("git", "clone", "--depth", "1", "--branch", branch, "--filter=blob:none", url, dest)
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("clone lws %s @ %s: %w", url, branch, err)
	}
	return nil
}

func materializeLWS(dest string) error {
	paths := []string{
		"site/content/en/docs/concepts",
		"site/content/en/docs/reference",
		"site/static/images",
		"site/static/examples",
	}
	args := append([]string{"-C", dest, "checkout", "HEAD", "--"}, paths...)
	cmd := exec.Command("git", args...)
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func copyLWSImages(srcDir, dstDir string) error {
	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		return err
	}
	entries, err := os.ReadDir(srcDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if ext == ".svg" || ext == ".png" {
			src := filepath.Join(srcDir, entry.Name())
			dst := filepath.Join(dstDir, entry.Name())
			if err := copyFileVerbatim(src, dst); err != nil {
				return err
			}
		}
	}
	return nil
}

func parseHugoFile(data []byte) (*hugoFrontmatter, string, error) {
	content := string(data)
	if !strings.HasPrefix(content, "---") {
		return &hugoFrontmatter{}, content, nil
	}
	idx := strings.Index(content[3:], "\n---")
	if idx == -1 {
		return &hugoFrontmatter{}, content, nil
	}
	fmStr := content[3 : 3+idx]
	body := content[3+idx+4:]
	body = strings.TrimPrefix(body, "\r")
	body = strings.TrimPrefix(body, "\n")

	var fm hugoFrontmatter
	if err := yaml.Unmarshal([]byte(fmStr), &fm); err != nil {
		return nil, "", err
	}
	return &fm, body, nil
}

func readHugoPage(filePath, dirName string) (*hugoPage, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	fm, body, err := parseHugoFile(data)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", filePath, err)
	}
	title := fm.Title
	if title == "" {
		title = fm.LinkTitle
	}
	return &hugoPage{
		DirName: dirName,
		Title:   title,
		Weight:  fm.Weight,
		Body:    body,
	}, nil
}

func readHugoSubpages(parentDir string) ([]*hugoPage, error) {
	entries, err := os.ReadDir(parentDir)
	if err != nil {
		return nil, err
	}
	var pages []*hugoPage
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		indexPath := filepath.Join(parentDir, entry.Name(), "_index.md")
		if !fileExists(indexPath) {
			continue
		}
		p, err := readHugoPage(indexPath, entry.Name())
		if err != nil {
			return nil, err
		}
		pages = append(pages, p)
	}
	sort.Slice(pages, func(i, j int) bool {
		if pages[i].Weight != pages[j].Weight {
			return pages[i].Weight < pages[j].Weight
		}
		return pages[i].DirName < pages[j].DirName
	})
	return pages, nil
}

type lwsTransformer struct {
	lwsStaticDir    string
	currentPage     string
	lwsSubpageSlugs map[string]string
	dsSubpageSlugs  map[string]string
}

func (t *lwsTransformer) transform(content string) string {
	content = t.inlineIncludes(content)
	content = t.convertAlerts(content)
	content = t.rewriteImages(content)
	content = t.rewriteLinks(content)
	return content
}

var reInclude = regexp.MustCompile(`(?s)\{\{<\s*include\s+([^>]+)\s*>\}\}`)
var reAttrFile = regexp.MustCompile(`file="([^"]+)"`)
var reAttrLang = regexp.MustCompile(`lang="([^"]+)"`)

func (t *lwsTransformer) inlineIncludes(content string) string {
	return reInclude.ReplaceAllStringFunc(content, func(match string) string {
		attrs := match
		fileMatch := reAttrFile.FindStringSubmatch(attrs)
		if len(fileMatch) < 2 {
			return match
		}
		fileRel := fileMatch[1]
		lang := "yaml"
		if langMatch := reAttrLang.FindStringSubmatch(attrs); len(langMatch) > 1 {
			lang = langMatch[1]
		}
		filePath := filepath.Join(t.lwsStaticDir, fileRel)
		data, err := os.ReadFile(filePath)
		if err != nil {
			return match
		}
		trimmed := strings.TrimRight(string(data), "\r\n")
		return fmt.Sprintf("```%s\n%s\n```", lang, trimmed)
	})
}

var (
	reAlertPercent    = regexp.MustCompile(`(?s)\{\{%\s*alert\s+([^%\n]*?)\s*%\}\}(.*?)\{\{%\s*/alert\s*%\}\}`)
	reAlertAngle      = regexp.MustCompile(`(?s)\{\{<\s*alert\s+([^>\n]*?)\s*>\}\}(.*?)\{\{<\s*/alert\s*>\}\}`)
	rePageInfoPercent = regexp.MustCompile(`(?s)\{\{%\s*pageinfo\s*%\}\}(.*?)\{\{%\s*/pageinfo\s*%\}\}`)
	rePageInfoAngle   = regexp.MustCompile(`(?s)\{\{<\s*pageinfo\s*>\}\}(.*?)\{\{<\s*/pageinfo\s*>\}\}`)
	reAttrColor       = regexp.MustCompile(`color="([^"]+)"`)
)

func (t *lwsTransformer) convertAlerts(content string) string {
	replaceAlert := func(match string, re *regexp.Regexp) string {
		sub := re.FindStringSubmatch(match)
		attrs := sub[1]
		body := sub[2]

		color := ""
		if m := reAttrColor.FindStringSubmatch(attrs); len(m) > 1 {
			color = strings.ToLower(m[1])
		}

		var header string
		switch color {
		case "warning":
			header = "> [!WARNING]"
		case "danger":
			header = "> [!CAUTION]"
		default:
			header = "> [!NOTE]"
		}

		return formatCallout(header, body)
	}

	content = reAlertPercent.ReplaceAllStringFunc(content, func(m string) string {
		return replaceAlert(m, reAlertPercent)
	})
	content = reAlertAngle.ReplaceAllStringFunc(content, func(m string) string {
		return replaceAlert(m, reAlertAngle)
	})
	content = rePageInfoPercent.ReplaceAllStringFunc(content, func(m string) string {
		sub := rePageInfoPercent.FindStringSubmatch(m)
		return formatCallout("> [!NOTE]", sub[1])
	})
	content = rePageInfoAngle.ReplaceAllStringFunc(content, func(m string) string {
		sub := rePageInfoAngle.FindStringSubmatch(m)
		return formatCallout("> [!NOTE]", sub[1])
	})

	return content
}

func formatCallout(header, body string) string {
	body = strings.TrimSpace(body)
	lines := strings.Split(body, "\n")
	var out []string
	out = append(out, header)
	for _, l := range lines {
		l = strings.TrimRight(l, "\r")
		if strings.TrimSpace(l) == "" {
			out = append(out, ">")
		} else {
			out = append(out, "> "+l)
		}
	}
	return strings.Join(out, "\n")
}

var reImgTag = regexp.MustCompile(`(?i)(src=["']|\]\()/images/([a-zA-Z0-9_\-\.]+)`)

func (t *lwsTransformer) rewriteImages(content string) string {
	return reImgTag.ReplaceAllString(content, "${1}../../assets/lws/${2}")
}

var reMDLink = regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)

func (t *lwsTransformer) rewriteLinks(content string) string {
	return reMDLink.ReplaceAllStringFunc(content, func(match string) string {
		sub := reMDLink.FindStringSubmatch(match)
		linkText := sub[1]
		target := strings.TrimSpace(sub[2])

		newTarget := t.rewriteTarget(target)
		return fmt.Sprintf("[%s](%s)", linkText, newTarget)
	})
}

func (t *lwsTransformer) rewriteTarget(target string) string {
	if strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://") || strings.HasPrefix(target, "mailto:") {
		return target
	}
	if strings.HasPrefix(target, "#") {
		return target
	}
	if strings.HasPrefix(target, "/images/") || strings.HasPrefix(target, "../../assets/lws/") {
		return target
	}

	linkPath, anchor, hasAnchor := strings.Cut(target, "#")
	if hasAnchor {
		anchor = "#" + anchor
	}

	// 1. Labels reference
	if strings.Contains(linkPath, "labels-annotations-and-environment-variables") {
		if hasAnchor {
			return anchor
		}
		return "#labels-annotations-and-environment-variables"
	}

	// 2. Links resolving out of concepts (e.g. ../../../examples/..., ../../../installation/..., or /docs/...)
	if strings.HasPrefix(linkPath, "../../..") {
		rel := strings.TrimPrefix(linkPath, "../../..")
		if !strings.HasPrefix(rel, "/") {
			rel = "/" + rel
		}
		return "https://lws.sigs.k8s.io/docs" + rel + anchor
	}
	if strings.Contains(linkPath, "examples/") {
		clean := strings.TrimPrefix(linkPath, "/")
		for strings.HasPrefix(clean, "../") {
			clean = strings.TrimPrefix(clean, "../")
		}
		return "https://lws.sigs.k8s.io/docs/" + clean + anchor
	}
	if strings.HasPrefix(linkPath, "/docs/") && !strings.HasPrefix(linkPath, "/docs/concepts/") {
		return "https://lws.sigs.k8s.io" + linkPath + anchor
	}

	// 3. Cross-links between LeaderWorkerSet and DisaggregatedSet
	if t.currentPage == "leaderworkerset" {
		if strings.Contains(linkPath, "disaggregatedset") {
			clean := strings.Trim(linkPath, "/")
			parts := strings.Split(clean, "/")
			var child string
			for i, p := range parts {
				if p == "disaggregatedset" && i+1 < len(parts) {
					child = parts[i+1]
					break
				}
			}
			if child != "" {
				if slug, ok := t.dsSubpageSlugs[child]; ok {
					if hasAnchor {
						return "disaggregatedset.md" + anchor
					}
					return "disaggregatedset.md#" + slug
				}
			}
			if hasAnchor {
				return "disaggregatedset.md" + anchor
			}
			return "disaggregatedset.md"
		}

		clean := strings.Trim(linkPath, "/")
		if clean == ".." || clean == "." || clean == "" || clean == "docs/concepts/leaderworkerset" {
			if hasAnchor {
				return anchor
			}
			return "#architecture-and-relationship-with-statefulset"
		}

		parts := strings.Split(clean, "/")
		last := parts[len(parts)-1]
		if slug, ok := t.lwsSubpageSlugs[last]; ok {
			if hasAnchor {
				return anchor
			}
			return "#" + slug
		}
	} else if t.currentPage == "disaggregatedset" {
		if strings.Contains(linkPath, "leaderworkerset") {
			clean := strings.Trim(linkPath, "/")
			parts := strings.Split(clean, "/")
			var child string
			for i, p := range parts {
				if p == "leaderworkerset" && i+1 < len(parts) {
					child = parts[i+1]
					break
				}
			}
			if child != "" {
				if slug, ok := t.lwsSubpageSlugs[child]; ok {
					if hasAnchor {
						return "leaderworkerset.md" + anchor
					}
					return "leaderworkerset.md#" + slug
				}
			}
			if hasAnchor {
				return "leaderworkerset.md" + anchor
			}
			return "leaderworkerset.md"
		}

		clean := strings.Trim(linkPath, "/")
		if clean == ".." || clean == "." || clean == "" || clean == "docs/concepts/disaggregatedset" {
			if hasAnchor {
				return anchor
			}
			return "#"
		}

		parts := strings.Split(clean, "/")
		last := parts[len(parts)-1]
		if slug, ok := t.dsSubpageSlugs[last]; ok {
			if hasAnchor {
				return anchor
			}
			return "#" + slug
		}
	}

	return target
}

func shiftHeadings(content string) string {
	lines := strings.Split(content, "\n")
	var out []string
	inCode := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "```") || strings.HasPrefix(trimmed, "~~~") {
			inCode = !inCode
			out = append(out, line)
			continue
		}
		if !inCode && strings.HasPrefix(line, "#") {
			i := 0
			for i < len(line) && line[i] == '#' {
				i++
			}
			if i < len(line) && line[i] == ' ' {
				out = append(out, "#"+line)
				continue
			}
		}
		out = append(out, line)
	}
	return strings.Join(out, "\n")
}

func transformLabelsRef(content string) string {
	lines := strings.Split(content, "\n")
	var out []string
	for _, line := range lines {
		switch strings.TrimSpace(line) {
		case "# Labels":
			out = append(out, "### Labels")
		case "# Annotations":
			out = append(out, "### Annotations")
		case "# Environment Variables":
			out = append(out, "### Environment Variables")
		default:
			out = append(out, line)
		}
	}
	return strings.Join(out, "\n")
}

func slugify(s string) string {
	s = strings.ToLower(s)
	var sb strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			sb.WriteRune(r)
		} else if r == ' ' || r == '-' || r == '_' {
			if sb.Len() > 0 && !strings.HasSuffix(sb.String(), "-") {
				sb.WriteRune('-')
			}
		}
	}
	return strings.Trim(sb.String(), "-")
}

func isGitRepo(path string) bool {
	cmd := exec.Command("git", "-C", path, "rev-parse", "--git-dir")
	cmd.Stderr = nil
	return cmd.Run() == nil
}

func gitFetchReset(repo, branch string) error {
	fetch := exec.Command("git", "-C", repo, "fetch", "origin", branch, "--quiet")
	fetch.Stderr = os.Stderr
	if err := fetch.Run(); err != nil {
		return fmt.Errorf("git fetch: %w", err)
	}
	reset := exec.Command("git", "-C", repo, "reset", "--hard", "origin/"+branch, "--quiet")
	reset.Stderr = os.Stderr
	if err := reset.Run(); err != nil {
		return fmt.Errorf("git reset: %w", err)
	}
	return nil
}

func sanitizeBranch(branch string) string {
	return strings.NewReplacer("/", "_", "\\", "_", ":", "_").Replace(branch)
}

func expandHome(p string) string {
	if p == "" || p[0] != '~' {
		return p
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return p
	}
	return filepath.Join(home, strings.TrimPrefix(p, "~/"))
}

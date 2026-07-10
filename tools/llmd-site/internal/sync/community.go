package sync

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
)

// Community mirror pages. These reproduce scripts/sync-community.mjs: the
// contributing / code-of-conduct / security / SIGs pages mirror the canonical
// source files at the llm-d repo root, wrapped with frontmatter + a "source"
// admonition. Unlike docs/, community/ is NOT processed by preprocess.mjs, so
// links are rewritten here (via the same semantics as scripts/lib/rewrite.mjs).
type communityPage struct {
	Src         string
	Out         string
	Title       string
	Label       string
	Position    int
	HideSidebar bool
}

var communityPages = []communityPage{
	{Src: "CONTRIBUTING.md", Out: "contribute.md", Title: "Contributing to llm-d", Label: "Contributing", Position: 3},
	{Src: "CODE_OF_CONDUCT.md", Out: "code-of-conduct.md", Title: "Code of Conduct", Label: "Code of Conduct", Position: 4},
	{Src: "SECURITY.md", Out: "security.md", Title: "Security Policy", Label: "Security", Position: 5},
	{Src: "SIGS.md", Out: "sigs.md", Title: "Special Interest Groups (SIGs)", Label: "SIGs", Position: 6},
}

var communityPathMap = map[string]string{
	"CONTRIBUTING.md":    "/community/contribute",
	"CODE_OF_CONDUCT.md": "/community/code-of-conduct",
	"SECURITY.md":        "/community/security",
	"SIGS.md":            "/community/sigs",
}

var reLeadingH1 = regexp.MustCompile(`^\s*#\s+.*\n`)

func (e *engine) syncCommunity() error {
	outDir := filepath.Join(e.opts.RepoRoot, "community")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}
	rw := newRewriter(e.src.Root, communityPathMap)

	count := 0
	for _, p := range communityPages {
		srcPath := filepath.Join(e.src.Root, p.Src)
		if !fileExists(srcPath) {
			fmt.Printf("    ! community source not found, skipping: %s\n", p.Src)
			continue
		}
		data, err := os.ReadFile(srcPath)
		if err != nil {
			return err
		}
		// Drop the source's leading H1 so the frontmatter title is the sole title.
		body := reLeadingH1.ReplaceAllString(string(data), "")
		body = rw.transformContent(body, ".")

		fm := []string{
			"---",
			"title: " + jsonString(p.Title),
			"sidebar_label: " + jsonString(p.Label),
			fmt.Sprintf("sidebar_position: %d", p.Position),
			"description: " + jsonString(p.Title+" — llm-d community"),
			"custom_edit_url: https://github.com/llm-d/llm-d/edit/main/" + p.Src,
		}
		if p.HideSidebar {
			fm = append(fm, `# Standalone page reached from the "Contributing" navbar item — no left sidebar.`)
			fm = append(fm, "displayed_sidebar: null")
		}
		fm = append(fm, "---")
		frontmatter := strings.Join(fm, "\n")

		note := fmt.Sprintf(":::info\nThis page mirrors [`%s`](https://github.com/llm-d/llm-d/blob/main/%s) from the llm-d repository. Edit it there.\n:::", p.Src, p.Src)

		content := frontmatter + "\n\n" + note + "\n\n" + strings.TrimSpace(body) + "\n"
		if err := os.WriteFile(filepath.Join(outDir, p.Out), []byte(content), 0o644); err != nil {
			return err
		}
		count++
	}
	fmt.Printf("    ✓ synced community -> community/ (%d pages from repo root)\n", count)
	return nil
}

// jsonString mirrors JavaScript's JSON.stringify for a string value (used for
// YAML frontmatter values), keeping UTF-8 (e.g. the em dash) unescaped.
func jsonString(s string) string {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(s)
	return strings.TrimRight(buf.String(), "\n")
}

// rewriter ports scripts/lib/rewrite.mjs createRewriter (relativeDocLinks:false).
type rewriter struct {
	repo    string // upstream repo root (for existence checks)
	pathMap map[string]string
}

func newRewriter(repo string, pathMap map[string]string) *rewriter {
	return &rewriter{repo: repo, pathMap: pathMap}
}

const (
	gh      = "https://github.com/llm-d/llm-d"
	ghBlob  = gh + "/blob/main"
	ghTree  = gh + "/tree/main"
	ghRaw   = gh + "/raw/main"
)

var communityImageExts = map[string]bool{
	".png": true, ".svg": true, ".jpg": true, ".jpeg": true,
	".gif": true, ".webp": true, ".ico": true, ".avif": true,
}

var (
	reLlmdImg      = regexp.MustCompile(`https?://llm-d\.ai/img/`)
	reSectionLink  = regexp.MustCompile(`((?:to|href)=")/(getting-started|guides|architecture|well-lit-paths|operations|infrastructure|api-reference)(["#/])`)
	reFence        = regexp.MustCompile("^\\s*(`{3,}|~{3,})")
	reLink         = regexp.MustCompile(`(!?)\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]+)([^)]*)\)`)
	reCodeSpan     = regexp.MustCompile("`+[^`]*`+")
	reDocIndexSlug = regexp.MustCompile(`(?i)/(README|index)\.mdx?$`)
	reDocIndexRoot = regexp.MustCompile(`(?i)^(README|index)\.mdx?$`)
	reDocExt       = regexp.MustCompile(`(?i)\.mdx?$`)
	reTrailSlash   = regexp.MustCompile(`/+$`)
)

// transformContent rewrites a whole markdown document. fileRepoDir is the
// file's directory relative to the repo root (community pages use ".").
// escapeBraces is always applied (community pages are generated as .md).
func (r *rewriter) transformContent(content, fileRepoDir string) string {
	content = reLlmdImg.ReplaceAllString(content, "/img/")
	content = reSectionLink.ReplaceAllString(content, "${1}/docs/${2}${3}")

	lines := strings.Split(content, "\n")
	inFence := false
	for i, line := range lines {
		fence := reFence.MatchString(line)
		if fence {
			inFence = !inFence
		}
		if inFence || fence {
			continue
		}
		out := r.rewriteLinks(line, fileRepoDir)
		out = escapeBracesLine(out)
		lines[i] = out
	}
	return strings.Join(lines, "\n")
}

func (r *rewriter) rewriteLinks(line, fileRepoDir string) string {
	return replaceAllSubmatch(reLink, line, func(g []string) string {
		full, bang, text, raw, tail := g[0], g[1], g[2], g[3], g[4]
		url := strings.TrimSuffix(strings.TrimPrefix(raw, "<"), ">")
		next, ok := r.rewriteURL(url, fileRepoDir)
		if !ok {
			return full
		}
		return bang + "[" + text + "](" + next + tail + ")"
	})
}

// rewriteURL returns (newURL, true) when the link should be rewritten, or
// ("", false) to leave it unchanged.
func (r *rewriter) rewriteURL(url, fileRepoDir string) (string, bool) {
	if hasScheme(url) || strings.HasPrefix(url, "//") || strings.HasPrefix(url, "#") || strings.HasPrefix(url, "/") {
		return "", false
	}
	pathPart, suffix := splitPathSuffix(url)
	if pathPart == "" {
		return "", false
	}
	resolved := path.Join(fileRepoDir, pathPart)
	ext := strings.ToLower(path.Ext(resolved))

	if mapped, ok := r.pathMap[resolved]; ok {
		return mapped + suffix, true
	}

	if communityImageExts[ext] {
		if strings.HasPrefix(resolved, "docs/") || strings.HasPrefix(resolved, "guides/") {
			return "", false
		}
		return ghRaw + "/" + resolved + suffix, true
	}

	if (strings.HasPrefix(resolved, "docs/") || strings.HasPrefix(resolved, "guides/")) && r.docExists(resolved) {
		return r.toSiteDocURL(resolved) + suffix, true
	}

	if strings.HasPrefix(resolved, "..") {
		return ghTree + "/" + stripLeadingDotDot(resolved) + suffix, true
	}
	if r.isDir(resolved) {
		return ghTree + "/" + resolved + suffix, true
	}
	return ghBlob + "/" + resolved + suffix, true
}

func (r *rewriter) docExists(repoRel string) bool {
	abs := filepath.Join(r.repo, filepath.FromSlash(repoRel))
	ext := strings.ToLower(path.Ext(repoRel))
	if (ext == ".md" || ext == ".mdx") && fileExists(abs) {
		return true
	}
	for _, e := range []string{".md", ".mdx"} {
		if fileExists(abs + e) {
			return true
		}
	}
	if dirExists(abs) {
		for _, i := range []string{"README.md", "README.mdx", "index.md", "index.mdx"} {
			if fileExists(filepath.Join(abs, i)) {
				return true
			}
		}
	}
	return false
}

func (r *rewriter) isDir(repoRel string) bool {
	return dirExists(filepath.Join(r.repo, filepath.FromSlash(repoRel)))
}

// toSiteDocURL maps a repo-relative doc path to its absolute site URL
// (/docs/… or /docs/guides/…), matching rewrite.mjs toSiteDocUrl.
func (r *rewriter) toSiteDocURL(repoRel string) string {
	var rel string
	if strings.HasPrefix(repoRel, "guides/") {
		rel = "guides/" + repoRel[len("guides/"):]
	} else {
		rel = repoRel[len("docs/"):]
	}
	rel = reDocIndexSlug.ReplaceAllString(rel, "")
	rel = reDocIndexRoot.ReplaceAllString(rel, "")
	rel = reDocExt.ReplaceAllString(rel, "")
	rel = reTrailSlash.ReplaceAllString(rel, "")
	if rel != "" {
		return "/docs/" + rel
	}
	return "/docs"
}

func escapeBracesLine(line string) string {
	var b strings.Builder
	last := 0
	for _, loc := range reCodeSpan.FindAllStringIndex(line, -1) {
		b.WriteString(escBraces(line[last:loc[0]]))
		b.WriteString(line[loc[0]:loc[1]]) // code span verbatim
		last = loc[1]
	}
	b.WriteString(escBraces(line[last:]))
	return b.String()
}

func escBraces(s string) string {
	s = strings.ReplaceAll(s, "{", "&#123;")
	s = strings.ReplaceAll(s, "}", "&#125;")
	return s
}

var reScheme = regexp.MustCompile(`^[a-z][a-z0-9+.-]*:`)

func hasScheme(url string) bool { return reScheme.MatchString(strings.ToLower(url)) }

// splitPathSuffix splits a URL into its path and its trailing #fragment/?query.
func splitPathSuffix(url string) (string, string) {
	if i := strings.IndexAny(url, "#?"); i >= 0 {
		return url[:i], url[i:]
	}
	return url, ""
}

func stripLeadingDotDot(p string) string {
	for strings.HasPrefix(p, "../") {
		p = p[len("../"):]
	}
	return p
}

// replaceAllSubmatch applies fn to every match of re in s; fn receives the full
// match followed by its capture groups and returns the replacement.
func replaceAllSubmatch(re *regexp.Regexp, s string, fn func([]string) string) string {
	var b strings.Builder
	last := 0
	for _, m := range re.FindAllStringSubmatchIndex(s, -1) {
		b.WriteString(s[last:m[0]])
		groups := make([]string, len(m)/2)
		for i := 0; i < len(m)/2; i++ {
			if m[2*i] >= 0 {
				groups[i] = s[m[2*i]:m[2*i+1]]
			}
		}
		b.WriteString(fn(groups))
		last = m[1]
	}
	b.WriteString(s[last:])
	return b.String()
}

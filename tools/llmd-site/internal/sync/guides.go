package sync

import (
	"encoding/json"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

// Guide mirror pages. Each entry in docs-sync.yaml guides: mirrors a top-level
// well-lit-path deployment guide (a repo-root guides/<name>/README.md in
// llm-d/llm-d) into the site's own guides/ docs-plugin instance, wrapped with
// frontmatter + a "source" admonition — analogous to syncCommunity. Unlike
// community pages (repo-root files), a guide README's relative links resolve
// against the guide's own directory, not the repo root, since guides link out
// to sibling manifests, Kustomize overlays, and sub-guides alongside the README.
func (e *engine) syncGuides() error {
	if len(e.m.Guides) == 0 {
		return nil
	}

	// Like community/, guides/ mixes committed authored pages (index.md) with
	// generated mirror pages, so it is only created here, never wiped.
	outDir := filepath.Join(e.opts.RepoRoot, "guides")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}

	pathMap := guidesPathMap(e.m.Guides)
	rw := newRewriter(e.src.Root, pathMap)

	repoURL := strings.TrimSuffix(e.m.Sources.LLMD.Remote.URL, "/")
	editBase := repoURL + "/edit/main/"
	blobBase := repoURL + "/blob/main/"

	count := 0
	for _, page := range e.m.Guides {
		srcPath := filepath.Join(e.src.Root, page.From)
		if !fileExists(srcPath) {
			fmt.Printf("    ! guide source not found, skipping: %s\n", page.From)
			continue
		}
		data, err := os.ReadFile(srcPath)
		if err != nil {
			return err
		}
		// Drop the source's leading H1 so the frontmatter title is the sole title.
		body := reLeadingH1.ReplaceAllString(string(data), "")
		fileRepoDir := path.Dir(filepath.ToSlash(page.From))
		// Guide READMEs use GitHub alert blockquotes heavily; guides/ (like
		// community/) isn't run through the JS markdown preprocessor
		// (scripts/lib/preprocess.mjs bails outside docsDir), so convert here.
		body = convertGithubAlerts(body)
		body = rw.transformContent(body, fileRepoDir)
		body = fixAbsoluteDocLinks(body, latestReleaseDocsDir(e.opts.RepoRoot))

		label := page.SidebarLabel()

		fm := []string{
			"---",
			"title: " + jsonString(page.Title),
			"sidebar_label: " + jsonString(label),
			fmt.Sprintf("sidebar_position: %d", page.SidebarPosition),
			"description: " + jsonString(page.Title+" — a well-lit path deployment guide"),
			"custom_edit_url: " + editBase + page.From,
			"---",
		}
		frontmatter := strings.Join(fm, "\n")

		note := fmt.Sprintf(":::info\nThis guide mirrors [`%s`](%s%s) from the llm-d repository, including the manifests and overlays it links to. Edit it there.\n:::", page.From, blobBase, page.From)

		content := frontmatter + "\n\n" + note + "\n\n" + strings.TrimSpace(body) + "\n"
		if err := os.WriteFile(filepath.Join(outDir, page.OutputFile()), []byte(content), 0o644); err != nil {
			return err
		}
		count++
	}
	fmt.Printf("    ✓ synced guides -> guides/ (%d pages from guides/)\n", count)
	return nil
}

// Absolute /docs/<section>/... links (e.g. into well-lit-paths or
// architecture) target real docs pages, but only the unversioned "dev" docs
// are guaranteed to have them — the page may not have shipped in the latest
// release yet. Guides are themselves unversioned (mirroring main, like
// community/), so route through /docs/dev/ rather than the versioned "latest
// release" path, which 404s until the target doc is released.
var reAbsDocSectionLink = regexp.MustCompile(`\]\(/docs/((?:well-lit-paths|architecture|getting-started|operations|infrastructure|api-reference|accelerators)/[^)\s#?]+)`)

// fixAbsoluteDocLinks rewrites the hardcoded /docs/<section>/... links
// described above so they resolve on this site instead of 404ing.
// Markdown-link-aware only (not a general URL rewrite); skipped inside fenced
// code blocks. latestDir is the latest released version's docs directory
// (versioned_docs/version-X.Y), or "" if it can't be determined — in which
// case section links are left as-is rather than redirected on a guess.
func fixAbsoluteDocLinks(body string, latestDir string) string {
	if latestDir == "" {
		return body
	}
	lines := strings.Split(body, "\n")
	inFence := false
	for i, line := range lines {
		if reFence.MatchString(line) {
			inFence = !inFence
			continue
		}
		if inFence {
			continue
		}
		lines[i] = reAbsDocSectionLink.ReplaceAllStringFunc(line, func(m string) string {
			rest := strings.TrimPrefix(m, "](/docs/")
			if docPageExists(latestDir, rest) {
				return m // already resolves in the latest release; leave it
			}
			return "](/docs/dev/" + rest
		})
	}
	return strings.Join(lines, "\n")
}

// latestReleaseDocsDir returns the versioned docs directory for the newest
// released version (versions.json is newest-first), or "" if unavailable.
func latestReleaseDocsDir(repoRoot string) string {
	data, err := os.ReadFile(filepath.Join(repoRoot, "versions.json"))
	if err != nil {
		return ""
	}
	var versions []string
	if err := json.Unmarshal(data, &versions); err != nil || len(versions) == 0 {
		return ""
	}
	dir := filepath.Join(repoRoot, "versioned_docs", "version-"+versions[0])
	if !dirExists(dir) {
		return ""
	}
	return dir
}

// docPageExists reports whether repoRel (a docs-relative path with no
// extension, e.g. "architecture/core/router/proxy") resolves to a page under
// baseDir, as a file (.md/.mdx) or a directory index (README/index).
func docPageExists(baseDir, repoRel string) bool {
	abs := filepath.Join(baseDir, filepath.FromSlash(repoRel))
	for _, e := range []string{".md", ".mdx"} {
		if fileExists(abs + e) {
			return true
		}
	}
	if dirExists(abs) {
		for _, idx := range []string{"README.md", "README.mdx", "index.md", "index.mdx"} {
			if fileExists(filepath.Join(abs, idx)) {
				return true
			}
		}
	}
	return false
}

func guidesPathMap(entries []manifest.GuideFile) map[string]string {
	out := make(map[string]string, len(entries))
	for _, g := range entries {
		out[g.From] = g.SitePath()
	}
	return out
}

var (
	reGithubAlertOpen  = regexp.MustCompile(`(?i)^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$`)
	reBlockquoteLine   = regexp.MustCompile(`^\s*>`)
	reBlockquotePrefix = regexp.MustCompile(`^\s*>\s?`)
)

var githubAlertTypes = map[string]string{
	"NOTE": "note", "TIP": "tip", "IMPORTANT": "info", "WARNING": "warning", "CAUTION": "danger",
}

// convertGithubAlerts ports scripts/lib/preprocess.mjs convertGithubAdmonitions
// to Go. guides/ (like community/) isn't run through the JS markdown
// preprocessor — it bails on anything outside docsDir — so GitHub alert
// blockquotes (`> [!NOTE]` ...) need converting to Docusaurus admonitions
// (`:::note` ... `:::`) here instead. Fence-aware; leaves everything else
// untouched.
func convertGithubAlerts(body string) string {
	lines := strings.Split(body, "\n")
	out := make([]string, 0, len(lines))
	inFence := false
	for i := 0; i < len(lines); i++ {
		line := lines[i]
		if reFence.MatchString(line) {
			inFence = !inFence
			out = append(out, line)
			continue
		}
		var m []string
		if !inFence {
			m = reGithubAlertOpen.FindStringSubmatch(line)
		}
		if m == nil {
			out = append(out, line)
			continue
		}
		kind := githubAlertTypes[strings.ToUpper(m[1])]
		var quoted []string
		j := i + 1
		for j < len(lines) && reBlockquoteLine.MatchString(lines[j]) {
			quoted = append(quoted, reBlockquotePrefix.ReplaceAllString(lines[j], ""))
			j++
		}
		for len(quoted) > 0 && strings.TrimSpace(quoted[0]) == "" {
			quoted = quoted[1:]
		}
		for len(quoted) > 0 && strings.TrimSpace(quoted[len(quoted)-1]) == "" {
			quoted = quoted[:len(quoted)-1]
		}
		if len(out) > 0 && strings.TrimSpace(out[len(out)-1]) != "" {
			out = append(out, "")
		}
		out = append(out, ":::"+kind)
		out = append(out, quoted...)
		out = append(out, ":::", "")
		i = j - 1
	}
	return strings.Join(out, "\n")
}

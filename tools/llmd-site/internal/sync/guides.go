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
		body = rw.transformContent(body, fileRepoDir)
		body = fixAbsoluteDocLinks(body, pathMap, latestReleaseDocsDir(e.opts.RepoRoot))

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

var (
	// A guide README may hardcode an absolute /docs/guides/<name>/... link,
	// written on the assumption that guides render inline under docs/. They
	// don't: guides render at /guides/<name>, so this never resolves as-is.
	reAbsGuideDocLink = regexp.MustCompile(`\]\(/docs/guides/([^)\s#?]+)`)
	// Other absolute /docs/<section>/... links (e.g. into well-lit-paths or
	// architecture) target real docs pages, but only the unversioned "dev"
	// docs are guaranteed to have them — the page may not have shipped in the
	// latest release yet. Guides are themselves unversioned (mirroring main,
	// like community/), so route through /docs/dev/ rather than the versioned
	// "latest release" path, which 404s until the target doc is released.
	reAbsDocSectionLink = regexp.MustCompile(`\]\(/docs/((?:well-lit-paths|architecture|getting-started|operations|infrastructure|api-reference|accelerators)/[^)\s#?]+)`)
)

// fixAbsoluteDocLinks rewrites the hardcoded /docs/... links described above
// so they resolve on this site instead of 404ing. Markdown-link-aware only
// (not a general URL rewrite); skipped inside fenced code blocks. latestDir is
// the latest released version's docs directory (versioned_docs/version-X.Y),
// or "" if it can't be determined — in which case section links are left as-is
// rather than redirected on a guess.
func fixAbsoluteDocLinks(body string, pathMap map[string]string, latestDir string) string {
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
		line = reAbsGuideDocLink.ReplaceAllStringFunc(line, func(m string) string {
			rest := strings.TrimPrefix(m, "](/docs/guides/")
			name := rest
			if idx := strings.Index(name, "/"); idx >= 0 {
				name = name[:idx]
			}
			if mapped, ok := pathMap["guides/"+name+"/README.md"]; ok {
				return "](" + mapped
			}
			return "](" + ghTree + "/guides/" + name
		})
		if latestDir != "" {
			line = reAbsDocSectionLink.ReplaceAllStringFunc(line, func(m string) string {
				rest := strings.TrimPrefix(m, "](/docs/")
				if docPageExists(latestDir, rest) {
					return m // already resolves in the latest release; leave it
				}
				return "](/docs/dev/" + rest
			})
		}
		lines[i] = line
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

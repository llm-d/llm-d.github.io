package check

import "strings"

// collapseSlashes normalizes duplicate slashes in URL paths.
func collapseSlashes(path string) string {
	for strings.Contains(path, "//") {
		path = strings.ReplaceAll(path, "//", "/")
	}
	return path
}

// internalPathCandidates returns alternate paths to try when validating internal links.
// Unified static serving does not mirror Docusaurus client redirects, so root-absolute
// /guides/* and *.md targets often resolve under /docs/ or /docs/dev/.
func internalPathCandidates(path string) []string {
	path = collapseSlashes(path)
	seen := map[string]struct{}{}
	var out []string
	add := func(p string) {
		p = collapseSlashes(p)
		if p == "" {
			p = "/"
		}
		if _, ok := seen[p]; ok {
			return
		}
		seen[p] = struct{}{}
		out = append(out, p)
	}

	add(path)

	if strings.HasSuffix(path, ".md") {
		trimmed := strings.TrimSuffix(path, ".md")
		add(trimmed)
		if !strings.HasSuffix(trimmed, "/") {
			add(trimmed + "/")
		}
	}
	if strings.HasSuffix(path, "/README.md") {
		base := strings.TrimSuffix(path, "/README.md")
		add(base)
		add(base + "/")
	}

	if strings.HasPrefix(path, "/guides/") {
		add("/docs" + path)
		add("/docs/dev" + path)
	}

	// Root-absolute architecture/resources paths from dev docs pages.
	for _, prefix := range []string{"/architecture/", "/getting-started/", "/helpers/"} {
		if strings.HasPrefix(path, prefix) {
			add("/docs" + path)
			add("/docs/dev" + path)
		}
	}

	return out
}

func (c *Checker) pageExists(path string) bool {
	for _, candidate := range internalPathCandidates(path) {
		if result := c.crawlPageCached(c.server.BaseURL() + candidate); result.Success {
			return true
		}
	}
	return false
}

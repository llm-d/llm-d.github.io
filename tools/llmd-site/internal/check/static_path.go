package check

import (
	"os"
	"path/filepath"
	"strings"
)

// ResolveStaticBuildPath maps a URL path from the built Docusaurus site to a file
// under buildDir. Docusaurus (trailingSlash: false) emits foo.html for /foo.
func ResolveStaticBuildPath(buildDir, urlPath string) (string, bool) {
	path := collapseSlashes(urlPath)
	if path == "/" {
		path = "/index.html"
	}
	rel := strings.TrimPrefix(path, "/")
	if rel == "" {
		rel = "index.html"
	}

	var candidates []string
	if strings.HasSuffix(rel, ".html") {
		candidates = []string{rel}
	} else {
		candidates = []string{
			rel,
			rel + ".html",
			filepath.ToSlash(filepath.Join(rel, "index.html")),
		}
	}

	for _, c := range candidates {
		full := filepath.Join(buildDir, filepath.FromSlash(c))
		info, err := os.Stat(full)
		if err == nil && !info.IsDir() {
			return full, true
		}
	}
	return "", false
}

package repo

import (
	"os"
	"path/filepath"
)

// Root returns the llm-d.github.io repository root (parent of tools/llmd-site).
func Root() (string, error) {
	if env := os.Getenv("LLMD_SITE_ROOT"); env != "" {
		return filepath.Abs(env)
	}
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	dir := wd
	for {
		if _, err := os.Stat(filepath.Join(dir, "tools", "llmd-site", "go.mod")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return wd, nil
		}
		dir = parent
	}
}

func ManifestPath(root string) string {
	return filepath.Join(root, "docs-sync.yaml")
}

func LocalConfigPath(root string) string {
	return filepath.Join(root, "llmd-site.local.yaml")
}

func PreviewDocsDir(root string) string {
	return filepath.Join(root, "preview", "docs")
}

func GoldenDir(root string) string {
	return filepath.Join(root, "tools", "llmd-site", "testdata", "golden")
}

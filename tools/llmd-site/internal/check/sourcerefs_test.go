package check

import (
	"path/filepath"
	"testing"
)

// versionLabel must not invent a release name from an arbitrary path segment:
// under --dir docs the first segment is a docs section, and treating that as a
// release reported every dev-doc link as belonging to a missing release.
func TestVersionLabel(t *testing.T) {
	versioned := filepath.FromSlash("/r/versioned_docs")
	docs := filepath.FromSlash("/r/docs")

	tests := []struct {
		scanDir string
		file    string
		want    string
	}{
		{versioned, "/r/versioned_docs/version-0.10/a/b.md", "0.10"},
		{versioned, "/r/versioned_docs/version-0.7/a.md", "0.7"},
		{versioned, "/r/versioned_docs/version-1.0/deep/er/c.md", "1.0"},
		// Not a version directory -> no release to compare against.
		{docs, "/r/docs/architecture/core/x.md", ""},
		{docs, "/r/docs/api-reference/y.md", ""},
		// A file sitting directly in the scan dir is not a release either.
		{versioned, "/r/versioned_docs/loose.md", ""},
		{docs, "/r/docs/README.md", ""},
	}
	for _, tc := range tests {
		got := versionLabel(tc.scanDir, filepath.FromSlash(tc.file))
		if got != tc.want {
			t.Errorf("versionLabel(%s, %s) = %q, want %q", tc.scanDir, tc.file, got, tc.want)
		}
	}
}

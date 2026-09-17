package sync

import (
	"os"
	"path/filepath"
	"testing"
)

// TestRewriteURLGuideLinks guards against the guides/ link-collapse bug:
// rewriteURL must preserve the full repo-relative path to GitHub for any
// guides/... target that isn't itself a migrated guide's README (pathMap),
// rather than routing it through the nonexistent /docs/guides/... site route.
func TestRewriteURLGuideLinks(t *testing.T) {
	repo := t.TempDir()
	writeFile(t, repo, "guides/optimized-baseline/benchmark-results/sglang-qwen3-32b-h100/README.md")
	writeFile(t, repo, "guides/recipes/router/calibration/README.md")
	writeFile(t, repo, "guides/recipes/router/calibration/configuration-matrix.md")
	writeFile(t, repo, "docs/architecture/core/router/proxy.md")

	pathMap := map[string]string{
		"guides/optimized-baseline/README.md": "/guides/optimized-baseline",
	}
	rw := newRewriter(repo, pathMap)

	cases := []struct {
		name        string
		url         string
		fileRepoDir string
		want        string
	}{
		{
			name:        "deep benchmark-results link keeps its own path, not the guide root",
			url:         "./benchmark-results/sglang-qwen3-32b-h100/README.md",
			fileRepoDir: "guides/optimized-baseline",
			want:        ghBlob + "/guides/optimized-baseline/benchmark-results/sglang-qwen3-32b-h100/README.md",
		},
		{
			name:        "sibling guide recipe link keeps its full path",
			url:         "../recipes/router/calibration/README.md",
			fileRepoDir: "guides/optimized-baseline",
			want:        ghBlob + "/guides/recipes/router/calibration/README.md",
		},
		{
			name:        "sibling guide recipe matrix link keeps its full path",
			url:         "../recipes/router/calibration/configuration-matrix.md",
			fileRepoDir: "guides/optimized-baseline",
			want:        ghBlob + "/guides/recipes/router/calibration/configuration-matrix.md",
		},
		{
			name:        "link to a migrated guide's own README uses its site path",
			url:         "../optimized-baseline/README.md",
			fileRepoDir: "guides/multi-model-routing",
			want:        "/guides/optimized-baseline",
		},
		{
			name:        "link into docs/ still resolves to a site doc URL",
			url:         "../../docs/architecture/core/router/proxy.md",
			fileRepoDir: "guides/optimized-baseline",
			want:        "/docs/architecture/core/router/proxy",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := rw.rewriteURL(tc.url, tc.fileRepoDir)
			if !ok {
				t.Fatalf("rewriteURL(%q) = not rewritten, want %q", tc.url, tc.want)
			}
			if got != tc.want {
				t.Errorf("rewriteURL(%q) = %q, want %q", tc.url, got, tc.want)
			}
		})
	}
}

func writeFile(t *testing.T, repo, repoRel string) {
	t.Helper()
	abs := filepath.Join(repo, filepath.FromSlash(repoRel))
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(abs, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
}

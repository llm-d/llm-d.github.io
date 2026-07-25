package check

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveStaticBuildPath(t *testing.T) {
	build := t.TempDir()
	write := func(rel, content string) {
		full := filepath.Join(build, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	write("index.html", "home")
	write("docs/dev/getting-started/accelerators.html", "acc")
	write("docs/dev/architecture/advanced/batch/async-processor.html", "ap")

	cases := map[string]string{
		"/":                                                      "index.html",
		"/docs/dev/getting-started/accelerators":                 "docs/dev/getting-started/accelerators.html",
		"/docs/dev/architecture/advanced/batch/async-processor":  "docs/dev/architecture/advanced/batch/async-processor.html",
		"/docs/dev/accelerators.html":                            "docs/dev/getting-started/accelerators.html", // won't match - wrong path
	}
	for urlPath, wantRel := range cases {
		if urlPath == "/docs/dev/accelerators.html" {
			if _, ok := ResolveStaticBuildPath(build, urlPath); ok {
				t.Fatalf("expected %q to miss", urlPath)
			}
			continue
		}
		got, ok := ResolveStaticBuildPath(build, urlPath)
		if !ok {
			t.Fatalf("ResolveStaticBuildPath(%q) not found", urlPath)
		}
		want := filepath.Join(build, filepath.FromSlash(wantRel))
		if got != want {
			t.Fatalf("ResolveStaticBuildPath(%q) = %q, want %q", urlPath, got, want)
		}
	}
}

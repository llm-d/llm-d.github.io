package sync

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

func TestEvalWhenExprUpstreamPaths(t *testing.T) {
	dir := t.TempDir()
	wip := filepath.Join(dir, "docs")
	if err := os.MkdirAll(filepath.Join(wip, "well-lit-paths", "foundations"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(wip, "operations", "observability"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(wip, "operations", "observability", "setup.md"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	e := &engine{wip: wip}

	if !e.evalWhenExpr("upstream:docs/well-lit-paths/foundations exists") {
		t.Fatal("expected foundations to exist")
	}
	if e.evalWhenExpr("upstream:docs/well-lit-paths/foundations missing") {
		t.Fatal("expected foundations to not be missing")
	}
	if !e.evalWhenExpr("upstream:docs/operations/observability exists") {
		t.Fatal("expected observability setup to exist")
	}
}

func TestCopyPreferGettingStartedIndex(t *testing.T) {
	prefer := []string{"getting-started/README.mdx", "getting-started/README.md"}

	t.Run("mdx upstream produces only index.mdx", func(t *testing.T) {
		dir := t.TempDir()
		wip := filepath.Join(dir, "docs")
		docsDir := filepath.Join(dir, "preview", "docs")
		if err := os.MkdirAll(filepath.Join(wip, "getting-started"), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(wip, "getting-started", "README.mdx"), []byte("mdx"), 0o644); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(wip, "getting-started", "README.md"), []byte("md"), 0o644); err != nil {
			t.Fatal(err)
		}

		e := &engine{wip: wip, docsDir: docsDir}
		if err := e.copyPrefer(manifest.Copy{To: "getting-started/index.mdx", Prefer: prefer}); err != nil {
			t.Fatal(err)
		}
		if err := e.copyPrefer(manifest.Copy{To: "getting-started/index.md", Prefer: prefer}); err != nil {
			t.Fatal(err)
		}

		if !fileExists(filepath.Join(docsDir, "getting-started", "index.mdx")) {
			t.Fatal("expected index.mdx")
		}
		if fileExists(filepath.Join(docsDir, "getting-started", "index.md")) {
			t.Fatal("did not expect index.md when README.mdx exists")
		}
	})

	t.Run("md upstream produces only index.md", func(t *testing.T) {
		dir := t.TempDir()
		wip := filepath.Join(dir, "docs")
		docsDir := filepath.Join(dir, "preview", "docs")
		if err := os.MkdirAll(filepath.Join(wip, "getting-started"), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(wip, "getting-started", "README.md"), []byte("md"), 0o644); err != nil {
			t.Fatal(err)
		}

		e := &engine{wip: wip, docsDir: docsDir}
		if err := e.copyPrefer(manifest.Copy{To: "getting-started/index.mdx", Prefer: prefer}); err != nil {
			t.Fatal(err)
		}
		if err := e.copyPrefer(manifest.Copy{To: "getting-started/index.md", Prefer: prefer}); err != nil {
			t.Fatal(err)
		}

		if fileExists(filepath.Join(docsDir, "getting-started", "index.mdx")) {
			t.Fatal("did not expect index.mdx when only README.md exists")
		}
		if !fileExists(filepath.Join(docsDir, "getting-started", "index.md")) {
			t.Fatal("expected index.md")
		}
	})
}

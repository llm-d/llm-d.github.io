package manifest_test

import (
	"testing"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
)

func TestManifestFromRepo(t *testing.T) {
	root, err := repo.Root()
	if err != nil {
		t.Fatal(err)
	}
	path := repo.ManifestPath(root)
	m, err := manifest.Load(path)
	if err != nil {
		t.Fatalf("load manifest: %v", err)
	}
	if err := m.Validate(); err != nil {
		t.Fatalf("validate: %v", err)
	}
	if len(m.Community) < 4 {
		t.Fatalf("expected at least 4 community entries, got %d", len(m.Community))
	}
}

func TestSourceMap(t *testing.T) {
	m := manifest.Default()
	m.Copies = []manifest.Copy{
		{From: "docs/foo.md", To: "bar/baz.md"},
	}
	sm := m.SourceMap()
	if sm["bar/baz.md"] != "docs/foo.md" {
		t.Fatalf("unexpected source map: %v", sm)
	}
}

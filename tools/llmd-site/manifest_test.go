package manifest_test

import (
	"path/filepath"
	"testing"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/extract"
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
	if len(m.Copies) < 50 {
		t.Fatalf("expected at least 50 copy rules, got %d", len(m.Copies))
	}
}

func TestExtractMatchesManifest(t *testing.T) {
	root, err := repo.Root()
	if err != nil {
		t.Fatal(err)
	}
	script := repo.SyncScriptPath(root)
	extracted, err := extract.FromSyncScript(script)
	if err != nil {
		t.Fatal(err)
	}
	extracted.Copies = extract.MergeUniqueCopies(extracted.Copies)
	if err := extract.ValidateExtract(extracted); err != nil {
		t.Fatal(err)
	}

	committed, err := manifest.Load(filepath.Join(root, "docs-sync.yaml"))
	if err != nil {
		t.Skip("docs-sync.yaml not generated yet")
	}

	if len(extracted.Copies) != len(committed.Copies) {
		t.Errorf("copy count drift: extracted %d committed %d", len(extracted.Copies), len(committed.Copies))
	}
	if len(extracted.Slugs) != len(committed.Slugs) {
		t.Errorf("slug count drift: extracted %d committed %d", len(extracted.Slugs), len(committed.Slugs))
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

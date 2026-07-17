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

func TestCommunityFileHelpers(t *testing.T) {
	f := manifest.CommunityFile{
		From:            "CONTRIBUTING.md",
		To:              "community/contribute.md",
		Title:           "Contributing to llm-d",
		SidebarLabelYAML: "Contributing",
		SidebarPosition: 3,
	}
	if f.OutputFile() != "contribute.md" {
		t.Fatalf("OutputFile: got %q", f.OutputFile())
	}
	if f.SitePath() != "/community/contribute" {
		t.Fatalf("SitePath: got %q", f.SitePath())
	}
	if f.SidebarLabel() != "Contributing" {
		t.Fatalf("SidebarLabel: got %q", f.SidebarLabel())
	}
}

func TestManifestCommunityEntries(t *testing.T) {
	root, err := repo.Root()
	if err != nil {
		t.Fatal(err)
	}
	m, err := manifest.Load(repo.ManifestPath(root))
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range m.Community {
		if c.SidebarLabel() == "" {
			t.Fatalf("community entry %q missing sidebar label/title", c.From)
		}
		if c.SiteRoute() == "" {
			t.Fatalf("community entry %q missing site route", c.From)
		}
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

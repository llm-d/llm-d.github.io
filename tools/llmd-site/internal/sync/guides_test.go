package sync

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

const guidesFixture = "../../testdata/guides-upstream"

func runGuidesFixture(t *testing.T) (docsDir, imgDir string) {
	t.Helper()
	site := t.TempDir()
	docsDir = filepath.Join(site, "docs")
	imgDir = filepath.Join(site, "static", "img", "docs")
	if err := mirrorTree(filepath.Join(guidesFixture, "docs"), docsDir); err != nil {
		t.Fatal(err)
	}
	n, err := syncGuides(guidesFixture, "docs/well-lit-paths/guides.yaml", docsDir, imgDir, "https://github.com/llm-d/llm-d", "release-9.9")
	if err != nil {
		t.Fatalf("syncGuides: %v", err)
	}
	if n != 2 {
		t.Fatalf("expected 2 pages, got %d", n)
	}
	return docsDir, imgDir
}

func TestSyncGuidesPages(t *testing.T) {
	docsDir, imgDir := runGuidesFixture(t)
	gdir := filepath.Join(docsDir, "well-lit-paths", "foundations", "demo")

	// Main page has variant/env markers -> .mdx
	idx, err := os.ReadFile(filepath.Join(gdir, "index.mdx"))
	if err != nil {
		t.Fatalf("index.mdx not written: %v", err)
	}
	if fileExists(filepath.Join(gdir, "index.md")) {
		t.Fatal("index.md should not exist alongside index.mdx")
	}
	s := string(idx)
	if !strings.HasPrefix(s, "---\n") {
		t.Fatal("missing frontmatter")
	}
	parts := strings.SplitN(s, "\n---\n", 2)
	var fm struct {
		Title         string `yaml:"title"`
		CustomEditURL string `yaml:"custom_edit_url"`
		Guide         struct {
			Dir      string            `yaml:"dir"`
			Source   string            `yaml:"source"`
			Ref      string            `yaml:"ref"`
			Repo     string            `yaml:"repo"`
			Defaults map[string]string `yaml:"defaults"`
			Support  yaml.Node         `yaml:"support"`
			Engines  map[string]string `yaml:"engine_labels"`
		} `yaml:"llmd_guide"`
	}
	if err := yaml.Unmarshal([]byte(strings.TrimPrefix(parts[0], "---\n")), &fm); err != nil {
		t.Fatalf("frontmatter not valid YAML: %v\n%s", err, parts[0])
	}
	if fm.Title != "Deploy a Demo" {
		t.Errorf("title = %q", fm.Title)
	}
	if fm.CustomEditURL != "https://github.com/llm-d/llm-d/edit/release-9.9/guides/demo/README.md" {
		t.Errorf("custom_edit_url = %q", fm.CustomEditURL)
	}
	g := fm.Guide
	if g.Dir != "guides/demo" || g.Source != "guides/demo/README.md" || g.Ref != "release-9.9" || g.Repo != "https://github.com/llm-d/llm-d" {
		t.Errorf("llmd_guide basics wrong: %+v", g)
	}
	if g.Defaults["accelerator"] != "gpu" || g.Defaults["engine"] != "vllm" {
		t.Errorf("defaults = %v", g.Defaults)
	}
	if g.Engines["sglang"] != "SGLang" {
		t.Errorf("engine_labels = %v", g.Engines)
	}
	// Support order preserved (gpu, amd, tpu/v7) and nested issue kept.
	accs := mappingValue(&g.Support, "accelerators")
	if accs == nil || len(accs.Content) != 6 || accs.Content[0].Value != "gpu" || accs.Content[4].Value != "tpu/v7" {
		t.Fatalf("support.accelerators order not preserved")
	}
	if !strings.Contains(parts[0], `"issue": "https://github.com/llm-d/llm-d/issues/1"`) {
		t.Error("unsupported issue link missing from support")
	}
	// Body is verbatim.
	readme, _ := os.ReadFile(filepath.Join(guidesFixture, "guides", "demo", "README.md"))
	if strings.TrimPrefix(parts[1], "\n") != string(readme) {
		t.Error("body is not verbatim README content")
	}

	// Child page -> .md with its own edit URL.
	child, err := os.ReadFile(filepath.Join(gdir, "benchmark-run1.md"))
	if err != nil {
		t.Fatalf("child page: %v", err)
	}
	if !strings.Contains(string(child), `custom_edit_url: "https://github.com/llm-d/llm-d/edit/release-9.9/guides/demo/bench/run1/README.md"`) {
		t.Errorf("child edit url missing:\n%s", child)
	}
	if strings.Contains(string(child), "llmd_guide") {
		t.Error("child page should not carry llmd_guide")
	}

	// Superseded stub removed.
	if fileExists(filepath.Join(docsDir, "well-lit-paths", "foundations", "demo.md")) {
		t.Error("old demo.md stub should be removed")
	}

	// Images copied under static, not docs; modelserver skipped.
	for _, rel := range []string{"bench/run1/latency.png", "bench/run1/chart.png"} {
		if !fileExists(filepath.Join(imgDir, "guides", "demo", filepath.FromSlash(rel))) {
			t.Errorf("image %s not copied", rel)
		}
	}
	if fileExists(filepath.Join(imgDir, "guides", "demo", "modelserver", "gpu", "skip.png")) {
		t.Error("modelserver images must be skipped")
	}
	_ = filepath.Walk(docsDir, func(p string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() && strings.HasSuffix(p, ".png") {
			t.Errorf("image written under docs/: %s", p)
		}
		return nil
	})
}

func TestSyncGuidesMenuAndMap(t *testing.T) {
	docsDir, _ := runGuidesFixture(t)

	var menu struct {
		Categories map[string]map[string]any `json:"categories"`
		Pages      map[string]map[string]any `json:"pages"`
	}
	b, err := os.ReadFile(filepath.Join(docsDir, "menu-config.json"))
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(b, &menu); err != nil {
		t.Fatal(err)
	}
	cat := menu.Categories["well-lit-paths/foundations/demo"]
	if cat["label"] != "Deploy a Demo" || cat["position"] != float64(1) || cat["collapsed"] != true {
		t.Errorf("guide category = %v", cat)
	}
	if _, ok := menu.Categories["well-lit-paths/foundations"]; !ok {
		t.Error("existing categories must be preserved")
	}
	if _, ok := menu.Pages["well-lit-paths/foundations/demo"]; ok {
		t.Error("superseded page entry should be removed")
	}
	p := menu.Pages["well-lit-paths/foundations/demo/benchmark-run1"]
	if p["label"] != "Benchmark: run1" || p["position"] != float64(1) {
		t.Errorf("child page entry = %v", p)
	}

	var sm SyncMap
	b, err = os.ReadFile(filepath.Join(docsDir, ".sync-map.json"))
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(b, &sm); err != nil {
		t.Fatal(err)
	}
	if sm.Ref != "release-9.9" || sm.Repo != "https://github.com/llm-d/llm-d" {
		t.Errorf("sync map ref/repo = %q %q", sm.Ref, sm.Repo)
	}
	want := map[string]string{
		"well-lit-paths/foundations/demo/index.mdx":         "guides/demo/README.md",
		"well-lit-paths/foundations/demo/benchmark-run1.md": "guides/demo/bench/run1/README.md",
	}
	for k, v := range want {
		if sm.Pages[k] != v {
			t.Errorf("pages[%s] = %q, want %q", k, sm.Pages[k], v)
		}
	}
	if g := sm.Guides["guides/demo"]; g.Docs != "well-lit-paths/foundations/demo" || g.Img != "/img/docs/guides/demo" {
		t.Errorf("guides entry = %+v", g)
	}
}

func TestSyncGuidesMissingManifest(t *testing.T) {
	n, err := syncGuides(guidesFixture, "docs/nope.yaml", t.TempDir(), t.TempDir(), "https://github.com/llm-d/llm-d", "main")
	if err != nil || n != 0 {
		t.Fatalf("missing manifest should be skipped, got n=%d err=%v", n, err)
	}
}

func TestGuidesManifestValidate(t *testing.T) {
	bad := []GuidesManifest{
		{Version: 2},
		{Version: 1, Sections: map[string]GuideSection{"a": {Target: "../x"}}},
		{Version: 1, Sections: map[string]GuideSection{"a": {Target: "x", Guides: []GuideEntry{{Dir: "docs/x", Slug: "x", Title: "X"}}}}},
		{Version: 1, Sections: map[string]GuideSection{"a": {Target: "x", Guides: []GuideEntry{{Dir: "guides/x", Slug: "a/b", Title: "X"}}}}},
		{Version: 1, Sections: map[string]GuideSection{"a": {Target: "x", Guides: []GuideEntry{{Dir: "guides/x", Slug: "x", Title: "X", Pages: []GuidePage{{From: "../y.md", To: "y", Title: "Y"}}}}}}},
	}
	for i, gm := range bad {
		if err := gm.validate(); err == nil {
			t.Errorf("case %d: expected validation error", i)
		}
	}
}

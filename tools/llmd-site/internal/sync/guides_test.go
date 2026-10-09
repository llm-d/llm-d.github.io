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
	if g.Defaults["accelerator"] != "gpu" || g.Defaults["engine"] != "vllm" || g.Defaults["provider"] != "base" {
		t.Errorf("defaults = %v", g.Defaults)
	}
	// Providers are normalized to {name, label[, engines]}; accelerators
	// without providers stay without them.
	var sup struct {
		Accelerators map[string]struct {
			Providers []struct {
				Name    string   `yaml:"name"`
				Label   string   `yaml:"label"`
				Engines []string `yaml:"engines"`
			} `yaml:"providers"`
		} `yaml:"accelerators"`
	}
	if err := g.Support.Decode(&sup); err != nil {
		t.Fatalf("decode support: %v", err)
	}
	gp := sup.Accelerators["gpu"].Providers
	if len(gp) != 3 ||
		gp[0].Name != "base" || gp[0].Label != "base" || gp[0].Engines != nil ||
		gp[1].Name != "gke/a4x" || gp[1].Label != "GKE A4X" ||
		gp[2].Name != "cks-mooncake" || gp[2].Label != "CKS + Mooncake" || len(gp[2].Engines) != 1 || gp[2].Engines[0] != "vllm" {
		t.Errorf("gpu providers not normalized: %+v", gp)
	}
	if p := sup.Accelerators["amd"].Providers; p != nil {
		t.Errorf("amd should have no providers, got %+v", p)
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

	// Child page -> always .mdx, with its own edit URL. Its upstream
	// frontmatter is merged: our title wins, other keys are kept, no
	// duplicates.
	if fileExists(filepath.Join(gdir, "benchmark-run1.md")) {
		t.Error("child page must be written as .mdx, not .md")
	}
	child, err := os.ReadFile(filepath.Join(gdir, "benchmark-run1.mdx"))
	if err != nil {
		t.Fatalf("child page: %v", err)
	}
	cs := string(child)
	if !strings.Contains(cs, `custom_edit_url: "https://github.com/llm-d/llm-d/edit/release-9.9/guides/demo/bench/run1/README.md"`) {
		t.Errorf("child edit url missing:\n%s", child)
	}
	if strings.Contains(cs, "llmd_guide") {
		t.Error("child page should not carry llmd_guide")
	}
	cparts := strings.SplitN(cs, "\n---\n", 2)
	if len(cparts) != 2 {
		t.Fatalf("child page frontmatter not closed:\n%s", cs)
	}
	var cfm yaml.Node
	if err := yaml.Unmarshal([]byte(strings.TrimPrefix(cparts[0], "---\n")), &cfm); err != nil {
		t.Fatalf("child frontmatter not valid YAML: %v\n%s", err, cparts[0])
	}
	keys := map[string]int{}
	m := cfm.Content[0]
	for i := 0; i+1 < len(m.Content); i += 2 {
		keys[m.Content[i].Value]++
	}
	for k, n := range keys {
		if n != 1 {
			t.Errorf("frontmatter key %q appears %d times", k, n)
		}
	}
	if v := mappingValue(m, "title"); v == nil || v.Value != "Benchmark: run1" {
		t.Errorf("manifest title must win over upstream title:\n%s", cparts[0])
	}
	if v := mappingValue(m, "description"); v == nil || v.Value != "Results of benchmark run 1" {
		t.Errorf("upstream description not kept:\n%s", cparts[0])
	}
	if v := mappingValue(m, "tags"); v == nil || len(v.Content) != 2 {
		t.Errorf("upstream tags not kept:\n%s", cparts[0])
	}
	if strings.Contains(cparts[1], "Upstream run title") || !strings.HasPrefix(cparts[1], "# Run 1\n") {
		t.Errorf("child body should be the README body after its frontmatter:\n%s", cparts[1])
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
		"well-lit-paths/foundations/demo/index.mdx":          "guides/demo/README.md",
		"well-lit-paths/foundations/demo/benchmark-run1.mdx": "guides/demo/bench/run1/README.md",
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
	sec := func(target string, g GuideEntry) GuidesManifest {
		return GuidesManifest{Version: 1, Sections: map[string]GuideSection{"a": {Target: target, Guides: []GuideEntry{g}}}}
	}
	ok := GuideEntry{Dir: "guides/x", Slug: "x", Title: "X", Pages: []GuidePage{{From: "b/README.md", To: "b", Title: "B"}}}
	good := sec("well-lit-paths/foundations", ok)
	if err := good.validate(); err != nil {
		t.Fatalf("valid manifest rejected: %v", err)
	}
	withSlug := func(s string) GuideEntry { g := ok; g.Slug = s; return g }
	withDir := func(d string) GuideEntry { g := ok; g.Dir = d; return g }
	withPage := func(from, to string) GuideEntry {
		g := ok
		g.Pages = []GuidePage{{From: from, To: to, Title: "B"}}
		return g
	}
	bad := map[string]GuidesManifest{
		"version":        {Version: 2},
		"target ..":      sec("../x", ok),
		"target .":       sec(".", ok),
		"target a/./b":   sec("a/./b", ok),
		"target a/..":    sec("a/..", ok),
		"target empty":   sec("", ok),
		"target abs":     sec("/x", ok),
		"dir not guides": sec("x", withDir("docs/x")),
		"dir guides/..":  sec("x", withDir("guides/..")),
		"dir guides/./x": sec("x", withDir("guides/./x")),
		"slug a/b":       sec("x", withSlug("a/b")),
		"slug ..":        sec("x", withSlug("..")),
		"slug .":         sec("x", withSlug(".")),
		"slug empty":     sec("x", withSlug("")),
		"slug backslash": sec("x", withSlug(`a\b`)),
		"from ..":        sec("x", withPage("../y.md", "y")),
		"to ..":          sec("x", withPage("y.md", "..")),
		"to .":           sec("x", withPage("y.md", ".")),
		"to a/b":         sec("x", withPage("y.md", "a/b")),
		"to index":       sec("x", withPage("y.md", "index")),
	}
	for name, gm := range bad {
		if err := gm.validate(); err == nil {
			t.Errorf("%s: expected validation error", name)
		}
	}
}

func TestMergeFrontMatter(t *testing.T) {
	ours := []fmField{{"title", `"Ours"`}, {"custom_edit_url", `"https://e"`}}
	cases := []struct {
		name, in, want string
	}{
		{"none", "# Hi\n", "---\ntitle: \"Ours\"\ncustom_edit_url: \"https://e\"\n---\n\n# Hi\n"},
		{"owned keys replaced", "---\ntitle: Theirs\ncustom_edit_url: x\n---\n# Hi\n",
			"---\ntitle: \"Ours\"\ncustom_edit_url: \"https://e\"\n---\n# Hi\n"},
		{"other keys kept", "---\ntitle: Theirs\nsidebar_class_name: foo\n---\n\n# Hi\n",
			"---\ntitle: \"Ours\"\ncustom_edit_url: \"https://e\"\nsidebar_class_name: foo\n---\n\n# Hi\n"},
		{"crlf", "---\r\ntitle: Theirs\r\nkeep: 1\r\n---\r\n# Hi\r\n",
			"---\ntitle: \"Ours\"\ncustom_edit_url: \"https://e\"\nkeep: 1\n---\n# Hi\r\n"},
		{"empty block", "---\n---\n# Hi\n", "---\ntitle: \"Ours\"\ncustom_edit_url: \"https://e\"\n---\n# Hi\n"},
		{"unclosed is body", "---\n# Hi\n", "---\ntitle: \"Ours\"\ncustom_edit_url: \"https://e\"\n---\n\n---\n# Hi\n"},
	}
	for _, c := range cases {
		got, err := mergeFrontMatter(ours, c.in)
		if err != nil {
			t.Errorf("%s: %v", c.name, err)
			continue
		}
		if got != c.want {
			t.Errorf("%s:\ngot  %q\nwant %q", c.name, got, c.want)
		}
	}
	if _, err := mergeFrontMatter(ours, "---\n- a\n- b\n---\n# Hi\n"); err == nil {
		t.Error("non-mapping frontmatter should be an error")
	}
}

func TestGuideMetaWithoutProvider(t *testing.T) {
	dir := t.TempDir()
	y := "env:\n  static:\n    ACCELERATOR_TYPE: {default: amd}\nsupport:\n  accelerators:\n    amd: {label: AMD, engines: {vllm: validated}}\n"
	if err := os.WriteFile(filepath.Join(dir, "guide.yaml"), []byte(y), 0o644); err != nil {
		t.Fatal(err)
	}
	gs := &guideSyncer{repoURL: "https://github.com/llm-d/llm-d", ref: "main"}
	meta, err := gs.guideMeta(GuideEntry{Dir: "guides/x"}, dir)
	if err != nil {
		t.Fatal(err)
	}
	var m struct {
		Defaults map[string]string `json:"defaults"`
	}
	if err := json.Unmarshal([]byte(meta), &m); err != nil {
		t.Fatalf("meta not JSON: %v\n%s", err, meta)
	}
	if _, ok := m.Defaults["provider"]; ok || m.Defaults["accelerator"] != "amd" || m.Defaults["engine"] != "vllm" {
		t.Errorf("defaults = %v", m.Defaults)
	}
	if strings.Contains(meta, "providers") {
		t.Errorf("unexpected providers in meta: %s", meta)
	}
}

func TestNormalizeProvidersErrors(t *testing.T) {
	for name, y := range map[string]string{
		"not a list":      "accelerators: {gpu: {providers: base}}",
		"missing name":    "accelerators: {gpu: {providers: [{label: X}]}}",
		"engines not seq": "accelerators: {gpu: {providers: [{name: a, engines: vllm}]}}",
		"nested list":     "accelerators: {gpu: {providers: [[a]]}}",
	} {
		var n yaml.Node
		if err := yaml.Unmarshal([]byte(y), &n); err != nil {
			t.Fatal(err)
		}
		if err := normalizeProviders(n.Content[0]); err == nil {
			t.Errorf("%s: expected error", name)
		}
	}
}

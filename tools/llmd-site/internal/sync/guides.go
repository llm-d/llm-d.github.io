package sync

// Guide publishing: render selected guides/<name>/README.md pages from the
// same llm-d checkout as docs/ onto the site.
//
// The upstream publish manifest (sources.llm-d.guides_manifest, e.g.
// docs/well-lit-paths/guides.yaml) lists, per site section, the guides to
// publish, their slug/title/position and optional child pages. For each guide:
//
//   - README.md -> docs/<target>/<slug>/index.mdx, verbatim except for the
//     frontmatter (title, custom_edit_url, llmd_guide metadata) merged into
//     any frontmatter the README already has;
//   - child pages -> docs/<target>/<slug>/<to>.mdx;
//   - images under the guide dir -> static/img/docs/guides/<slug>/<rel>
//     (never under docs/, which would create sidebar categories);
//   - sidebar metadata is merged into the synced docs/menu-config.json;
//   - docs/.sync-map.json maps every published page back to its repo path and
//     records the synced ref, for build-time link rewriting (preprocess.mjs).
//
// Pages are always .mdx so the preprocessor makes them MDX-safe and turns the
// GitHub-friendly markers (variant/tab groups, env block) into JSX.

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

// GuidesManifest is the upstream publish manifest.
type GuidesManifest struct {
	Version  int                     `yaml:"version"`
	Sections map[string]GuideSection `yaml:"sections"`
}

type GuideSection struct {
	Target string       `yaml:"target"`
	Guides []GuideEntry `yaml:"guides"`
}

type GuideEntry struct {
	Dir      string      `yaml:"dir"`
	Slug     string      `yaml:"slug"`
	Title    string      `yaml:"title"`
	Position int         `yaml:"position"`
	Pages    []GuidePage `yaml:"pages"`
}

type GuidePage struct {
	From  string `yaml:"from"`
	To    string `yaml:"to"`
	Title string `yaml:"title"`
}

// SyncMap is written to docs/.sync-map.json.
type SyncMap struct {
	Ref    string                  `json:"ref"`
	Repo   string                  `json:"repo"`
	Pages  map[string]string       `json:"pages"`
	Guides map[string]SyncMapGuide `json:"guides"`
}

type SyncMapGuide struct {
	Docs string `json:"docs"`
	Img  string `json:"img"`
}

const syncMapFile = ".sync-map.json"

// guideImageSkipDirs are guide subdirectories that hold deployment assets, not
// published page content.
var guideImageSkipDirs = map[string]bool{
	"modelserver": true, "router": true, "node_modules": true,
}

var guideImageExts = map[string]bool{
	".png": true, ".svg": true, ".jpg": true, ".jpeg": true, ".gif": true, ".webp": true,
}

// pageExt is the extension of every published guide page. Pages are always
// written as .mdx, never .md: preprocess.mjs makes mapped .mdx pages
// MDX-safe (HTML comments, void tags, autolinks, <placeholder> text, braces)
// and turns the guide markers into components. A .md page would skip that
// pass, yet Docusaurus still compiles it with the MDX toolchain.
const pageExt = ".mdx"

type guideSyncer struct {
	repoRoot  string // upstream checkout
	docsDir   string // site docs/
	imgDir    string // site static/img/docs
	repoURL   string // https://github.com/llm-d/llm-d
	ref       string
	syncMap   *SyncMap
	menuCats  map[string]any
	menuPages map[string]any
}

// syncGuides publishes guides listed in the manifest at manifestRel (repo
// relative). Returns the number of pages written. A missing manifest is not an
// error (older branches predate guide publishing).
func syncGuides(repoRoot, manifestRel, docsDir, imgDir, repoURL, ref string) (int, error) {
	if manifestRel == "" {
		return 0, nil
	}
	data, err := os.ReadFile(filepath.Join(repoRoot, filepath.FromSlash(manifestRel)))
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Printf("    - guides manifest %s not found upstream; skipping guide publishing\n", manifestRel)
			return 0, nil
		}
		return 0, err
	}
	var gm GuidesManifest
	if err := yaml.Unmarshal(data, &gm); err != nil {
		return 0, fmt.Errorf("parse %s: %w", manifestRel, err)
	}
	if err := gm.validate(); err != nil {
		return 0, fmt.Errorf("%s: %w", manifestRel, err)
	}

	gs := &guideSyncer{
		repoRoot: repoRoot,
		docsDir:  docsDir,
		imgDir:   imgDir,
		repoURL:  strings.TrimSuffix(strings.TrimSuffix(repoURL, "/"), ".git"),
		ref:      ref,
		syncMap: &SyncMap{
			Ref: ref, Repo: strings.TrimSuffix(strings.TrimSuffix(repoURL, "/"), ".git"),
			Pages: map[string]string{}, Guides: map[string]SyncMapGuide{},
		},
	}
	menuPath := filepath.Join(docsDir, "menu-config.json")
	menu, err := readMenuConfig(menuPath)
	if err != nil {
		return 0, err
	}
	gs.menuCats = asMap(menu, "categories")
	gs.menuPages = asMap(menu, "pages")

	// Deterministic order.
	names := make([]string, 0, len(gm.Sections))
	for n := range gm.Sections {
		names = append(names, n)
	}
	sort.Strings(names)

	count := 0
	for _, name := range names {
		sec := gm.Sections[name]
		for _, g := range sec.Guides {
			n, err := gs.syncGuide(sec.Target, g)
			if err != nil {
				return count, fmt.Errorf("guide %s: %w", g.Dir, err)
			}
			count += n
		}
	}

	if err := writeJSON(menuPath, menu); err != nil {
		return count, err
	}
	if err := writeJSON(filepath.Join(docsDir, syncMapFile), gs.syncMap); err != nil {
		return count, err
	}
	fmt.Printf("    ✓ published %d guide pages from %s\n", count, manifestRel)
	return count, nil
}

func (gm *GuidesManifest) validate() error {
	if gm.Version != 1 {
		return fmt.Errorf("unsupported guides manifest version %d", gm.Version)
	}
	seen := map[string]bool{}
	for name, s := range gm.Sections {
		if s.Target == "" || !cleanRel(s.Target) {
			return fmt.Errorf("sections.%s: target must be a clean docs-relative path", name)
		}
		for i, g := range s.Guides {
			if g.Dir == "" || !cleanRel(g.Dir) || !strings.HasPrefix(g.Dir, "guides/") {
				return fmt.Errorf("sections.%s.guides[%d]: dir must be under guides/", name, i)
			}
			if !validSegment(g.Slug) {
				return fmt.Errorf("sections.%s.guides[%d]: slug is required and must be a single path segment (no /, . or ..)", name, i)
			}
			if g.Title == "" {
				return fmt.Errorf("sections.%s.guides[%d]: title is required", name, i)
			}
			if seen[g.Slug] {
				return fmt.Errorf("duplicate guide slug %q", g.Slug)
			}
			seen[g.Slug] = true
			for j, p := range g.Pages {
				if p.From == "" || !cleanRel(p.From) || !validSegment(p.To) || p.To == "index" || p.Title == "" {
					return fmt.Errorf("sections.%s.guides[%d].pages[%d]: from/to/title required (to is a file stem other than index; no /, . or ..)", name, i, j)
				}
			}
		}
	}
	return nil
}

// cleanRel reports whether p is a clean, relative, slash-separated path with
// no empty, "." or ".." components.
func cleanRel(p string) bool {
	if p == "" || strings.HasPrefix(p, "/") || path.Clean(p) != p {
		return false
	}
	for _, seg := range strings.Split(p, "/") {
		if !validSegment(seg) {
			return false
		}
	}
	return true
}

// validSegment reports whether s is usable as a single path component.
func validSegment(s string) bool {
	return s != "" && s != "." && s != ".." && !strings.ContainsAny(s, `/\`)
}

func (gs *guideSyncer) syncGuide(target string, g GuideEntry) (int, error) {
	guideDir := filepath.Join(gs.repoRoot, filepath.FromSlash(g.Dir))
	readme := filepath.Join(guideDir, "README.md")
	raw, err := os.ReadFile(readme)
	if err != nil {
		return 0, err
	}
	docsRel := path.Join(target, g.Slug)
	imgURL := "/img/docs/guides/" + g.Slug

	// A guide supersedes a same-named mirrored doc (e.g. the old
	// <target>/<slug>.md stub); both would claim the same route.
	for _, ext := range []string{".md", ".mdx"} {
		old := filepath.Join(gs.docsDir, filepath.FromSlash(docsRel)+ext)
		if fileExists(old) {
			fmt.Printf("    ! removing %s (superseded by published guide %s)\n", docsRel+ext, g.Dir)
			if err := os.Remove(old); err != nil {
				return 0, err
			}
		}
	}
	delete(gs.menuPages, docsRel)

	meta, err := gs.guideMeta(g, guideDir)
	if err != nil {
		return 0, err
	}
	content := string(raw)
	fm := []fmField{
		{"title", jsonString(g.Title)},
		{"custom_edit_url", jsonString(gs.editURL(g.Dir, "README.md"))},
		{"llmd_guide", meta},
	}
	outRel := path.Join(docsRel, "index"+pageExt)
	if err := gs.writePage(outRel, fm, content); err != nil {
		return 0, fmt.Errorf("README.md: %w", err)
	}
	gs.syncMap.Pages[outRel] = path.Join(g.Dir, "README.md")
	count := 1

	for i, p := range g.Pages {
		src := filepath.Join(guideDir, filepath.FromSlash(p.From))
		b, err := os.ReadFile(src)
		if err != nil {
			return count, fmt.Errorf("page %s: %w", p.From, err)
		}
		prel := path.Join(docsRel, p.To+pageExt)
		pfm := []fmField{
			{"title", jsonString(p.Title)},
			{"custom_edit_url", jsonString(gs.editURL(g.Dir, p.From))},
		}
		if err := gs.writePage(prel, pfm, string(b)); err != nil {
			return count, fmt.Errorf("page %s: %w", p.From, err)
		}
		gs.syncMap.Pages[prel] = path.Join(g.Dir, p.From)
		gs.menuPages[path.Join(docsRel, p.To)] = map[string]any{"label": p.Title, "position": i + 1}
		count++
	}

	gs.menuCats[docsRel] = map[string]any{"label": g.Title, "position": g.Position, "collapsed": true}
	gs.syncMap.Guides[g.Dir] = SyncMapGuide{Docs: docsRel, Img: imgURL}

	if err := copyGuideImages(guideDir, filepath.Join(gs.imgDir, "guides", g.Slug)); err != nil {
		return count, err
	}
	return count, nil
}

func (gs *guideSyncer) editURL(dir, file string) string {
	return fmt.Sprintf("%s/edit/%s/%s", gs.repoURL, gs.ref, path.Join(dir, file))
}

// fmField is one frontmatter entry the sync owns; Value is already valid
// YAML (a JSON scalar or single-line JSON object).
type fmField struct {
	Key, Value string
}

func (gs *guideSyncer) writePage(docsRel string, fm []fmField, content string) error {
	dst := filepath.Join(gs.docsDir, filepath.FromSlash(docsRel))
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	out, err := mergeFrontMatter(fm, content)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, []byte(out), 0o644)
}

// mergeFrontMatter returns content with the sync-owned fields as its
// frontmatter. If content already starts with a frontmatter block, its other
// keys are kept (after ours) and any key we own (e.g. an upstream title:) is
// dropped, so the result never has duplicate keys. The body is verbatim.
func mergeFrontMatter(fm []fmField, content string) (string, error) {
	var b strings.Builder
	b.WriteString("---\n")
	for _, f := range fm {
		b.WriteString(f.Key + ": " + f.Value + "\n")
	}
	block, body, ok := splitFrontMatter(content)
	if !ok {
		b.WriteString("---\n\n")
		b.WriteString(content)
		return b.String(), nil
	}
	var doc yaml.Node
	if err := yaml.Unmarshal([]byte(block), &doc); err != nil {
		return "", fmt.Errorf("parse existing frontmatter: %w", err)
	}
	if len(doc.Content) > 0 {
		m := doc.Content[0]
		if m.Kind != yaml.MappingNode {
			return "", fmt.Errorf("existing frontmatter is not a mapping")
		}
		owned := map[string]bool{}
		for _, f := range fm {
			owned[f.Key] = true
		}
		kept := make([]*yaml.Node, 0, len(m.Content))
		for i := 0; i+1 < len(m.Content); i += 2 {
			if !owned[m.Content[i].Value] {
				kept = append(kept, m.Content[i], m.Content[i+1])
			}
		}
		if len(kept) > 0 {
			m.Content = kept
			var buf bytes.Buffer
			enc := yaml.NewEncoder(&buf)
			enc.SetIndent(2)
			if err := enc.Encode(m); err != nil {
				return "", err
			}
			if err := enc.Close(); err != nil {
				return "", err
			}
			b.Write(buf.Bytes())
		}
	}
	b.WriteString("---\n")
	b.WriteString(body)
	return b.String(), nil
}

// splitFrontMatter splits a leading "---" ... "---" block from content.
// block is the YAML between the fences; body is everything after the closing
// fence line.
func splitFrontMatter(content string) (block, body string, ok bool) {
	first, rest, found := strings.Cut(content, "\n")
	if !found || strings.TrimRight(first, "\r") != "---" {
		return "", content, false
	}
	off := 0
	for off <= len(rest) {
		line, _, more := strings.Cut(rest[off:], "\n")
		if strings.TrimRight(line, "\r \t") == "---" {
			end := off + len(line)
			if more {
				end++
			}
			return rest[:off], rest[end:], true
		}
		if !more {
			break
		}
		off += len(line) + 1
	}
	return "", content, false
}

// guideYAML is the subset of guides/<name>/guide.yaml the site needs.
type guideYAML struct {
	Env struct {
		Static map[string]yaml.Node `yaml:"static"`
	} `yaml:"env"`
	Support yaml.Node `yaml:"support"`
}

// guideMeta builds the llm_guide frontmatter value as a single-line JSON
// object (valid YAML flow syntax), preserving the key order of the support
// matrix so the site lists accelerators/engines in authoring order.
func (gs *guideSyncer) guideMeta(g GuideEntry, guideDir string) (string, error) {
	var gy guideYAML
	if b, err := os.ReadFile(filepath.Join(guideDir, "guide.yaml")); err == nil {
		if err := yaml.Unmarshal(b, &gy); err != nil {
			return "", fmt.Errorf("parse guide.yaml: %w", err)
		}
	} else if !os.IsNotExist(err) {
		return "", err
	}

	var buf bytes.Buffer
	buf.WriteString("{")
	writeKV := func(first bool, k, v string) {
		if !first {
			buf.WriteString(", ")
		}
		buf.WriteString(jsonString(k) + ": " + v)
	}
	writeKV(true, "dir", jsonString(g.Dir))
	writeKV(false, "source", jsonString(path.Join(g.Dir, "README.md")))
	writeKV(false, "ref", jsonString(gs.ref))
	writeKV(false, "repo", jsonString(gs.repoURL))
	defaults := fmt.Sprintf("{%q: %s, %q: %s",
		"accelerator", jsonString(staticDefault(gy.Env.Static, "ACCELERATOR_TYPE", "gpu")),
		"engine", jsonString(staticDefault(gy.Env.Static, "MODEL_SERVER", "vllm")))
	// INFRA_PROVIDER is optional; only guides that declare it get a default.
	if p := staticDefault(gy.Env.Static, "INFRA_PROVIDER", ""); p != "" {
		defaults += fmt.Sprintf(", %q: %s", "provider", jsonString(p))
	}
	writeKV(false, "defaults", defaults+"}")

	support := "null"
	engineLabels := "{}"
	if gy.Support.Kind != 0 {
		if err := normalizeProviders(&gy.Support); err != nil {
			return "", fmt.Errorf("guide.yaml support: %w", err)
		}
		s, err := nodeJSON(&gy.Support)
		if err != nil {
			return "", fmt.Errorf("guide.yaml support: %w", err)
		}
		support = s
		if eng := mappingValue(&gy.Support, "engines"); eng != nil {
			if s, err := nodeJSON(eng); err == nil {
				engineLabels = s
			}
		}
	}
	writeKV(false, "support", support)
	writeKV(false, "engine_labels", engineLabels)
	buf.WriteString("}")
	return buf.String(), nil
}

// normalizeProviders rewrites every support.accelerators.<acc>.providers
// entry into the canonical {name, label[, engines]} mapping the site expects:
// a bare string is the provider name (label defaults to the name), and a
// mapping without a label gets label = name. engines, when present, must be a
// list of engine keys (the subset of the accelerator's engines this provider
// supports).
func normalizeProviders(support *yaml.Node) error {
	accs := mappingValue(support, "accelerators")
	if accs == nil || accs.Kind != yaml.MappingNode {
		return nil
	}
	for i := 0; i+1 < len(accs.Content); i += 2 {
		accName := accs.Content[i].Value
		acc := resolveAlias(accs.Content[i+1])
		provs := mappingValue(acc, "providers")
		if provs == nil {
			continue
		}
		provs = resolveAlias(provs)
		if provs.Kind != yaml.SequenceNode {
			return fmt.Errorf("accelerators.%s.providers must be a list", accName)
		}
		out := make([]*yaml.Node, 0, len(provs.Content))
		for j, item := range provs.Content {
			item = resolveAlias(item)
			var name, label string
			var engines *yaml.Node
			switch item.Kind {
			case yaml.ScalarNode:
				name = item.Value
			case yaml.MappingNode:
				if n := mappingValue(item, "name"); n != nil {
					name = n.Value
				}
				if l := mappingValue(item, "label"); l != nil {
					label = l.Value
				}
				if e := mappingValue(item, "engines"); e != nil {
					engines = resolveAlias(e)
					if engines.Kind != yaml.SequenceNode {
						return fmt.Errorf("accelerators.%s.providers[%d].engines must be a list", accName, j)
					}
				}
			default:
				return fmt.Errorf("accelerators.%s.providers[%d]: expected a name or {name, label, engines}", accName, j)
			}
			if name == "" {
				return fmt.Errorf("accelerators.%s.providers[%d]: name is required", accName, j)
			}
			if label == "" {
				label = name
			}
			m := &yaml.Node{Kind: yaml.MappingNode, Tag: "!!map", Content: []*yaml.Node{
				strNode("name"), strNode(name), strNode("label"), strNode(label),
			}}
			if engines != nil {
				m.Content = append(m.Content, strNode("engines"), engines)
			}
			out = append(out, m)
		}
		// Replace the providers value inside the accelerator mapping.
		for k := 0; k+1 < len(acc.Content); k += 2 {
			if acc.Content[k].Value == "providers" {
				acc.Content[k+1] = &yaml.Node{Kind: yaml.SequenceNode, Tag: "!!seq", Content: out}
			}
		}
	}
	return nil
}

func resolveAlias(n *yaml.Node) *yaml.Node {
	for n != nil && n.Kind == yaml.AliasNode {
		n = n.Alias
	}
	return n
}

func strNode(v string) *yaml.Node {
	return &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: v}
}

func staticDefault(static map[string]yaml.Node, key, fallback string) string {
	n, ok := static[key]
	if !ok {
		return fallback
	}
	switch n.Kind {
	case yaml.ScalarNode:
		if n.Value != "" {
			return n.Value
		}
	case yaml.MappingNode:
		if d := mappingValue(&n, "default"); d != nil && d.Kind == yaml.ScalarNode && d.Value != "" {
			return d.Value
		}
	}
	return fallback
}

func mappingValue(n *yaml.Node, key string) *yaml.Node {
	if n.Kind == yaml.DocumentNode && len(n.Content) > 0 {
		n = n.Content[0]
	}
	if n.Kind != yaml.MappingNode {
		return nil
	}
	for i := 0; i+1 < len(n.Content); i += 2 {
		if n.Content[i].Value == key {
			return n.Content[i+1]
		}
	}
	return nil
}

// nodeJSON encodes a YAML node as compact JSON, preserving mapping key order
// and resolving aliases.
func nodeJSON(n *yaml.Node) (string, error) {
	var buf bytes.Buffer
	if err := writeNodeJSON(&buf, n, 0); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func writeNodeJSON(buf *bytes.Buffer, n *yaml.Node, depth int) error {
	if depth > 32 {
		return fmt.Errorf("yaml nesting too deep")
	}
	switch n.Kind {
	case yaml.DocumentNode:
		if len(n.Content) == 0 {
			buf.WriteString("null")
			return nil
		}
		return writeNodeJSON(buf, n.Content[0], depth+1)
	case yaml.AliasNode:
		return writeNodeJSON(buf, n.Alias, depth+1)
	case yaml.MappingNode:
		buf.WriteString("{")
		for i := 0; i+1 < len(n.Content); i += 2 {
			if i > 0 {
				buf.WriteString(", ")
			}
			buf.WriteString(jsonString(n.Content[i].Value) + ": ")
			if err := writeNodeJSON(buf, n.Content[i+1], depth+1); err != nil {
				return err
			}
		}
		buf.WriteString("}")
	case yaml.SequenceNode:
		buf.WriteString("[")
		for i, c := range n.Content {
			if i > 0 {
				buf.WriteString(", ")
			}
			if err := writeNodeJSON(buf, c, depth+1); err != nil {
				return err
			}
		}
		buf.WriteString("]")
	case yaml.ScalarNode:
		switch n.Tag {
		case "!!null":
			buf.WriteString("null")
		case "!!bool":
			b, err := strconv.ParseBool(strings.ToLower(n.Value))
			if err != nil {
				buf.WriteString(jsonString(n.Value))
			} else {
				buf.WriteString(strconv.FormatBool(b))
			}
		case "!!int", "!!float":
			var v any
			if err := json.Unmarshal([]byte(n.Value), &v); err == nil {
				buf.WriteString(n.Value)
			} else {
				buf.WriteString(jsonString(n.Value))
			}
		default:
			buf.WriteString(jsonString(n.Value))
		}
	default:
		buf.WriteString("null")
	}
	return nil
}

// copyGuideImages mirrors images under guideDir (skipping deployment asset
// dirs and hidden dirs) into dst, preserving the guide-relative layout.
func copyGuideImages(guideDir, dst string) error {
	return filepath.Walk(guideDir, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if p != guideDir && (guideImageSkipDirs[info.Name()] || strings.HasPrefix(info.Name(), ".")) {
				return filepath.SkipDir
			}
			return nil
		}
		if !guideImageExts[strings.ToLower(filepath.Ext(p))] {
			return nil
		}
		rel, err := filepath.Rel(guideDir, p)
		if err != nil {
			return err
		}
		return copyFileVerbatim(p, filepath.Join(dst, rel))
	})
}

func readMenuConfig(p string) (map[string]any, error) {
	menu := map[string]any{}
	b, err := os.ReadFile(p)
	if err != nil {
		if os.IsNotExist(err) {
			return menu, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(b, &menu); err != nil {
		return nil, fmt.Errorf("parse %s: %w", p, err)
	}
	return menu, nil
}

func asMap(m map[string]any, key string) map[string]any {
	if v, ok := m[key].(map[string]any); ok {
		return v
	}
	v := map[string]any{}
	m[key] = v
	return v
}

func writeJSON(p string, v any) error {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	return os.WriteFile(p, buf.Bytes(), 0o644)
}

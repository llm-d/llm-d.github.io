package version

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"gopkg.in/yaml.v3"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/build"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/srcrefs"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/sync"
)

// CutOptions configures a docs version cut.
type CutOptions struct {
	Root         string
	Version      string
	SkipBake     bool
	SkipImages   bool
	NoResync     bool
	ResyncBranch string
	SyncOpts     sync.Options
}

// NormalizeLabel returns the Docusaurus version label (major.minor).
func NormalizeLabel(version string) (string, error) {
	return srcrefs.NormalizeLabel(version)
}

// Cut freezes the current dev docs/ as a released Docusaurus version.
func Cut(opts CutOptions) error {
	label, err := NormalizeLabel(opts.Version)
	if err != nil {
		return err
	}

	docsDir := filepath.Join(opts.Root, "docs")
	if st, err := os.Stat(docsDir); err != nil || !st.IsDir() {
		return fmt.Errorf("docs/ not found — run llmd-site sync first")
	}

	imgBase := fmt.Sprintf("/img/versioned/%s/", label)
	versionedImgDir := filepath.Join(opts.Root, "static", "img", "versioned", label)
	docImgDir := filepath.Join(opts.Root, "static", "img", "docs")

	fmt.Printf("==> Cutting docs version %s\n", label)
	zhHansTranslations, err := freshCurrentZhHansTranslations(opts.Root)
	if err != nil {
		return fmt.Errorf("validate current zh-Hans translations: %w", err)
	}

	if !opts.SkipImages {
		fmt.Printf("    Copying doc images -> static/img/versioned/%s/\n", label)
		if err := os.RemoveAll(versionedImgDir); err != nil {
			return err
		}
		if _, err := os.Stat(docImgDir); err == nil {
			if err := copyTree(docImgDir, versionedImgDir); err != nil {
				return fmt.Errorf("copy versioned images: %w", err)
			}
		} else if !os.IsNotExist(err) {
			return err
		}
	}

	bakeScript := filepath.Join(opts.Root, "scripts", "bake-docs.mjs")
	if !opts.SkipBake {
		// Pin llm-d GitHub links to immutable refs so the frozen version keeps
		// pointing at the sources it documents, not at whatever main becomes.
		refs, err := resolveRefs(opts.Root, label, docsDir)
		if err != nil {
			return err
		}
		refJSON, err := json.Marshal(refs)
		if err != nil {
			return err
		}
		fmt.Printf("    Baking preprocess fixups into docs/ (img-base %s)\n", imgBase)
		fmt.Printf("    Pinning source links for %s:\n", label)
		for _, repo := range sortedKeys(refs) {
			fmt.Printf("      %-34s %s\n", repo, refs[repo])
		}
		if _, err := os.Stat(bakeScript); err != nil {
			return fmt.Errorf("bake script not found at %s", bakeScript)
		}
		if err := build.RunNode(opts.Root, bakeScript, "--img-base", imgBase, "--ref-map", string(refJSON)); err != nil {
			return err
		}
	}

	fmt.Printf("    Running docusaurus docs:version %s\n", label)
	if err := build.RunNPX(opts.Root, "docusaurus", "docs:version", label); err != nil {
		return err
	}
	zhHansDocs, err := freezeCurrentZhHansDocs(opts.Root, label, zhHansTranslations)
	if err != nil {
		return fmt.Errorf("freeze current zh-Hans docs translations: %w", err)
	}
	if zhHansDocs > 0 {
		fmt.Printf("    Frozen %d zh-Hans translated docs -> i18n/zh-Hans/docusaurus-plugin-content-docs/version-%s/\n", zhHansDocs, label)
	}

	if !opts.NoResync {
		branch := opts.ResyncBranch
		if branch == "" {
			branch = "main"
		}
		fmt.Printf("    Restoring pristine docs/ from llm-d/llm-d @ %s\n", branch)
		m, err := manifest.Load(repo.ManifestPath(opts.Root))
		if err != nil {
			return err
		}
		if err := m.Validate(); err != nil {
			return err
		}
		syncOpts := opts.SyncOpts
		syncOpts.RepoRoot = opts.Root
		syncOpts.Branch = branch
		if _, err := sync.Run(m, syncOpts); err != nil {
			return err
		}
	}

	fmt.Printf("\n✓ cut docs version %s\n", label)
	fmt.Printf("  Review and commit versioned_docs/version-%s/, versioned_sidebars/, versions.json", label)
	if zhHansDocs > 0 {
		fmt.Printf(", i18n/zh-Hans/docusaurus-plugin-content-docs/version-%s/", label)
	}
	if !opts.SkipImages {
		fmt.Printf(", static/img/versioned/%s/", label)
	}
	fmt.Println()
	return nil
}

// freshCurrentZhHansTranslations returns only current translations whose
// source blob still matches the corresponding docs/ page. It runs before docs
// are baked for versioning, since those build-time edits must not make an
// otherwise-current translation appear stale.
func freshCurrentZhHansTranslations(root string) (map[string][]byte, error) {
	pluginDir := filepath.Join(root, "i18n", "zh-Hans", "docusaurus-plugin-content-docs")
	currentDir := filepath.Join(pluginDir, "current")
	if st, err := os.Stat(currentDir); err != nil {
		if os.IsNotExist(err) {
			return map[string][]byte{}, nil
		}
		return nil, err
	} else if !st.IsDir() {
		return nil, fmt.Errorf("current translation path %s is not a directory", currentDir)
	}

	translations := make(map[string][]byte)
	err := filepath.WalkDir(currentDir, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if ext != ".md" && ext != ".mdx" {
			return nil
		}
		relPath, err := filepath.Rel(currentDir, path)
		if err != nil {
			return err
		}
		relPath = filepath.ToSlash(relPath)
		currentSourcePath := filepath.ToSlash(filepath.Join("docs", relPath))
		currentSourceFile := filepath.Join(root, filepath.FromSlash(currentSourcePath))
		if _, err := os.Stat(currentSourceFile); err != nil {
			if os.IsNotExist(err) {
				fmt.Printf("    Skipping zh-Hans translation without current English source: %s\n", relPath)
				return nil
			}
			return err
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		metadata, hasFrontmatter, err := readTranslationMetadata(content)
		if err != nil {
			return fmt.Errorf("read translation metadata in %s: %w", path, err)
		}
		if !hasFrontmatter || metadata.Source != currentSourcePath || len(metadata.Blob) != 40 {
			fmt.Printf("    Skipping stale zh-Hans translation: %s\n", relPath)
			return nil
		}
		if _, err := hex.DecodeString(metadata.Blob); err != nil {
			fmt.Printf("    Skipping stale zh-Hans translation: %s\n", relPath)
			return nil
		}
		if metadata.Status != "" && metadata.Status != "stale" {
			return fmt.Errorf("%s: invalid translation_status %q", path, metadata.Status)
		}
		if metadata.Status == "stale" {
			fmt.Printf("    Skipping stale zh-Hans translation: %s\n", relPath)
			return nil
		}
		currentBlob, err := gitBlobSHA(root, currentSourcePath)
		if err != nil {
			return fmt.Errorf("hash current English source %s: %w", currentSourcePath, err)
		}
		if !strings.EqualFold(metadata.Blob, currentBlob) {
			fmt.Printf("    Skipping stale zh-Hans translation: %s\n", relPath)
			return nil
		}
		translations[relPath] = content
		return nil
	})
	if err != nil {
		return nil, err
	}
	return translations, nil
}

type translationMetadata struct {
	Source string `yaml:"translation_source"`
	Blob   string `yaml:"translation_source_blob"`
	Status string `yaml:"translation_status"`
}

func readTranslationMetadata(content []byte) (translationMetadata, bool, error) {
	lines := strings.SplitAfter(string(content), "\n")
	if len(lines) == 0 || trimLineEnding(lines[0]) != "---" {
		return translationMetadata{}, false, nil
	}
	closing := -1
	for i := 1; i < len(lines); i++ {
		if trimLineEnding(lines[i]) == "---" {
			closing = i
			break
		}
	}
	if closing < 0 {
		return translationMetadata{}, true, fmt.Errorf("frontmatter starts with --- but has no closing ---")
	}
	var metadata translationMetadata
	if err := yaml.Unmarshal([]byte(strings.Join(lines[1:closing], "")), &metadata); err != nil {
		return translationMetadata{}, true, err
	}
	return metadata, true, nil
}

// freezeCurrentZhHansDocs freezes only translations validated against docs/
// before docs:version runs. Untranslated or stale pages are omitted so the
// locale falls back to the matching frozen English source.
func freezeCurrentZhHansDocs(root, label string, translations map[string][]byte) (int, error) {
	pluginDir := filepath.Join(root, "i18n", "zh-Hans", "docusaurus-plugin-content-docs")
	currentDir := filepath.Join(pluginDir, "current")
	if st, err := os.Stat(currentDir); err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	} else if !st.IsDir() {
		return 0, fmt.Errorf("current translation path %s is not a directory", currentDir)
	}

	relPaths := make([]string, 0, len(translations))
	for relPath := range translations {
		relPaths = append(relPaths, relPath)
	}
	sort.Strings(relPaths)
	frozenTranslations := make(map[string][]byte, len(translations))
	for _, relPath := range relPaths {
		englishRepoPath := filepath.ToSlash(filepath.Join("versioned_docs", "version-"+label, relPath))
		englishPath := filepath.Join(root, filepath.FromSlash(englishRepoPath))
		if _, err := os.Stat(englishPath); err != nil {
			return 0, fmt.Errorf("translated doc %s has no frozen English source %s: %w", relPath, englishRepoPath, err)
		}
		blob, err := gitBlobSHA(root, englishRepoPath)
		if err != nil {
			return 0, fmt.Errorf("hash frozen English source %s: %w", englishRepoPath, err)
		}
		content, err := updateTranslationSource(translations[relPath], englishRepoPath, blob)
		if err != nil {
			return 0, fmt.Errorf("update translation metadata in %s: %w", relPath, err)
		}
		frozenTranslations[relPath] = content
	}

	versionDir := filepath.Join(pluginDir, "version-"+label)
	if _, err := os.Stat(versionDir); err == nil {
		if err := removeMarkdownFiles(versionDir); err != nil {
			return 0, err
		}
	} else if !os.IsNotExist(err) {
		return 0, err
	}
	if len(translations) == 0 {
		return 0, nil
	}
	if err := copyTreeExceptMarkdown(currentDir, versionDir); err != nil {
		return 0, err
	}
	for _, relPath := range relPaths {
		dest := filepath.Join(versionDir, filepath.FromSlash(relPath))
		if err := os.WriteFile(dest, frozenTranslations[relPath], 0o644); err != nil {
			return 0, err
		}
	}

	// Docusaurus uses this catalog for version/sidebar labels and its native
	// docs:version command copies it alongside the localized docs when zh-Hans
	// is enabled in the site config. Preserve that behavior for this release.
	currentCatalog := filepath.Join(pluginDir, "current.json")
	if _, err := os.Stat(currentCatalog); err == nil {
		if err := copyFile(currentCatalog, filepath.Join(pluginDir, "version-"+label+".json")); err != nil {
			return 0, err
		}
	} else if !os.IsNotExist(err) {
		return 0, err
	}

	return len(translations), nil
}

// gitBlobSHA returns the Git blob ID for a repository-relative path, applying
// the repository's clean filter for that path just as `git add` would.
func gitBlobSHA(root, repoPath string) (string, error) {
	repoPath = filepath.ToSlash(repoPath)
	cmd := exec.Command("git", "-C", root, "hash-object", "--path="+repoPath, "--", filepath.FromSlash(repoPath))
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("git hash-object failed: %w: %s", err, strings.TrimSpace(string(output)))
	}
	blob := strings.TrimSpace(string(output))
	if decoded, err := hex.DecodeString(blob); err != nil || len(decoded) == 0 {
		return "", fmt.Errorf("git hash-object returned invalid blob ID %q", blob)
	}
	return blob, nil
}

// updateTranslationSource points the frozen translation at its versioned
// English source and removes translation_source_commit, which only described
// the live source revision and cannot identify this newly cut version.
func updateTranslationSource(content []byte, sourcePath, sourceBlob string) ([]byte, error) {
	text := string(content)
	newline := "\n"
	if strings.Contains(text, "\r\n") {
		newline = "\r\n"
	}
	fields := []struct {
		key   string
		value string
	}{
		{key: "translation_source", value: sourcePath},
		{key: "translation_source_blob", value: sourceBlob},
	}
	lines := strings.SplitAfter(text, "\n")
	if len(lines) == 0 || trimLineEnding(lines[0]) != "---" {
		header := "---" + newline
		for _, field := range fields {
			header += field.key + ": " + field.value + newline
		}
		header += "---" + newline
		return []byte(header + text), nil
	}

	closing := -1
	for i := 1; i < len(lines); i++ {
		if trimLineEnding(lines[i]) == "---" {
			closing = i
			break
		}
	}
	if closing < 0 {
		return nil, fmt.Errorf("frontmatter starts with --- but has no closing ---")
	}

	seen := make(map[string]bool, len(fields))
	for i := 1; i < closing; i++ {
		line := trimLineEnding(lines[i])
		trimmed := strings.TrimLeft(line, " \t")
		if len(trimmed) != len(line) {
			continue
		}
		for _, field := range fields {
			if !strings.HasPrefix(trimmed, field.key+":") {
				continue
			}
			if seen[field.key] {
				return nil, fmt.Errorf("frontmatter contains duplicate %s fields", field.key)
			}
			seen[field.key] = true
			indent := line[:len(line)-len(trimmed)]
			ending := lineEnding(lines[i])
			lines[i] = indent + field.key + ": " + field.value + ending
		}
	}

	var additions []string
	for _, field := range fields {
		if !seen[field.key] {
			additions = append(additions, field.key+": "+field.value+newline)
		}
	}
	updated := make([]string, 0, len(lines)+len(additions))
	updated = append(updated, lines[:1]...)
	for i := 1; i < closing; i++ {
		line := strings.TrimLeft(trimLineEnding(lines[i]), " \t")
		if strings.HasPrefix(line, "translation_source_commit:") {
			continue
		}
		updated = append(updated, lines[i])
	}
	updated = append(updated, additions...)
	updated = append(updated, lines[closing:]...)
	return []byte(strings.Join(updated, "")), nil
}

func trimLineEnding(line string) string {
	return strings.TrimSuffix(strings.TrimSuffix(line, "\n"), "\r")
}

func lineEnding(line string) string {
	if strings.HasSuffix(line, "\r\n") {
		return "\r\n"
	}
	if strings.HasSuffix(line, "\n") {
		return "\n"
	}
	return ""
}

// resolveRefs returns the immutable source refs for a release and fails if the
// docs link to an llm-d repo the release does not list. A forgotten repo is the
// way a frozen version silently keeps a link on main, so this stops the cut
// rather than warning.
func resolveRefs(root, label, docsDir string) (map[string]string, error) {
	path := srcrefs.Path(root)
	f, err := srcrefs.Load(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("%s not found — it records the refs each released docs version pins its source links to", path)
		}
		return nil, err
	}
	refs, ok := f.For(label)
	if !ok {
		return nil, fmt.Errorf("%s has no entry for release %q (has: %s)\n"+
			"  add one before cutting, with the refs from that release's component table",
			srcrefs.FileName, label, strings.Join(f.Labels(), ", "))
	}
	links, err := srcrefs.Scan(docsDir)
	if err != nil {
		return nil, err
	}
	if unmapped := srcrefs.UnmappedRepos(links, refs); len(unmapped) > 0 {
		return nil, fmt.Errorf("docs/ links to llm-d repos on a moving ref that release %q does not list in %s:%s\n  add a ref for each, then re-run",
			label, srcrefs.FileName, srcrefs.DescribeUnmapped(unmapped))
	}
	return refs, nil
}

func sortedKeys(m map[string]string) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func copyTree(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		return copyFile(path, target)
	})
}

func copyTreeExceptMarkdown(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		ext := strings.ToLower(filepath.Ext(d.Name()))
		if ext == ".md" || ext == ".mdx" {
			return nil
		}
		return copyFile(path, target)
	})
}

func removeMarkdownFiles(root string) error {
	return filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(d.Name()))
		if ext != ".md" && ext != ".mdx" {
			return nil
		}
		return os.Remove(path)
	})
}

func copyFile(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

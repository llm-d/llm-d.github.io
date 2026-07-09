package sync

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/upstream"
)

type existenceCache struct {
	files map[string]bool
	dirs  map[string]bool
}

type engine struct {
	m           *manifest.Manifest
	opts        Options
	src         *upstream.Source
	wip         string
	docsDir     string
	staticDir   string
	guidesDir   string
	upstreamRef string
	flags       layoutFlags
	existence   *existenceCache
}

type layoutFlags struct {
	FoundationsLayout bool
}

func runNative(m *manifest.Manifest, opts Options, src *upstream.Source) error {
	previewDir := filepath.Join(opts.RepoRoot, "preview")
	e := &engine{
		m:           m,
		opts:        opts,
		src:         src,
		wip:         src.DocsDir(m),
		docsDir:     filepath.Join(previewDir, "docs"),
		staticDir:   filepath.Join(previewDir, "static", "img", "docs"),
		guidesDir:   filepath.Join(src.Root, "guides"),
		upstreamRef: src.Branch,
		existence: &existenceCache{
			files: make(map[string]bool),
			dirs:  make(map[string]bool),
		},
	}
	e.flags.FoundationsLayout = e.dirExists(filepath.Join(e.wip, "well-lit-paths", "foundations"))

	fmt.Println("    Cleaning docs/ directory...")
	if err := cleanDir(e.docsDir); err != nil {
		return err
	}
	if err := e.createDirectories(); err != nil {
		return err
	}

	fmt.Println("    Copying content...")
	if err := e.runCopies(); err != nil {
		return err
	}
	if err := e.validateCopyCount(); err != nil {
		return err
	}

	fmt.Println("    Copying image assets...")
	if err := e.copyAssets(); err != nil {
		return err
	}

	fmt.Println("    Fixing links and applying transforms...")
	if err := e.postprocess(); err != nil {
		return err
	}

	fmt.Println("    Generating stubs for missing pages...")
	if err := e.generateStubs(); err != nil {
		return err
	}

	if err := e.applySlugs(); err != nil {
		return err
	}

	return nil
}

const minCopiedDocs = 20

func (e *engine) validateCopyCount() error {
	if e.opts.AllowMissing {
		return nil
	}
	n, err := countMarkdown(e.docsDir)
	if err != nil {
		return err
	}
	if n >= minCopiedDocs {
		return nil
	}
	return fmt.Errorf(
		"upstream sync copied only %d documents (expected at least %d). "+
			"Check that LLMD_REPO or llmd-site.local.yaml points to a complete llm-d/llm-d clone (currently %s @ %s). "+
			"Try: llmd-site sync --fetch or sync without --local to clone from GitHub",
		n, minCopiedDocs, e.src.Root, e.upstreamRef,
	)
}

func (e *engine) createDirectories() error {
	fmt.Println("    Creating directory structure from outline...")
	for _, d := range e.m.Directories {
		if err := os.MkdirAll(filepath.Join(e.docsDir, d), 0o755); err != nil {
			return err
		}
	}
	return nil
}

func cleanDir(dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return os.MkdirAll(dir, 0o755)
		}
		return err
	}
	for _, ent := range entries {
		if err := os.RemoveAll(filepath.Join(dir, ent.Name())); err != nil {
			return err
		}
	}
	return nil
}

func upstreamRel(from string) string {
	from = filepath.ToSlash(from)
	if after, ok := stringsCutPrefix(from, "docs/"); ok {
		return after
	}
	return from
}

func stringsCutPrefix(s, prefix string) (string, bool) {
	if len(s) >= len(prefix) && s[:len(prefix)] == prefix {
		return s[len(prefix):], true
	}
	return s, false
}

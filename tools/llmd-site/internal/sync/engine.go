package sync

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/upstream"
)

type engine struct {
	m           *manifest.Manifest
	opts        Options
	src         *upstream.Source
	wip         string // upstream docs/ directory
	docsDir     string // <repo>/docs
	staticDir   string // <repo>/static/img/docs
	upstreamRef string
}

func runNative(m *manifest.Manifest, opts Options, src *upstream.Source) error {
	e := &engine{
		m:           m,
		opts:        opts,
		src:         src,
		wip:         src.DocsDir(m),
		docsDir:     filepath.Join(opts.RepoRoot, "docs"),
		staticDir:   filepath.Join(opts.RepoRoot, "static", "img", "docs"),
		upstreamRef: src.Branch,
	}

	// Partial clones (--filter=blob:none) may not have blobs until checkout.
	_ = src.Materialize("docs")

	fmt.Println("    Cleaning docs/ and static/img/docs/ ...")
	if err := cleanDir(e.docsDir); err != nil {
		return err
	}
	if err := cleanDir(e.staticDir); err != nil {
		return err
	}

	fmt.Println("    Mirroring upstream docs/ verbatim...")
	if err := mirrorTree(e.wip, e.docsDir); err != nil {
		return err
	}
	if err := e.validateDocCount(); err != nil {
		return err
	}

	fmt.Println("    Copying doc images into static/img/docs/ ...")
	if err := copyDocImages(e.docsDir, e.staticDir); err != nil {
		return err
	}

	fmt.Println("    Generating community mirror pages...")
	if err := e.syncCommunity(); err != nil {
		return err
	}

	return nil
}

const minCopiedDocs = 20

func (e *engine) validateDocCount() error {
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

// imageExts are the extensions the Docusaurus preprocessor serves from
// /img/docs/ (must match scripts/lib/preprocess.mjs IMAGE_EXT).
var imageExts = map[string]bool{
	".png": true, ".svg": true, ".jpg": true, ".jpeg": true,
	".gif": true, ".webp": true, ".ico": true, ".avif": true,
}

// mirrorTree copies every file under src into dst, preserving the relative
// layout. The copy is verbatim: no content rewriting (README.md is kept as-is,
// menu-config.json and images come along with the .md/.mdx docs).
func mirrorTree(src, dst string) error {
	if _, err := os.Stat(src); err != nil {
		return fmt.Errorf("upstream docs dir %s: %w", src, err)
	}
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		return copyFileVerbatim(path, filepath.Join(dst, rel))
	})
}

// copyDocImages mirrors every image under docsDir into staticDir, preserving
// the path relative to docs/. The preprocessor rewrites in-doc <img src> under
// docs/<rel> to /img/docs/<rel>, so the static copy must keep the same layout.
func copyDocImages(docsDir, staticDir string) error {
	return filepath.Walk(docsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if !imageExts[strings.ToLower(filepath.Ext(path))] {
			return nil
		}
		rel, err := filepath.Rel(docsDir, path)
		if err != nil {
			return err
		}
		return copyFileVerbatim(path, filepath.Join(staticDir, rel))
	})
}

func copyFileVerbatim(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

// cleanDir empties dir (creating it if absent). Only the generated docs/ and
// static/img/docs/ targets are ever passed here — never the repo root or a
// committed directory.
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

package sync

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/report"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/upstream"
)

// Options configures a sync run.
type Options struct {
	RepoRoot     string
	Branch       string
	Local        bool
	Fetch        bool
	LocalConfig  string
	AllowMissing    bool
	RefreshUpstream bool
}

// Result describes sync output.
type Result struct {
	DocCount int
	Report   *report.SyncReport
}

// Run pulls documentation from llm-d/llm-d into the single-site docs/ tree.
//
// docs/** is copied verbatim (no link/image rewriting — that happens at
// Docusaurus build time via scripts/lib/preprocess.mjs). Doc images are also
// mirrored into static/img/docs/ so the build-time <img src> rewrites resolve,
// and the community mirror pages are regenerated from the upstream repo root.
func Run(m *manifest.Manifest, opts Options) (*Result, error) {
	src, err := upstream.Resolve(m, upstream.Options{
		Branch:        opts.Branch,
		Local:         opts.Local,
		Fetch:         opts.Fetch,
		LocalConfig:   opts.LocalConfig,
		AllowMissing:  opts.AllowMissing,
		RefreshRemote: opts.RefreshUpstream,
	})
	if err != nil {
		return nil, err
	}
	defer src.Cleanup()

	fmt.Printf("==> Syncing docs from llm-d/llm-d @ %s\n", src.Branch)
	if opts.Local || os.Getenv("LLMD_REPO") != "" {
		fmt.Printf("    Using local repo: %s\n", src.Root)
	} else {
		fmt.Printf("    Cloned to: %s\n", src.Root)
	}

	if err := runNative(m, opts, src); err != nil {
		return nil, fmt.Errorf("sync failed: %w", err)
	}

	docsDir := filepath.Join(opts.RepoRoot, "docs")
	docCount, err := countMarkdown(docsDir)
	if err != nil {
		return nil, err
	}

	rep := &report.SyncReport{
		Branch:   src.Branch,
		DocCount: docCount,
		Source:   src.Root,
	}
	if err := rep.Write(opts.RepoRoot); err != nil {
		return nil, err
	}

	fmt.Printf("==> Done. %d docs synced from llm-d/llm-d @ %s\n", docCount, src.Branch)
	return &Result{DocCount: docCount, Report: rep}, nil
}

func countMarkdown(dir string) (int, error) {
	n := 0
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && (filepath.Ext(path) == ".md" || filepath.Ext(path) == ".mdx") {
			n++
		}
		return nil
	})
	return n, err
}

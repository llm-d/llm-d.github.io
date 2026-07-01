package build

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/search"
	syncpkg "github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/sync"
)

// Options configures a full site build.
type Options struct {
	RepoRoot     string
	DevBranch    string
	Local        bool
	Fetch        bool
	LocalConfig  string
	AllowMissing bool
	Parallel     int
}

// Run performs the unified build (replaces scripts/build-all.sh).
func Run(m *manifest.Manifest, opts Options) error {
	if opts.DevBranch == "" {
		opts.DevBranch = "main"
	}
	if opts.Parallel <= 0 {
		opts.Parallel = 2
	}

	syncOpts := syncpkg.Options{
		RepoRoot:     opts.RepoRoot,
		Branch:       opts.DevBranch,
		Local:        opts.Local,
		Fetch:        opts.Fetch,
		LocalConfig:  opts.LocalConfig,
		AllowMissing: opts.AllowMissing,
	}

	fmt.Println("=========================================")
	fmt.Println("llm-d.ai Unified Build (llmd-site)")
	fmt.Println("=========================================")
	fmt.Println()

	fmt.Println("Pre-step: Syncing docs content...")
	if _, err := syncpkg.Run(m, syncOpts); err != nil {
		return err
	}
	fmt.Println("✓ Docs synced to preview/docs/")
	fmt.Println()

	fmt.Println("Step 1: Building main site...")
	if err := runNPM(opts.RepoRoot, nil, "run", "build"); err != nil {
		return err
	}
	fmt.Println("✓ Main site built to build/")
	fmt.Println()

	fmt.Println("Step 2: Discovering release branches...")
	versions, latest, err := DiscoverReleases(opts.RepoRoot)
	if err != nil {
		return err
	}
	if len(versions) > 0 {
		fmt.Println("Found release branches:")
		for _, v := range versions {
			fmt.Printf("  origin/release-%s\n", v)
		}
		fmt.Printf("Latest stable: %s\n", latest)
	} else {
		fmt.Println("No release branches found")
	}
	fmt.Println()

	devBaseURL := "/docs/"
	devSubdir := "docs"
	if latest != "" {
		devBaseURL = "/docs/dev/"
		devSubdir = "docs/dev"
	}

	fmt.Printf("Step 3: Syncing and building dev docs from llm-d/llm-d @ %s...\n", opts.DevBranch)
	fmt.Printf("        Output: build/%s/ (baseUrl: %s)\n", devSubdir, devBaseURL)
	if _, err := syncpkg.Run(m, syncOpts); err != nil {
		return err
	}

	previewDir := filepath.Join(opts.RepoRoot, "preview")
	if err := runNPM(previewDir, nil, "install"); err != nil {
		return err
	}
	if err := runNPM(previewDir, []string{"DOCS_BASE_URL=" + devBaseURL}, "run", "build"); err != nil {
		return err
	}

	outDev := filepath.Join(opts.RepoRoot, "build", devSubdir)
	if err := os.MkdirAll(outDev, 0o755); err != nil {
		return err
	}
	if err := copyDir(filepath.Join(previewDir, "build"), outDev); err != nil {
		return err
	}
	fmt.Printf("✓ Dev docs built to build/%s/\n", devSubdir)

	imgOut := filepath.Join(opts.RepoRoot, "build", "img", "docs")
	_ = os.MkdirAll(imgOut, 0o755)
	_ = copyDirIfExists(filepath.Join(previewDir, "build", "img", "docs"), imgOut)

	if llmdRepo := os.Getenv("LLMD_REPO"); llmdRepo != "" {
		report := filepath.Join(llmdRepo, "merge-report.txt")
		if _, err := os.Stat(report); err == nil {
			fmt.Println("Including merge report...")
			_ = copyFile(report, filepath.Join(outDev, "merge-report.txt"), 0o644)
		}
	}
	fmt.Println()

	if len(versions) == 0 {
		fmt.Println("Step 4: No release branches to build")
	} else {
		fmt.Println("Step 4: Building release branches...")
		if err := buildReleasesParallel(opts.RepoRoot, m, versions, latest, opts.Parallel); err != nil {
			return err
		}
	}

	fmt.Println("Step 5: Merging docs into unified search index...")
	if err := search.Merge(opts.RepoRoot); err != nil {
		return err
	}
	fmt.Println("✓ Unified search index updated")
	fmt.Println()

	printSummary(opts, latest, versions)
	return nil
}

func buildReleasesParallel(repoRoot string, m *manifest.Manifest, versions []string, latest string, parallel int) error {
	sem := make(chan struct{}, parallel)
	var wg sync.WaitGroup
	errCh := make(chan error, len(versions))

	for _, version := range versions {
		version := version
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			fmt.Printf("\nBuilding docs for version %s (latest: %v)\n", version, version == latest)
			job := releaseJob{Version: version, IsLatest: version == latest}
			if err := buildRelease(repoRoot, m, job); err != nil {
				if errors.Is(err, errSkipRelease) {
					return
				}
				errCh <- fmt.Errorf("release %s: %w", version, err)
			}
		}()
	}

	wg.Wait()
	close(errCh)
	for err := range errCh {
		if err != nil {
			return err
		}
	}
	return nil
}

func printSummary(opts Options, latest string, versions []string) {
	fmt.Println()
	fmt.Println("=========================================")
	fmt.Println("Build Complete!")
	fmt.Println("=========================================")
	fmt.Println()
	fmt.Println("Output directory: build/")
	fmt.Println("  - Main site:       build/")
	if latest != "" {
		fmt.Printf("  - /docs/           latest stable (%s)\n", latest)
		fmt.Printf("  - /docs/dev/       development (from llm-d/llm-d@%s)\n", opts.DevBranch)
	} else {
		fmt.Printf("  - /docs/           development (from llm-d/llm-d@%s)\n", opts.DevBranch)
	}
	for _, v := range versions {
		fmt.Printf("  - /docs/%s/\n", v)
	}
	fmt.Println()
	fmt.Println("To serve locally:")
	fmt.Println("  npm run serve")
	fmt.Println()
}

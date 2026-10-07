package cmd

import (
	"fmt"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/check"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/spf13/cobra"
)

// ExitError carries a process exit code through Cobra.
type ExitError struct {
	Code int
}

func (e ExitError) Error() string {
	return fmt.Sprintf("exit code %d", e.Code)
}

func newCheckCmd() *cobra.Command {
	checkCmd := &cobra.Command{
		Use:   "check",
		Short: "Validation checks on the built site",
	}

	var warnOnly bool

	links := &cobra.Command{
		Use:   "links",
		Short: "Check links in built site (replaces scripts/check-links.mjs)",
		Long: `Crawl the built site, validate internal and GitHub links,
and write broken-links-report.md. Posts a PR comment when GITHUB_TOKEN and PR context are set.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			m, err := manifest.Load(repo.ManifestPath(rootDir))
			if err != nil {
				return err
			}
			code, err := check.CheckLinksWithOptions(rootDir, m, check.CheckOptions{WarnOnly: warnOnly})
			if err != nil {
				return err
			}
			if code != 0 {
				return ExitError{Code: code}
			}
			return nil
		},
	}

	links.Flags().BoolVar(&warnOnly, "warn-on-broken-links", false, "report broken links but exit 0")

	images := &cobra.Command{
		Use:   "images",
		Short: "Verify images in built site load correctly",
		Long:  `Crawl the built site and verify all img/background/srcset references return HTTP 2xx/3xx.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			code, err := check.CheckImages(rootDir)
			if err != nil {
				return err
			}
			if code != 0 {
				return ExitError{Code: code}
			}
			return nil
		},
	}

	var refsDir, refsVersion string
	var refsWarnOnly, refsStatic bool

	refs := &cobra.Command{
		Use:   "refs",
		Short: "Verify source links in released docs versions are pinned and resolve",
		Long: `Check every github.com/llm-d/... source link under versioned_docs/.

A released docs version is frozen content, so its source links must be pinned
to immutable refs recorded in source-refs.yaml. This verifies two things:

  - every link's ref matches the one source-refs.yaml lists for that release
  - every linked path actually exists in that repo at that ref

The second is the one that matters. A ref from the wrong release still resolves
for most paths, so a wrong pin looks fine until a reader follows a link into
code that moved.

Reads the GitHub API. Set GITHUB_TOKEN for usable rate limits. --static skips
the API and checks the refs alone, which is what runs in CI.

Only files under a version-<x.y> directory are compared against
source-refs.yaml. Pointed at a tree without them (--dir docs), there is no
release to compare against, so the links are only resolved — still a useful way
to find dead links in the dev docs, whose refs track "main" on purpose.

Examples:
  llmd-site check refs
  llmd-site check refs --static
  llmd-site check refs --version 0.10
  llmd-site check refs --dir docs      # resolve dev-doc links; no ref comparison`,
		RunE: func(cmd *cobra.Command, args []string) error {
			code, err := check.CheckSourceRefs(rootDir, check.SourceRefOptions{
				Dir:      refsDir,
				Version:  refsVersion,
				Static:   refsStatic,
				WarnOnly: refsWarnOnly,
			})
			if err != nil {
				return err
			}
			if code != 0 {
				return ExitError{Code: code}
			}
			return nil
		},
	}

	refs.Flags().StringVar(&refsDir, "dir", "versioned_docs", "tree to scan, relative to the repo root")
	refs.Flags().StringVar(&refsVersion, "version", "", "limit to one docs version label, e.g. 0.10")
	refs.Flags().BoolVar(&refsStatic, "static", false, "compare refs against source-refs.yaml only, no network")
	refs.Flags().BoolVar(&refsWarnOnly, "warn-only", false, "report problems but exit 0")

	checkCmd.AddCommand(links, images, refs)
	return checkCmd
}

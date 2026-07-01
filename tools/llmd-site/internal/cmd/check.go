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

	links := &cobra.Command{
		Use:   "links",
		Short: "Check links in built site (replaces scripts/check-links.mjs)",
		Long: `Crawl the built site via docusaurus serve, validate internal and GitHub links,
and write broken-links-report.md. Posts a PR comment when GITHUB_TOKEN and PR context are set.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			m, err := manifest.Load(repo.ManifestPath(rootDir))
			if err != nil {
				return err
			}
			code, err := check.CheckLinks(rootDir, m)
			if err != nil {
				return err
			}
			if code != 0 {
				return ExitError{Code: code}
			}
			return nil
		},
	}

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

	checkCmd.AddCommand(links, images)
	return checkCmd
}

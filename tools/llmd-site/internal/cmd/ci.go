package cmd

import (
	"fmt"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/build"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/check"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	syncpkg "github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/sync"
	"github.com/spf13/cobra"
)

func newCICmd() *cobra.Command {
	var skipCheck bool
	var warnOnBrokenLinks bool

	cmd := &cobra.Command{
		Use:   "ci [branch]",
		Short: "Full CI pipeline: sync docs, build the site, then check links",
		Long: `Run the same steps as CI: sync docs from llm-d/llm-d@<branch> (default main),
build the site, then check links.

Examples:
  llmd-site ci
  llmd-site ci main
  llmd-site ci --skip-check`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			branch := "main"
			if len(args) > 0 {
				branch = args[0]
			}

			m, err := manifest.Load(repo.ManifestPath(rootDir))
			if err != nil {
				return err
			}
			if err := m.Validate(); err != nil {
				return err
			}

			if _, err := syncpkg.Run(m, syncpkg.Options{
				RepoRoot:    rootDir,
				Branch:      branch,
				Local:       localMode,
				LocalConfig: repo.LocalConfigPath(rootDir),
			}); err != nil {
				return err
			}

			if err := build.Run(rootDir); err != nil {
				return err
			}

			if skipCheck {
				fmt.Println("✓ ci complete (link check skipped)")
				return nil
			}

			code, err := check.CheckLinks(rootDir, m)
			if err != nil {
				return err
			}
			if code != 0 {
				if warnOnBrokenLinks {
					fmt.Println("⚠️  link check reported issues (see broken-links-report.md); continuing (--warn-on-broken-links)")
					return nil
				}
				return ExitError{Code: code}
			}

			fmt.Println("✓ ci complete")
			return nil
		},
	}

	cmd.Flags().BoolVar(&skipCheck, "skip-check", false, "build only; skip link check")
	cmd.Flags().BoolVar(&warnOnBrokenLinks, "warn-on-broken-links", false, "report broken links but do not fail the command")

	return cmd
}

package cmd

import (
	"fmt"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/build"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/check"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/spf13/cobra"
)

func newCICmd() *cobra.Command {
	var fetch bool
	var allowMissing bool
	var parallel int
	var skipCheck bool

	cmd := &cobra.Command{
		Use:   "ci [dev-branch]",
		Short: "Full CI pipeline (build + link check)",
		Long: `Run the same steps as GitHub Actions test-deploy: full site build then link check.

Examples:
  llmd-site ci
  llmd-site ci main
  llmd-site ci --skip-check`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			devBranch := "main"
			if len(args) > 0 {
				devBranch = args[0]
			}

			m, err := manifest.Load(repo.ManifestPath(rootDir))
			if err != nil {
				return err
			}
			if err := m.Validate(); err != nil {
				return err
			}

			if err := build.Run(m, build.Options{
				RepoRoot:     rootDir,
				DevBranch:    devBranch,
				Local:        localMode,
				Fetch:        fetch,
				LocalConfig:  repo.LocalConfigPath(rootDir),
				AllowMissing: allowMissing,
				Parallel:     parallel,
			}); err != nil {
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
				return ExitError{Code: code}
			}

			fmt.Println("✓ ci complete")
			return nil
		},
	}

	cmd.Flags().BoolVar(&fetch, "fetch", false, "git fetch local upstream clone before sync")
	cmd.Flags().BoolVar(&allowMissing, "allow-missing", false, "allow missing upstream files during sync")
	cmd.Flags().IntVar(&parallel, "parallel", 2, "max parallel release branch builds")
	cmd.Flags().BoolVar(&skipCheck, "skip-check", false, "build only; skip link check")

	return cmd
}

package cmd

import (
	"fmt"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/build"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/spf13/cobra"
)

func newBuildCmd() *cobra.Command {
	var fetch bool
	var allowMissing bool
	var parallel int

	cmd := &cobra.Command{
		Use:   "build [dev-branch]",
		Short: "Full site build (main site + docs + all release versions)",
		Long: `Build the complete llm-d.ai site into build/.

Replaces scripts/build-all.sh: syncs docs, builds the main Docusaurus site,
builds dev docs and every release-* branch (parallelized), then merges search indexes.

Examples:
  llmd-site build
  llmd-site build release-0.7
  llmd-site build --local`,
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

			fmt.Println("✓ build complete")
			return nil
		},
	}

	cmd.Flags().BoolVar(&fetch, "fetch", false, "git fetch local upstream clone before sync")
	cmd.Flags().BoolVar(&allowMissing, "allow-missing", false, "allow missing upstream files during sync")
	cmd.Flags().IntVar(&parallel, "parallel", 2, "max parallel release branch builds")

	return cmd
}

package cmd

import (
	"fmt"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/sync"
	"github.com/spf13/cobra"
)

func newSyncCmd() *cobra.Command {
	var fetch bool
	var allowMissing bool
	var failOnStubs bool

	cmd := &cobra.Command{
		Use:   "sync [branch]",
		Short: "Sync docs from llm-d/llm-d into preview/docs",
		Long: `Pull documentation from llm-d/llm-d and materialize preview/docs/.

Uses docs-sync.yaml for configuration. With --local, reads upstream path
from llmd-site.local.yaml (see llmd-site.local.yaml.example).

Native Go sync engine (Phase 2.1): manifest-driven copies, generated sed
rules, and shared MDX transforms — no bash delegation.`,
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

			_, err = sync.Run(m, sync.Options{
				RepoRoot:     rootDir,
				Branch:       branch,
				Local:        localMode,
				Fetch:        fetch,
				LocalConfig:  repo.LocalConfigPath(rootDir),
				AllowMissing: allowMissing,
				FailOnStubs:  failOnStubs,
			})
			if err != nil {
				return err
			}

			fmt.Println("✓ sync-report.json written")
			return nil
		},
	}

	cmd.Flags().BoolVar(&fetch, "fetch", false, "git fetch and reset local upstream clone before sync")
	cmd.Flags().BoolVar(&allowMissing, "allow-missing", false, "skip errors for missing upstream files (legacy release branches)")
	cmd.Flags().BoolVar(&failOnStubs, "fail-on-stubs", false, "fail if WIP stub pages were generated")

	return cmd
}

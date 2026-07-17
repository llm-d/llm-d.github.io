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
	var refreshUpstream bool

	cmd := &cobra.Command{
		Use:   "sync [branch]",
		Short: "Sync docs from llm-d/llm-d into docs/",
		Long: `Pull documentation from llm-d/llm-d@<branch> (default main) into the
single-site docs/ tree.

Copies upstream docs/** verbatim (README.md kept as-is, menu-config.json and
images included), mirrors doc images into static/img/docs/, and regenerates the
community mirror pages. All link/image rewriting happens later at Docusaurus
build time via scripts/lib/preprocess.mjs, so the copy stays pristine.

With --local, reads the upstream path from llmd-site.local.yaml (or LLMD_REPO).`,
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
				RepoRoot:        rootDir,
				Branch:          branch,
				Local:           localMode,
				Fetch:           fetch,
				LocalConfig:     repo.LocalConfigPath(rootDir),
				AllowMissing:    allowMissing,
				RefreshUpstream: refreshUpstream,
			})
			if err != nil {
				return err
			}

			fmt.Println("✓ sync-report.json written")
			return nil
		},
	}

	cmd.Flags().BoolVar(&fetch, "fetch", false, "git fetch and reset local upstream clone before sync")
	cmd.Flags().BoolVar(&allowMissing, "allow-missing", false, "skip the minimum doc-count sanity check")
	cmd.Flags().BoolVar(&refreshUpstream, "refresh-upstream", false, "force fresh shallow clone of remote upstream (ignore cache)")

	return cmd
}

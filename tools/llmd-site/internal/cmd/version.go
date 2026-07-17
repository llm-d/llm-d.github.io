package cmd

import (
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/sync"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/version"
	"github.com/spf13/cobra"
)

func newVersionCmd() *cobra.Command {
	var (
		skipBake     bool
		skipImages   bool
		noResync     bool
		resyncBranch string
		fetch        bool
		allowMissing bool
	)

	cmd := &cobra.Command{
		Use:   "version",
		Short: "Documentation version utilities",
	}

	cut := &cobra.Command{
		Use:   "cut <semver>",
		Short: "Freeze current dev docs as a released version",
		Long: `Snapshot docs/ into versioned_docs/version-<x.y>/ via Docusaurus versioning.

Before cutting, doc images are copied to static/img/versioned/<x.y>/ and
preprocess fixups are baked into docs/ (link/image rewrites versioned docs
need at build time). docs/ is then restored from upstream via sync.

Examples:
  llmd-site version cut 0.9
  llmd-site version cut 0.9.0
  llmd-site version cut 0.9 --no-resync   # keep baked docs/ (advanced)

Commit versioned_docs/, versioned_sidebars/, versions.json, and
static/img/versioned/<x.y>/ afterwards.`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return version.Cut(version.CutOptions{
				Root:         rootDir,
				Version:      args[0],
				SkipBake:     skipBake,
				SkipImages:   skipImages,
				NoResync:     noResync,
				ResyncBranch: resyncBranch,
				SyncOpts: sync.Options{
					Local:        localMode,
					Fetch:        fetch,
					LocalConfig:  repo.LocalConfigPath(rootDir),
					AllowMissing: allowMissing,
				},
			})
		},
	}

	cut.Flags().BoolVar(&skipBake, "skip-bake", false, "skip baking preprocess fixups into docs/ before cut")
	cut.Flags().BoolVar(&skipImages, "skip-images", false, "skip copying doc images to static/img/versioned/<version>/")
	cut.Flags().BoolVar(&noResync, "no-resync", false, "do not re-sync docs/ from upstream after cut")
	cut.Flags().StringVar(&resyncBranch, "resync-branch", "main", "upstream branch for post-cut docs/ restore")
	cut.Flags().BoolVar(&fetch, "fetch", false, "git fetch upstream clone before post-cut resync")
	cut.Flags().BoolVar(&allowMissing, "allow-missing", false, "skip minimum doc-count check on post-cut resync")

	cmd.AddCommand(cut)
	return cmd
}

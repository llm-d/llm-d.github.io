package cmd

import (
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/spf13/cobra"
)

var (
	localMode bool
	rootDir   string
)

func Execute() error {
	return NewRoot().Execute()
}

func NewRoot() *cobra.Command {
	root := &cobra.Command{
		Use:   "llmd-site",
		Short: "Build, sync, and validate the llm-d.ai documentation site",
		Long: `Native orchestrator for llm-d.github.io CI/CD.

Sync, build, check, and ci commands replace the legacy bash/Node scripts.`,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			if rootDir != "" {
				return nil
			}
			r, err := repo.Root()
			if err != nil {
				return err
			}
			rootDir = r
			return nil
		},
	}

	root.PersistentFlags().BoolVar(&localMode, "local", false, "use local upstream clones from llmd-site.local.yaml")
	root.PersistentFlags().StringVar(&rootDir, "root", "", "repository root (auto-detected by default)")

	root.AddCommand(newValidateCmd())
	root.AddCommand(newExtractManifestCmd())
	root.AddCommand(newGoldenCmd())
	root.AddCommand(newSyncCmd())
	root.AddCommand(newBuildCmd())
	root.AddCommand(newCheckCmd())
	root.AddCommand(newBlogCmd())
	root.AddCommand(newCICmd())

	return root
}

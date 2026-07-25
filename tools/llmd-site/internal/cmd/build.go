package cmd

import (
	"fmt"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/build"
	"github.com/spf13/cobra"
)

func newBuildCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "build",
		Short: "Build the Docusaurus site into build/",
		Long: `Build the single-site llm-d.ai Docusaurus project.

Runs "npm run landing:css" then "npm run build". Docusaurus handles native
versioning from versioned_docs/; run "llmd-site sync" first to refresh docs/.

Example:
  llmd-site sync
  llmd-site build`,
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := build.Run(rootDir); err != nil {
				return err
			}
			fmt.Println("✓ build complete")
			return nil
		},
	}
}

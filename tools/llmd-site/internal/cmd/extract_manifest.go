package cmd

import (
	"fmt"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/extract"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/spf13/cobra"
)

func newExtractManifestCmd() *cobra.Command {
	var write bool
	cmd := &cobra.Command{
		Use:   "extract-manifest",
		Short: "Extract docs-sync.yaml from legacy/preview/scripts/sync-docs.sh",
		Long:  "One-time / refresh helper that parses the legacy bash sync script into docs-sync.yaml.",
		RunE: func(cmd *cobra.Command, args []string) error {
			script := repo.SyncScriptPath(rootDir)
			m, err := extract.FromSyncScript(script)
			if err != nil {
				return err
			}
			m.Copies = extract.MergeUniqueCopies(m.Copies)

			if err := extract.ValidateExtract(m); err != nil {
				return err
			}

			fmt.Printf("Extracted manifest from %s\n", script)
			fmt.Printf("  copies: %d, slugs: %d, directories: %d\n",
				len(m.Copies), len(m.Slugs), len(m.Directories))

			if !write {
				fmt.Println("Dry run — pass --write to save docs-sync.yaml")
				return nil
			}

			out := repo.ManifestPath(rootDir)
			if err := m.Save(out); err != nil {
				return err
			}
			fmt.Printf("✓ Wrote %s\n", out)
			return nil
		},
	}
	cmd.Flags().BoolVar(&write, "write", false, "write docs-sync.yaml")
	return cmd
}

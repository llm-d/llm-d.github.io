package cmd

import (
	"fmt"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/spf13/cobra"
)

func newValidateCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "validate",
		Short: "Validate docs-sync.yaml manifest",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := repo.ManifestPath(rootDir)
			m, err := manifest.Load(path)
			if err != nil {
				return err
			}
			if err := m.Validate(); err != nil {
				return err
			}
			fmt.Printf("✓ Manifest valid: %s\n", path)
			fmt.Printf("  copies: %d, slugs: %d, edit_urls: %d, community: %d\n",
				len(m.Copies), len(m.Slugs), len(m.EditURLs), len(m.Community))
			if m.ReplacementsPending != nil {
				fmt.Printf("  sed rules pending port: %d\n", m.ReplacementsPending.SedRuleCount)
			}
			return nil
		},
	}
}

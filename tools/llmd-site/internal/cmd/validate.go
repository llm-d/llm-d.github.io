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
			fmt.Printf("  community: %d\n", len(m.Community))
			return nil
		},
	}
}

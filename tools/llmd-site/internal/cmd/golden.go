package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	goldpkg "github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/golden"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/spf13/cobra"
)

func newGoldenCmd() *cobra.Command {
	goldenCmd := &cobra.Command{
		Use:   "golden",
		Short: "Golden tests for sync-docs.sh output",
	}

	var upstreamRepo string
	var fetch bool
	var engine string
	var useLegacy bool

	capture := &cobra.Command{
		Use:   "capture [branch]",
		Short: "Run sync and save golden checksums",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			branch := args[0]
			if upstreamRepo == "" {
				upstreamRepo = os.Getenv("LLMD_REPO")
			}
			eng := goldpkg.EngineGo
			if useLegacy || engine == "legacy" {
				eng = goldpkg.EngineLegacy
			}
			rec, err := goldpkg.Capture(goldpkg.CaptureOptions{
				Root:         rootDir,
				Branch:       branch,
				UpstreamRepo: upstreamRepo,
				Fetch:        fetch,
				Engine:       eng,
				Local:        localMode || upstreamRepo != "",
			})
			if err != nil {
				return err
			}
			safeBranch := filepath.Base(branch)
			out := filepath.Join(repo.GoldenDir(rootDir), safeBranch+".golden")
			if err := goldpkg.SaveRecord(out, rec); err != nil {
				return err
			}
			fmt.Printf("✓ Captured golden for %s (%d files, hash %s)\n", branch, len(rec.Files), rec.FileHash[:12])
			fmt.Printf("  → %s\n", out)
			return nil
		},
	}
	capture.Flags().StringVar(&upstreamRepo, "repo", "", "local llm-d/llm-d clone (or LLMD_REPO env)")
	capture.Flags().BoolVar(&fetch, "fetch", false, "fetch upstream before sync")
	capture.Flags().StringVar(&engine, "engine", "go", "sync engine: go or legacy")
	capture.Flags().BoolVar(&useLegacy, "legacy", false, "use legacy sync-docs.sh (alias for --engine=legacy)")

	verify := &cobra.Command{
		Use:   "verify [branch]",
		Short: "Run sync and compare against golden checksums",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			branch := args[0]
			if upstreamRepo == "" {
				upstreamRepo = os.Getenv("LLMD_REPO")
			}
			eng := goldpkg.EngineGo
			if useLegacy || engine == "legacy" {
				eng = goldpkg.EngineLegacy
			}
			safeBranch := filepath.Base(branch)
			goldenPath := filepath.Join(repo.GoldenDir(rootDir), safeBranch+".golden")
			expected, err := goldpkg.LoadRecord(goldenPath)
			if err != nil {
				return fmt.Errorf("load golden %s: %w (run: llmd-site golden capture %s)", goldenPath, err, branch)
			}
			actual, err := goldpkg.Capture(goldpkg.CaptureOptions{
				Root:         rootDir,
				Branch:       branch,
				UpstreamRepo: upstreamRepo,
				Fetch:        fetch,
				Engine:       eng,
				Local:        localMode || upstreamRepo != "",
			})
			if err != nil {
				return err
			}
			diffs := goldpkg.CompareRecords(expected, actual)
			if len(diffs) == 0 {
				fmt.Printf("✓ Golden verify passed for %s (%d files)\n", branch, len(actual.Files))
				return nil
			}
			for _, d := range diffs {
				fmt.Fprintf(os.Stderr, "  - %s\n", d)
			}
			return fmt.Errorf("golden verify failed: %d difference(s)", len(diffs))
		},
	}
	verify.Flags().StringVar(&upstreamRepo, "repo", "", "local llm-d/llm-d clone (or LLMD_REPO env)")
	verify.Flags().BoolVar(&fetch, "fetch", false, "fetch upstream before sync")
	verify.Flags().StringVar(&engine, "engine", "go", "sync engine: go or legacy")
	verify.Flags().BoolVar(&useLegacy, "legacy", false, "use legacy sync-docs.sh (alias for --engine=legacy)")

	goldenCmd.AddCommand(capture, verify)
	return goldenCmd
}

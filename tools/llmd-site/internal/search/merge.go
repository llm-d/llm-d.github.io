package search

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// Merge runs scripts/merge-search-index.mjs to unify main + docs search indexes.
// Uses the repo's Node/lunr setup until a native Go lunr port lands.
func Merge(repoRoot string) error {
	script := filepath.Join(repoRoot, "scripts", "merge-search-index.mjs")
	if _, err := os.Stat(script); err != nil {
		return fmt.Errorf("merge search script: %w", err)
	}
	cmd := exec.Command("node", script)
	cmd.Dir = repoRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("merge search index: %w", err)
	}
	return nil
}

package upstream

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func TestIsGitRepo(t *testing.T) {
	t.Run("missing directory", func(t *testing.T) {
		if isGitRepo(filepath.Join(t.TempDir(), "missing")) {
			t.Fatal("expected false for missing path")
		}
	})

	t.Run("fake git dir without HEAD", func(t *testing.T) {
		root := t.TempDir()
		if err := os.MkdirAll(filepath.Join(root, ".git", "objects"), 0o755); err != nil {
			t.Fatal(err)
		}
		if isGitRepo(root) {
			t.Fatal("expected false for incomplete .git directory")
		}
	})

	t.Run("valid repo", func(t *testing.T) {
		root := t.TempDir()
		cmd := exec.Command("git", "init", root)
		if err := cmd.Run(); err != nil {
			t.Skip("git init unavailable:", err)
		}
		if !isGitRepo(root) {
			t.Fatal("expected true for git init repo")
		}
	})
}

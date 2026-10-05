package upstream

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

func gitInitWithFile(t *testing.T, rel, content string) string {
	t.Helper()
	root := t.TempDir()
	run := func(args ...string) {
		cmd := exec.Command("git", append([]string{"-C", root}, args...)...)
		cmd.Env = append(os.Environ(),
			"GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@example.com",
			"GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@example.com")
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Skipf("git %v unavailable: %v: %s", args, err, out)
		}
	}
	run("init", "-q")
	p := filepath.Join(root, rel)
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", ".")
	run("commit", "-q", "-m", "init")
	return root
}

// A local (non-partial) checkout must never be reset by Materialize.
func TestMaterializeLocalIsNoop(t *testing.T) {
	root := gitInitWithFile(t, "docs/a.md", "committed\n")
	p := filepath.Join(root, "docs", "a.md")
	if err := os.WriteFile(p, []byte("uncommitted edit\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	src := &Source{Root: root, Branch: "main"}
	if err := src.Materialize("docs", "guides"); err != nil {
		t.Fatalf("Materialize: %v", err)
	}
	got, _ := os.ReadFile(p)
	if string(got) != "uncommitted edit\n" {
		t.Fatalf("local working tree was modified: %q", got)
	}
}

func TestMaterializePartialChecksOut(t *testing.T) {
	root := gitInitWithFile(t, "docs/a.md", "committed\n")
	p := filepath.Join(root, "docs", "a.md")
	if err := os.WriteFile(p, []byte("dirty\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	src := &Source{Root: root, Branch: "main", Partial: true}
	if err := src.Materialize("docs"); err != nil {
		t.Fatalf("Materialize: %v", err)
	}
	got, _ := os.ReadFile(p)
	if string(got) != "committed\n" {
		t.Fatalf("partial clone not materialized: %q", got)
	}
}

func TestResolveLLMDRepoNotPartial(t *testing.T) {
	root := t.TempDir()
	t.Setenv("LLMD_REPO", root)
	t.Setenv("LLMD_FETCH", "")
	m := manifest.Default()
	src, err := Resolve(m, Options{})
	if err != nil {
		t.Fatal(err)
	}
	if src.Partial {
		t.Fatal("LLMD_REPO source must not be marked Partial")
	}
}

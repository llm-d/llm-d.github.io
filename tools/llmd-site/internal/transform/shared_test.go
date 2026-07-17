package transform_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/transform"
)

func TestApplySharedFixture(t *testing.T) {
	root, err := repo.Root()
	if err != nil {
		t.Fatal(err)
	}

	fixtureDir := filepath.Join(root, "tools", "llmd-site", "testdata", "transform")
	inputPath := filepath.Join(fixtureDir, "transformation-test.md")
	expectedPath := filepath.Join(fixtureDir, "transformation-test.expected.md")

	input, err := os.ReadFile(inputPath)
	if err != nil {
		t.Fatalf("read input fixture: %v", err)
	}
	expected, err := os.ReadFile(expectedPath)
	if err != nil {
		t.Fatalf("read expected fixture: %v", err)
	}

	got := transform.ApplySharedContent(string(input))
	if got != string(expected) {
		gotPath := filepath.Join(t.TempDir(), "transformation-test.got.md")
		_ = os.WriteFile(gotPath, []byte(got), 0o644)
		t.Fatalf("transform output mismatch with %s (got written to %s)", expectedPath, gotPath)
	}
}

func TestApplySharedSmoke(t *testing.T) {
	input := "![x](../assets/foo.svg)\n<https://example.com>\n<= 5\n"
	out := transform.ApplySharedContent(input)
	if !strings.Contains(out, "/img/docs/foo.svg") {
		t.Fatalf("expected image rewrite, got %q", out)
	}
	if strings.Contains(out, "<https://") {
		t.Fatalf("expected autolink stripped, got %q", out)
	}
}

package srcrefs

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// refMap is the map both implementations are given for the fixtures.
// llm-d-benchmark is deliberately absent: an unlisted repo must be left alone.
var boundaryRefs = map[string]string{"llm-d/llm-d-router": "v0.11.0"}

// TestBakeAgreesWithScanner is the contract ahg-g asked for in #509: the Go
// scanner and scripts/bake-docs.mjs must agree on where a ref ends.
//
// A disagreement is not cosmetic. The cut's guard uses the Go scanner, while
// the rewrite uses the script's pattern, so a link the script's boundary misses
// is pinned by neither and reported by neither — it stays on a moving ref in a
// frozen snapshot until someone runs `check refs` by hand.
//
// Rather than assert two copies of the expected output, this runs the real
// script and checks the result against what the scanner then sees.
func TestBakeAgreesWithScanner(t *testing.T) {
	if _, err := exec.LookPath("node"); err != nil {
		t.Skip("node not available")
	}
	root := repoRoot(t)
	fixtures := filepath.Join(root, "tools", "llmd-site", "testdata", "ref-boundary-fixtures.md")
	src, err := os.ReadFile(fixtures)
	if err != nil {
		t.Fatalf("read fixtures: %v", err)
	}

	// Baking rewrites in place, so work on a copy.
	dir := t.TempDir()
	page := filepath.Join(dir, "fixtures.md")
	if err := os.WriteFile(page, src, 0o644); err != nil {
		t.Fatal(err)
	}

	before, err := Scan(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(before) == 0 {
		t.Fatal("scanner found no links in the fixtures")
	}

	refJSON, err := json.Marshal(boundaryRefs)
	if err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command("node", filepath.Join(root, "scripts", "bake-docs.mjs"), dir,
		"--ref-map", string(refJSON))
	cmd.Dir = root
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("bake-docs.mjs failed: %v\n%s", err, out)
	}

	// Every link the scanner can see must now satisfy the rule the checker
	// applies: a listed repo sits on its ref, an unlisted one is immutable.
	after, err := Scan(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(after) != len(before) {
		t.Fatalf("link count changed across baking: %d -> %d (the rewrite ate or split a link)",
			len(before), len(after))
	}
	for _, l := range after {
		want, listed := boundaryRefs[l.Repo]
		switch {
		case listed && l.Ref != want:
			t.Errorf("%s is at %q after baking, want %q — bake's boundary missed a link the scanner sees",
				l.Repo, l.Ref, want)
		case !listed && !Immutable(l.Ref):
			t.Errorf("%s is at %q, which is not immutable and not listed", l.Repo, l.Ref)
		}
	}

	// The rewrite must not disturb anything outside the ref. Comparing the two
	// texts with every ref normalised away catches eaten punctuation, a
	// swallowed "**", or a mangled path.
	baked, err := os.ReadFile(page)
	if err != nil {
		t.Fatal(err)
	}
	if got, want := blankRefs(string(baked)), blankRefs(string(src)); got != want {
		t.Errorf("baking changed text outside the refs:\n  %s", firstDiffLine(got, want))
	}

	// Another org must be untouched, refs and all.
	if !strings.Contains(string(baked), "kubernetes-sigs/gateway-api/tree/main/apix") {
		t.Error("a non-llm-d link was rewritten")
	}
}

// blankRefs replaces every llm-d link's ref with a placeholder so two texts can
// be compared for changes elsewhere.
func blankRefs(s string) string {
	return linkRE.ReplaceAllStringFunc(s, func(m string) string {
		sub := linkRE.FindStringSubmatch(m)
		return "github.com/" + sub[1] + "/tree/<REF>" + sub[3]
	})
}

func firstDiffLine(a, b string) string {
	la, lb := strings.Split(a, "\n"), strings.Split(b, "\n")
	for i := range la {
		if i >= len(lb) {
			return "extra line: " + la[i]
		}
		if la[i] != lb[i] {
			return la[i] + "\n  vs: " + lb[i]
		}
	}
	return "(identical)"
}

func repoRoot(t *testing.T) string {
	t.Helper()
	root, err := filepath.Abs(filepath.Join("..", "..", "..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	return root
}

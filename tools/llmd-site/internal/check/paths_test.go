package check

import "testing"

func TestInternalPathCandidates(t *testing.T) {
	candidates := internalPathCandidates("/guides/batch-gateway")
	want := map[string]bool{
		"/guides/batch-gateway":           true,
		"/docs/guides/batch-gateway":      true,
		"/docs/dev/guides/batch-gateway":  true,
	}
	for _, c := range candidates {
		if !want[c] {
			t.Fatalf("unexpected candidate %q", c)
		}
	}

	md := internalPathCandidates("/docs/dev/resources/providers/README.md")
	found := false
	for _, c := range md {
		if c == "/docs/dev/resources/providers" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected .md stripped candidate, got %v", md)
	}

	dbl := collapseSlashes("/docs/resources//guides/foo")
	if dbl != "/docs/resources/guides/foo" {
		t.Fatalf("collapseSlashes: got %q", dbl)
	}
}

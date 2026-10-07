package srcrefs

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRepinText(t *testing.T) {
	refs := map[string]string{
		"llm-d/llm-d":        "v0.9.0",
		"llm-d/llm-d-router": "v0.10.0",
	}

	tests := []struct {
		name  string
		in    string
		want  string
		links int
	}{
		{
			name:  "rewrites main",
			in:    "[a](https://github.com/llm-d/llm-d-router/tree/main/pkg/epp)",
			want:  "[a](https://github.com/llm-d/llm-d-router/tree/v0.10.0/pkg/epp)",
			links: 1,
		},
		{
			// The case #504 left behind: a minor tag llm-d repoints, so the
			// frozen version still moves.
			name:  "rewrites a mutable minor tag",
			in:    "[a](https://github.com/llm-d/llm-d/blob/v0.9/guides/README.md)",
			want:  "[a](https://github.com/llm-d/llm-d/blob/v0.9.0/guides/README.md)",
			links: 1,
		},
		{
			name:  "rewrites a ref from the wrong release",
			in:    "[a](https://github.com/llm-d/llm-d-router/raw/v0.8.0/README.md)",
			want:  "[a](https://github.com/llm-d/llm-d-router/raw/v0.10.0/README.md)",
			links: 1,
		},
		{
			name:  "leaves unlisted llm-d repos alone",
			in:    "[a](https://github.com/llm-d/llm-d-benchmark/tree/v0.5.0/config_explorer)",
			want:  "[a](https://github.com/llm-d/llm-d-benchmark/tree/v0.5.0/config_explorer)",
			links: 0,
		},
		{
			name:  "leaves other orgs alone",
			in:    "[a](https://github.com/kubernetes-sigs/gateway-api/tree/main/apix)",
			want:  "[a](https://github.com/kubernetes-sigs/gateway-api/tree/main/apix)",
			links: 0,
		},
		{
			name:  "already correct is a no-op",
			in:    "[a](https://github.com/llm-d/llm-d-router/tree/v0.10.0/pkg)",
			want:  "[a](https://github.com/llm-d/llm-d-router/tree/v0.10.0/pkg)",
			links: 0,
		},
		{
			name:  "rewrites every link in one file",
			in:    "a/llm-d/llm-d/tree/main/x b https://github.com/llm-d/llm-d/tree/main/x https://github.com/llm-d/llm-d-router/tree/main/y",
			want:  "a/llm-d/llm-d/tree/main/x b https://github.com/llm-d/llm-d/tree/v0.9.0/x https://github.com/llm-d/llm-d-router/tree/v0.10.0/y",
			links: 2,
		},
		{
			name:  "keeps a bare repo link's trailing form",
			in:    "[a](https://github.com/llm-d/llm-d-router/tree/main)",
			want:  "[a](https://github.com/llm-d/llm-d-router/tree/v0.10.0)",
			links: 1,
		},
		// The ref group absorbs a trailing "." or "," when a bare URL ends a
		// clause. Replacing that whole span would delete the punctuation and
		// corrupt the sentence.
		{
			name:  "preserves a full stop after a bare URL",
			in:    "See https://github.com/llm-d/llm-d-router/tree/main.",
			want:  "See https://github.com/llm-d/llm-d-router/tree/v0.10.0.",
			links: 1,
		},
		{
			name:  "preserves a comma after a bare URL",
			in:    "See https://github.com/llm-d/llm-d/tree/main, and then stop.",
			want:  "See https://github.com/llm-d/llm-d/tree/v0.9.0, and then stop.",
			links: 1,
		},
		{
			name:  "preserves a full stop after a URL with a path",
			in:    "See https://github.com/llm-d/llm-d-router/tree/main/pkg/epp.",
			want:  "See https://github.com/llm-d/llm-d-router/tree/v0.10.0/pkg/epp.",
			links: 1,
		},
		{
			name:  "a dotted filename is not trailing punctuation",
			in:    "https://github.com/llm-d/llm-d/blob/main/README.md",
			want:  "https://github.com/llm-d/llm-d/blob/v0.9.0/README.md",
			links: 1,
		},
		{
			// Text between a skipped match and a rewritten one must survive
			// exactly once — the splice cursor only advances on a rewrite.
			name:  "preserves text around a skipped match",
			in:    "A https://github.com/llm-d/llm-d-benchmark/tree/v0.5.0/x B https://github.com/llm-d/llm-d-router/tree/main/y C",
			want:  "A https://github.com/llm-d/llm-d-benchmark/tree/v0.5.0/x B https://github.com/llm-d/llm-d-router/tree/v0.10.0/y C",
			links: 1,
		},
		{
			name:  "rewrites adjacent matches",
			in:    "https://github.com/llm-d/llm-d/tree/main/a https://github.com/llm-d/llm-d-router/tree/main/b",
			want:  "https://github.com/llm-d/llm-d/tree/v0.9.0/a https://github.com/llm-d/llm-d-router/tree/v0.10.0/b",
			links: 2,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, ch := repinText(tc.in, refs)
			if got != tc.want {
				t.Errorf("repinText()\n got: %s\nwant: %s", got, tc.want)
			}
			switch {
			case tc.links == 0 && ch != nil:
				t.Errorf("repinText() reported %d change(s), want none", ch.Links)
			case tc.links > 0 && ch == nil:
				t.Fatalf("repinText() reported no change, want %d", tc.links)
			case tc.links > 0 && ch.Links != tc.links:
				t.Errorf("repinText() links = %d, want %d", ch.Links, tc.links)
			}
		})
	}
}

func TestRepinIsIdempotent(t *testing.T) {
	refs := map[string]string{"llm-d/llm-d-router": "v0.10.0"}
	dir := t.TempDir()
	page := filepath.Join(dir, "p.md")
	write(t, page, "[a](https://github.com/llm-d/llm-d-router/tree/main/pkg)\n")

	first, err := Repin(dir, refs, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(first) != 1 || first[0].Links != 1 {
		t.Fatalf("first Repin() = %+v, want 1 file with 1 link", first)
	}

	second, err := Repin(dir, refs, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(second) != 0 {
		t.Errorf("second Repin() = %+v, want no changes", second)
	}

	got, err := os.ReadFile(page)
	if err != nil {
		t.Fatal(err)
	}
	want := "[a](https://github.com/llm-d/llm-d-router/tree/v0.10.0/pkg)\n"
	if string(got) != want {
		t.Errorf("file = %q, want %q", got, want)
	}
}

func TestRepinDryRunWritesNothing(t *testing.T) {
	refs := map[string]string{"llm-d/llm-d-router": "v0.10.0"}
	dir := t.TempDir()
	page := filepath.Join(dir, "p.md")
	before := "[a](https://github.com/llm-d/llm-d-router/tree/main/pkg)\n"
	write(t, page, before)

	changes, err := Repin(dir, refs, true)
	if err != nil {
		t.Fatal(err)
	}
	if len(changes) != 1 {
		t.Fatalf("Repin(dryRun) = %+v, want 1 reported change", changes)
	}
	got, err := os.ReadFile(page)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != before {
		t.Errorf("dry run wrote to the file: %q", got)
	}
}

func TestChangeTotalsAndSummary(t *testing.T) {
	changes := []Change{
		{File: "a.md", Links: 1, Refs: map[string]int{"r: main -> v1.0.0": 1}},
		{File: "b.md", Links: 3, Refs: map[string]int{"r: main -> v1.0.0": 2, "s: main -> v2.0.0": 1}},
	}
	totals := ChangeTotals(changes)
	if totals["r: main -> v1.0.0"] != 3 || totals["s: main -> v2.0.0"] != 1 {
		t.Fatalf("ChangeTotals() = %v", totals)
	}
	summary := SummariseChanges(changes)
	if len(summary) != 2 || summary[0] != "r: main -> v1.0.0" {
		t.Errorf("SummariseChanges() = %v, want the busiest first", summary)
	}
}

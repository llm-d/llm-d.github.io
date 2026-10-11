package srcrefs

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Change is one file's worth of rewritten refs.
type Change struct {
	File  string
	Links int
	// Refs counts rewrites per "repo: oldRef -> newRef".
	Refs map[string]int
}

// Repin rewrites every llm-d source link in dir whose repo appears in refs so
// that it names the configured ref, whatever it names now.
//
// Links to repos absent from refs are left alone: a release may deliberately
// pin one inline, as 0.7 does for llm-d-benchmark. So this settles the ref
// mismatches CheckSourceRefs reports, but not its other two complaints — a repo
// the release does not list, or a release missing from source-refs.yaml. Those
// need an edit to the file, because there is no ref to apply.
//
// Repin is idempotent, and reports what it would change when dryRun is set.
func Repin(dir string, refs map[string]string, dryRun bool) ([]Change, error) {
	var changes []Change
	err := filepath.WalkDir(dir, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		switch strings.ToLower(filepath.Ext(p)) {
		case ".md", ".mdx":
		default:
			return nil
		}
		before, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		after, ch := repinText(string(before), refs)
		if ch == nil {
			return nil
		}
		ch.File = p
		changes = append(changes, *ch)
		if dryRun {
			return nil
		}
		return os.WriteFile(p, []byte(after), 0o644)
	})
	if err != nil {
		return nil, err
	}
	sort.Slice(changes, func(i, j int) bool { return changes[i].File < changes[j].File })
	return changes, nil
}

// repinText rewrites the ref of each mapped llm-d link in text. It returns nil
// when nothing changed.
func repinText(text string, refs map[string]string) (string, *Change) {
	// Group 1 is the repo and group 2 the ref; only the ref span is replaced,
	// so the link's kind (tree/blob/raw) and path are untouched.
	matches := linkRE.FindAllStringSubmatchIndex(text, -1)
	if matches == nil {
		return text, nil
	}
	ch := &Change{Refs: map[string]int{}}
	var b strings.Builder
	b.Grow(len(text))
	last := 0
	for _, m := range matches {
		repo := text[m[2]:m[3]]
		// The ref group can absorb a trailing "." or "," when a bare URL ends a
		// clause. Shrink the span so the rewrite replaces the ref and leaves the
		// punctuation, matching what Scan reports.
		start, end := m[4], m[5]
		for end > start && (text[end-1] == '.' || text[end-1] == ',') {
			end--
		}
		oldRef := text[start:end]
		newRef, ok := refs[repo]
		if !ok || oldRef == newRef {
			continue
		}
		b.WriteString(text[last:start])
		b.WriteString(newRef)
		last = end
		ch.Links++
		ch.Refs[repo+": "+oldRef+" -> "+newRef]++
	}
	if ch.Links == 0 {
		return text, nil
	}
	b.WriteString(text[last:])
	return b.String(), ch
}

// ChangeTotals returns rewrite counts keyed by "repo: oldRef -> newRef".
func ChangeTotals(changes []Change) map[string]int {
	totals := map[string]int{}
	for _, c := range changes {
		for k, n := range c.Refs {
			totals[k] += n
		}
	}
	return totals
}

// SummariseChanges renders ChangeTotals busiest-first, ties broken by name.
func SummariseChanges(changes []Change) []string {
	totals := ChangeTotals(changes)
	keys := sortedKeys(totals)
	sort.SliceStable(keys, func(i, j int) bool { return totals[keys[i]] > totals[keys[j]] })
	return keys
}

package version

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/srcrefs"
)

// RepinOptions configures Repin.
type RepinOptions struct {
	Root string
	// Versions limits the run to these docs version labels. Empty means every
	// release listed in source-refs.yaml.
	Versions []string
	DryRun   bool
}

// Repin rewrites released versions' llm-d source links to the refs recorded in
// source-refs.yaml.
func Repin(opts RepinOptions) error {
	cfg, err := srcrefs.Load(srcrefs.Path(opts.Root))
	if err != nil {
		return err
	}

	labels := opts.Versions
	if len(labels) == 0 {
		labels = cfg.Labels()
	}

	total := 0
	for _, raw := range labels {
		label, err := NormalizeLabel(raw)
		if err != nil {
			return err
		}
		refs, ok := cfg.For(label)
		if !ok {
			return fmt.Errorf("%s has no entry for release %q", srcrefs.FileName, label)
		}
		dir := filepath.Join(opts.Root, "versioned_docs", "version-"+label)
		if _, err := os.Stat(dir); err != nil {
			return fmt.Errorf("no snapshot at versioned_docs/version-%s: %w", label, err)
		}

		changes, err := srcrefs.Repin(dir, refs, opts.DryRun)
		if err != nil {
			return err
		}
		links := 0
		for _, c := range changes {
			links += c.Links
		}
		total += links

		verb := "Repinned"
		if opts.DryRun {
			verb = "Would repin"
		}
		fmt.Printf("==> %s %s: %d link(s) in %d file(s)\n", verb, label, links, len(changes))
		totals := srcrefs.ChangeTotals(changes)
		for _, k := range srcrefs.SummariseChanges(changes) {
			fmt.Printf("      %-58s %3d\n", k, totals[k])
		}
	}

	if opts.DryRun {
		fmt.Printf("\n%d link(s) would change. Re-run without --dry-run to apply.\n", total)
		return nil
	}
	fmt.Printf("\n✓ repinned %d link(s). Verify with: llmd-site check refs\n", total)
	return nil
}

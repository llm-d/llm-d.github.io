package version

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/build"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/srcrefs"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/sync"
)

// CutOptions configures a docs version cut.
type CutOptions struct {
	Root        string
	Version     string
	SkipBake    bool
	SkipImages  bool
	NoResync    bool
	ResyncBranch string
	SyncOpts    sync.Options
}

// NormalizeLabel returns the Docusaurus version label (major.minor).
func NormalizeLabel(version string) (string, error) {
	return srcrefs.NormalizeLabel(version)
}

// Cut freezes the current dev docs/ as a released Docusaurus version.
func Cut(opts CutOptions) error {
	label, err := NormalizeLabel(opts.Version)
	if err != nil {
		return err
	}

	docsDir := filepath.Join(opts.Root, "docs")
	if st, err := os.Stat(docsDir); err != nil || !st.IsDir() {
		return fmt.Errorf("docs/ not found — run llmd-site sync first")
	}

	imgBase := fmt.Sprintf("/img/versioned/%s/", label)
	versionedImgDir := filepath.Join(opts.Root, "static", "img", "versioned", label)
	docImgDir := filepath.Join(opts.Root, "static", "img", "docs")

	fmt.Printf("==> Cutting docs version %s\n", label)

	if !opts.SkipImages {
		fmt.Printf("    Copying doc images -> static/img/versioned/%s/\n", label)
		if err := os.RemoveAll(versionedImgDir); err != nil {
			return err
		}
		if _, err := os.Stat(docImgDir); err == nil {
			if err := copyTree(docImgDir, versionedImgDir); err != nil {
				return fmt.Errorf("copy versioned images: %w", err)
			}
		} else if !os.IsNotExist(err) {
			return err
		}
	}

	bakeScript := filepath.Join(opts.Root, "scripts", "bake-docs.mjs")
	if !opts.SkipBake {
		// Pin llm-d GitHub links to immutable refs so the frozen version keeps
		// pointing at the sources it documents, not at whatever main becomes.
		refs, err := resolveRefs(opts.Root, label, docsDir)
		if err != nil {
			return err
		}
		refJSON, err := json.Marshal(refs)
		if err != nil {
			return err
		}
		fmt.Printf("    Baking preprocess fixups into docs/ (img-base %s)\n", imgBase)
		fmt.Printf("    Pinning source links for %s:\n", label)
		for _, repo := range sortedKeys(refs) {
			fmt.Printf("      %-34s %s\n", repo, refs[repo])
		}
		if _, err := os.Stat(bakeScript); err != nil {
			return fmt.Errorf("bake script not found at %s", bakeScript)
		}
		if err := build.RunNode(opts.Root, bakeScript, "--img-base", imgBase, "--ref-map", string(refJSON)); err != nil {
			return err
		}
	}

	fmt.Printf("    Running docusaurus docs:version %s\n", label)
	if err := build.RunNPX(opts.Root, "docusaurus", "docs:version", label); err != nil {
		return err
	}

	if !opts.NoResync {
		branch := opts.ResyncBranch
		if branch == "" {
			branch = "main"
		}
		fmt.Printf("    Restoring pristine docs/ from llm-d/llm-d @ %s\n", branch)
		m, err := manifest.Load(repo.ManifestPath(opts.Root))
		if err != nil {
			return err
		}
		if err := m.Validate(); err != nil {
			return err
		}
		syncOpts := opts.SyncOpts
		syncOpts.RepoRoot = opts.Root
		syncOpts.Branch = branch
		if _, err := sync.Run(m, syncOpts); err != nil {
			return err
		}
	}

	fmt.Printf("\n✓ cut docs version %s\n", label)
	fmt.Printf("  Review and commit versioned_docs/version-%s/, versioned_sidebars/, versions.json", label)
	if !opts.SkipImages {
		fmt.Printf(", static/img/versioned/%s/", label)
	}
	fmt.Println()
	return nil
}

// resolveRefs returns the immutable source refs for a release and fails if the
// docs link to an llm-d repo the release does not list. A forgotten repo is the
// way a frozen version silently keeps a link on main, so this stops the cut
// rather than warning.
func resolveRefs(root, label, docsDir string) (map[string]string, error) {
	path := srcrefs.Path(root)
	f, err := srcrefs.Load(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("%s not found — it records the refs each released docs version pins its source links to", path)
		}
		return nil, err
	}
	refs, ok := f.For(label)
	if !ok {
		return nil, fmt.Errorf("%s has no entry for release %q (has: %s)\n"+
			"  add one before cutting, with the refs from that release's component table",
			srcrefs.FileName, label, strings.Join(f.Labels(), ", "))
	}
	links, err := srcrefs.Scan(docsDir)
	if err != nil {
		return nil, err
	}
	if unmapped := srcrefs.UnmappedRepos(links, refs); len(unmapped) > 0 {
		return nil, fmt.Errorf("docs/ links to llm-d repos on a moving ref that release %q does not list in %s:%s\n  add a ref for each, then re-run",
			label, srcrefs.FileName, srcrefs.DescribeUnmapped(unmapped))
	}
	return refs, nil
}

func sortedKeys(m map[string]string) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func copyTree(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		return copyFile(path, target)
	})
}

func copyFile(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

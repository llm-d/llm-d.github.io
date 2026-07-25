package version

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/build"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/sync"
)

var semverRE = regexp.MustCompile(`^(\d+\.\d+)(?:\.\d+)?$`)

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
	v := strings.TrimSpace(version)
	m := semverRE.FindStringSubmatch(v)
	if m == nil {
		return "", fmt.Errorf("invalid version %q (expected x.y or x.y.z, e.g. 0.9 or 0.9.0)", version)
	}
	return m[1], nil
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

	bakeScript := filepath.Join(opts.Root, "legacy", "scripts", "bake-docs.mjs")
	if !opts.SkipBake {
		fmt.Printf("    Baking preprocess fixups into docs/ (img-base %s)\n", imgBase)
		if _, err := os.Stat(bakeScript); err != nil {
			return fmt.Errorf("bake script not found at %s", bakeScript)
		}
		if err := build.RunNode(opts.Root, bakeScript, "--img-base", imgBase); err != nil {
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

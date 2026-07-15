package upstream

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"gopkg.in/yaml.v3"
)

// Source is a resolved llm-d/llm-d checkout.
type Source struct {
	Root   string // repo root
	Branch string
	Temp   bool   // remove Root on cleanup when true
}

func (s *Source) DocsDir(m *manifest.Manifest) string {
	return filepath.Join(s.Root, m.Sources.LLMD.Remote.DocsRoot)
}

func (s *Source) GuidesDir() string {
	return filepath.Join(s.Root, "guides")
}

func (s *Source) Cleanup() {
	if s.Temp && s.Root != "" {
		_ = os.RemoveAll(s.Root)
	}
}

// Materialize checks out paths from HEAD in a partial (blob-less) clone.
func (s *Source) Materialize(paths ...string) error {
	if len(paths) == 0 {
		return nil
	}
	args := append([]string{"-C", s.Root, "checkout", "HEAD", "--"}, paths...)
	cmd := exec.Command("git", args...)
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git checkout %v: %w", paths, err)
	}
	return nil
}

// Options controls source resolution.
type Options struct {
	Branch        string
	Local         bool
	Fetch         bool
	LocalConfig   string
	AllowMissing  bool
	CacheDir      string
	RefreshRemote bool
}

// Resolve obtains an upstream source tree.
func Resolve(m *manifest.Manifest, opts Options) (*Source, error) {
	branch := opts.Branch
	if branch == "" {
		branch = m.Sources.LLMD.Remote.DefaultBranch
	}

	if opts.Local {
		path, fetch, err := localPath(m, opts)
		if err != nil {
			return nil, err
		}
		if fetch || opts.Fetch {
			if err := gitFetchReset(path, branch); err != nil {
				return nil, err
			}
		}
		return &Source{Root: path, Branch: branch}, nil
	}

	if env := os.Getenv("LLMD_REPO"); env != "" {
		path := expandHome(env)
		if opts.Fetch || os.Getenv("LLMD_FETCH") == "1" {
			if err := gitFetchReset(path, branch); err != nil {
				return nil, err
			}
		}
		return &Source{Root: path, Branch: branch}, nil
	}

	cache := opts.CacheDir
	if cache == "" {
		cache = filepath.Join(os.TempDir(), "llmd-site-cache")
	}
	dest := filepath.Join(cache, "llm-d-"+sanitizeBranch(branch))
	if err := os.MkdirAll(cache, 0o755); err != nil {
		return nil, err
	}

	if opts.RefreshRemote {
		_ = os.RemoveAll(dest)
	}

	if isGitRepo(dest) {
		if err := gitFetchReset(dest, branch); err != nil {
			fmt.Fprintf(os.Stderr, "    ! cached upstream clone unusable, re-cloning: %v\n", err)
			_ = os.RemoveAll(dest)
		} else {
			return &Source{Root: dest, Branch: branch, Temp: false}, nil
		}
	} else if dirExists(dest) {
		_ = os.RemoveAll(dest)
	}

	return cloneUpstream(m, branch, "", dest)
}

func cloneUpstream(m *manifest.Manifest, branch, url, dest string) (*Source, error) {
	if url == "" {
		url = m.Sources.LLMD.Remote.URL
	}
	if !strings.HasSuffix(url, ".git") {
		url += ".git"
	}
	cmd := exec.Command("git", "clone", "--depth", "1", "--branch", branch, "--filter=blob:none", url, dest)
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("clone %s @ %s: %w", url, branch, err)
	}
	return &Source{Root: dest, Branch: branch, Temp: false}, nil
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func isGitRepo(path string) bool {
	cmd := exec.Command("git", "-C", path, "rev-parse", "--git-dir")
	cmd.Stderr = nil
	return cmd.Run() == nil
}

type localOverrides struct {
	Sources struct {
		LLMD struct {
			Path  string `yaml:"path"`
			Fetch bool   `yaml:"fetch"`
		} `yaml:"llm-d"`
	} `yaml:"sources"`
}

func localPath(m *manifest.Manifest, opts Options) (string, bool, error) {
	path := expandHome(m.Sources.LLMD.Local.Path)
	fetch := m.Sources.LLMD.Local.Fetch

	if opts.LocalConfig != "" {
		data, err := os.ReadFile(opts.LocalConfig)
		if err != nil && !os.IsNotExist(err) {
			return "", false, err
		}
		if err == nil {
			var o localOverrides
			if err := yaml.Unmarshal(data, &o); err != nil {
				return "", false, fmt.Errorf("parse local config: %w", err)
			}
			if o.Sources.LLMD.Path != "" {
				path = expandHome(o.Sources.LLMD.Path)
			}
			if o.Sources.LLMD.Fetch {
				fetch = true
			}
		}
	}

	if path == "" {
		return "", false, fmt.Errorf("--local requires sources.llm-d.path in manifest or llmd-site.local.yaml")
	}
	if _, err := os.Stat(path); err != nil {
		return "", false, fmt.Errorf("local upstream not found at %s: %w", path, err)
	}
	return path, fetch, nil
}

func gitFetchReset(repo, branch string) error {
	fetch := exec.Command("git", "-C", repo, "fetch", "origin", branch, "--quiet")
	fetch.Stderr = os.Stderr
	if err := fetch.Run(); err != nil {
		return fmt.Errorf("git fetch: %w", err)
	}
	reset := exec.Command("git", "-C", repo, "reset", "--hard", "origin/"+branch, "--quiet")
	reset.Stderr = os.Stderr
	if err := reset.Run(); err != nil {
		return fmt.Errorf("git reset: %w", err)
	}
	return nil
}

func expandHome(path string) string {
	if path == "" {
		return path
	}
	if path[0] == '~' {
		home, err := os.UserHomeDir()
		if err != nil {
			return path
		}
		return filepath.Join(home, strings.TrimPrefix(path, "~/"))
	}
	return path
}

func sanitizeBranch(branch string) string {
	return strings.NewReplacer("/", "_", "\\", "_", ":", "_").Replace(branch)
}

// Exists checks whether a path exists under upstream docs root (from is relative to docs/).
func (s *Source) Exists(docsRoot, rel string) bool {
	rel = strings.TrimPrefix(rel, "docs/")
	p := filepath.Join(docsRoot, rel)
	_, err := os.Stat(p)
	return err == nil
}

func (s *Source) ExistsDir(docsRoot, rel string) bool {
	rel = strings.TrimPrefix(rel, "docs/")
	p := filepath.Join(docsRoot, rel)
	info, err := os.Stat(p)
	return err == nil && info.IsDir()
}

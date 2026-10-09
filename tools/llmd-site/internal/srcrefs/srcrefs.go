// Package srcrefs reads source-refs.yaml, the immutable GitHub refs that
// released docs versions pin their llm-d source links to.
//
// A released version under versioned_docs/ is frozen content, so its links must
// be frozen too. Links left on `main` break as the source repos move. The cut
// rewrites them to the ref recorded for that release; the dev docs keep
// tracking `main` on purpose.
//
// Scope: this covers github.com/llm-d/<repo>/{tree,blob,raw}/<ref> links, which
// is every form the docs use today. raw.githubusercontent.com puts the ref
// straight after the repo and so needs its own pattern; nothing links that way
// at present, in the released versions or upstream, so it is deliberately not
// handled. Add it here and in bake-docs.mjs if that changes, or such a link
// will stay on `main` without any check noticing.
package srcrefs

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"gopkg.in/yaml.v3"
)

const CurrentVersion = 1

// FileName is the repo-root config file.
const FileName = "source-refs.yaml"

// Path returns the config path for a repo root.
func Path(root string) string { return filepath.Join(root, FileName) }

// File is the parsed source-refs.yaml.
type File struct {
	Version int `yaml:"version"`
	// Releases maps a docs version label ("0.10") to repo ("llm-d/llm-d-router")
	// to an immutable ref ("v0.11.0").
	Releases map[string]map[string]string `yaml:"releases"`
}

var (
	// labelRE is a Docusaurus docs version label.
	labelRE = regexp.MustCompile(`^\d+\.\d+$`)
	// repoRE is a GitHub owner/name pair.
	repoRE = regexp.MustCompile(`^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$`)
	// immutableTagRE is a tag with at least three numeric components, so it
	// names one release and cannot be repointed at the next patch. Bare minor
	// tags ("v0.10") are excluded deliberately: llm-d moves them.
	immutableTagRE = regexp.MustCompile(`^v?\d+\.\d+\.\d+(\.\d+)*(-[0-9A-Za-z.-]+)?$`)
	// shaRE is a full commit SHA. An abbreviated one is not required to stay
	// unambiguous, and short hex is indistinguishable from a branch name —
	// "deadbeef" would otherwise count as immutable.
	shaRE = regexp.MustCompile(`^[0-9a-f]{40}$`)
)

// labelFromVersionRE accepts x.y or x.y.z and captures the x.y label.
var labelFromVersionRE = regexp.MustCompile(`^(\d+\.\d+)(?:\.\d+)?$`)

// NormalizeLabel returns the Docusaurus version label (major.minor) for a
// version written either way, so 0.10 and 0.10.0 both resolve to "0.10".
func NormalizeLabel(version string) (string, error) {
	m := labelFromVersionRE.FindStringSubmatch(strings.TrimSpace(version))
	if m == nil {
		return "", fmt.Errorf("invalid version %q (expected x.y or x.y.z, e.g. 0.9 or 0.9.0)", version)
	}
	return m[1], nil
}

// Immutable reports whether ref names a fixed point in history.
func Immutable(ref string) bool {
	return immutableTagRE.MatchString(ref) || shaRE.MatchString(ref)
}

// Load reads and validates source-refs.yaml.
func Load(path string) (*File, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var f File
	if err := yaml.Unmarshal(data, &f); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}
	if err := f.Validate(); err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	return &f, nil
}

// Validate checks the schema and that every ref is immutable.
func (f *File) Validate() error {
	if f.Version != CurrentVersion {
		return fmt.Errorf("unsupported version %d (want %d)", f.Version, CurrentVersion)
	}
	if len(f.Releases) == 0 {
		return fmt.Errorf("no releases listed")
	}
	for _, label := range sortedKeys(f.Releases) {
		if !labelRE.MatchString(label) {
			return fmt.Errorf("release %q: not a docs version label like \"0.10\"", label)
		}
		repos := f.Releases[label]
		if len(repos) == 0 {
			return fmt.Errorf("release %q: no repos listed", label)
		}
		for _, repo := range sortedKeys(repos) {
			ref := repos[repo]
			if !repoRE.MatchString(repo) {
				return fmt.Errorf("release %q: %q is not an owner/name repo", label, repo)
			}
			if ref == "" {
				return fmt.Errorf("release %q: %s has no ref", label, repo)
			}
			if !Immutable(ref) {
				return fmt.Errorf("release %q: %s ref %q is not immutable — use a full vX.Y.Z tag or a commit SHA (minor tags like v0.10 get repointed)", label, repo, ref)
			}
		}
	}
	return nil
}

// For returns the ref map for a docs version label.
func (f *File) For(label string) (map[string]string, bool) {
	repos, ok := f.Releases[label]
	return repos, ok
}

// Labels returns the configured version labels, sorted.
func (f *File) Labels() []string { return sortedKeys(f.Releases) }

// linkRE matches a GitHub source link into an llm-d repo, capturing the repo,
// the ref and the path.
//
// The ref class is positive, not an exclusion list: a git ref may only hold
// letters, digits, ".", "_", "-" and "+" (a "/" would be ambiguous with the
// path that follows). That keeps structural characters out of the ref, so
// "**<url>/tree/main**" yields "main" rather than "main**", and the path group
// is either empty or starts with "/" so the trailing "**" is not read as a path.
//
// scripts/bake-docs.mjs uses the same class for the same reason. Both are
// exercised against one fixture list by TestBakeAgreesWithScanner, so a change
// to either boundary fails the build rather than silently leaving links on main.
var linkRE = regexp.MustCompile(
	`github\.com/(llm-d/[A-Za-z0-9._-]+)/(?:tree|blob|raw)/([A-Za-z0-9._+-]+)((?:/[^\s"'` + "`" + `)\]>?#]*)?)`)

// trimRefPunct drops sentence punctuation that the ref group can absorb when a
// bare URL ends a clause: in "see .../tree/main." the ref is captured as
// "main.". No real ref ends in "." or ",", so trimming is always right, and
// leaving it would make a rewrite eat the punctuation.
func trimRefPunct(ref string) string { return strings.TrimRight(ref, ".,") }

// Link is one GitHub source link found in a Markdown file.
type Link struct {
	File string // path of the Markdown file
	Repo string // "llm-d/llm-d-router"
	Ref  string // "v0.11.0", or "main" if unpinned
	Path string // repo-relative path, leading "/" kept, may be empty
}

// Unpinned reports whether the link still tracks a moving branch.
func (l Link) Unpinned() bool { return !Immutable(l.Ref) }

// TreePath returns the repo-relative path with no leading or trailing slash.
func (l Link) TreePath() string {
	return strings.Trim(strings.TrimRight(l.Path, ".,"), "/")
}

// Scan walks dir and returns every llm-d GitHub source link in its Markdown.
func Scan(dir string) ([]Link, error) {
	var out []Link
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
		data, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		for _, m := range linkRE.FindAllStringSubmatch(string(data), -1) {
			out = append(out, Link{File: p, Repo: m[1], Ref: trimRefPunct(m[2]), Path: m[3]})
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

// UnmappedRepos returns the llm-d repos in links that still track a moving ref
// but have no entry in refs, with a count of links each.
func UnmappedRepos(links []Link, refs map[string]string) map[string]int {
	out := map[string]int{}
	for _, l := range links {
		if !l.Unpinned() {
			continue
		}
		if _, ok := refs[l.Repo]; !ok {
			out[l.Repo]++
		}
	}
	return out
}

// DescribeUnmapped renders UnmappedRepos as a stable, readable list.
func DescribeUnmapped(unmapped map[string]int) string {
	var b strings.Builder
	for _, repo := range sortedKeys(unmapped) {
		fmt.Fprintf(&b, "\n    %s (%d link(s))", repo, unmapped[repo])
	}
	return b.String()
}

func sortedKeys[V any](m map[string]V) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

package check

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/srcrefs"
)

// SourceRefOptions configures CheckSourceRefs.
type SourceRefOptions struct {
	// Dir is the tree to scan, relative to the repo root. Default versioned_docs.
	Dir string
	// Version limits the check to one docs version label, e.g. "0.10".
	Version string
	// WarnOnly reports problems but returns exit code 0.
	WarnOnly bool
}

// CheckSourceRefs verifies the llm-d source links in released docs versions:
// every link resolves at the ref it names, and every ref agrees with
// source-refs.yaml. It returns a process exit code.
//
// This is the check that catches a wrong ref. A ref from the wrong release
// usually still resolves for most paths, so nothing looks broken until a reader
// follows a link into code that moved — which is how the released versions
// drifted in the first place. Comparing every linked path against the tree at
// the pinned ref is what makes that visible.
func CheckSourceRefs(root string, opts SourceRefOptions) (int, error) {
	dir := opts.Dir
	if dir == "" {
		dir = "versioned_docs"
	}
	scanDir := filepath.Join(root, dir)
	if _, err := os.Stat(scanDir); err != nil {
		return 1, fmt.Errorf("nothing to check at %s: %w", scanDir, err)
	}

	cfg, err := srcrefs.Load(srcrefs.Path(root))
	if err != nil {
		return 1, err
	}

	// Accept the forms `version cut` accepts, so 0.10 and 0.10.0 both work.
	// Silently checking nothing because the label did not match a directory
	// would turn the post-cut verification step into a no-op that reports
	// success, so an unmatched filter is an error.
	wantVersion := opts.Version
	if wantVersion != "" {
		wantVersion, err = srcrefs.NormalizeLabel(wantVersion)
		if err != nil {
			return 1, err
		}
		if _, err := os.Stat(filepath.Join(scanDir, "version-"+wantVersion)); err != nil {
			return 1, fmt.Errorf("no snapshot at %s/version-%s — nothing to check for release %s",
				dir, wantVersion, wantVersion)
		}
	}

	links, err := srcrefs.Scan(scanDir)
	if err != nil {
		return 1, err
	}
	fmt.Printf("==> Checking source refs in %s\n", dir)

	problemSet := map[string]bool{}
	problem := func(format string, a ...any) { problemSet[fmt.Sprintf(format, a...)] = true }
	// Only the fixes that apply to the problems actually found are printed.
	// `version repin` is not one of them for an unlisted repo or release: it
	// rewrites links for repos a release lists, and iterates only the releases
	// in source-refs.yaml, so it would leave those untouched.
	remedySet := map[string]bool{}
	remedy := func(format string, a ...any) { remedySet[fmt.Sprintf(format, a...)] = true }
	type target struct {
		repo string
		ref  string
	}
	paths := map[target]map[string][]srcrefs.Link{}

	considered := 0
	for _, l := range links {
		label := versionLabel(scanDir, l.File)
		if wantVersion != "" && label != wantVersion {
			continue
		}
		considered++
		// Every repo/ref pair is resolved, even when no link carries a path, so
		// a ref used only by repo-root links still has its existence checked.
		t := target{l.Repo, l.Ref}
		if paths[t] == nil {
			paths[t] = map[string][]srcrefs.Link{}
		}
		// Compare the ref in the content with the one configured for the
		// release. An empty label means the file is not under a version-<x.y>
		// directory (--dir docs, say), so there is no release to compare
		// against — the paths are still verified.
		if refs, ok := cfg.For(label); ok && label != "" {
			if want, mapped := refs[l.Repo]; mapped && l.Ref != want {
				problem("%s: %s is at %s, but %s lists %s for release %s",
					rel(root, l.File), l.Repo, l.Ref, srcrefs.FileName, want, label)
				remedy("run `llmd-site version repin` to set the listed repos' links to their recorded refs")
				if srcrefs.Immutable(l.Ref) {
					// A listed repo shares one ref across all its links. Pinning
					// one link elsewhere means dropping the repo from the
					// release, which puts every one of its links under the
					// immutable-ref rule instead.
					remedy("or, if %s needs per-link refs for release %s, remove it from %s and pin each of its links inline to an immutable ref",
						l.Repo, label, srcrefs.FileName)
				}
				continue
			} else if !mapped && l.Unpinned() {
				problem("%s: %s tracks %q and release %s has no ref for it in %s",
					rel(root, l.File), l.Repo, l.Ref, label, srcrefs.FileName)
				remedy("add a ref for %s under release %q in %s, or pin that link inline to an immutable ref",
					l.Repo, label, srcrefs.FileName)
				continue
			}
		} else if label != "" && l.Unpinned() {
			problem("%s: %s tracks %q and release %s is not listed in %s",
				rel(root, l.File), l.Repo, l.Ref, label, srcrefs.FileName)
			remedy("add a %q entry to %s listing a ref for each llm-d repo that release links to",
				label, srcrefs.FileName)
			continue
		}
		if p := l.TreePath(); p != "" {
			paths[t][p] = append(paths[t][p], l)
		}
	}

	gh := &githubTrees{
		client: newHTTPClient(30 * time.Second),
		token:  os.Getenv("GITHUB_TOKEN"),
		cache:  map[string]map[string]bool{},
	}
	if gh.token == "" {
		fmt.Println("    No GITHUB_TOKEN set — unauthenticated API rate limits apply")
	}

	targets := make([]target, 0, len(paths))
	for t := range paths {
		targets = append(targets, t)
	}
	sort.Slice(targets, func(i, j int) bool {
		if targets[i].repo != targets[j].repo {
			return targets[i].repo < targets[j].repo
		}
		return targets[i].ref < targets[j].ref
	})

	checked := 0
	for _, t := range targets {
		tree, err := gh.tree(t.repo, t.ref)
		if err != nil {
			problem("%s@%s: %v", t.repo, t.ref, err)
			remedy("check the ref for %s in %s names a tag that exists upstream", t.repo, srcrefs.FileName)
			continue
		}
		missing := 0
		for _, p := range sortedStrings(paths[t]) {
			checked++
			if tree[p] {
				continue
			}
			missing++
			files := map[string]bool{}
			for _, l := range paths[t][p] {
				files[rel(root, l.File)] = true
			}
			problem("%s@%s/%s does not exist (linked from %s)",
				t.repo, t.ref, p, strings.Join(sortedBoolKeys(files), ", "))
			remedy("correct the path, or the %s ref in %s if that release documents a different tree",
				t.repo, srcrefs.FileName)
		}
		status := "ok"
		if missing > 0 {
			status = fmt.Sprintf("%d missing", missing)
		}
		fmt.Printf("    %-34s %-10s %3d path(s)  %s\n", t.repo, t.ref, len(paths[t]), status)
	}

	fmt.Printf("\n    %d link(s), %d path(s) verified across %d repo/ref pair(s)\n",
		considered, checked, len(targets))

	if len(problemSet) == 0 {
		fmt.Println("✓ source refs valid")
		return 0, nil
	}
	problems := sortedBoolKeys(problemSet)
	fmt.Printf("\n%d problem(s):\n", len(problems))
	const maxShown = 25
	for i, p := range problems {
		if i == maxShown {
			fmt.Printf("  … and %d more\n", len(problems)-maxShown)
			break
		}
		fmt.Printf("  - %s\n", p)
	}
	if len(remedySet) > 0 {
		fmt.Println("\nTo fix:")
		for _, m := range sortedBoolKeys(remedySet) {
			fmt.Printf("  - %s\n", m)
		}
	}
	if opts.WarnOnly {
		return 0, nil
	}
	return 1, nil
}

// versionLabel maps versioned_docs/version-0.10/a/b.md to "0.10". It returns ""
// for a file that is not inside a version-<x.y> directory, rather than invent a
// release name from whatever the first path segment happens to be.
func versionLabel(scanDir, file string) string {
	r, err := filepath.Rel(scanDir, file)
	if err != nil {
		return ""
	}
	parts := strings.Split(r, string(filepath.Separator))
	if len(parts) < 2 || !strings.HasPrefix(parts[0], "version-") {
		return ""
	}
	return strings.TrimPrefix(parts[0], "version-")
}

func rel(root, p string) string {
	if r, err := filepath.Rel(root, p); err == nil {
		return r
	}
	return p
}

// githubTrees fetches and caches repo trees.
type githubTrees struct {
	client *http.Client
	token  string
	cache  map[string]map[string]bool
}

// tree returns the set of paths in repo at ref.
func (g *githubTrees) tree(repo, ref string) (map[string]bool, error) {
	key := repo + "@" + ref
	if t, ok := g.cache[key]; ok {
		return t, nil
	}
	url := fmt.Sprintf("https://api.github.com/repos/%s/git/trees/%s?recursive=1", repo, ref)
	var body struct {
		Truncated bool `json:"truncated"`
		Tree      []struct {
			Path string `json:"path"`
		} `json:"tree"`
	}
	if err := g.get(url, &body); err != nil {
		return nil, err
	}
	if body.Truncated {
		// The trees API caps a recursive listing. Nothing here can tell a
		// genuinely missing path from a truncated one, so refuse rather than
		// report false failures.
		return nil, fmt.Errorf("tree listing truncated — too large to verify in one request")
	}
	t := make(map[string]bool, len(body.Tree))
	for _, e := range body.Tree {
		t[e.Path] = true
	}
	g.cache[key] = t
	return t, nil
}

func (g *githubTrees) get(url string, out any) error {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if g.token != "" {
		req.Header.Set("Authorization", "Bearer "+g.token)
	}
	resp, err := g.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return apiError(resp)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// apiError describes a failed GitHub response. A 403 is not necessarily a rate
// limit — an under-scoped token, or a repository the token cannot read, returns
// one too — so the API's own message is reported rather than guessed at.
func apiError(resp *http.Response) error {
	var body struct {
		Message string `json:"message"`
	}
	_ = json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&body)
	msg := strings.TrimSpace(body.Message)

	hint := ""
	switch resp.StatusCode {
	case http.StatusNotFound:
		if msg == "" {
			return fmt.Errorf("ref not found")
		}
		return fmt.Errorf("ref not found: %s", msg)
	case http.StatusForbidden, http.StatusTooManyRequests:
		if resp.Header.Get("X-RateLimit-Remaining") == "0" {
			hint = " (rate limited; wait for the reset or use a token with more quota)"
		} else if os.Getenv("GITHUB_TOKEN") == "" {
			hint = " (no GITHUB_TOKEN set)"
		}
	}
	if msg == "" {
		return fmt.Errorf("HTTP %d%s", resp.StatusCode, hint)
	}
	return fmt.Errorf("HTTP %d: %s%s", resp.StatusCode, msg, hint)
}

func sortedStrings[V any](m map[string]V) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func sortedBoolKeys(m map[string]bool) []string { return sortedStrings(m) }

package srcrefs

import (
	"os"
	"path/filepath"
	"testing"
)

func TestImmutable(t *testing.T) {
	for _, ref := range []string{
		"v0.11.0", "0.11.0", "v0.0.15", "v0.6.8.1", "v0.8.0-rc.1",
		"d6ffb5c7cff80e3953c62f464c08984ccd6a6096",
	} {
		if !Immutable(ref) {
			t.Errorf("Immutable(%q) = false, want true", ref)
		}
	}
	for _, ref := range []string{
		// Minor tags are the trap: llm-d repoints them. v0.8 was moved to
		// v0.8.1, and v0.9 sits 29 commits short of v0.9.0.
		"v0.10", "v0.9", "main", "release-0.9", "", "latest", "v1",
		// Short hex is indistinguishable from a branch name, so only a full
		// 40-character SHA counts.
		"f22bbaf", "deadbeef", "cafe123",
	} {
		if Immutable(ref) {
			t.Errorf("Immutable(%q) = true, want false", ref)
		}
	}
}

func TestNormalizeLabel(t *testing.T) {
	for in, want := range map[string]string{
		"0.10": "0.10", "0.10.0": "0.10", " 0.9 ": "0.9", "1.0.3": "1.0",
	} {
		got, err := NormalizeLabel(in)
		if err != nil || got != want {
			t.Errorf("NormalizeLabel(%q) = (%q, %v), want (%q, nil)", in, got, err, want)
		}
	}
	for _, in := range []string{"", "dev", "v0.10", "0", "0.10.0.1", "latest"} {
		if _, err := NormalizeLabel(in); err == nil {
			t.Errorf("NormalizeLabel(%q) = nil error, want one", in)
		}
	}
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name    string
		file    File
		wantErr bool
	}{
		{
			name: "valid",
			file: File{Version: 1, Releases: map[string]map[string]string{
				"0.10": {"llm-d/llm-d": "v0.10.0"},
			}},
		},
		{
			name: "wrong schema version",
			file: File{Version: 2, Releases: map[string]map[string]string{
				"0.10": {"llm-d/llm-d": "v0.10.0"},
			}},
			wantErr: true,
		},
		{
			name:    "no releases",
			file:    File{Version: 1},
			wantErr: true,
		},
		{
			name: "mutable ref",
			file: File{Version: 1, Releases: map[string]map[string]string{
				"0.10": {"llm-d/llm-d": "v0.10"},
			}},
			wantErr: true,
		},
		{
			name: "0.1 is a valid label",
			file: File{Version: 1, Releases: map[string]map[string]string{
				"0.1": {"llm-d/llm-d": "v0.10.0"},
			}},
		},
		{
			name: "label not a version",
			file: File{Version: 1, Releases: map[string]map[string]string{
				"dev": {"llm-d/llm-d": "v0.10.0"},
			}},
			wantErr: true,
		},
		{
			name: "repo missing owner",
			file: File{Version: 1, Releases: map[string]map[string]string{
				"0.10": {"llm-d": "v0.10.0"},
			}},
			wantErr: true,
		},
		{
			name: "empty ref",
			file: File{Version: 1, Releases: map[string]map[string]string{
				"0.10": {"llm-d/llm-d": ""},
			}},
			wantErr: true,
		},
		{
			name: "release with no repos",
			file: File{Version: 1, Releases: map[string]map[string]string{
				"0.10": {},
			}},
			wantErr: true,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.file.Validate()
			if tc.wantErr && err == nil {
				t.Fatal("Validate() = nil, want error")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("Validate() = %v, want nil", err)
			}
		})
	}
}

func TestScan(t *testing.T) {
	dir := t.TempDir()
	write(t, filepath.Join(dir, "a.md"), `
See [scheduling](https://github.com/llm-d/llm-d-router/tree/v0.11.0/pkg/epp/framework) and
[the guide](https://github.com/llm-d/llm-d/blob/main/guides/README.md).
Also [raw](https://github.com/llm-d/llm-d-kv-cache/raw/v0.9.0/README.md).
Not an llm-d repo: https://github.com/kubernetes-sigs/gateway-api/tree/main/apix
`)
	write(t, filepath.Join(dir, "b.mdx"), "<a href=\"https://github.com/llm-d/llm-d-async/tree/main\">async</a>\n")
	write(t, filepath.Join(dir, "skip.txt"), "https://github.com/llm-d/llm-d/tree/main/nope\n")

	links, err := Scan(dir)
	if err != nil {
		t.Fatalf("Scan() = %v", err)
	}
	if len(links) != 4 {
		t.Fatalf("Scan() found %d links, want 4: %+v", len(links), links)
	}

	byRepo := map[string]Link{}
	for _, l := range links {
		byRepo[l.Repo] = l
	}
	for repo, want := range map[string]struct {
		ref      string
		treePath string
		unpinned bool
	}{
		"llm-d/llm-d-router":   {"v0.11.0", "pkg/epp/framework", false},
		"llm-d/llm-d":          {"main", "guides/README.md", true},
		"llm-d/llm-d-kv-cache": {"v0.9.0", "README.md", false},
		"llm-d/llm-d-async":    {"main", "", true},
	} {
		got, ok := byRepo[repo]
		if !ok {
			t.Errorf("no link found for %s", repo)
			continue
		}
		if got.Ref != want.ref {
			t.Errorf("%s ref = %q, want %q", repo, got.Ref, want.ref)
		}
		if got.TreePath() != want.treePath {
			t.Errorf("%s TreePath() = %q, want %q", repo, got.TreePath(), want.treePath)
		}
		if got.Unpinned() != want.unpinned {
			t.Errorf("%s Unpinned() = %v, want %v", repo, got.Unpinned(), want.unpinned)
		}
	}
}

// A bare URL ending a clause lets the ref group absorb the punctuation, so the
// captured ref must be trimmed — otherwise a rewrite eats the full stop.
func TestScanTrimsRefPunctuation(t *testing.T) {
	dir := t.TempDir()
	write(t, filepath.Join(dir, "a.md"), `
Period: see https://github.com/llm-d/llm-d-router/tree/main.
Comma: see https://github.com/llm-d/llm-d-kv-cache/tree/v0.9.0, and more.
Path then period: https://github.com/llm-d/llm-d-async/tree/main/pkg/epp.
Dotted file is not punctuation: https://github.com/llm-d/llm-d/blob/main/README.md
`)
	links, err := Scan(dir)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]struct{ ref, path string }{
		"llm-d/llm-d-router":   {"main", ""},
		"llm-d/llm-d-kv-cache": {"v0.9.0", ""},
		"llm-d/llm-d-async":    {"main", "pkg/epp"},
		"llm-d/llm-d":          {"main", "README.md"},
	}
	if len(links) != len(want) {
		t.Fatalf("Scan() found %d links, want %d: %+v", len(links), len(want), links)
	}
	for _, l := range links {
		w, ok := want[l.Repo]
		if !ok {
			t.Errorf("unexpected repo %s", l.Repo)
			continue
		}
		if l.Ref != w.ref {
			t.Errorf("%s ref = %q, want %q", l.Repo, l.Ref, w.ref)
		}
		if l.TreePath() != w.path {
			t.Errorf("%s TreePath() = %q, want %q", l.Repo, l.TreePath(), w.path)
		}
	}
}

func TestUnmappedRepos(t *testing.T) {
	links := []Link{
		{Repo: "llm-d/llm-d", Ref: "main"},
		{Repo: "llm-d/llm-d-router", Ref: "main"},
		{Repo: "llm-d/llm-d-router", Ref: "main"},
		{Repo: "llm-d/llm-d-kv-cache", Ref: "v0.9.0"},
	}
	got := UnmappedRepos(links, map[string]string{"llm-d/llm-d": "v0.10.0"})
	if len(got) != 1 || got["llm-d/llm-d-router"] != 2 {
		t.Fatalf("UnmappedRepos() = %v, want {llm-d/llm-d-router: 2}", got)
	}
	if DescribeUnmapped(got) == "" {
		t.Error("DescribeUnmapped() = empty")
	}
}

// TestLoadCommitted checks the file this repo actually ships, so a bad ref
// cannot be committed without a test failure.
func TestLoadCommitted(t *testing.T) {
	root, err := filepath.Abs(filepath.Join("..", "..", "..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	path := Path(root)
	if _, err := os.Stat(path); err != nil {
		t.Skipf("%s not present", path)
	}
	f, err := Load(path)
	if err != nil {
		t.Fatalf("Load(%s) = %v", path, err)
	}
	if len(f.Labels()) == 0 {
		t.Error("no releases loaded")
	}
	for _, label := range f.Labels() {
		refs, ok := f.For(label)
		if !ok || len(refs) == 0 {
			t.Errorf("release %s has no refs", label)
		}
	}
}

func write(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

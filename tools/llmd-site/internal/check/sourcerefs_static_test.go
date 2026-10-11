package check

import (
	"os"
	"path/filepath"
	"testing"
)

const staticConfig = `version: 1
releases:
  "0.10":
    llm-d/llm-d-router: v0.11.0
`

// TestCheckSourceRefsStatic covers the form wired into `llmd-site ci`, which
// gates every PR.
//
// The cases with an unresolvable repo are the point: `source-refs.yaml` names a
// repository that cannot exist, so if the static path ever started resolving
// refs — because the early return moved below the githubTrees setup, say — these
// would fail or, worse, start depending on the GitHub API from CI and flake on
// rate limits. Passing without a token and without network access is the
// assertion.
func TestCheckSourceRefsStatic(t *testing.T) {
	tests := []struct {
		name     string
		config   string
		page     string
		wantCode int
	}{
		{
			name:     "listed repo on its recorded ref",
			config:   staticConfig,
			page:     "[a](https://github.com/llm-d/llm-d-router/tree/v0.11.0/pkg/epp)\n",
			wantCode: 0,
		},
		{
			name:     "listed repo still on main",
			config:   staticConfig,
			page:     "[a](https://github.com/llm-d/llm-d-router/tree/main/pkg/epp)\n",
			wantCode: 1,
		},
		{
			name:     "listed repo on a mutable minor tag",
			config:   staticConfig,
			page:     "[a](https://github.com/llm-d/llm-d-router/tree/v0.10/pkg/epp)\n",
			wantCode: 1,
		},
		{
			name:     "listed repo on a ref from another release",
			config:   staticConfig,
			page:     "[a](https://github.com/llm-d/llm-d-router/tree/v0.9.0/pkg/epp)\n",
			wantCode: 1,
		},
		{
			name:     "unlisted repo pinned inline is allowed",
			config:   staticConfig,
			page:     "[a](https://github.com/llm-d/llm-d-benchmark/tree/v0.5.0/config_explorer)\n",
			wantCode: 0,
		},
		{
			name:     "unlisted repo on main is not",
			config:   staticConfig,
			page:     "[a](https://github.com/llm-d/llm-d-benchmark/tree/main/config_explorer)\n",
			wantCode: 1,
		},
		{
			name:     "another org is never checked",
			config:   staticConfig,
			page:     "[a](https://github.com/kubernetes-sigs/gateway-api/tree/main/apix)\n",
			wantCode: 0,
		},
		{
			// No network: the ref matches the config, so nothing is resolved —
			// which is the only reason a repository that cannot exist passes.
			name:     "unresolvable repo passes when the ref matches",
			config:   "version: 1\nreleases:\n  \"0.10\":\n    llm-d/llm-d-no-such-repo-9c1f: v9.9.9\n",
			page:     "[a](https://github.com/llm-d/llm-d-no-such-repo-9c1f/tree/v9.9.9/x)\n",
			wantCode: 0,
		},
		{
			name:     "release with no entry at all",
			config:   "version: 1\nreleases:\n  \"0.9\":\n    llm-d/llm-d-router: v0.10.0\n",
			page:     "[a](https://github.com/llm-d/llm-d-router/tree/main/pkg)\n",
			wantCode: 1,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			root := staticRoot(t, tc.config, tc.page)
			code, err := CheckSourceRefs(root, SourceRefOptions{Static: true})
			if err != nil {
				t.Fatalf("CheckSourceRefs() = %v", err)
			}
			if code != tc.wantCode {
				t.Errorf("CheckSourceRefs(static) = %d, want %d", code, tc.wantCode)
			}
		})
	}
}

// TestCheckSourceRefsStaticWarnOnly checks the reporting-only form still exits 0.
func TestCheckSourceRefsStaticWarnOnly(t *testing.T) {
	root := staticRoot(t, staticConfig,
		"[a](https://github.com/llm-d/llm-d-router/tree/main/pkg)\n")
	code, err := CheckSourceRefs(root, SourceRefOptions{Static: true, WarnOnly: true})
	if err != nil {
		t.Fatalf("CheckSourceRefs() = %v", err)
	}
	if code != 0 {
		t.Errorf("CheckSourceRefs(static, warn-only) = %d, want 0", code)
	}
}

// TestCheckSourceRefsVersionFilter guards the post-cut verification step: a
// label that matches no snapshot must fail rather than check nothing and report
// success, and the semver form the cut accepts must resolve to the same label.
func TestCheckSourceRefsVersionFilter(t *testing.T) {
	root := staticRoot(t, staticConfig,
		"[a](https://github.com/llm-d/llm-d-router/tree/main/pkg)\n")

	for _, version := range []string{"0.10", "0.10.0"} {
		code, err := CheckSourceRefs(root, SourceRefOptions{Static: true, Version: version})
		if err != nil {
			t.Fatalf("--version %s = %v", version, err)
		}
		if code != 1 {
			t.Errorf("--version %s = %d, want 1 (the page is still on main)", version, code)
		}
	}

	for _, version := range []string{"0.11", "nonsense"} {
		if _, err := CheckSourceRefs(root, SourceRefOptions{Static: true, Version: version}); err == nil {
			t.Errorf("--version %s = nil error, want one: checking nothing must not report success", version)
		}
	}
}

// staticRoot builds a repo root holding source-refs.yaml and one 0.10 page.
func staticRoot(t *testing.T, config, page string) string {
	t.Helper()
	root := t.TempDir()
	dir := filepath.Join(root, "versioned_docs", "version-0.10")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "source-refs.yaml"), []byte(config), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "page.md"), []byte(page), 0o644); err != nil {
		t.Fatal(err)
	}
	return root
}

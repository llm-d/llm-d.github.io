package version

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const validConfig = `version: 1
releases:
  "0.10":
    llm-d/llm-d: v0.10.0
    llm-d/llm-d-router: v0.11.0
`

// resolveRefs is the guard that stops a cut from freezing a link on main.
// These cases are the ways that guard is reached.
func TestResolveRefs(t *testing.T) {
	tests := []struct {
		name    string
		config  string // "" writes no file
		docs    string
		label   string
		wantErr string // substring
		wantRef map[string]string
	}{
		{
			name:    "pins every linked repo",
			config:  validConfig,
			docs:    "[a](https://github.com/llm-d/llm-d-router/tree/main/pkg) [b](https://github.com/llm-d/llm-d/tree/main/guides)\n",
			label:   "0.10",
			wantRef: map[string]string{"llm-d/llm-d": "v0.10.0", "llm-d/llm-d-router": "v0.11.0"},
		},
		{
			name:    "repo linked but not listed",
			config:  validConfig,
			docs:    "[a](https://github.com/llm-d/llm-d-async/tree/main/README.md)\n",
			label:   "0.10",
			wantErr: "llm-d/llm-d-async",
		},
		{
			name:    "release not listed",
			config:  validConfig,
			docs:    "[a](https://github.com/llm-d/llm-d/tree/main/guides)\n",
			label:   "1.0",
			wantErr: `no entry for release "1.0"`,
		},
		{
			// Decoding into map[string]... keeps the key's literal text, so an
			// unquoted 0.10 does not become 0.1. source-refs.yaml quotes the
			// labels anyway, to keep them obviously strings.
			name:    "unquoted label still reads as a string",
			config:  "version: 1\nreleases:\n  0.10:\n    llm-d/llm-d: v0.10.0\n",
			docs:    "[a](https://github.com/llm-d/llm-d/tree/main/guides)\n",
			label:   "0.10",
			wantRef: map[string]string{"llm-d/llm-d": "v0.10.0"},
		},
		{
			name:    "mutable ref rejected",
			config:  "version: 1\nreleases:\n  \"0.10\":\n    llm-d/llm-d: v0.10\n",
			docs:    "[a](https://github.com/llm-d/llm-d/tree/main/guides)\n",
			label:   "0.10",
			wantErr: "not immutable",
		},
		{
			name:    "no config file",
			docs:    "[a](https://github.com/llm-d/llm-d/tree/main/guides)\n",
			label:   "0.10",
			wantErr: "source-refs.yaml not found",
		},
		{
			name:    "already pinned links need no entry",
			config:  validConfig,
			docs:    "[a](https://github.com/llm-d/llm-d-benchmark/tree/v0.5.0/config_explorer)\n",
			label:   "0.10",
			wantRef: map[string]string{"llm-d/llm-d": "v0.10.0", "llm-d/llm-d-router": "v0.11.0"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			docsDir := filepath.Join(root, "docs")
			if err := os.MkdirAll(docsDir, 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(docsDir, "page.md"), []byte(tc.docs), 0o644); err != nil {
				t.Fatal(err)
			}
			if tc.config != "" {
				if err := os.WriteFile(filepath.Join(root, "source-refs.yaml"), []byte(tc.config), 0o644); err != nil {
					t.Fatal(err)
				}
			}

			refs, err := resolveRefs(root, tc.label, docsDir)
			if tc.wantErr != "" {
				if err == nil {
					t.Fatalf("resolveRefs() = nil error, want one containing %q", tc.wantErr)
				}
				if !strings.Contains(err.Error(), tc.wantErr) {
					t.Fatalf("resolveRefs() error = %q, want it to contain %q", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("resolveRefs() = %v", err)
			}
			if len(refs) != len(tc.wantRef) {
				t.Fatalf("resolveRefs() = %v, want %v", refs, tc.wantRef)
			}
			for repo, want := range tc.wantRef {
				if refs[repo] != want {
					t.Errorf("refs[%s] = %q, want %q", repo, refs[repo], want)
				}
			}
		})
	}
}

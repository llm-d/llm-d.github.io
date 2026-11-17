package version

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestNormalizeLabel(t *testing.T) {
	tests := []struct {
		in    string
		want  string
		valid bool
	}{
		{"0.8", "0.8", true},
		{"0.8.0", "0.8", true},
		{"0.9.1", "0.9", true},
		{"v0.8", "", false},
		{"", "", false},
	}
	for _, tc := range tests {
		got, err := NormalizeLabel(tc.in)
		if tc.valid {
			if err != nil {
				t.Fatalf("NormalizeLabel(%q): unexpected error: %v", tc.in, err)
			}
			if got != tc.want {
				t.Fatalf("NormalizeLabel(%q) = %q, want %q", tc.in, got, tc.want)
			}
		} else if err == nil {
			t.Fatalf("NormalizeLabel(%q): expected error", tc.in)
		}
	}
}

func TestFreezeCurrentZhHansDocsCopiesOnlyExistingTranslations(t *testing.T) {
	root := t.TempDir()
	initVersionTestRepo(t, root)
	pluginDir := filepath.Join(root, "i18n", "zh-Hans", "docusaurus-plugin-content-docs")
	currentDir := filepath.Join(pluginDir, "current")
	currentSourcePath := "docs/getting-started/README.mdx"
	currentEnglishContent := "---\nslug: /\n---\n# Getting Started\n"
	writeVersionTestFile(t, filepath.Join(root, filepath.FromSlash(currentSourcePath)), currentEnglishContent)
	currentBlob := versionTestGitBlob(t, root, currentSourcePath)
	currentTranslation := "---\nslug: /\ntranslation_source: " + currentSourcePath + "\ntranslation_source_commit: 188e66d95d851bdc9c621fa4f117df23f46fd964\ntranslation_source_blob: " + currentBlob + "\n---\n# 入门\n"
	currentTranslationPath := filepath.Join(currentDir, "getting-started", "README.mdx")
	writeVersionTestFile(t, currentTranslationPath, currentTranslation)
	writeVersionTestFile(t, filepath.Join(currentDir, "getting-started", "diagram.svg"), "<svg />\n")
	writeVersionTestFile(t, filepath.Join(pluginDir, "current.json"), "{\"version.label\":{\"message\":\"开发版\"}}\n")

	englishRepoPath := "versioned_docs/version-1.2/getting-started/README.mdx"
	englishContent := "---\nslug: /\n---\n# Getting Started\n\nFrozen for release.\n"
	writeVersionTestFile(t, filepath.Join(root, filepath.FromSlash(englishRepoPath)), englishContent)
	expectedBlob := versionTestGitBlob(t, root, englishRepoPath)
	if expectedBlob == currentBlob {
		t.Fatal("test fixture must use different live and frozen English blobs")
	}

	// A stale translated page is present beside the reviewed page. Its markdown
	// must not be copied just because it exists under current/.
	staleSourcePath := "docs/older/legacy.md"
	writeVersionTestFile(t, filepath.Join(root, filepath.FromSlash(staleSourcePath)), "# Current English\n")
	writeVersionTestFile(t, filepath.Join(root, "versioned_docs/version-1.2/older/legacy.md"), "# Frozen English\n")
	staleTranslation := "---\ntranslation_source: " + staleSourcePath + "\ntranslation_source_blob: " + strings.Repeat("0", 40) + "\n---\n# 旧译文\n"
	writeVersionTestFile(t, filepath.Join(currentDir, "older", "legacy.md"), staleTranslation)

	// This page exists in the English docs tree but has no zh-Hans translation.
	writeVersionTestFile(t, filepath.Join(root, "docs", "getting-started", "quickstart.md"), "# Quickstart\n")

	count, err := freezeCurrentZhHansDocsForTest(t, root, "1.2")
	if err != nil {
		t.Fatalf("freezeCurrentZhHansDocs: %v", err)
	}
	if count != 1 {
		t.Fatalf("copied docs = %d, want 1", count)
	}

	versionDir := filepath.Join(pluginDir, "version-1.2")
	wantTranslation := "---\nslug: /\ntranslation_source: " + englishRepoPath + "\ntranslation_source_blob: " + expectedBlob + "\n---\n# 入门\n"
	assertVersionTestFile(t, filepath.Join(versionDir, "getting-started", "README.mdx"), wantTranslation)
	assertVersionTestFile(t, filepath.Join(versionDir, "getting-started", "diagram.svg"), "<svg />\n")
	assertVersionTestFile(t, filepath.Join(pluginDir, "version-1.2.json"), "{\"version.label\":{\"message\":\"开发版\"}}\n")
	assertVersionTestFile(t, currentTranslationPath, currentTranslation)
	if _, err := os.Stat(filepath.Join(versionDir, "getting-started", "quickstart.md")); !os.IsNotExist(err) {
		t.Fatalf("untranslated English page should not be copied; stat error = %v", err)
	}
	if _, err := os.Stat(filepath.Join(versionDir, "older", "legacy.md")); !os.IsNotExist(err) {
		t.Fatalf("stale translation should not be frozen; stat error = %v", err)
	}
}

func TestFreezeCurrentZhHansDocsFailsWithoutFrozenEnglishSource(t *testing.T) {
	root := t.TempDir()
	initVersionTestRepo(t, root)
	pluginDir := filepath.Join(root, "i18n", "zh-Hans", "docusaurus-plugin-content-docs")
	sourcePath := "docs/getting-started/README.mdx"
	writeVersionTestFile(t, filepath.Join(root, filepath.FromSlash(sourcePath)), "# Current English\n")
	currentBlob := versionTestGitBlob(t, root, sourcePath)
	writeVersionTestFile(t, filepath.Join(pluginDir, "current", "getting-started", "README.mdx"), "---\ntranslation_source: "+sourcePath+"\ntranslation_source_blob: "+currentBlob+"\n---\n# 入门\n")

	count, err := freezeCurrentZhHansDocsForTest(t, root, "1.2")
	if err == nil {
		t.Fatal("freezeCurrentZhHansDocs succeeded without a frozen English source")
	}
	if count != 0 {
		t.Fatalf("copied docs = %d, want 0 on source error", count)
	}
	if !strings.Contains(err.Error(), "no frozen English source") {
		t.Fatalf("error = %q, want missing frozen source context", err)
	}
	versionDir := filepath.Join(pluginDir, "version-1.2")
	if _, err := os.Stat(versionDir); !os.IsNotExist(err) {
		t.Fatalf("version translation directory should not be created; stat error = %v", err)
	}
}

func TestFreezeCurrentZhHansDocsNoopsWithoutTranslatedMarkdown(t *testing.T) {
	for _, tc := range []struct {
		name       string
		makeSource func(t *testing.T, root string)
	}{
		{
			name:       "missing current directory",
			makeSource: func(t *testing.T, root string) {},
		},
		{
			name: "no markdown files",
			makeSource: func(t *testing.T, root string) {
				writeVersionTestFile(t, filepath.Join(root, "i18n", "zh-Hans", "docusaurus-plugin-content-docs", "current", "notes.txt"), "not a translated doc\n")
			},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			tc.makeSource(t, root)
			count, err := freezeCurrentZhHansDocsForTest(t, root, "1.2")
			if err != nil {
				t.Fatalf("freezeCurrentZhHansDocs: %v", err)
			}
			if count != 0 {
				t.Fatalf("copied docs = %d, want 0", count)
			}
			versionDir := filepath.Join(root, "i18n", "zh-Hans", "docusaurus-plugin-content-docs", "version-1.2")
			if _, err := os.Stat(versionDir); !os.IsNotExist(err) {
				t.Fatalf("version translation directory should not be created; stat error = %v", err)
			}
		})
	}
}

func freezeCurrentZhHansDocsForTest(t *testing.T, root, label string) (int, error) {
	t.Helper()
	translations, err := freshCurrentZhHansTranslations(root)
	if err != nil {
		return 0, err
	}
	return freezeCurrentZhHansDocs(root, label, translations)
}

func writeVersionTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("MkdirAll(%s): %v", path, err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("WriteFile(%s): %v", path, err)
	}
}

func assertVersionTestFile(t *testing.T, path, want string) {
	t.Helper()
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile(%s): %v", path, err)
	}
	if string(got) != want {
		t.Fatalf("%s = %q, want %q", path, got, want)
	}
}

func initVersionTestRepo(t *testing.T, root string) {
	t.Helper()
	cmd := exec.Command("git", "-C", root, "init", "--quiet")
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git init: %v: %s", err, output)
	}
}

func versionTestGitBlob(t *testing.T, root, repoPath string) string {
	t.Helper()
	cmd := exec.Command("git", "-C", root, "hash-object", "--path="+repoPath, "--", filepath.FromSlash(repoPath))
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git hash-object: %v: %s", err, output)
	}
	return strings.TrimSpace(string(output))
}

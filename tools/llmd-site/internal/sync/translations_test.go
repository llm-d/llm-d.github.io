package sync

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/upstream"
)

func TestSyncTranslationsPublishesOnlyFreshPages(t *testing.T) {
	srcRoot := t.TempDir()
	siteRoot := t.TempDir()
	english := []byte("# Getting Started\n")
	englishPath := filepath.Join(srcRoot, "docs", "getting-started", "README.mdx")
	writeTranslationFixture(t, englishPath, english)
	translationPath := filepath.Join(srcRoot, "translations", "zh-Hans", "docs", "getting-started", "README.mdx")
	writeTranslationFixture(t, translationPath, []byte(fmt.Sprintf("---\ntranslation_source: docs/getting-started/README.mdx\ntranslation_source_blob: %s\n---\n\n# 开始使用\n", gitBlobID(english))))
	generated := filepath.Join(siteRoot, "i18n", "zh-Hans", "docusaurus-plugin-content-docs", "current", "getting-started", "README.mdx")
	e := translationTestEngine(srcRoot, siteRoot)
	if err := e.syncTranslations(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(generated); err != nil {
		t.Fatalf("fresh translation should be published: %v", err)
	}

	// A changed English page invalidates the recorded blob. The old localized
	// output is removed, allowing Docusaurus to fall back to English.
	writeTranslationFixture(t, englishPath, []byte("# Updated Getting Started\n"))
	if err := e.syncTranslations(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(generated); !os.IsNotExist(err) {
		t.Fatalf("stale translation must be withheld, got %v", err)
	}
}

func TestSyncTranslationsRejectsIncorrectSourceMapping(t *testing.T) {
	srcRoot := t.TempDir()
	siteRoot := t.TempDir()
	path := filepath.Join(srcRoot, "translations", "zh-Hans", "docs", "getting-started", "README.mdx")
	writeTranslationFixture(t, path, []byte("---\ntranslation_source: docs/other.md\ntranslation_source_blob: 0123456789abcdef0123456789abcdef01234567\n---\n"))
	err := translationTestEngine(srcRoot, siteRoot).syncTranslations()
	if err == nil || !strings.Contains(err.Error(), "translation_source") {
		t.Fatalf("expected mapping error, got %v", err)
	}
}

func translationTestEngine(srcRoot, siteRoot string) *engine {
	return &engine{
		m: &manifest.Manifest{Sources: manifest.Sources{LLMD: manifest.SourceRepo{
			Translations: manifest.TranslationSource{Root: "translations", Locales: []string{"zh-Hans"}},
		}}},
		opts: Options{RepoRoot: siteRoot},
		src:  &upstream.Source{Root: srcRoot},
	}
}

func writeTranslationFixture(t *testing.T, path string, data []byte) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
}

func gitBlobID(data []byte) string {
	h := sha1.New()
	fmt.Fprintf(h, "blob %d\x00", len(data))
	_, _ = h.Write(data)
	return hex.EncodeToString(h.Sum(nil))
}

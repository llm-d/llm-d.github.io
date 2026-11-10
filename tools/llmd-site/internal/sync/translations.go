package sync

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

type translationMetadata struct {
	Source string `yaml:"translation_source"`
	Blob   string `yaml:"translation_source_blob"`
	Status string `yaml:"translation_status"`
}

// syncTranslations copies reviewed translations into Docusaurus' locale tree.
// A stale page is withheld, so Docusaurus falls back to its English source
// instead of publishing an outdated translation without warning.
func (e *engine) syncTranslations() error {
	config := e.m.Sources.LLMD.Translations
	for _, locale := range config.Locales {
		dst := filepath.Join(e.opts.RepoRoot, "i18n", locale, "docusaurus-plugin-content-docs", "current")
		if err := cleanDir(dst); err != nil {
			return err
		}
		src := filepath.Join(e.src.Root, config.Root, locale, "docs")
		if !dirExists(src) {
			fmt.Printf("    No %s translations at %s\n", locale, src)
			continue
		}
		count := 0
		err := filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if info.IsDir() {
				return nil
			}
			rel, err := filepath.Rel(src, path)
			if err != nil {
				return err
			}
			if ext := strings.ToLower(filepath.Ext(path)); ext == ".md" || ext == ".mdx" {
				fresh, err := e.translationIsFresh(path, rel)
				if err != nil {
					return err
				}
				if !fresh {
					fmt.Printf("    Skipping stale %s translation: %s\n", locale, rel)
					return nil
				}
			}
			if err := copyFileVerbatim(path, filepath.Join(dst, rel)); err != nil {
				return err
			}
			count++
			return nil
		})
		if err != nil {
			return fmt.Errorf("sync %s translations: %w", locale, err)
		}
		fmt.Printf("    Synced %d %s translation files\n", count, locale)
	}
	return nil
}

func (e *engine) translationIsFresh(path, rel string) (bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return false, err
	}
	if !strings.HasPrefix(string(data), "---\n") {
		return false, fmt.Errorf("%s: missing translation front matter", path)
	}
	parts := strings.SplitN(string(data)[4:], "\n---\n", 2)
	if len(parts) != 2 {
		return false, fmt.Errorf("%s: unterminated translation front matter", path)
	}
	var meta translationMetadata
	if err := yaml.Unmarshal([]byte(parts[0]), &meta); err != nil {
		return false, fmt.Errorf("%s: parse translation metadata: %w", path, err)
	}
	expected := filepath.ToSlash(filepath.Join("docs", rel))
	if meta.Source != expected {
		return false, fmt.Errorf("%s: translation_source %q must be %q", path, meta.Source, expected)
	}
	if len(meta.Blob) != 40 {
		return false, fmt.Errorf("%s: invalid translation_source_blob", path)
	}
	if _, err := hex.DecodeString(meta.Blob); err != nil {
		return false, fmt.Errorf("%s: invalid translation_source_blob: %w", path, err)
	}
	if meta.Status != "" && meta.Status != "stale" {
		return false, fmt.Errorf("%s: invalid translation_status %q", path, meta.Status)
	}
	source, err := os.ReadFile(filepath.Join(e.src.Root, filepath.FromSlash(meta.Source)))
	if err != nil {
		return false, fmt.Errorf("%s: read English source: %w", path, err)
	}
	h := sha1.New()
	fmt.Fprintf(h, "blob %d\x00", len(source))
	_, _ = h.Write(source)
	currentBlob := hex.EncodeToString(h.Sum(nil))
	return meta.Status != "stale" && strings.EqualFold(meta.Blob, currentBlob), nil
}

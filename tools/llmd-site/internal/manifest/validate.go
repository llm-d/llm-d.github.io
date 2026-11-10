package manifest

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

var localeName = regexp.MustCompile(`^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$`)

// Validate checks manifest invariants.
func (m *Manifest) Validate() error {
	if m.Version != CurrentVersion {
		return fmt.Errorf("unsupported manifest version %d (expected %d)", m.Version, CurrentVersion)
	}
	if m.Sources.LLMD.Remote.URL == "" {
		return fmt.Errorf("sources.llm-d.remote.url is required")
	}
	if m.Sources.LLMD.Remote.DocsRoot == "" {
		return fmt.Errorf("sources.llm-d.remote.docs_root is required")
	}
	if gm := m.Sources.LLMD.GuidesManifest; gm != "" {
		clean := filepath.ToSlash(filepath.Clean(gm))
		if filepath.IsAbs(gm) || strings.HasPrefix(gm, "/") || clean == ".." || strings.HasPrefix(clean, "../") {
			return fmt.Errorf("sources.llm-d.guides_manifest must be a repo-relative path, got %q", gm)
		}
		if ext := strings.ToLower(filepath.Ext(gm)); ext != ".yaml" && ext != ".yml" {
			return fmt.Errorf("sources.llm-d.guides_manifest must be a .yaml file, got %q", gm)
		}
	}
	tr := m.Sources.LLMD.Translations
	if len(tr.Locales) > 0 && tr.Root == "" {
		return fmt.Errorf("sources.llm-d.translations.root is required when locales are configured")
	}
	if tr.Root != "" {
		clean := filepath.ToSlash(filepath.Clean(tr.Root))
		if filepath.IsAbs(tr.Root) || clean == "." || clean == ".." || strings.HasPrefix(clean, "../") {
			return fmt.Errorf("sources.llm-d.translations.root must be a repo-relative directory, got %q", tr.Root)
		}
	}
	for _, locale := range tr.Locales {
		if !localeName.MatchString(locale) {
			return fmt.Errorf("invalid translation locale %q", locale)
		}
	}

	for i, c := range m.Copies {
		if c.From == "" {
			return fmt.Errorf("copies[%d]: from is required", i)
		}
		if c.To == "" {
			return fmt.Errorf("copies[%d]: to is required", i)
		}
	}

	for i, s := range m.Slugs {
		if s.File == "" || s.Slug == "" {
			return fmt.Errorf("slugs[%d]: file and slug are required", i)
		}
		if !strings.HasPrefix(s.Slug, "/") {
			return fmt.Errorf("slugs[%d]: slug must start with /", i)
		}
	}

	for i, f := range m.Community {
		if f.From == "" || f.To == "" {
			return fmt.Errorf("community[%d]: from and to are required", i)
		}
		if f.Title == "" {
			return fmt.Errorf("community[%d]: title is required", i)
		}
		to := filepath.ToSlash(f.To)
		if !strings.HasPrefix(to, "community/") {
			return fmt.Errorf("community[%d]: to must be under community/", i)
		}
		if f.SidebarPosition == 0 {
			return fmt.Errorf("community[%d]: sidebar_position is required", i)
		}
	}

	return nil
}

// SourceMap returns local docs/ path -> upstream path for link checker use.
func (m *Manifest) SourceMap() map[string]string {
	out := make(map[string]string, len(m.Copies)+len(m.EditURLs))
	for _, c := range m.Copies {
		if c.To == "" || c.From == "" {
			continue
		}
		out[c.To] = c.From
	}
	for _, e := range m.EditURLs {
		if e.Match == "" || e.Upstream == "" {
			continue
		}
		key := strings.TrimPrefix(e.Match, "docs/")
		out[key] = e.Upstream
	}
	return out
}

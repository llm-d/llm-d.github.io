package manifest

import (
	"fmt"
	"strings"
)

// Validate checks manifest invariants for Phase 1.
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

	seenTo := map[string]int{}
	for i, c := range m.Copies {
		if c.From == "" {
			return fmt.Errorf("copies[%d]: from is required", i)
		}
		if c.To == "" {
			return fmt.Errorf("copies[%d]: to is required", i)
		}
		if prev, ok := seenTo[c.To]; ok && c.When == "" && m.Copies[prev].When == "" {
			return fmt.Errorf("duplicate copy destination %q at copies[%d] and copies[%d]", c.To, prev, i)
		}
		seenTo[c.To] = i
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
	}

	return nil
}

// SourceMap returns local preview/docs path -> upstream path for link checker use.
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
		key := strings.TrimPrefix(e.Match, "preview/docs/")
		out[key] = e.Upstream
	}
	return out
}

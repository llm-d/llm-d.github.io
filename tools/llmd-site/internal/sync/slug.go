package sync

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func setDocSlug(path, slug string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil // missing file is ok
	}
	content := string(data)
	lines := strings.Split(content, "\n")
	if len(lines) == 0 {
		return writeSlug(path, slug, content)
	}
	if strings.TrimSpace(lines[0]) != "---" {
		return writeSlug(path, slug, content)
	}

	var out []string
	out = append(out, lines[0])
	slugSet := false
	inFM := true
	for i := 1; i < len(lines); i++ {
		line := lines[i]
		if inFM && strings.HasPrefix(line, "slug:") {
			out = append(out, "slug: "+slug)
			slugSet = true
			continue
		}
		if inFM && strings.TrimSpace(line) == "---" {
			if !slugSet {
				out = append(out, "slug: "+slug)
			}
			inFM = false
		}
		out = append(out, line)
	}
	return os.WriteFile(path, []byte(strings.Join(out, "\n")), 0o644)
}

func writeSlug(path, slug, body string) error {
	var b strings.Builder
	b.WriteString("---\n")
	fmt.Fprintf(&b, "slug: %s\n", slug)
	b.WriteString("---\n\n")
	b.WriteString(body)
	return os.WriteFile(path, []byte(b.String()), 0o644)
}

func (e *engine) applySlugs() error {
	for _, s := range e.m.Slugs {
		path := filepath.Join(e.docsDir, filepath.FromSlash(s.File))
		if err := setDocSlug(path, s.Slug); err != nil {
			return err
		}
	}
	// Stub slug applied after stub generation in bash; duplicate slug for multimodal.
	return setDocSlug(filepath.Join(e.docsDir, "guides", "multimodal-serving.md"), "/well-lit-paths/multimodal-serving")
}

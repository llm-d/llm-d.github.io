package blog

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

var (
	dateLineRE   = regexp.MustCompile(`(?m)^date:\s*.*$`)
	blogFileRE   = regexp.MustCompile(`^(\d{4}-\d{2}-\d{2})_(.+)$`)
	ignoredNames = map[string]struct{}{
		"authors.yml": {},
		"tags.yml":    {},
	}
)

// StampOptions configures frontmatter date stamping.
type StampOptions struct {
	When    time.Time
	TimeOfDay string // HH:MM, default 09:00
	Rename  bool
	DryRun  bool
}

// StampResult describes one stamped file.
type StampResult struct {
	Path    string
	NewPath string
	Changed bool
	Skipped bool
	Reason  string
}

// IsBlogPost returns true for blog markdown posts (not authors.yml / tags.yml).
func IsBlogPost(path string) bool {
	base := filepath.Base(path)
	if _, skip := ignoredNames[base]; skip {
		return false
	}
	return strings.HasSuffix(strings.ToLower(base), ".md")
}

// StampFile updates the date frontmatter (and optionally renames YYYY-MM-DD_*.md files).
func StampFile(path string, opts StampOptions) (StampResult, error) {
	res := StampResult{Path: path}
	if !IsBlogPost(path) {
		res.Skipped = true
		res.Reason = "not a blog post markdown file"
		return res, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return res, err
	}

	when := opts.When
	if when.IsZero() {
		when = time.Now().UTC()
	}
	tod := opts.TimeOfDay
	if tod == "" {
		tod = "09:00"
	}
	newDate := fmt.Sprintf("%sT%s", when.Format("2006-01-02"), tod)

	updated, err := upsertDate(string(data), newDate)
	if err != nil {
		return res, err
	}

	if updated == string(data) {
		res.Skipped = true
		res.Reason = "date already set"
		return res, nil
	}

	targetPath := path
	if opts.Rename {
		if renamed, ok := renameWithDate(path, when); ok {
			targetPath = renamed
		}
	}

	res.NewPath = targetPath
	res.Changed = true

	if opts.DryRun {
		return res, nil
	}

	if targetPath != path {
		if err := os.WriteFile(targetPath, []byte(updated), 0o644); err != nil {
			return res, err
		}
		if err := os.Remove(path); err != nil {
			return res, fmt.Errorf("wrote %s but failed to remove %s: %w", targetPath, path, err)
		}
		return res, nil
	}

	if err := os.WriteFile(path, []byte(updated), 0o644); err != nil {
		return res, err
	}
	return res, nil
}

// StampFiles stamps multiple blog posts.
func StampFiles(paths []string, opts StampOptions) ([]StampResult, error) {
	var results []StampResult
	for _, p := range paths {
		r, err := StampFile(p, opts)
		if err != nil {
			return results, fmt.Errorf("%s: %w", p, err)
		}
		results = append(results, r)
	}
	return results, nil
}

func upsertDate(content, newDate string) (string, error) {
	if !strings.HasPrefix(content, "---") {
		return "", fmt.Errorf("missing YAML frontmatter")
	}

	end := strings.Index(content[3:], "\n---")
	if end < 0 {
		return "", fmt.Errorf("unclosed frontmatter")
	}
	end += 3

	fm := content[:end+4]
	body := content[end+4:]

	newLine := "date: " + newDate
	if dateLineRE.MatchString(fm) {
		current := strings.TrimSpace(strings.TrimPrefix(dateLineRE.FindString(fm), "date:"))
		if normalizeDateDay(current) == normalizeDateDay(newDate) {
			return content, nil
		}
		fm = dateLineRE.ReplaceAllString(fm, newLine)
	} else {
		lines := strings.Split(fm, "\n")
		var out []string
		inserted := false
		for _, line := range lines {
			out = append(out, line)
			if inserted {
				continue
			}
			trim := strings.TrimSpace(line)
			if strings.HasPrefix(trim, "slug:") {
				out = append(out, newLine)
				inserted = true
			}
		}
		if !inserted {
			// After opening --- and title, or at end of frontmatter block.
			if len(out) >= 2 {
				out = append(out[:2], append([]string{newLine}, out[2:]...)...)
			} else {
				out = append(out, newLine)
			}
		}
		fm = strings.Join(out, "\n")
	}

	return fm + body, nil
}

func normalizeDateDay(s string) string {
	s = strings.TrimSpace(s)
	if i := strings.IndexAny(s, "T "); i >= 0 {
		return s[:i]
	}
	return s
}

func renameWithDate(path string, when time.Time) (string, bool) {
	dir := filepath.Dir(path)
	base := filepath.Base(path)
	m := blogFileRE.FindStringSubmatch(base)
	if len(m) != 3 {
		return path, false
	}
	newBase := when.Format("2006-01-02") + "_" + m[2]
	if newBase == base {
		return path, false
	}
	return filepath.Join(dir, newBase), true
}

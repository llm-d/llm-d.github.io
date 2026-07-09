package sync

import (
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

func (e *engine) runCopies() error {
	if err := e.syncObservability(); err != nil {
		return err
	}

	for _, c := range e.m.Copies {
		if !e.copyWhenActive(c.When) {
			continue
		}
		if len(c.Prefer) > 0 {
			if err := e.copyPrefer(c); err != nil {
				return err
			}
			continue
		}
		if err := e.copyOne(c.From, c.To); err != nil {
			return err
		}
	}

	for _, cond := range e.m.Conditionals {
		if !e.evalWhenExpr(cond.When) {
			continue
		}
		for _, c := range cond.Copies {
			if err := e.copyOne(c.From, c.To); err != nil {
				return err
			}
		}
	}

	// Autoscaling diagram assets (not in manifest).
	_ = copyGlob(filepath.Join(e.wip, "architecture", "advanced", "autoscaling"), "*.svg",
		filepath.Join(e.docsDir, "architecture", "advanced", "autoscaling"))

	// Accelerators fallback when getting-started copy did not produce index.
	accIndex := filepath.Join(e.docsDir, "accelerators", "index.md")
	if !e.fileExists(accIndex) {
		_ = e.copyOne("docs/accelerators/README.md", "accelerators/index.md")
	}

	return nil
}

func (e *engine) copyWhenActive(when string) bool {
	switch when {
	case "", "always":
		return true
	case "foundations_layout":
		return e.flags.FoundationsLayout
	case "capabilities_layout":
		return !e.flags.FoundationsLayout
	default:
		return e.evalConditionalWhen(when)
	}
}

func (e *engine) evalConditionalWhen(when string) bool {
	for _, c := range e.m.Conditionals {
		if c.Name == when {
			return e.evalWhenExpr(c.When)
		}
	}
	return true
}

func (e *engine) evalWhenExpr(expr string) bool {
	expr = strings.TrimSpace(expr)
	if !strings.HasPrefix(expr, "upstream:") {
		return true
	}
	rel := strings.TrimSpace(strings.TrimPrefix(expr, "upstream:"))
	missing := strings.HasSuffix(rel, " missing")
	if strings.HasSuffix(rel, " exists") {
		rel = strings.TrimSuffix(rel, " exists")
	}
	if missing {
		rel = strings.TrimSuffix(rel, " missing")
	}
	path := filepath.Join(e.wip, filepath.FromSlash(upstreamRel(rel)))
	if missing {
		return !e.fileExists(path) && !e.dirExists(path)
	}
	return e.fileExists(path) || e.dirExists(path)
}

func (e *engine) copyPrefer(c manifest.Copy) error {
	destExt := filepath.Ext(c.To)
	for _, pref := range c.Prefer {
		src := filepath.Join(e.wip, filepath.FromSlash(pref))
		if !e.fileExists(src) {
			continue
		}
		// Multiple manifest copies can share the same prefer list with different
		// destinations (e.g. getting-started/index.mdx vs index.md). Route each
		// upstream file to the destination with a matching extension, matching
		// sync-docs.sh: use index.mdx when README.mdx exists, else index.md.
		if destExt != "" && filepath.Ext(pref) != destExt {
			return nil
		}
		return e.copyFile(src, filepath.Join(e.docsDir, filepath.FromSlash(c.To)))
	}
	return e.copyOne(c.From, c.To)
}

func (e *engine) copyOne(from, to string) error {
	src := filepath.Join(e.wip, filepath.FromSlash(upstreamRel(from)))
	if !e.fileExists(src) {
		return nil
	}
	dst := filepath.Join(e.docsDir, filepath.FromSlash(to))
	return e.copyFile(src, dst)
}

func (e *engine) copyFile(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

func (e *engine) syncObservability() error {
	dest := filepath.Join(e.docsDir, "resources", "observability")
	type pair struct{ from, to string }
	var pairs []pair

	switch {
	case e.fileExists(filepath.Join(e.wip, "operations", "observability", "setup.md")):
		pairs = []pair{
			{"operations/observability/README.md", "index.md"},
			{"operations/observability/setup.md", "setup.md"},
			{"operations/observability/metrics.md", "metrics.md"},
			{"operations/observability/tracing.md", "tracing.md"},
			{"operations/observability/promql.md", "promql.md"},
		}
	case e.fileExists(filepath.Join(e.wip, "resources", "observability", "setup.md")):
		pairs = []pair{
			{"resources/observability/README.md", "index.md"},
			{"resources/observability/setup.md", "setup.md"},
			{"resources/observability/metrics.md", "metrics.md"},
			{"resources/observability/tracing.md", "tracing.md"},
			{"resources/observability/promql.md", "promql.md"},
		}
	default:
		// Legacy monitoring paths — best effort.
		for _, p := range []struct{ from, to string }{
			{"resources/monitoring/metrics.md", "metrics.md"},
			{"resources/monitoring/tracing.md", "tracing.md"},
			{"guides/monitoring/metrics.md", "metrics.md"},
			{"guides/monitoring/tracing.md", "tracing.md"},
		} {
			src := filepath.Join(e.wip, filepath.FromSlash(p.from))
			if e.fileExists(src) {
				dst := filepath.Join(dest, p.to)
				if err := e.copyFile(src, dst); err != nil {
					return err
				}
			}
		}
	}

	for _, p := range pairs {
		src := filepath.Join(e.wip, filepath.FromSlash(p.from))
		if e.fileExists(src) {
			if err := e.copyFile(src, filepath.Join(dest, p.to)); err != nil {
				return err
			}
		}
	}

	// Always prefer current operations layout when present (matches sync-docs.sh).
	for _, p := range []pair{
		{"operations/observability/README.md", "index.md"},
		{"operations/observability/setup.md", "setup.md"},
		{"operations/observability/metrics.md", "metrics.md"},
		{"operations/observability/tracing.md", "tracing.md"},
		{"operations/observability/promql.md", "promql.md"},
	} {
		src := filepath.Join(e.wip, filepath.FromSlash(p.from))
		if e.fileExists(src) {
			if err := e.copyFile(src, filepath.Join(dest, p.to)); err != nil {
				return err
			}
		}
	}
	return nil
}

func copyGlob(srcDir, pattern, dstDir string) error {
	matches, err := filepath.Glob(filepath.Join(srcDir, pattern))
	if err != nil {
		return err
	}
	for _, src := range matches {
		info, err := os.Stat(src)
		if err != nil || info.IsDir() {
			continue
		}
		if err := os.MkdirAll(dstDir, 0o755); err != nil {
			return err
		}
		dst := filepath.Join(dstDir, filepath.Base(src))
		if err := copyFileSimple(src, dst); err != nil {
			return err
		}
	}
	return nil
}

func copyFileSimple(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

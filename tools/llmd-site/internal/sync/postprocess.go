package sync

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/transform"
)

type ruleGroup struct {
	scope string
	rules []transform.Rule
}

func (e *engine) postprocess() error {
	vars := map[string]string{
		"UPSTREAM_REF": e.upstreamRef,
	}

	for _, g := range generatedRuleGroups() {
		if err := e.applyRuleGroup(g, vars); err != nil {
			return err
		}
	}

	if err := e.applyGuideDynamicRules(vars); err != nil {
		return err
	}

	// apply_transformations (shared transforms) on all markdown.
	fmtMsg := "    Applying markdown transformations (callouts, tabs, MDX escaping, well-lit-paths links)..."
	fmt.Println(fmtMsg)
	if err := walkDocs(e.docsDir, func(path string) error {
		if strings.HasSuffix(path, ".md") {
			return transform.ApplyShared(path)
		}
		return nil
	}); err != nil {
		return err
	}

	// Post-transform fixes that must run after ApplyShared.
	postShared := []transform.Rule{
		{Pattern: `/img/docs/images/`, Replacement: `/img/docs/`},
	}
	if err := walkDocs(e.docsDir, func(path string) error {
		if !strings.HasSuffix(path, ".md") {
			return nil
		}
		return transform.ApplyRulesToFile(path, postShared, vars)
	}); err != nil {
		return err
	}

	// Canonicalize /guides -> /well-lit-paths (runs after shared transforms in bash too for some paths).
	return e.applyLateRules(vars)
}

func (e *engine) applyLateRules(vars map[string]string) error {
	lateGroups := []ruleGroup{
		{scope: "all_md", rules: canonicalizeGuideRules()},
		{scope: "glob:**/*.mdx", rules: mdxGuideRules()},
		{scope: "glob:guides/*.md", rules: flattenedArchRules()},
		{scope: "all_md", rules: upstreamDeepLinkRules()},
		{scope: "all_md", rules: upstreamBranchRules()},
		{scope: "all_md", rules: mdxHygieneRules()},
		{scope: "glob:**/*.{md,mdx}", rules: []transform.Rule{
			{Pattern: `https://llm-d.ai/img/`, Replacement: `/img/`},
		}},
	}
	for _, g := range lateGroups {
		if err := e.applyRuleGroup(g, vars); err != nil {
			return err
		}
	}
	return nil
}

func (e *engine) applyRuleGroup(g ruleGroup, vars map[string]string) error {
	switch g.scope {
	case "all_md":
		return walkDocs(e.docsDir, func(path string) error {
			if strings.HasSuffix(path, ".md") {
				return transform.ApplyRulesToFile(path, g.rules, vars)
			}
			return nil
		})
	case "glob:guides/**/*.md":
		return walkDocsIfExists(filepath.Join(e.docsDir, "guides"), func(path string) error {
			if strings.HasSuffix(path, ".md") {
				return transform.ApplyRulesToFile(path, g.rules, vars)
			}
			return nil
		})
	case "glob:guides/*.md":
		guidesDir := filepath.Join(e.docsDir, "guides")
		if _, err := os.Stat(guidesDir); err != nil {
			if os.IsNotExist(err) {
				return nil
			}
			return err
		}
		return filepath.Walk(guidesDir, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() || !strings.HasSuffix(path, ".md") {
				return err
			}
			if filepath.Dir(path) != filepath.Join(e.docsDir, "guides") {
				return nil
			}
			return transform.ApplyRulesToFile(path, g.rules, vars)
		})
	case "glob:resources/infra-providers/*.md":
		return walkDocsIfExists(filepath.Join(e.docsDir, "resources", "infra-providers"), func(path string) error {
			if strings.HasSuffix(path, ".md") {
				return transform.ApplyRulesToFile(path, g.rules, vars)
			}
			return nil
		})
	case "glob:**/*.{md,mdx}":
		return walkDocs(e.docsDir, func(path string) error {
			if strings.HasSuffix(path, ".md") || strings.HasSuffix(path, ".mdx") {
				return transform.ApplyRulesToFile(path, g.rules, vars)
			}
			return nil
		})
	case "glob:**/*.mdx":
		return walkDocs(e.docsDir, func(path string) error {
			if strings.HasSuffix(path, ".mdx") {
				return transform.ApplyRulesToFile(path, g.rules, vars)
			}
			return nil
		})
	case "files:section_overviews":
		for _, name := range []string{"capabilities.md", "workloads.md"} {
			p := filepath.Join(e.docsDir, "guides", name)
			if err := transform.ApplyRulesToFileIfExists(p, g.rules, vars); err != nil {
				return err
			}
		}
	case "files:operations":
		for _, name := range []string{
			"resources/operations/rollouts/adapter-rollout.md",
			"resources/operations/rollouts/blue-green-update.md",
			"resources/operations/rollouts/index.md",
			"resources/operations/readiness-probes.md",
			"resources/operations/router.md",
		} {
			p := filepath.Join(e.docsDir, filepath.FromSlash(name))
			if err := transform.ApplyRulesToFileIfExists(p, g.rules, vars); err != nil {
				return err
			}
		}
	case "files:accelerators":
		for _, name := range []string{"accelerators/index.md", "getting-started/accelerators.md"} {
			p := filepath.Join(e.docsDir, filepath.FromSlash(name))
			if err := transform.ApplyRulesToFileIfExists(p, g.rules, vars); err != nil {
				return err
			}
		}
	case "files:observability":
		for _, name := range []string{"index.md", "setup.md", "metrics.md", "tracing.md", "promql.md"} {
			p := filepath.Join(e.docsDir, "resources", "observability", name)
			if err := transform.ApplyRulesToFileIfExists(p, g.rules, vars); err != nil {
				return err
			}
		}
	default:
		if strings.HasPrefix(g.scope, "file:") {
			rel := strings.TrimPrefix(g.scope, "file:")
			p := filepath.Join(e.docsDir, filepath.FromSlash(rel))
			return transform.ApplyRulesToFileIfExists(p, g.rules, vars)
		}
	}
	return nil
}

func (e *engine) applyGuideDynamicRules(vars map[string]string) error {
	guidesDocs := filepath.Join(e.docsDir, "guides")
	if _, err := os.Stat(guidesDocs); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return filepath.Walk(guidesDocs, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".md") {
			return err
		}
		rel, err := filepath.Rel(guidesDocs, path)
		if err != nil {
			return err
		}
		subdir := filepath.ToSlash(filepath.Dir(rel))
		if subdir == "." {
			return nil
		}
		imgRules := []transform.Rule{
			{Pattern: `!\[([^]]*)\]\(images/([^)]*)\)`, Replacement: `![$1](/img/docs/guides/` + subdir + `/` + `$2)`},
			{Pattern: `!\[([^]]*)\]\(\./images/([^)]*)\)`, Replacement: `![$1](/img/docs/guides/` + subdir + `/` + `$2)`},
		}
		if err := transform.ApplyRulesToFile(path, imgRules, vars); err != nil {
			return err
		}
		benchDir := filepath.Join(e.staticDir, "guides", subdir, "benchmark-results")
		if hasPNG(benchDir) {
			benchRules := []transform.Rule{
				{Pattern: `src="\./benchmark-results/([^"]*)"`, Replacement: `src="/img/docs/guides/` + subdir + `/benchmark-results/` + `$1"`},
				{Pattern: `src="benchmark-results/([^"]*)"`, Replacement: `src="/img/docs/guides/` + subdir + `/benchmark-results/` + `$1"`},
				{Pattern: `!\[([^]]*)\]\(\./benchmark-results/([^)]*)\)`, Replacement: `![$1](/img/docs/guides/` + subdir + `/benchmark-results/` + `$2)`},
				{Pattern: `!\[([^]]*)\]\(benchmark-results/([^)]*)\)`, Replacement: `![$1](/img/docs/guides/` + subdir + `/benchmark-results/` + `$2)`},
			}
			if err := transform.ApplyRulesToFile(path, benchRules, vars); err != nil {
				return err
			}
		}
		return nil
	})
}

func hasPNG(dir string) bool {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return false
	}
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(strings.ToLower(e.Name()), ".png") {
			return true
		}
	}
	return false
}

func walkDocs(root string, fn func(string) error) error {
	return walkDocsIfExists(root, fn)
}

func walkDocsIfExists(root string, fn func(string) error) error {
	if _, err := os.Stat(root); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		return fn(path)
	})
}

func canonicalizeGuideRules() []transform.Rule {
	return []transform.Rule{
		{Pattern: `\](/docs/guides/([^)]*)\)`, Replacement: `\](/docs/well-lit-paths/$1)`},
		{Pattern: `\](/docs/guides)`, Replacement: `\](/docs/well-lit-paths)`},
		{Pattern: `\](/guides/([^)]*)\)`, Replacement: `\](/well-lit-paths/$1)`},
		{Pattern: `\](/guides)`, Replacement: `\](/well-lit-paths)`},
		{Pattern: `\](/docs/well-lit-paths/foundations/([^)]*)\)`, Replacement: `\](/docs/well-lit-paths/$1)`},
		{Pattern: `\](/well-lit-paths/foundations/([^)]*)\)`, Replacement: `\](/well-lit-paths/$1)`},
	}
}

func mdxGuideRules() []transform.Rule {
	return []transform.Rule{
		{Pattern: `(to=")/guides(/[^"]*)?"`, Replacement: `${1}/well-lit-paths$2"`},
		{Pattern: `\](/guides(/[^)]*)?\)`, Replacement: `\](/well-lit-paths$1)`},
	}
}

func flattenedArchRules() []transform.Rule {
	return []transform.Rule{
		{Pattern: `\]((\.\./){2,}architecture/`, Replacement: `\](../architecture/`},
	}
}

func upstreamDeepLinkRules() []transform.Rule {
	return []transform.Rule{
		{Pattern: `\]((\.\./)+guides/index\.md(#[^)]*)?\)`, Replacement: `](https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/guides/README.md$2)`},
		{Pattern: `\]((\.\./)+guides/([^)#]*\.md)(#[^)]*)?\)`, Replacement: `](https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/guides/$3$4)`},
		{Pattern: `\]((\.\./)+guides/([^)]*)\)`, Replacement: `](https://github.com/llm-d/llm-d/tree/$UPSTREAM_REF/guides/$3)`},
	}
}

func upstreamBranchRules() []transform.Rule {
	return []transform.Rule{
		{Pattern: `https://github.com/llm-d/llm-d/tree/main/`, Replacement: `https://github.com/llm-d/llm-d/tree/$UPSTREAM_REF/`},
		{Pattern: `https://github.com/llm-d/llm-d/blob/main/`, Replacement: `https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/`},
	}
}

func mdxHygieneRules() []transform.Rule {
	return []transform.Rule{
		{Pattern: `<br>`, Replacement: `<br/>`},
		{Pattern: `<hr>`, Replacement: `<hr/>`},
		{Pattern: `<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>`, Replacement: `$1`},
		{Pattern: `<(https?://[^ >]*)>`, Replacement: `$1`},
	}
}

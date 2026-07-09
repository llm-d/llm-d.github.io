package sync

import (
	"os"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/transform"
)

type ruleGroup struct {
	scope string
	rules []transform.Rule
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

// fileExists checks path with optional engine-level memoization.
func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func (e *engine) fileExists(path string) bool {
	if e.existence != nil {
		if v, ok := e.existence.files[path]; ok {
			return v
		}
	}
	ok := fileExists(path)
	if e.existence != nil {
		e.existence.files[path] = ok
	}
	return ok
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func (e *engine) dirExists(path string) bool {
	if e.existence != nil {
		if v, ok := e.existence.dirs[path]; ok {
			return v
		}
	}
	ok := dirExists(path)
	if e.existence != nil {
		e.existence.dirs[path] = ok
	}
	return ok
}

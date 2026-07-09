package transform

import (
	"os"
	"strings"
	"testing"
)

func benchDocContent(tb testing.TB) string {
	tb.Helper()
	data, err := os.ReadFile("../../../preview/docs/architecture/index.md")
	if err != nil {
		return strings.Repeat("# Architecture\n\nSee [guide](../guides/foo.md) and ![img](../../assets/x.png).\n", 200)
	}
	return string(data)
}

func benchSampleRules() []Rule {
	return []Rule{
		{Pattern: `\](../well-lit-paths/capabilities/optimized-baseline\.md#([^)]*))`, Replacement: `\](/guides/optimized-baseline#\\1)`},
		{Pattern: `\](../../api-reference/([^)]*)\.md)`, Replacement: `\](/api-reference/\\1)`},
		{Pattern: `!\[([^]]*)\]\((\.\./)*assets/([^)]*)\)`, Replacement: `![$1](/img/docs/$3)`},
		{Pattern: `https://github.com/llm-d/llm-d/tree/main/`, Replacement: `https://github.com/llm-d/llm-d/tree/$UPSTREAM_REF/`},
		{Pattern: `\](/guides/([^)]*)\)`, Replacement: `\](/well-lit-paths/$1)`},
		{Pattern: `<br>`, Replacement: `<br/>`},
	}
}

func BenchmarkApplyRules(b *testing.B) {
	content := benchDocContent(b)
	rules := benchSampleRules()
	vars := map[string]string{"UPSTREAM_REF": "main"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ApplyRules(content, rules, vars)
	}
}

func BenchmarkApplyCompiledRules(b *testing.B) {
	content := benchDocContent(b)
	compiled := CompileRulesSkipInvalid(benchSampleRules())
	vars := map[string]string{"UPSTREAM_REF": "main"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ApplyCompiledRules(content, compiled, vars)
	}
}

func BenchmarkApplySharedContent(b *testing.B) {
	content := benchDocContent(b)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ApplySharedContent(content)
	}
}

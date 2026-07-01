// Package main generates internal/sync/rules_generated.go from sync-docs.sh sed rules.
package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

func main() {
	repo := flag.String("repo", ".", "llm-d.github.io repo root")
	out := flag.String("out", "internal/sync/rules_generated.go", "output path relative to tools/llmd-site")
	flag.Parse()

	scriptPath := filepath.Join(*repo, "legacy", "preview", "scripts", "sync-docs.sh")
	data, err := os.ReadFile(scriptPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "read script: %v\n", err)
		os.Exit(1)
	}

	groups := parseGroups(string(data))
	if err := writeGo(*out, groups); err != nil {
		fmt.Fprintf(os.Stderr, "write: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("wrote %s (%d groups, %d rules)\n", *out, len(groups), countRules(groups))
}

type ruleGroup struct {
	Scope string // all_md, file:..., files:..., glob:...
	Rules []rule
}

type rule struct {
	Pattern, Replacement string
}

func countRules(groups []ruleGroup) int {
	n := 0
	for _, g := range groups {
		n += len(g.Rules)
	}
	return n
}

var reSedE = regexp.MustCompile(`-e\s+'s\|(.+)\|(.+)\|g'`)

func parseGroups(content string) []ruleGroup {
	lines := strings.Split(content, "\n")
	var groups []ruleGroup
	var current *ruleGroup
	var inSedBlock bool

	flush := func() {
		if current != nil && len(current.Rules) > 0 {
			groups = append(groups, *current)
		}
		current = nil
		inSedBlock = false
	}

	for i, line := range lines {
		if strings.Contains(line, "Apply markdown transformations") {
			break
		}
		trim := strings.TrimSpace(line)

		// Detect scope from find/sed context (look back a few lines)
		if strings.Contains(trim, "sed_inplace") && !inSedBlock {
			flush()
			scope := detectScope(lines, i)
			current = &ruleGroup{Scope: scope}
			inSedBlock = true
			// single-line sed
			if m := reSedE.FindAllStringSubmatch(trim, -1); len(m) > 0 {
				for _, match := range m {
					current.Rules = append(current.Rules, rule{sedPatternToGo(unescape(match[1])), unescape(match[2])})
				}
			}
			if strings.HasSuffix(trim, `"$file"`) || strings.HasSuffix(trim, `'"$file"'`) {
				inSedBlock = false
			}
			continue
		}

		if inSedBlock && current != nil {
			if m := reSedE.FindStringSubmatch(trim); m != nil {
				current.Rules = append(current.Rules, rule{sedPatternToGo(unescape(m[1])), unescape(m[2])})
			}
			if strings.Contains(trim, `"$file"`) || strings.Contains(trim, `"$_opfile"`) ||
				strings.Contains(trim, `"$_secfile"`) || strings.Contains(trim, `"$_accfile"`) ||
				strings.HasSuffix(trim, `"$DOCS_DIR/guides/index.md"`) ||
				strings.Contains(trim, `"$DOCS_DIR/`) && strings.HasSuffix(trim, ".md\"") {
				flush()
			}
		}
	}
	flush()
	return groups
}

func detectScope(lines []string, sedLine int) string {
	// Look backward for find or file target
	for j := sedLine; j >= 0 && j > sedLine-15; j-- {
		l := lines[j]
		if strings.Contains(l, `find "$DOCS_DIR" -name "*.md"`) {
			return "all_md"
		}
		if strings.Contains(l, `find "$DOCS_DIR/guides" -name "*.md"`) {
			if strings.Contains(l, "-maxdepth 1") {
				return "glob:guides/*.md"
			}
			return "glob:guides/**/*.md"
		}
		if strings.Contains(l, `find "$DOCS_DIR/resources/infra-providers"`) {
			return "glob:resources/infra-providers/*.md"
		}
		if strings.Contains(l, `find "$DOCS_DIR" -name "*.mdx"`) || strings.Contains(l, `\( -name "*.md" -o -name "*.mdx" \)`) {
			return "glob:**/*.{md,mdx}"
		}
		if strings.Contains(l, `for _opfile in`) {
			return "files:operations"
		}
		if strings.Contains(l, `for _sec in capabilities workloads`) {
			return "files:section_overviews"
		}
		if strings.Contains(l, `for _accfile in`) {
			return "files:accelerators"
		}
		if strings.Contains(l, `for obs_file in`) {
			return "files:observability"
		}
		if strings.Contains(l, `"$DOCS_DIR/guides/agentic-serving/index.md"`) {
			return "file:guides/agentic-serving/index.md"
		}
		if strings.Contains(l, `"$DOCS_DIR/guides/multimodal-serving.md"`) {
			return "file:guides/multimodal-serving.md"
		}
		if strings.Contains(l, `"$DOCS_DIR/guides/index.md"`) {
			return "file:guides/index.md"
		}
		if strings.Contains(l, `"$DOCS_DIR/resources/infrastructure/index.md"`) {
			return "file:resources/infrastructure/index.md"
		}
		if strings.Contains(l, `"$DOCS_DIR/resources/gateway/index.md"`) {
			return "file:resources/gateway/index.md"
		}
		if strings.Contains(l, `"$DOCS_DIR/resources/rdma/rdma-configuration.md"`) {
			return "file:resources/rdma/rdma-configuration.md"
		}
		if strings.Contains(l, `"$DOCS_DIR/api-reference/index.md"`) {
			return "file:api-reference/index.md"
		}
		if strings.Contains(l, `"$DOCS_DIR/api-reference/epp-http-apis.md"`) {
			return "file:api-reference/epp-http-apis.md"
		}
		if strings.Contains(l, `"$DOCS_DIR/architecture/index.md"`) {
			return "file:architecture/index.md"
		}
		if strings.Contains(l, `"$DOCS_DIR/architecture/core/router/index.md"`) {
			return "file:architecture/core/router/index.md"
		}
	}
	return "all_md"
}

func unescape(s string) string {
	s = strings.ReplaceAll(s, `\(`, "(")
	s = strings.ReplaceAll(s, `\)`, ")")
	return s
}

// sedPatternToGo converts sed BRE from sync-docs.sh into Go regexp syntax.
func sedPatternToGo(s string) string {
	// sed BRE \{n,m\} → Go {n,m} quantifier on the preceding atom.
	s = regexp.MustCompile(`\\?\{(\d+),(\d*)\\?\}`).ReplaceAllString(s, `{$1,$2}`)

	// sed uses bare ) for literal close-paren in link targets (e.g. ../../../guides/)).
	for _, lit := range []string{`guides/)`, `guides)`} {
		s = strings.ReplaceAll(s, lit, strings.ReplaceAll(lit, ")", `\)`))
	}

	// LaTeX commands: sed patterns may already use \\text; only fix single-backslash
	// forms that Go regexp would misread (\text → tab+"ext").
	for _, cmd := range []string{"text", "frac", "times"} {
		re := regexp.MustCompile(`(^|[^\\])\\` + regexp.QuoteMeta(cmd))
		s = re.ReplaceAllString(s, `${1}\\`+cmd)
	}
	return s
}

func writeGo(outPath string, groups []ruleGroup) error {
	var b strings.Builder
	b.WriteString("// Code generated by cmd/gensyncrules; DO NOT EDIT.\n\n")
	b.WriteString("package sync\n\n")
	b.WriteString("import \"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/transform\"\n\n")
	b.WriteString("func generatedRuleGroups() []ruleGroup {\n")
	b.WriteString("\treturn []ruleGroup{\n")
	for _, g := range groups {
		fmt.Fprintf(&b, "\t\t{scope: %q, rules: []transform.Rule{\n", g.Scope)
		for _, r := range g.Rules {
			fmt.Fprintf(&b, "\t\t\t{Pattern: %q, Replacement: %q},\n", r.Pattern, r.Replacement)
		}
		b.WriteString("\t\t}},\n")
	}
	b.WriteString("\t}\n}\n")
	return os.WriteFile(outPath, []byte(b.String()), 0o644)
}

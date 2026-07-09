package transform

import (
	"os"
	"regexp"
	"strings"
)

// Rule is a sed-style substitution (pattern applied with ReplaceAllString).
type Rule struct {
	Pattern     string
	Replacement string
}

// CompiledRule is a pre-compiled Rule for repeated application.
type CompiledRule struct {
	re   *regexp.Regexp
	repl string
}

// CompileRules compiles rules once for reuse across many files.
func CompileRules(rules []Rule) ([]CompiledRule, error) {
	out := make([]CompiledRule, 0, len(rules))
	for _, r := range rules {
		pattern := r.Pattern
		if strings.HasPrefix(pattern, "^") || strings.Contains(pattern, "\n") {
			if !strings.HasPrefix(pattern, "(?m)") {
				pattern = "(?m)" + pattern
			}
		}
		re, err := regexp.Compile(pattern)
		if err != nil {
			return nil, err
		}
		out = append(out, CompiledRule{re: re, repl: r.Replacement})
	}
	return out, nil
}

// MustCompileRules compiles rules and panics on invalid patterns.
func MustCompileRules(rules []Rule) []CompiledRule {
	out, err := CompileRules(rules)
	if err != nil {
		panic(err)
	}
	return out
}

// CompileRulesSkipInvalid compiles rules, skipping patterns that fail to compile.
func CompileRulesSkipInvalid(rules []Rule) []CompiledRule {
	out := make([]CompiledRule, 0, len(rules))
	for _, r := range rules {
		pattern := r.Pattern
		if strings.HasPrefix(pattern, "^") || strings.Contains(pattern, "\n") {
			if !strings.HasPrefix(pattern, "(?m)") {
				pattern = "(?m)" + pattern
			}
		}
		re, err := regexp.Compile(pattern)
		if err != nil {
			continue
		}
		out = append(out, CompiledRule{re: re, repl: r.Replacement})
	}
	return out
}

// ApplyCompiledRules applies pre-compiled rules with optional $VAR substitution.
func ApplyCompiledRules(content string, compiled []CompiledRule, vars map[string]string) string {
	for _, cr := range compiled {
		repl := cr.repl
		for k, v := range vars {
			repl = strings.ReplaceAll(repl, "$"+k, v)
		}
		content = cr.re.ReplaceAllString(content, repl)
	}
	return content
}

// Vars substitutes $NAME placeholders in replacement strings (e.g. $UPSTREAM_REF).
func ApplyRules(content string, rules []Rule, vars map[string]string) string {
	return ApplyCompiledRules(content, CompileRulesSkipInvalid(rules), vars)
}

// ApplyRulesToFile reads path, applies rules, writes back.
func ApplyRulesToFile(path string, rules []Rule, vars map[string]string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	out := ApplyRules(string(data), rules, vars)
	return os.WriteFile(path, []byte(out), 0o644)
}

// ApplyRulesToFileIfExists applies rules when path exists; missing files are skipped.
func ApplyRulesToFileIfExists(path string, rules []Rule, vars map[string]string) error {
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return ApplyRulesToFile(path, rules, vars)
}

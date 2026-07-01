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

// Vars substitutes $NAME placeholders in replacement strings (e.g. $UPSTREAM_REF).
func ApplyRules(content string, rules []Rule, vars map[string]string) string {
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
		repl := r.Replacement
		for k, v := range vars {
			repl = strings.ReplaceAll(repl, "$"+k, v)
		}
		content = re.ReplaceAllString(content, repl)
	}
	return content
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

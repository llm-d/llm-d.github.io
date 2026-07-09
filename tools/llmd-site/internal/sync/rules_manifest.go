package sync

import (
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/transform"
)

func manifestRuleGroups(m *manifest.Manifest) []ruleGroup {
	if m == nil || len(m.TransformRules) == 0 {
		return nil
	}
	groups := make([]ruleGroup, 0, len(m.TransformRules))
	for _, g := range m.TransformRules {
		rules := make([]transform.Rule, len(g.Rules))
		for i, r := range g.Rules {
			rules[i] = transform.Rule{Pattern: r.Pattern, Replacement: r.Replace}
		}
		groups = append(groups, ruleGroup{scope: g.Scope, rules: rules})
	}
	return groups
}

package sync

import (
	"regexp"
	"testing"
)

func TestGeneratedRulesCompile(t *testing.T) {
	critical := map[string]bool{
		"/img/docs/flow_control_dashboard.png":             true,
		"`Tokens = (Image Width * Image Height) / Factor`": true,
	}
	for _, g := range generatedRuleGroups() {
		for _, r := range g.rules {
			if !critical[r.Replacement] {
				continue
			}
			if _, err := regexp.Compile(r.Pattern); err != nil {
				t.Fatalf("scope %q pattern %q: %v", g.scope, r.Pattern, err)
			}
		}
	}
}

func TestGeneratedMultimodalRuleInManifest(t *testing.T) {
	var pattern string
	for _, g := range generatedRuleGroups() {
		if g.scope != "file:guides/multimodal-serving.md" {
			continue
		}
		for _, r := range g.rules {
			if r.Replacement == "`Tokens = (Image Width * Image Height) / Factor`" {
				pattern = r.Pattern
			}
		}
	}
	if pattern == "" {
		t.Fatal("multimodal math rule not found")
	}
	re, err := regexp.Compile(pattern)
	if err != nil {
		t.Fatalf("compile: %v pattern %q", err, pattern)
	}
	line := "$$\\text{Tokens} = \\frac{\\text{Image Width} \\times \\text{Image Height}}{\\text{Factor}}$$"
	if !re.MatchString(line) {
		t.Fatalf("pattern did not match line %q", line)
	}
}

func TestGeneratedFlowControlImageRule(t *testing.T) {
	var pattern string
	for _, g := range generatedRuleGroups() {
		if g.scope != "all_md" {
			continue
		}
		for _, r := range g.rules {
			if r.Replacement == "/img/docs/flow_control_dashboard.png" {
				pattern = r.Pattern
			}
		}
	}
	if pattern == "" {
		t.Fatal("flow_control_dashboard rule not found")
	}
	re := regexp.MustCompile(pattern)
	in := "![x](../../images/flow_control_dashboard.png)"
	if !re.MatchString(in) {
		t.Fatalf("pattern %q did not match %q", pattern, in)
	}
}

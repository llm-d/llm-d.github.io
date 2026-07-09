package sync

import (
	"path/filepath"
	"regexp"
	"testing"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
)

func loadManifestTransformRules(t *testing.T) []ruleGroup {
	t.Helper()
	root, err := repo.Root()
	if err != nil {
		t.Fatal(err)
	}
	m, err := manifest.Load(filepath.Join(root, "docs-sync.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	groups := manifestRuleGroups(m)
	if len(groups) == 0 {
		t.Fatal("expected transform_rules in docs-sync.yaml")
	}
	return groups
}

func TestManifestTransformRulesCompile(t *testing.T) {
	critical := map[string]bool{
		"/img/docs/flow_control_dashboard.png":             true,
		"`Tokens = (Image Width * Image Height) / Factor`": true,
	}
	for _, g := range loadManifestTransformRules(t) {
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

func TestManifestMultimodalRule(t *testing.T) {
	var pattern string
	for _, g := range loadManifestTransformRules(t) {
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

func TestManifestFlowControlImageRule(t *testing.T) {
	var pattern string
	for _, g := range loadManifestTransformRules(t) {
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

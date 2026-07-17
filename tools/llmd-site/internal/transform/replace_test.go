package transform

import (
	"regexp"
	"testing"
)

func TestBrokenRulePatterns(t *testing.T) {
	// Sed \{1,\} repetition does not translate to Go regexp; pattern compiles but never matches.
	re, err := regexp.Compile(`(\.\./)\{1,\}images/flow_control_dashboard\.png`)
	if err != nil {
		t.Fatal(err)
	}
	if re.MatchString("../../images/flow_control_dashboard.png") {
		t.Fatal("broken sed quantifier pattern should not match")
	}
}

func TestFixedFlowControlImageRule(t *testing.T) {
	rules := []Rule{
		{Pattern: `(?:\.\./)+images/flow_control_dashboard\.png`, Replacement: `/img/docs/flow_control_dashboard.png`},
	}
	in := "![Flow Control Dashboard](../../images/flow_control_dashboard.png)"
	out := ApplyRules(in, rules, nil)
	want := "![Flow Control Dashboard](/img/docs/flow_control_dashboard.png)"
	if out != want {
		t.Fatalf("got %q want %q", out, want)
	}
}

func TestFixedMultimodalMathRule(t *testing.T) {
	rules := []Rule{
		{Pattern: `^\$\$\\text\{Tokens\} = \\frac\{\\text\{Image Width\} \\times \\text\{Image Height\}\}\{\\text\{Factor\}\}\$\$`, Replacement: "`Tokens = (Image Width * Image Height) / Factor`"},
	}
	in := "$$\\text{Tokens} = \\frac{\\text{Image Width} \\times \\text{Image Height}}{\\text{Factor}}$$"
	out := ApplyRules(in, rules, nil)
	want := "`Tokens = (Image Width * Image Height) / Factor`"
	if out != want {
		t.Fatalf("got %q want %q", out, want)
	}
}

func TestGeneratedMultimodalMathRule(t *testing.T) {
	rules := []Rule{
		{Pattern: "^\\$\\$\\\\text{Tokens} = \\\\frac{\\\\text{Image Width} \\\\times \\\\text{Image Height}}{\\\\text{Factor}}\\$\\$", Replacement: "`Tokens = (Image Width * Image Height) / Factor`"},
	}
	in := "$$\\text{Tokens} = \\frac{\\text{Image Width} \\times \\text{Image Height}}{\\text{Factor}}$$"
	out := ApplyRules(in, rules, nil)
	want := "`Tokens = (Image Width * Image Height) / Factor`"
	if out != want {
		t.Fatalf("generated rule: got %q want %q", out, want)
	}
}

func TestCompiledRulesMatchApplyRules(t *testing.T) {
	rules := benchSampleRules()
	vars := map[string]string{"UPSTREAM_REF": "main"}
	in := benchDocContent(t)

	got := ApplyCompiledRules(in, CompileRulesSkipInvalid(rules), vars)
	want := ApplyRules(in, rules, vars)
	if got != want {
		t.Fatalf("compiled rules diverged from ApplyRules")
	}
}

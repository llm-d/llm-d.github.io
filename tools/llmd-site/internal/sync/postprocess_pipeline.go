package sync

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/transform"
)

type compiledStage struct {
	applies func(docsDir, path string) bool
	apply   func(content, path string) string
}

func (e *engine) postprocess() error {
	vars := map[string]string{
		"UPSTREAM_REF": e.upstreamRef,
	}

	stages, err := e.buildPostprocessStages(vars)
	if err != nil {
		return err
	}

	paths, err := collectDocPaths(e.docsDir)
	if err != nil {
		return err
	}

	workers := e.opts.SyncWorkers
	if workers <= 0 {
		workers = runtime.NumCPU()
	}
	if workers > len(paths) {
		workers = len(paths)
	}
	if workers < 1 {
		workers = 1
	}

	if !e.opts.Quiet {
		fmt.Println("    Applying markdown transformations (callouts, tabs, MDX escaping, well-lit-paths links)...")
	}

	sem := make(chan struct{}, workers)
	var wg sync.WaitGroup
	var firstErr error
	var errMu sync.Mutex

	for _, path := range paths {
		path := path
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			if err := e.processDocFile(path, stages); err != nil {
				errMu.Lock()
				if firstErr == nil {
					firstErr = err
				}
				errMu.Unlock()
			}
		}()
	}
	wg.Wait()
	return firstErr
}

func (e *engine) processDocFile(path string, stages []compiledStage) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	content := string(data)
	for _, stage := range stages {
		if stage.applies(e.docsDir, path) {
			content = stage.apply(content, path)
		}
	}
	return os.WriteFile(path, []byte(content), 0o644)
}

func collectDocPaths(docsDir string) ([]string, error) {
	var paths []string
	err := filepath.Walk(docsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		ext := filepath.Ext(path)
		if ext == ".md" || ext == ".mdx" {
			paths = append(paths, path)
		}
		return nil
	})
	return paths, err
}

func (e *engine) buildPostprocessStages(vars map[string]string) ([]compiledStage, error) {
	var stages []compiledStage

	addRules := func(applies func(string, string) bool, rules []transform.Rule) {
		compiled := transform.CompileRulesSkipInvalid(rules)
		stages = append(stages, compiledStage{
			applies: applies,
			apply: func(content, _ string) string {
				return transform.ApplyCompiledRules(content, compiled, vars)
			},
		})
	}

	for _, g := range generatedRuleGroups() {
		addRules(scopeApplier(e.docsDir, g.scope), g.rules)
	}

	dynamicStage, err := e.buildGuideDynamicStage(vars)
	if err != nil {
		return nil, err
	}
	if dynamicStage != nil {
		stages = append(stages, *dynamicStage)
	}

	stages = append(stages, compiledStage{
		applies: func(_, path string) bool {
			return strings.HasSuffix(path, ".md")
		},
		apply: func(content, _ string) string {
			return transform.ApplySharedContent(content)
		},
	})

	addRules(func(_, path string) bool {
		return strings.HasSuffix(path, ".md")
	}, []transform.Rule{
		{Pattern: `/img/docs/images/`, Replacement: `/img/docs/`},
	})

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
		addRules(scopeApplier(e.docsDir, g.scope), g.rules)
	}

	return stages, nil
}

func (e *engine) buildGuideDynamicStage(vars map[string]string) (*compiledStage, error) {
	guidesDocs := filepath.Join(e.docsDir, "guides")
	if _, err := os.Stat(guidesDocs); err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	rulesByPath := map[string][]transform.CompiledRule{}

	err := filepath.Walk(guidesDocs, func(path string, info os.FileInfo, err error) error {
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
		compiled := transform.CompileRulesSkipInvalid(imgRules)
		benchDir := filepath.Join(e.staticDir, "guides", subdir, "benchmark-results")
		if hasPNG(benchDir) {
			benchRules := []transform.Rule{
				{Pattern: `src="\./benchmark-results/([^"]*)"`, Replacement: `src="/img/docs/guides/` + subdir + `/benchmark-results/` + `$1"`},
				{Pattern: `src="benchmark-results/([^"]*)"`, Replacement: `src="/img/docs/guides/` + subdir + `/benchmark-results/` + `$1"`},
				{Pattern: `!\[([^]]*)\]\(\./benchmark-results/([^)]*)\)`, Replacement: `![$1](/img/docs/guides/` + subdir + `/benchmark-results/` + `$2)`},
				{Pattern: `!\[([^]]*)\]\(benchmark-results/([^)]*)\)`, Replacement: `![$1](/img/docs/guides/` + subdir + `/benchmark-results/` + `$2)`},
			}
			compiled = append(compiled, transform.CompileRulesSkipInvalid(benchRules)...)
		}
		rulesByPath[path] = compiled
		return nil
	})
	if err != nil {
		return nil, err
	}
	if len(rulesByPath) == 0 {
		return nil, nil
	}

	return &compiledStage{
		applies: func(_, path string) bool {
			_, ok := rulesByPath[path]
			return ok
		},
		apply: func(content, path string) string {
			rules := rulesByPath[path]
			return transform.ApplyCompiledRules(content, rules, vars)
		},
	}, nil
}

func scopeApplier(docsDir, scope string) func(string, string) bool {
	switch scope {
	case "all_md":
		return func(_, path string) bool {
			return strings.HasSuffix(path, ".md")
		}
	case "glob:guides/**/*.md":
		guidesRoot := filepath.Join(docsDir, "guides")
		return func(_, path string) bool {
			if !strings.HasSuffix(path, ".md") {
				return false
			}
			rel, err := filepath.Rel(guidesRoot, path)
			return err == nil && !strings.HasPrefix(rel, "..")
		}
	case "glob:guides/*.md":
		guidesDir := filepath.Join(docsDir, "guides")
		return func(_, path string) bool {
			if !strings.HasSuffix(path, ".md") {
				return false
			}
			return filepath.Dir(path) == guidesDir
		}
	case "glob:resources/infra-providers/*.md":
		root := filepath.Join(docsDir, "resources", "infra-providers")
		return func(_, path string) bool {
			if !strings.HasSuffix(path, ".md") {
				return false
			}
			rel, err := filepath.Rel(root, path)
			return err == nil && !strings.HasPrefix(rel, "..") && !strings.Contains(rel, string(filepath.Separator))
		}
	case "glob:**/*.{md,mdx}":
		return func(_, path string) bool {
			ext := filepath.Ext(path)
			return ext == ".md" || ext == ".mdx"
		}
	case "glob:**/*.mdx":
		return func(_, path string) bool {
			return strings.HasSuffix(path, ".mdx")
		}
	case "files:section_overviews":
		return fileSetApplier(docsDir, "guides/capabilities.md", "guides/workloads.md")
	case "files:operations":
		return fileSetApplier(docsDir,
			"resources/operations/rollouts/adapter-rollout.md",
			"resources/operations/rollouts/blue-green-update.md",
			"resources/operations/rollouts/index.md",
			"resources/operations/readiness-probes.md",
			"resources/operations/router.md",
		)
	case "files:accelerators":
		return fileSetApplier(docsDir, "accelerators/index.md", "getting-started/accelerators.md")
	case "files:observability":
		return fileSetApplier(docsDir,
			"resources/observability/index.md",
			"resources/observability/setup.md",
			"resources/observability/metrics.md",
			"resources/observability/tracing.md",
			"resources/observability/promql.md",
		)
	default:
		if strings.HasPrefix(scope, "file:") {
			rel := strings.TrimPrefix(scope, "file:")
			target := filepath.Join(docsDir, filepath.FromSlash(rel))
			return func(_, path string) bool {
				return path == target
			}
		}
		return func(_, _ string) bool { return false }
	}
}

func fileSetApplier(docsDir string, relPaths ...string) func(string, string) bool {
	set := make(map[string]struct{}, len(relPaths))
	for _, rel := range relPaths {
		set[filepath.Join(docsDir, filepath.FromSlash(rel))] = struct{}{}
	}
	return func(_, path string) bool {
		_, ok := set[path]
		return ok
	}
}

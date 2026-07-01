package extract

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

var (
	cpDocWIP   = regexp.MustCompile(`cp_doc\s+"\$WIP/([^"]+)"\s+"\$DOCS_DIR/([^"]+)"`)
	cpDocWLP   = regexp.MustCompile(`cp_doc\s+"\$WLP/([^"]+)"\s+"\$DOCS_DIR/([^"]+)"`)
	setSlug    = regexp.MustCompile(`set_doc_slug\s+"\$DOCS_DIR/([^"]+)"\s+"([^"]+)"`)
	mkdirLine  = regexp.MustCompile(`"\$DOCS_DIR/([^"]+)"`)
	sedCount   = regexp.MustCompile(`sed_inplace|sed -i`)
)

// FromSyncScript parses legacy/preview/scripts/sync-docs.sh into a manifest skeleton.
func FromSyncScript(scriptPath string) (*manifest.Manifest, error) {
	f, err := os.Open(scriptPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	m := manifest.Default()
	m.Copies = nil
	m.Slugs = nil
	m.Directories = nil

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	var sedRules int
	inMkdir := false
	var mkdirBlock strings.Builder

	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		if strings.HasPrefix(trimmed, "mkdir -p") {
			inMkdir = true
			mkdirBlock.Reset()
			mkdirBlock.WriteString(line)
			if strings.HasSuffix(strings.TrimSpace(line), `\`) {
				continue
			}
			inMkdir = false
			m.Directories = append(m.Directories, parseMkdirDirs(mkdirBlock.String())...)
			continue
		}
		if inMkdir {
			mkdirBlock.WriteString("\n")
			mkdirBlock.WriteString(line)
			if !strings.HasSuffix(strings.TrimSpace(line), `\`) {
				inMkdir = false
				m.Directories = append(m.Directories, parseMkdirDirs(mkdirBlock.String())...)
			}
			continue
		}

		if sedCount.MatchString(line) {
			sedRules++
		}

		if parts := cpDocWIP.FindStringSubmatch(line); len(parts) == 3 {
			m.Copies = append(m.Copies, manifest.Copy{
				From: "docs/" + parts[1],
				To:   parts[2],
			})
			continue
		}
		if parts := cpDocWLP.FindStringSubmatch(line); len(parts) == 3 {
			m.Copies = append(m.Copies, manifest.Copy{
				From:    "docs/well-lit-paths/foundations/" + parts[1],
				To:      parts[2],
				When:    "foundations_layout",
				Comment: "from $WLP; capabilities layout uses docs/well-lit-paths/capabilities/",
			})
			continue
		}
		if strings.Contains(line, `cp_doc "$FC_SRC"`) {
			if dest := extractDest(line); dest != "" {
				m.Copies = append(m.Copies, manifest.Copy{
					From:    "docs/well-lit-paths/foundations/flow-control.md",
					To:      dest,
					When:    "foundations_layout",
					Comment: "capabilities layout: docs/well-lit-paths/traffic-control/flow-control.md",
				})
			}
			continue
		}
		if strings.Contains(line, `cp_doc "$WA_SRC"`) {
			if dest := extractDest(line); dest != "" {
				m.Copies = append(m.Copies, manifest.Copy{
					From:    "docs/well-lit-paths/foundations/workload-autoscaling.md",
					To:      dest,
					When:    "foundations_layout",
					Comment: "capabilities layout: docs/well-lit-paths/traffic-control/workload-autoscaling.md",
				})
			}
			continue
		}
		if parts := setSlug.FindStringSubmatch(line); len(parts) == 3 {
			m.Slugs = append(m.Slugs, manifest.Slug{File: parts[1], Slug: parts[2]})
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	// getting-started README prefer mdx over md
	for i, c := range m.Copies {
		if c.To == "getting-started/index.mdx" || c.To == "getting-started/index.md" {
			m.Copies[i].Prefer = []string{"getting-started/README.mdx", "getting-started/README.md"}
		}
	}

	m.Conditionals = defaultConditionals()
	m.Community = defaultCommunity()
	m.ReleaseFixups = defaultReleaseFixups()
	m.EditURLs = defaultEditURLs()
	m.ReplacementsPending = &manifest.ReplacementsMeta{
		SedRuleCount: sedRules,
		Note:         "sed rules remain in sync-docs.sh until Phase 2 Go sync port",
	}

	return m, nil
}

func extractDest(line string) string {
	idx := strings.Index(line, `"$DOCS_DIR/`)
	if idx < 0 {
		return ""
	}
	rest := line[idx+len(`"$DOCS_DIR/`):]
	end := strings.Index(rest, `"`)
	if end < 0 {
		return ""
	}
	return rest[:end]
}

func parseMkdirDirs(block string) []string {
	var dirs []string
	for _, m := range mkdirLine.FindAllStringSubmatch(block, -1) {
		if len(m) == 2 {
			dirs = append(dirs, m[1])
		}
	}
	return dirs
}

func defaultCommunity() []manifest.CommunityFile {
	return []manifest.CommunityFile{
		{From: "CONTRIBUTING.md", To: "community/contribute.md", Transform: "contribute", Title: "Contributing to llm-d"},
		{From: "CODE_OF_CONDUCT.md", To: "community/code-of-conduct.md", Transform: "standard", Title: "Code of Conduct"},
		{From: "SIGS.md", To: "community/sigs.md", Transform: "standard", Title: "Special Interest Groups (SIGs)"},
		{From: "SECURITY.md", To: "community/security.md", Transform: "standard", Title: "Security Policy"},
	}
}

func defaultConditionals() []manifest.Conditional {
	return []manifest.Conditional{
		{
			Name:        "foundations_layout",
			When:        "upstream:docs/well-lit-paths/foundations exists",
			Description: "well-lit-paths/capabilities renamed to foundations; traffic-control folded in",
			Copies: []manifest.Copy{
				{From: "docs/well-lit-paths/foundations/optimized-baseline.md", To: "guides/optimized-baseline.md"},
				{From: "docs/well-lit-paths/foundations/flow-control.md", To: "guides/flow-control.md"},
				{From: "docs/well-lit-paths/foundations/workload-autoscaling.md", To: "guides/workload-autoscaling.md"},
				{From: "docs/well-lit-paths/foundations/README.md", To: "guides/capabilities.md"},
			},
		},
		{
			Name:        "capabilities_layout",
			When:        "upstream:docs/well-lit-paths/foundations missing",
			Description: "legacy release branches before foundations rename",
			Copies: []manifest.Copy{
				{From: "docs/well-lit-paths/capabilities/optimized-baseline.md", To: "guides/optimized-baseline.md"},
				{From: "docs/well-lit-paths/traffic-control/flow-control.md", To: "guides/flow-control.md"},
				{From: "docs/well-lit-paths/traffic-control/workload-autoscaling.md", To: "guides/workload-autoscaling.md"},
				{From: "docs/well-lit-paths/capabilities/README.md", To: "guides/capabilities.md"},
			},
		},
		{
			Name:        "observability_modern",
			When:        "upstream:docs/operations/observability exists",
			Description: "operations/observability layout",
			Copies: []manifest.Copy{
				{From: "docs/operations/observability/README.md", To: "resources/observability/index.md"},
			},
		},
		{
			Name:        "observability_resources",
			When:        "upstream:docs/resources/observability exists",
			Description: "legacy resources/observability layout",
			Copies: []manifest.Copy{
				{From: "docs/resources/observability/README.md", To: "resources/observability/index.md"},
			},
		},
	}
}

func defaultReleaseFixups() []manifest.Replacement {
	return []manifest.Replacement{
		{Pattern: `github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-aware`, Replace: `github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-routing`, Scope: "release_branch_docs"},
		{Pattern: `github.com/llm-d/llm-d/tree/main/guides/predicted-latency-based-scheduling`, Replace: `github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing`, Scope: "release_branch_docs"},
		{Pattern: `github.com/llm-d/llm-d/tree/main/guides/prereq/gateways/README\.md`, Replace: `github.com/llm-d/llm-d/tree/main/docs/infrastructure/gateway`, Scope: "release_branch_docs"},
		{Pattern: `github.com/llm-d/llm-d/tree/main/docs/resources/gateway`, Replace: `github.com/llm-d/llm-d/tree/main/docs/infrastructure/gateway`, Scope: "release_branch_docs"},
	}
}

func defaultEditURLs() []manifest.EditURL {
	return []manifest.EditURL{
		{Match: "guides/optimized-baseline.md", Upstream: "docs/well-lit-paths/foundations/optimized-baseline.md", Description: "well-lit path flat guide"},
		{Match: "guides/no-kubernetes-deployment.md", Upstream: "docs/infrastructure/no-kubernetes-deployment.md"},
		{Match: "resources/gateway/", Upstream: "docs/infrastructure/gateway/", Description: "prefix rewrite"},
		{Match: "resources/infra-providers/index.md", Upstream: "docs/infrastructure/providers/README.md"},
		{Match: "resources/rdma/rdma-configuration.md", Upstream: "docs/infrastructure/rdma/README.md"},
		{Match: "architecture/advanced/autoscaling/workload-variant-autoscaling.md", Upstream: "docs/architecture/advanced/autoscaling/hpa-wva.md"},
		{Match: "architecture/advanced/autoscaling/igw-hpa.md", Upstream: "docs/architecture/advanced/autoscaling/hpa-epp.md"},
		{Match: "accelerators/index.md", Upstream: "docs/getting-started/accelerators.md"},
		{Match: "resources/operations/", Upstream: "docs/operations/", Description: "prefix rewrite"},
		{Match: "resources/infrastructure/", Upstream: "docs/infrastructure/", Description: "prefix rewrite"},
		{Match: "getting-started/index.md", Upstream: "docs/getting-started/README.mdx"},
		{Match: "getting-started/index.mdx", Upstream: "docs/getting-started/README.mdx"},
	}
}

// MergeUniqueCopies deduplicates copy rules keeping first unconditional entry per destination.
func MergeUniqueCopies(copies []manifest.Copy) []manifest.Copy {
	seen := map[string]bool{}
	var out []manifest.Copy
	for _, c := range copies {
		key := c.To + "\x00" + c.When
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, c)
	}
	return out
}

func ValidateExtract(m *manifest.Manifest) error {
	if len(m.Copies) == 0 {
		return fmt.Errorf("extract produced zero copy rules")
	}
	return m.Validate()
}

package transform

import (
	"os"
	"regexp"
	"strings"
)

// ApplyShared applies shared MDX/markdown transforms during doc sync.
// Doc-specific sed rules run via internal/sync/postprocess.go.
func ApplyShared(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	content := ApplySharedContent(string(data))
	return os.WriteFile(path, []byte(content), 0o644)
}

// ApplySharedContent applies shared MDX/markdown transforms during doc sync.
func ApplySharedContent(content string) string {
	content = strings.ReplaceAll(content, "<->", `\`+"<->")
	content = transformImages(content)
	content = transformAutolinks(content)
	content = transformHTMLComments(content)
	content = transformPlaceholders(content)
	content = transformComparisons(content)
	content = transformWellLitPaths(content)
	content = transformReadmeLinks(content)
	content = transformGuideSlugNorm(content)
	content = transformDeploymentLinks(content)
	content = transformVoidTags(content)
	content = transformUnquotedImgAttrs(content)
	content = transformCallouts(content)
	content = transformTabs(content)
	content = transformRemainingComments(content)
	return content
}

var (
	reMDImageAssets   = regexp.MustCompile(`!\[([^]]*)\]\((\.\./)*assets/([^)]*)\)`)
	reHTMLImgAssets   = regexp.MustCompile(`src="(\.\./)*assets/([^"]*)"`)
	reHTMLSrcset      = regexp.MustCompile(`srcset="(\.\./)*assets/([^"]*)"`)
	reAutolink        = regexp.MustCompile(`<(https?://[^>]+)>`)
	rePlaceholderTag  = regexp.MustCompile(`<([a-z][a-z0-9]*_[a-z0-9_]*)>`)
	reWellLitPrefix   = regexp.MustCompile(`well-lit-paths/(capabilities|operations|workloads/batch-serving|workloads)/`)
	reWellLitRel      = regexp.MustCompile(`\(\.\./well-lit-paths/([^)]+)\.md\)`)
	reWellLitAny      = regexp.MustCompile(`\][^)]*/well-lit-paths/([^)]*)\.md\)`)
)

func transformImages(s string) string {
	s = reMDImageAssets.ReplaceAllString(s, `![$1](/img/docs/$3)`)
	s = reHTMLImgAssets.ReplaceAllString(s, `src="/img/docs/$2"`)
	s = reHTMLSrcset.ReplaceAllString(s, `srcset="/img/docs/$2"`)
	return s
}

func transformAutolinks(s string) string {
	return reAutolink.ReplaceAllString(s, `$1`)
}

func transformPlaceholders(s string) string {
	return rePlaceholderTag.ReplaceAllString(s, `\<$1\>`)
}

func transformComparisons(s string) string {
	s = strings.ReplaceAll(s, "<=", `\&le;`)
	s = strings.ReplaceAll(s, ">=", `\&ge;`)
	s = strings.ReplaceAll(s, `\{`, `(`)
	s = strings.ReplaceAll(s, `\}`, `)`)
	lines := strings.Split(s, "\n")
	for i, line := range lines {
		if strings.HasPrefix(strings.TrimSpace(line), "|") {
			line = strings.ReplaceAll(line, "{", "(")
			line = strings.ReplaceAll(line, "}", ")")
			lines[i] = line
		}
	}
	return strings.Join(lines, "\n")
}

func transformWellLitPaths(s string) string {
	s = reWellLitPrefix.ReplaceAllString(s, `well-lit-paths/`)
	s = reWellLitRel.ReplaceAllString(s, `(/guides/$1)`)
	s = reWellLitAny.ReplaceAllString(s, `](/guides/$1)`)
	return s
}

func transformHTMLComments(s string) string {
	re := regexp.MustCompile(`<!--(.*?)-->`)
	return re.ReplaceAllStringFunc(s, func(match string) string {
		inner := strings.TrimPrefix(strings.TrimSuffix(match, "-->"), "<!--")
		trimmed := strings.TrimSpace(inner)
		if strings.HasPrefix(trimmed, "TABS") || strings.HasPrefix(trimmed, "TAB:") {
			return match
		}
		return "{/*" + inner + "*/}"
	})
}

func transformGuideSlugNorm(s string) string {
	repl := []struct{ pat, rep string }{
		{`\]\(/docs/guides/predicted-latency-routing\)`, `](/docs/guides/predicted-latency)`},
		{`\]\(/guides/predicted-latency-routing\)`, `](/guides/predicted-latency)`},
		{`\]\(\../../guides/predicted-latency-routing\)`, `](/guides/predicted-latency)`},
		{`\]\(/docs/guides/wide-ep-lws\)`, `](/docs/guides/wide-expert-parallelism)`},
		{`\]\(/guides/wide-ep-lws\)`, `](/guides/wide-expert-parallelism)`},
		{`\]\(\../../guides/wide-ep-lws\)`, `](/guides/wide-expert-parallelism)`},
		{`\]\(\../../prereq/gateway-provider/common-configurations/\*\)`, `](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateway-provider#common-configurations)`},
		{`\]\(\../gateway/\*\)`, `](/guides/recipes/gateway)`},
	}
	for _, r := range repl {
		re := regexp.MustCompile(r.pat)
		s = re.ReplaceAllString(s, r.rep)
	}
	return s
}

func transformDeploymentLinks(s string) string {
	repl := []struct{ pat, rep string }{
		{`\][^)]*/guides/prereq/gateways/README\.md\)`, `](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateways/README.md)`},
		{`\][^)]*/guides/prereq/gateways/istio\.md\)`, `](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateways/istio.md)`},
		{`\][^)]*/guides/prereq/gateways/gke\.md\)`, `](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateways/gke.md)`},
		{`\][^)]*/guides/prereq/gateways/agentgateway\.md\)`, `](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateways/agentgateway.md)`},
		{`\][^)]*/guides/multimodal/optimized-baseline/README\.md\)`, `](https://github.com/llm-d/llm-d/tree/main/guides/multimodal-serving/optimized-baseline/README.md)`},
	}
	for _, r := range repl {
		re := regexp.MustCompile(r.pat)
		s = re.ReplaceAllString(s, r.rep)
	}
	return s
}

func transformUnquotedImgAttrs(s string) string {
	re := regexp.MustCompile(`(<img [^>]*)(width|height|alt|src)=([^"' ][^ >]*)`)
	return re.ReplaceAllString(s, `$1$2="$3"`)
}

func transformReadmeLinks(s string) string {
	repl := []struct{ pat, rep string }{
		{`\][^)]*/accelerators/README\.md\)`, `](/accelerators)`},
		{`\][^)]*/architecture/core/router/epp/README\.md\)`, `](/architecture/core/router/epp)`},
		{`\][^)]*/architecture/advanced/kv-management/README\.md\)`, `](/architecture/advanced/kv-management)`},
		{`\][^)]*/guides/precise-prefix-cache-routing/README\.md\)`, `](/guides/precise-prefix-cache-routing)`},
		{`\][^)]*/guides/precise-prefix-cache-aware/README\.md\)`, `](/guides/precise-prefix-cache-routing)`},
		{`\]\(/guides/README\)`, `](/guides)`},
		{`\]\(\./gcp-pubsub/README\.md\)`, `](./gcp-pubsub/index.md)`},
		{`\]\(\./redis/README\.md\)`, `](./redis/index.md)`},
		{`\]\(\./gcp-pubsub/README\.md#testing\)`, `](./gcp-pubsub/index.md#testing)`},
		{`\]\(\./redis/README\.md#testing\)`, `](./redis/index.md#testing)`},
		{`\]\(\./cpu/README\.md\)`, `](./cpu/index.md)`},
		{`\]\(\./storage/README\.md\)`, `](./storage/index.md)`},
	}
	for _, r := range repl {
		re := regexp.MustCompile(r.pat)
		s = re.ReplaceAllString(s, r.rep)
	}
	return s
}

func transformVoidTags(s string) string {
	reImg := regexp.MustCompile(`<img ([^>]*[^/])>`)
	reSource := regexp.MustCompile(`<source ([^>]*[^/])>`)
	s = reImg.ReplaceAllString(s, `<img $1 />`)
	s = reSource.ReplaceAllString(s, `<source $1 />`)
	return s
}

func transformCallouts(s string) string {
	lines := strings.Split(s, "\n")
	var out []string
	inCallout := false
	calloutType := ""
	printedStart := false

	flush := func() {
		if inCallout {
			out = append(out, ":::")
			out = append(out, "")
			inCallout = false
			printedStart = false
			calloutType = ""
		}
	}

	calloutTypes := map[string]string{
		"> [!NOTE]":     "note",
		"> [!TIP]":      "tip",
		"> [!IMPORTANT]": "important",
		"> [!WARNING]":  "warning",
		"> [!CAUTION]":  "caution",
	}

	for _, line := range lines {
		matched := false
		for prefix, typ := range calloutTypes {
			if line == prefix {
				flush()
				inCallout = true
				calloutType = typ
				matched = true
				break
			}
		}
		if matched {
			continue
		}
		if inCallout && strings.HasPrefix(line, "> ") {
			if !printedStart {
				out = append(out, ":::"+calloutType)
				printedStart = true
			}
			out = append(out, strings.TrimPrefix(line, "> "))
			continue
		}
		if inCallout {
			flush()
		}
		out = append(out, line)
	}
	flush()
	return strings.Join(out, "\n")
}

func transformTabs(s string) string {
	if !strings.Contains(s, "<!-- TABS:START -->") {
		return s
	}
	if !strings.Contains(s, "import Tabs from '@theme/Tabs'") {
		s = "import Tabs from '@theme/Tabs';\nimport TabItem from '@theme/TabItem';\n\n" + s
	}

	lines := strings.Split(s, "\n")
	var out []string
	inTabs := false
	inTab := false

	for _, line := range lines {
		trim := strings.TrimSpace(line)
		if trim == "<!-- TABS:START -->" {
			inTabs = true
			out = append(out, "", "<Tabs>")
			continue
		}
		if inTabs && strings.HasPrefix(trim, "<!-- TAB:") {
			if inTab {
				out = append(out, "</TabItem>")
			}
			label := strings.TrimSuffix(strings.TrimPrefix(trim, "<!-- TAB:"), " -->")
			label = strings.TrimSpace(label)
			defaultAttr := ""
			if strings.HasSuffix(label, ":default") {
				defaultAttr = " default"
				label = strings.TrimSuffix(label, ":default")
			}
			value := tabValue(label)
			out = append(out, fmtTabItem(value, label, defaultAttr))
			inTab = true
			continue
		}
		if inTabs && trim == "<!-- TABS:END -->" {
			if inTab {
				out = append(out, "</TabItem>")
				inTab = false
			}
			out = append(out, "</Tabs>", "")
			inTabs = false
			continue
		}
		out = append(out, line)
	}
	return strings.Join(out, "\n")
}

func fmtTabItem(value, label, defaultAttr string) string {
	return `<TabItem value="` + value + `" label="` + label + `"` + defaultAttr + `>`
}

func tabValue(label string) string {
	v := strings.ToLower(label)
	re := regexp.MustCompile(`[^a-z0-9]+`)
	v = re.ReplaceAllString(v, "-")
	v = strings.Trim(v, "-")
	return v
}

func transformRemainingComments(s string) string {
	re := regexp.MustCompile(`<!--(.*)-->`)
	return re.ReplaceAllString(s, `{/*$1*/}`)
}

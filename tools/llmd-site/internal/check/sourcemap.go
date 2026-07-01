package check

import (
	"path/filepath"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

type SourceInfo struct {
	Source string
	File   string
}

func BuildSourceMap(m *manifest.Manifest) map[string]SourceInfo {
	out := make(map[string]SourceInfo)
	if m == nil {
		return out
	}

	add := func(dest, sourceFile string) {
		htmlPath := strings.TrimSuffix(dest, ".md")
		htmlPath = strings.TrimSuffix(htmlPath, ".mdx")
		htmlPath = strings.TrimSuffix(htmlPath, "/index")
		key := "docs/" + strings.Trim(htmlPath, "/")
		if key != "docs" {
			key += "/"
		}
		out[key] = SourceInfo{Source: "llm-d/llm-d", File: sourceFile}
	}

	for _, c := range m.Copies {
		src := strings.TrimPrefix(filepath.ToSlash(c.From), "docs/")
		add(c.To, src)
	}
	for _, cond := range m.Conditionals {
		for _, c := range cond.Copies {
			src := strings.TrimPrefix(filepath.ToSlash(c.From), "docs/")
			add(c.To, src)
		}
	}

	community := []struct{ source, dest string }{
		{"CONTRIBUTING.md", "docs/community/contribute"},
		{"CODE_OF_CONDUCT.md", "docs/community/code-of-conduct"},
		{"SECURITY.md", "docs/community/security"},
		{"SIGS.md", "docs/community/sigs"},
	}
	for _, c := range community {
		out[c.dest+".html"] = SourceInfo{Source: "llm-d/llm-d", File: c.source}
		out[c.dest+"/"] = SourceInfo{Source: "llm-d/llm-d", File: c.source}
	}
	return out
}

func lookupSource(pagePath string, sm map[string]SourceInfo) string {
	pagePath = strings.TrimPrefix(pagePath, "/")
	lookupPath := pagePath

	if info, ok := sm[lookupPath]; ok {
		return "**llm-d/llm-d**: `" + info.File + "`"
	}
	if !strings.HasSuffix(lookupPath, "/") {
		if info, ok := sm[strings.TrimSuffix(lookupPath, ".html")+"/"]; ok {
			return "**llm-d/llm-d**: `" + info.File + "`"
		}
	}
	if info, ok := sm[strings.TrimSuffix(lookupPath, ".html")]; ok {
		return "**llm-d/llm-d**: `" + info.File + "`"
	}
	if strings.HasPrefix(pagePath, "docs/") {
		return "**llm-d/llm-d** (synced documentation)"
	}
	return "**Local** (this repository)"
}

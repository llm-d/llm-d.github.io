package check

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

// BrokenLink is a single failed link check.
type BrokenLink struct {
	SourcePage string
	URL        string
	Reason     string
	Type       string
	Category   string
}

func GenerateReport(broken []BrokenLink, totalLinks, totalPages int, sourceMap map[string]SourceInfo) string {
	var b strings.Builder
	now := time.Now().Format("01/02/2006, 03:04:05 PM")
	fmt.Fprintf(&b, "# Broken Links Report\n\nGenerated: %s\n\n", now)
	fmt.Fprintf(&b, "## Summary\n\n")
	fmt.Fprintf(&b, "- **Total pages crawled:** %d\n", totalPages)
	fmt.Fprintf(&b, "- **Total links found:** %d\n", totalLinks)
	fmt.Fprintf(&b, "- **Broken links found:** %d\n", len(broken))

	if len(broken) == 0 {
		b.WriteString("\n🎉 **No broken links found!**\n")
		return b.String()
	}

	pages := map[string]struct{}{}
	for _, l := range broken {
		pages[l.SourcePage] = struct{}{}
	}
	fmt.Fprintf(&b, "- **Pages with issues:** %d\n\n", len(pages))
	b.WriteString("## Broken Links by Page\n\n")

	byPage := map[string][]BrokenLink{}
	for _, l := range broken {
		byPage[l.SourcePage] = append(byPage[l.SourcePage], l)
	}
	var pageKeys []string
	for p := range byPage {
		pageKeys = append(pageKeys, p)
	}
	sort.Slice(pageKeys, func(i, j int) bool {
		return len(byPage[pageKeys[i]]) > len(byPage[pageKeys[j]])
	})

	for _, page := range pageKeys {
		links := byPage[page]
		display := strings.TrimPrefix(page, "/")
		fmt.Fprintf(&b, "### /%s\n\n", display)
		if src := lookupSource(display, sourceMap); src != "" {
			fmt.Fprintf(&b, "**Source:** %s\n\n", src)
		}
		for _, l := range links {
			emoji := categoryEmoji(l.Category)
			fmt.Fprintf(&b, "- %s `%s` → **%s** (%s)\n", emoji, l.URL, l.Reason, l.Type)
		}
		b.WriteString("\n")
	}
	return b.String()
}

func categoryEmoji(cat string) string {
	switch cat {
	case "external":
		return "🌐"
	case "github":
		return "🐙"
	case "image":
		return "🖼️"
	default:
		return "🔗"
	}
}

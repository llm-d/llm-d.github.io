package manifest

import (
	"path/filepath"
	"strings"
)

// OutputFile returns the filename written under guides/ (e.g. optimized-baseline.md).
func (f GuideFile) OutputFile() string {
	return filepath.Base(filepath.ToSlash(f.To))
}

// SitePath returns the public URL path (e.g. /guides/optimized-baseline).
func (f GuideFile) SitePath() string {
	p := strings.TrimSuffix(filepath.ToSlash(f.To), ".md")
	p = strings.TrimSuffix(p, ".mdx")
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	return p
}

// SiteRoute returns the route without a leading slash (e.g. guides/optimized-baseline).
func (f GuideFile) SiteRoute() string {
	return strings.TrimPrefix(f.SitePath(), "/")
}

// SidebarLabel returns the sidebar label, defaulting to title.
func (f GuideFile) SidebarLabel() string {
	if f.SidebarLabelYAML != "" {
		return f.SidebarLabelYAML
	}
	return f.Title
}

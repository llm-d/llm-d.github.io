package manifest

import (
	"path/filepath"
	"strings"
)

// OutputFile returns the filename written under community/ (e.g. contribute.md).
func (f CommunityFile) OutputFile() string {
	return filepath.Base(filepath.ToSlash(f.To))
}

// SitePath returns the public URL path (e.g. /community/contribute).
func (f CommunityFile) SitePath() string {
	p := strings.TrimSuffix(filepath.ToSlash(f.To), ".md")
	p = strings.TrimSuffix(p, ".mdx")
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	return p
}

// SiteRoute returns the route without a leading slash (e.g. community/contribute).
func (f CommunityFile) SiteRoute() string {
	return strings.TrimPrefix(f.SitePath(), "/")
}

// SidebarLabel returns the sidebar label, defaulting to title.
func (f CommunityFile) SidebarLabel() string {
	if f.SidebarLabelYAML != "" {
		return f.SidebarLabelYAML
	}
	return f.Title
}

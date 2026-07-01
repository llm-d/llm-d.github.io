package check

import (
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var versionDirPattern = regexp.MustCompile(`^\d+\.\d+`)

func detectVersionedPaths(buildDir string) []string {
	docsDir := filepath.Join(buildDir, "docs")
	entries, err := os.ReadDir(docsDir)
	if err != nil {
		return nil
	}
	var paths []string
	for _, e := range entries {
		if !e.IsDir() || !versionDirPattern.MatchString(e.Name()) {
			continue
		}
		paths = append(paths, "/docs/"+e.Name()+"/")
	}
	return paths
}

func parseSitemapSeeds(buildDir string, ignore []string) []string {
	seeds := map[string]struct{}{"/": {}}

	var walk func(dir, rel string)
	walk = func(dir, rel string) {
		sitemap := filepath.Join(dir, "sitemap.xml")
		if _, err := os.Stat(sitemap); err == nil {
			normalizedDir := "/" + strings.Trim(filepath.ToSlash(rel), "/")
			if normalizedDir != "/" {
				normalizedDir += "/"
			}
			if !isIgnored(normalizedDir, ignore) {
				data, err := os.ReadFile(sitemap)
				if err == nil {
					for _, m := range reLoc.FindAllStringSubmatch(string(data), -1) {
						if u, err := url.Parse(m[1]); err == nil {
							p := u.Path
							if p == "" {
								p = "/"
							}
							if !isIgnored(p, ignore) {
								seeds[p] = struct{}{}
							}
						}
					}
				}
			}
		}
		entries, err := os.ReadDir(dir)
		if err != nil {
			return
		}
		for _, e := range entries {
			if e.IsDir() {
				walk(filepath.Join(dir, e.Name()), filepath.Join(rel, e.Name()))
			}
		}
	}
	walk(buildDir, "")

	out := make([]string, 0, len(seeds))
	for s := range seeds {
		out = append(out, s)
	}
	return out
}

package check

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

// Checker runs link validation against a built site.
type Checker struct {
	RepoRoot   string
	Config     Config
	Manifest   *manifest.Manifest
	server     *Server
	sourceMap  map[string]SourceInfo
}

type linkMeta struct {
	sourcePages map[string]struct{}
	linkType    string
}

// CheckLinks crawls the built site and returns exit code (0 ok, 1 broken links).
func CheckLinks(repoRoot string, m *manifest.Manifest) (int, error) {
	cfg := LoadConfig(repoRoot)
	if _, err := os.Stat(cfg.BuildDir); err != nil {
		return 1, fmt.Errorf("build directory not found at %s — run build first", cfg.BuildDir)
	}

	versioned := detectVersionedPaths(cfg.BuildDir)
	cfg.IgnorePatterns = append(cfg.IgnorePatterns, versioned...)
	if len(versioned) > 0 {
		fmt.Printf("📦 Auto-ignoring versioned paths: %s\n\n", stringsJoin(versioned, ", "))
	}

	c := &Checker{
		RepoRoot:  repoRoot,
		Config:    cfg,
		Manifest:  m,
		sourceMap: BuildSourceMap(m),
	}

	fmt.Println("🔍 Link Checker Starting...")
	fmt.Println("📂 Build directory:", cfg.BuildDir)

	srv, err := StartServer(repoRoot, cfg)
	if err != nil {
		return 1, err
	}
	c.server = srv
	defer srv.Stop()

	fmt.Println("🗺️  Building source map...")
	fmt.Printf("   Found %d source mappings\n\n", len(c.sourceMap))

	broken, totalLinks, visited, err := c.crawlAndValidate()
	if err != nil {
		return 1, err
	}

	fmt.Println("📝 Generating report...")
	report := GenerateReport(broken, totalLinks, len(visited), c.sourceMap)
	reportPath := filepath.Join(repoRoot, "broken-links-report.md")
	if err := os.WriteFile(reportPath, []byte(report), 0o644); err != nil {
		return 1, err
	}

	fmt.Println("✅ Report generated:", reportPath)
	fmt.Printf("\n📊 Summary:\n")
	fmt.Printf("   Total pages crawled: %d\n", len(visited))
	fmt.Printf("   Total links found: %d\n", totalLinks)
	fmt.Printf("   Broken links found: %d\n", len(broken))

	if len(broken) > 0 {
		fmt.Printf("\n⚠️  Found %d broken links:\n\n", len(broken))
		fmt.Println(stringsRepeat("─", 80))
		fmt.Println(report)
		fmt.Println(stringsRepeat("─", 80))
		postPullRequestComment(report)
		return 1, nil
	}

	fmt.Println("\n🎉 No broken links found!")
	return 0, nil
}

func (c *Checker) crawlAndValidate() ([]BrokenLink, int, map[string]struct{}, error) {
	base := c.server.BaseURL()
	seeds := parseSitemapSeeds(c.Config.BuildDir, c.Config.IgnorePatterns)
	fmt.Printf("🕷️  Crawling site...\n   Seeded crawl with %d URLs from sitemaps\n\n", len(seeds))

	toVisit := append([]string{}, seeds...)
	inQueue := map[string]struct{}{}
	for _, s := range seeds {
		inQueue[s] = struct{}{}
	}
	visited := map[string]struct{}{}
	allLinks := map[string]*linkMeta{}
	externalURLs := map[string]struct{}{}
	githubURLs := map[string]map[string]struct{}{}
	var broken []BrokenLink

	for len(toVisit) > 0 {
		current := toVisit[0]
		toVisit = toVisit[1:]
		if _, ok := visited[current]; ok {
			continue
		}
		visited[current] = struct{}{}
		fmt.Printf("\r   Crawled %d pages...", len(visited))

		result := c.crawlPage(base + current)
		if !result.Success {
			sources := []string{"N/A"}
			if meta, ok := allLinks[current]; ok && len(meta.sourcePages) > 0 {
				sources = sortedKeys(meta.sourcePages)
			}
			reason := result.Error
			if reason == "" {
				reason = fmt.Sprintf("HTTP %d", result.StatusCode)
			}
			typ := "link"
			if meta, ok := allLinks[current]; ok {
				typ = meta.linkType
			}
			for _, src := range sources {
				broken = append(broken, BrokenLink{
					SourcePage: src,
					URL:        current,
					Reason:     reason,
					Type:       typ,
					Category:   "internal",
				})
			}
			continue
		}

		for _, link := range result.Links {
			path, ext, isGH := normalizeURL(link.URL, base+current, c.Config)
			if ext != "" {
				if isGH {
					if githubURLs[ext] == nil {
						githubURLs[ext] = map[string]struct{}{}
					}
					githubURLs[ext][current] = struct{}{}
					if c.Config.CheckGitHubLinks {
						continue
					}
				}
				externalURLs[ext] = struct{}{}
				continue
			}
			if path == "" {
				continue
			}
			if allLinks[path] == nil {
				allLinks[path] = &linkMeta{sourcePages: map[string]struct{}{}, linkType: link.Type}
			}
			allLinks[path].sourcePages[current] = struct{}{}
			if isIgnored(path, c.Config.IgnorePatterns) {
				continue
			}
			if _, ok := visited[path]; ok {
				continue
			}
			if _, ok := inQueue[path]; ok {
				continue
			}
			toVisit = append(toVisit, path)
			inQueue[path] = struct{}{}
		}
	}
	fmt.Printf("\r   Crawled %d pages ✓\n\n", len(visited))
	fmt.Printf("   Found %d unique internal links\n", len(allLinks))
	fmt.Printf("   Found %d unique external URLs\n", len(externalURLs))
	fmt.Printf("   Found %d unique GitHub URLs\n\n", len(githubURLs))

	fmt.Println("✅ Validating discovered links...")
	checked := 0
	for path, meta := range allLinks {
		if isIgnored(path, c.Config.IgnorePatterns) {
			continue
		}
		checked++
		if _, ok := visited[path]; ok {
			continue
		}
		result := c.crawlPage(base + path)
		if !result.Success {
			reason := result.Error
			if reason == "" {
				reason = fmt.Sprintf("HTTP %d", result.StatusCode)
			}
			cat := "internal"
			if meta.linkType == "image" {
				cat = "image"
			}
			for src := range meta.sourcePages {
				broken = append(broken, BrokenLink{
					SourcePage: src,
					URL:        path,
					Reason:     reason,
					Type:       meta.linkType,
					Category:   cat,
				})
			}
		}
		if checked%100 == 0 {
			fmt.Printf("\r   Checked %d links...", checked)
		}
	}
	fmt.Printf("\r   Checked %d links ✓\n\n", checked)

	if c.Config.CheckGitHubLinks && len(githubURLs) > 0 {
		fmt.Println("🐙 Validating GitHub URLs...")
		if c.Config.GitHubToken != "" {
			fmt.Println("   Using GITHUB_TOKEN for authentication (better rate limits)")
		}
		rl := newRateLimiter(c.Config.MaxConcurrent)
		n := 0
		for url, sources := range githubURLs {
			if isIgnored(url, c.Config.IgnorePatterns) {
				continue
			}
			n++
			res := rl.run(func() validateResult {
				return validateExternalURL(url, c.Config.ExternalTimeout(), c.Config.GitHubToken)
			})
			if !res.Valid {
				for src := range sources {
					broken = append(broken, BrokenLink{
						SourcePage: src,
						URL:        url,
						Reason:     res.Reason,
						Type:       "link",
						Category:   "github",
					})
				}
			}
			if n%10 == 0 {
				fmt.Printf("\r   Checked %d/%d GitHub URLs...", n, len(githubURLs))
			}
		}
		fmt.Printf("\r   Checked %d GitHub URLs ✓\n\n", n)
	}

	if c.Config.CheckExternalLinks {
		fmt.Println("🌐 Validating external URLs...")
		rl := newRateLimiter(c.Config.MaxConcurrent)
		n := 0
		for url := range externalURLs {
			if isIgnored(url, c.Config.IgnorePatterns) {
				continue
			}
			n++
			res := rl.run(func() validateResult {
				return validateExternalURL(url, c.Config.ExternalTimeout(), "")
			})
			if !res.Valid {
				broken = append(broken, BrokenLink{
					SourcePage: "Multiple pages",
					URL:        url,
					Reason:     res.Reason,
					Type:       "link",
					Category:   "external",
				})
			}
		}
		fmt.Printf("\r   Checked %d external URLs ✓\n\n", n)
	} else {
		fmt.Println("⏭️  Skipping external URL validation (disabled in config)")
	}

	return broken, len(allLinks), visited, nil
}

func sortedKeys(m map[string]struct{}) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func stringsJoin(a []string, sep string) string {
	if len(a) == 0 {
		return ""
	}
	s := a[0]
	for i := 1; i < len(a); i++ {
		s += sep + a[i]
	}
	return s
}

func stringsRepeat(s string, n int) string {
	out := ""
	for i := 0; i < n; i++ {
		out += s
	}
	return out
}

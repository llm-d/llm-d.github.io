package check

import (
	"fmt"
	"sync"
	"sync/atomic"
)

func (c *Checker) crawlAndValidate() ([]BrokenLink, int, map[string]struct{}, error) {
	base := c.server.BaseURL()
	seeds := parseSitemapSeeds(c.Config.BuildDir, c.Config.IgnorePatterns)
	fmt.Printf("🕷️  Crawling site...\n   Seeded crawl with %d URLs from sitemaps\n\n", len(seeds))

	visited := map[string]struct{}{}
	visitedMu := sync.Mutex{}
	allLinks := map[string]*linkMeta{}
	linksMu := sync.Mutex{}
	externalURLs := map[string]struct{}{}
	extMu := sync.Mutex{}
	githubURLs := map[string]map[string]struct{}{}
	ghMu := sync.Mutex{}
	var broken []BrokenLink
	brokenMu := sync.Mutex{}

	workers := c.Config.CrawlConcurrency
	if workers <= 0 {
		workers = 8
	}
	sem := make(chan struct{}, workers)

	var crawlPending sync.WaitGroup
	var pagesCrawled atomic.Int64

	var enqueueCrawl func(string)
	enqueueCrawl = func(path string) {
		visitedMu.Lock()
		if _, ok := visited[path]; ok {
			visitedMu.Unlock()
			return
		}
		visited[path] = struct{}{}
		visitedMu.Unlock()

		crawlPending.Add(1)
		go func(current string) {
			defer crawlPending.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			n := pagesCrawled.Add(1)
			fmt.Printf("\r   Crawled %d pages...", n)

			result := c.crawlPageCached(base + current)
			if !result.Success {
				sources := []string{"N/A"}
				linksMu.Lock()
				if meta, ok := allLinks[current]; ok && len(meta.sourcePages) > 0 {
					sources = sortedKeys(meta.sourcePages)
				}
				typ := "link"
				if meta, ok := allLinks[current]; ok {
					typ = meta.linkType
				}
				linksMu.Unlock()
				reason := result.Error
				if reason == "" {
					reason = fmt.Sprintf("HTTP %d", result.StatusCode)
				}
				brokenMu.Lock()
				for _, src := range sources {
					broken = append(broken, BrokenLink{
						SourcePage: src,
						URL:        current,
						Reason:     reason,
						Type:       typ,
						Category:   "internal",
					})
				}
				brokenMu.Unlock()
				return
			}

			var next []string
			for _, link := range result.Links {
				path, ext, isGH := normalizeURL(link.URL, base+current, c.Config)
				if ext != "" {
					if isGH {
						ghMu.Lock()
						if githubURLs[ext] == nil {
							githubURLs[ext] = map[string]struct{}{}
						}
						githubURLs[ext][current] = struct{}{}
						ghMu.Unlock()
						if c.Config.CheckGitHubLinks {
							continue
						}
					}
					extMu.Lock()
					externalURLs[ext] = struct{}{}
					extMu.Unlock()
					continue
				}
				if path == "" {
					continue
				}
				linksMu.Lock()
				if allLinks[path] == nil {
					allLinks[path] = &linkMeta{sourcePages: map[string]struct{}{}, linkType: link.Type}
				}
				allLinks[path].sourcePages[current] = struct{}{}
				linksMu.Unlock()

				if isIgnored(path, c.Config.IgnorePatterns) {
					continue
				}
				visitedMu.Lock()
				_, seen := visited[path]
				visitedMu.Unlock()
				if !seen {
					next = append(next, path)
				}
			}
			for _, path := range next {
				enqueueCrawl(path)
			}
		}(path)
	}

	for _, s := range seeds {
		enqueueCrawl(s)
	}
	crawlPending.Wait()

	visitedMu.Lock()
	nVisited := len(visited)
	visitedMu.Unlock()

	fmt.Printf("\r   Crawled %d pages ✓\n\n", nVisited)
	fmt.Printf("   Found %d unique internal links\n", len(allLinks))
	fmt.Printf("   Found %d unique external URLs\n", len(externalURLs))
	fmt.Printf("   Found %d unique GitHub URLs\n\n", len(githubURLs))

	fmt.Println("✅ Validating discovered links...")
	pathsToCheck := make([]string, 0, len(allLinks))
	for path := range allLinks {
		if isIgnored(path, c.Config.IgnorePatterns) {
			continue
		}
		visitedMu.Lock()
		_, ok := visited[path]
		visitedMu.Unlock()
		if ok {
			continue
		}
		pathsToCheck = append(pathsToCheck, path)
	}

	var validateWG sync.WaitGroup
	validateSem := make(chan struct{}, workers)
	for _, path := range pathsToCheck {
		path := path
		meta := allLinks[path]
		validateWG.Add(1)
		go func() {
			defer validateWG.Done()
			validateSem <- struct{}{}
			defer func() { <-validateSem }()

			result := c.crawlPageCached(base + path)
			if result.Success {
				return
			}
			reason := result.Error
			if reason == "" {
				reason = fmt.Sprintf("HTTP %d", result.StatusCode)
			}
			if c.pageExists(path) {
				return
			}
			cat := "internal"
			if meta.linkType == "image" {
				cat = "image"
			}
			brokenMu.Lock()
			for src := range meta.sourcePages {
				broken = append(broken, BrokenLink{
					SourcePage: src,
					URL:        path,
					Reason:     reason,
					Type:       meta.linkType,
					Category:   cat,
				})
			}
			brokenMu.Unlock()
		}()
	}
	validateWG.Wait()
	fmt.Printf("\r   Checked %d links ✓\n\n", len(pathsToCheck))

	if c.Config.CheckGitHubLinks && len(githubURLs) > 0 {
		fmt.Println("🐙 Validating GitHub URLs...")
		if c.Config.GitHubToken != "" {
			fmt.Println("   Using GITHUB_TOKEN for authentication (better rate limits)")
		}
		urls := make([]string, 0, len(githubURLs))
		for url := range githubURLs {
			if isIgnored(url, c.Config.IgnorePatterns) {
				continue
			}
			urls = append(urls, url)
		}
		checkedGithub := c.checkURLsConcurrently(urls, "GitHub URLs", c.Config.GitHubToken, func(url string, res validateResult) {
			if !res.Valid {
				for src := range githubURLs[url] {
					broken = append(broken, BrokenLink{
						SourcePage: src,
						URL:        url,
						Reason:     res.Reason,
						Type:       "link",
						Category:   "github",
					})
				}
			}
		})
		fmt.Printf("   Checked %d GitHub URLs ✓\n\n", checkedGithub)
	}

	if c.Config.CheckExternalLinks {
		fmt.Println("🌐 Validating external URLs...")
		urls := make([]string, 0, len(externalURLs))
		for url := range externalURLs {
			if isIgnored(url, c.Config.IgnorePatterns) {
				continue
			}
			urls = append(urls, url)
		}
		checkedExternal := c.checkURLsConcurrently(urls, "external URLs", "", func(url string, res validateResult) {
			if !res.Valid {
				broken = append(broken, BrokenLink{
					SourcePage: "Multiple pages",
					URL:        url,
					Reason:     res.Reason,
					Type:       "link",
					Category:   "external",
				})
			}
		})
		fmt.Printf("   Checked %d external URLs ✓\n\n", checkedExternal)
	} else {
		fmt.Println("⏭️  Skipping external URL validation (disabled in config)")
	}

	visitedMu.Lock()
	visitedCopy := make(map[string]struct{}, len(visited))
	for k, v := range visited {
		visitedCopy[k] = v
	}
	visitedMu.Unlock()

	return broken, len(allLinks), visitedCopy, nil
}

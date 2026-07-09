package check

import (
	"net"
	"net/http"
	"time"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

func newHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			Proxy:               http.ProxyFromEnvironment,
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 32,
			IdleConnTimeout:     90 * time.Second,
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
		},
	}
}

func (c *Checker) initHTTPClient() {
	if c.client != nil {
		return
	}
	c.client = newHTTPClient(10 * time.Second)
}

func (c *Checker) crawlPageCached(pageURL string) crawlResult {
	if c.crawlCache != nil {
		c.crawlMu.RLock()
		if res, ok := c.crawlCache[pageURL]; ok {
			c.crawlMu.RUnlock()
			return res
		}
		c.crawlMu.RUnlock()
	}

	res := c.crawlPage(pageURL)

	if c.crawlCache != nil {
		c.crawlMu.Lock()
		if c.crawlCache == nil {
			c.crawlCache = make(map[string]crawlResult)
		}
		c.crawlCache[pageURL] = res
		c.crawlMu.Unlock()
	}
	return res
}

func newChecker(repoRoot string, cfg Config, m *manifest.Manifest) *Checker {
	c := &Checker{
		RepoRoot:   repoRoot,
		Config:     cfg,
		Manifest:   m,
		sourceMap:  nil,
		crawlCache: make(map[string]crawlResult),
	}
	if m != nil {
		c.sourceMap = BuildSourceMap(m)
	}
	c.initHTTPClient()
	if cfg.GitHubToken != "" && cfg.MaxConcurrent < 20 {
		c.Config.MaxConcurrent = 20
	}
	if c.Config.CrawlConcurrency <= 0 {
		c.Config.CrawlConcurrency = 8
	}
	return c
}

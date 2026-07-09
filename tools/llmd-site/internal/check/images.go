package check

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync"
)

var (
	reImgSrc   = regexp.MustCompile(`(?i)<img[^>]+src=["']([^"']+)["']`)
	reBgURL    = regexp.MustCompile(`(?i)background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)`)
	reSrcset   = regexp.MustCompile(`(?i)srcset=["']([^"']+)["']`)
	rePageLink = regexp.MustCompile(`(?i)<a[^>]+href=["']([^"'#]+)["']`)
	reSkipExt  = regexp.MustCompile(`(?i)\.(png|jpg|jpeg|gif|svg|webp|pdf|css|js|ico|woff|woff2|ttf|eot)$`)
)

// CheckImages crawls the site and verifies all images load (HTTP 2xx/3xx).
func CheckImages(repoRoot string) (int, error) {
	cfg := LoadConfig(repoRoot)
	if _, err := os.Stat(cfg.BuildDir); err != nil {
		return 1, fmt.Errorf("build directory not found at %s — run build first", cfg.BuildDir)
	}

	fmt.Println("🖼️  Image Checker Starting...")

	srv, err := StartServer(repoRoot, cfg)
	if err != nil {
		return 1, err
	}
	defer srv.Stop()

	c := newChecker(repoRoot, cfg, nil)
	base := srv.BaseURL()
	seeds := parseSitemapSeeds(cfg.BuildDir, cfg.IgnorePatterns)
	if len(seeds) == 0 {
		seeds = []string{"/"}
	}

	visitedPages := map[string]struct{}{}
	visitedMu := sync.Mutex{}
	checkedImages := map[string]struct{}{}
	imagesMu := sync.Mutex{}
	var broken []brokenImage
	brokenMu := sync.Mutex{}

	workers := cfg.CrawlConcurrency
	if workers <= 0 {
		workers = 8
	}
	sem := make(chan struct{}, workers)
	var pending sync.WaitGroup

	var enqueuePage func(string)
	enqueuePage = func(pagePath string) {
		visitedMu.Lock()
		if _, ok := visitedPages[pagePath]; ok {
			visitedMu.Unlock()
			return
		}
		visitedPages[pagePath] = struct{}{}
		nPages := len(visitedPages)
		visitedMu.Unlock()

		pending.Add(1)
		go func(pagePath string, nPages int) {
			defer pending.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			pageURL := base + pagePath
			resp, err := c.client.Get(pageURL)
			if err != nil || resp.StatusCode >= 400 {
				if resp != nil {
					resp.Body.Close()
				}
				return
			}
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 5<<20))
			resp.Body.Close()
			html := string(body)

			var imageURLs []string
			for _, imgURL := range extractImageURLs(html, pageURL) {
				imagesMu.Lock()
				if _, ok := checkedImages[imgURL]; ok {
					imagesMu.Unlock()
					continue
				}
				checkedImages[imgURL] = struct{}{}
				nImages := len(checkedImages)
				imagesMu.Unlock()
				imageURLs = append(imageURLs, imgURL)
				fmt.Printf("\r   Checked %d pages, %d images...", nPages, nImages)
			}

			var imgWG sync.WaitGroup
			imgSem := make(chan struct{}, workers)
			for _, imgURL := range imageURLs {
				imgURL := imgURL
				imgWG.Add(1)
				go func() {
					defer imgWG.Done()
					imgSem <- struct{}{}
					defer func() { <-imgSem }()
					status, err := headStatus(c.client, imgURL)
					if err != nil || status < 200 || status >= 400 {
						brokenMu.Lock()
						broken = append(broken, brokenImage{
							PageURL:  pagePath,
							ImageURL: imgURL,
							Status:   status,
							Error:    errString(err),
						})
						brokenMu.Unlock()
					}
				}()
			}
			imgWG.Wait()

			var next []string
			for _, link := range extractPageLinks(html, base) {
				if isIgnored(link, cfg.IgnorePatterns) {
					continue
				}
				visitedMu.Lock()
				_, seen := visitedPages[link]
				visitedMu.Unlock()
				if !seen {
					next = append(next, link)
				}
			}
			for _, link := range next {
				enqueuePage(link)
			}
		}(pagePath, nPages)
	}

	for _, seed := range seeds {
		enqueuePage(seed)
	}
	pending.Wait()

	visitedMu.Lock()
	nPages := len(visitedPages)
	imagesMu.Lock()
	nImages := len(checkedImages)
	imagesMu.Unlock()
	visitedMu.Unlock()

	fmt.Printf("\r   Checked %d pages, %d images ✓\n\n", nPages, nImages)

	if len(broken) > 0 {
		fmt.Printf("❌ Found %d broken images:\n\n", len(broken))
		for _, b := range broken {
			reason := b.Error
			if reason == "" {
				reason = fmt.Sprintf("HTTP %d", b.Status)
			}
			fmt.Printf("  Page: %s\n  Image: %s\n  Reason: %s\n\n", b.PageURL, b.ImageURL, reason)
		}
		return 1, nil
	}

	fmt.Println("🎉 All images loaded successfully!")
	return 0, nil
}

type brokenImage struct {
	PageURL  string
	ImageURL string
	Status   int
	Error    string
}

func extractImageURLs(html, pageURL string) []string {
	var out []string
	add := func(src string) {
		if src == "" || strings.HasPrefix(src, "data:") {
			return
		}
		out = append(out, resolveURL(src, pageURL))
	}
	for _, m := range reImgSrc.FindAllStringSubmatch(html, -1) {
		add(m[1])
	}
	for _, m := range reBgURL.FindAllStringSubmatch(html, -1) {
		add(m[1])
	}
	for _, m := range reSrcset.FindAllStringSubmatch(html, -1) {
		for _, part := range strings.Split(m[1], ",") {
			fields := strings.Fields(strings.TrimSpace(part))
			if len(fields) > 0 {
				add(fields[0])
			}
		}
	}
	return out
}

func extractPageLinks(html, baseURL string) []string {
	base, _ := url.Parse(baseURL)
	var out []string
	for _, m := range rePageLink.FindAllStringSubmatch(html, -1) {
		href := m[1]
		resolved := resolveURL(href, baseURL)
		u, err := url.Parse(resolved)
		if err != nil || u.Host != base.Host {
			continue
		}
		path := u.Path
		if path == "" {
			path = "/"
		}
		if reSkipExt.MatchString(path) {
			continue
		}
		out = append(out, path)
	}
	return out
}

func resolveURL(src, pageURL string) string {
	u, err := url.Parse(pageURL)
	if err != nil {
		return src
	}
	ref, err := url.Parse(src)
	if err != nil {
		return src
	}
	return u.ResolveReference(ref).String()
}

func headStatus(client *http.Client, raw string) (int, error) {
	req, err := http.NewRequest(http.MethodHead, raw, nil)
	if err != nil {
		return 0, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	resp.Body.Close()
	return resp.StatusCode, nil
}

func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

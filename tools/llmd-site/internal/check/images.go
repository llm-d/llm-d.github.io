package check

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

var (
	reImgSrc    = regexp.MustCompile(`(?i)<img[^>]+src=["']([^"']+)["']`)
	reBgURL     = regexp.MustCompile(`(?i)background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)`)
	reSrcset    = regexp.MustCompile(`(?i)srcset=["']([^"']+)["']`)
	rePageLink  = regexp.MustCompile(`(?i)<a[^>]+href=["']([^"'#]+)["']`)
	reSkipExt   = regexp.MustCompile(`(?i)\.(png|jpg|jpeg|gif|svg|webp|pdf|css|js|ico|woff|woff2|ttf|eot)$`)
)

type brokenImage struct {
	PageURL string
	ImageURL string
	Status  int
	Error   string
}

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

	base := srv.BaseURL()
	seeds := parseSitemapSeeds(cfg.BuildDir, cfg.IgnorePatterns)
	if len(seeds) == 0 {
		seeds = []string{"/"}
	}

	visitedPages := map[string]struct{}{}
	checkedImages := map[string]struct{}{}
	var broken []brokenImage
	queue := append([]string{}, seeds...)

	client := &http.Client{Timeout: 10 * time.Second}

	for len(queue) > 0 {
		pagePath := queue[0]
		queue = queue[1:]
		if _, ok := visitedPages[pagePath]; ok {
			continue
		}
		visitedPages[pagePath] = struct{}{}

		pageURL := base + pagePath
		resp, err := client.Get(pageURL)
		if err != nil || resp.StatusCode >= 400 {
			if resp != nil {
				resp.Body.Close()
			}
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 5<<20))
		resp.Body.Close()
		html := string(body)

		for _, imgURL := range extractImageURLs(html, pageURL) {
			if _, ok := checkedImages[imgURL]; ok {
				continue
			}
			checkedImages[imgURL] = struct{}{}

			status, err := headStatus(client, imgURL)
			if err != nil || status < 200 || status >= 400 {
				broken = append(broken, brokenImage{
					PageURL:  pagePath,
					ImageURL: imgURL,
					Status:   status,
					Error:    errString(err),
				})
			}
		}

		for _, link := range extractPageLinks(html, base) {
			if isIgnored(link, cfg.IgnorePatterns) {
				continue
			}
			if _, ok := visitedPages[link]; !ok {
				queue = append(queue, link)
			}
		}
		fmt.Printf("\r   Checked %d pages, %d images...", len(visitedPages), len(checkedImages))
	}

	fmt.Printf("\r   Checked %d pages, %d images ✓\n\n", len(visitedPages), len(checkedImages))

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

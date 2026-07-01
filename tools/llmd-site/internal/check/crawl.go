package check

import (
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

var (
	reHref = regexp.MustCompile(`(?i)<a[^>]+href=(?:"([^"]+)"|'([^']+)'|([^\s>]+))`)
	reImg  = regexp.MustCompile(`(?i)<img[^>]+src=(?:"([^"]+)"|'([^']+)'|([^\s>]+))`)
	reLoc  = regexp.MustCompile(`<loc>([^<]+)</loc>`)
)

const docusaurus404Marker = "Page Not Found"

type extractedLink struct {
	URL  string
	Type string // link | image
}

type crawlResult struct {
	Success    bool
	StatusCode int
	Error      string
	Links      []extractedLink
}

func (c *Checker) crawlPage(pageURL string) crawlResult {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(pageURL)
	if err != nil {
		return crawlResult{Success: false, Error: err.Error()}
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return crawlResult{Success: false, StatusCode: resp.StatusCode}
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 5<<20))
	if err != nil {
		return crawlResult{Success: false, Error: err.Error()}
	}
	html := string(body)

	if strings.Contains(html, docusaurus404Marker) && strings.Contains(html, "We could not find what you were looking for") {
		return crawlResult{Success: false, StatusCode: 404}
	}

	return crawlResult{
		Success:    true,
		StatusCode: resp.StatusCode,
		Links:      extractLinksFromHTML(html),
	}
}

func extractLinksFromHTML(html string) []extractedLink {
	var links []extractedLink
	for _, m := range reHref.FindAllStringSubmatch(html, -1) {
		u := firstNonEmpty(m[1], m[2], m[3])
		if u != "" {
			links = append(links, extractedLink{URL: u, Type: "link"})
		}
	}
	for _, m := range reImg.FindAllStringSubmatch(html, -1) {
		u := firstNonEmpty(m[1], m[2], m[3])
		if u != "" {
			links = append(links, extractedLink{URL: u, Type: "image"})
		}
	}
	return links
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func normalizeURL(raw, baseURL string, cfg Config) (path string, external string, isGitHub bool) {
	if raw == "" || raw == "#" || strings.HasPrefix(raw, "#") {
		return "", "", false
	}
	if strings.Contains(raw, ":") && !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") && !strings.HasPrefix(raw, "/") {
		return "", "", false
	}

	base, err := url.Parse(baseURL)
	if err != nil {
		return "", "", false
	}
	hostPort := cfg.ServerHost + ":" + itoa(cfg.ServerPort)

	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		u, err := url.Parse(raw)
		if err != nil {
			return "", "", false
		}
		if u.Host == hostPort {
			return cleanPath(u.Path), "", false
		}
		ext := u.String()
		isGH := u.Hostname() == "github.com" && strings.HasPrefix(u.Path, "/llm-d/")
		return "", ext, isGH
	}

	if strings.HasPrefix(raw, "/") {
		return cleanPath(raw), "", false
	}

	// Handle relative URLs
	resolved := base.ResolveReference(mustParse(raw))
	if resolved.Host != "" && resolved.Host != base.Host {
		return "", "", false
	}
	return cleanPath(resolved.Path), "", false
}

func cleanPath(p string) string {
	if i := strings.IndexAny(p, "#?"); i >= 0 {
		p = p[:i]
	}
	if p == "" {
		return "/"
	}
	return p
}

func mustParse(raw string) *url.URL {
	u, _ := url.Parse(raw)
	return u
}

func isIgnored(path string, patterns []string) bool {
	for _, p := range patterns {
		if strings.Contains(path, p) {
			return true
		}
	}
	return false
}

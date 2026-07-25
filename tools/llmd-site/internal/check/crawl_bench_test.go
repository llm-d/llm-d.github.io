package check

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func benchSiteHandler(pages int) http.Handler {
	mux := http.NewServeMux()
	for i := 0; i < pages; i++ {
		path := fmt.Sprintf("/page%d/", i)
		next := ""
		if i+1 < pages {
			next = fmt.Sprintf(`<a href="/page%d/">next</a>`, i+1)
		}
		body := fmt.Sprintf(`<html><body><h1>Page %d</h1>%s<img src="/img%d.png"></body></html>`, i, next, i)
		mux.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte(body))
		})
	}
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/page0/", http.StatusFound)
	})
	for i := 0; i < pages; i++ {
		i := i
		mux.HandleFunc(fmt.Sprintf("/img%d.png", i), func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})
	}
	return mux
}

func BenchmarkCrawlPage(b *testing.B) {
	srv := httptest.NewServer(benchSiteHandler(1))
	defer srv.Close()

	c := &Checker{
		Config:     DefaultConfig("."),
		crawlCache: make(map[string]crawlResult),
	}
	c.initHTTPClient()
	pageURL := srv.URL + "/page0/"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = c.crawlPage(pageURL)
	}
}

func BenchmarkCrawlBFS(b *testing.B) {
	const pages = 20
	srv := httptest.NewServer(benchSiteHandler(pages))
	defer srv.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		c := &Checker{
			Config:     DefaultConfig("."),
			crawlCache: make(map[string]crawlResult),
		}
		c.initHTTPClient()
		visited := map[string]struct{}{}
		queue := []string{"/page0/"}
		for len(queue) > 0 {
			current := queue[0]
			queue = queue[1:]
			if _, ok := visited[current]; ok {
				continue
			}
			visited[current] = struct{}{}
			result := c.crawlPage(srv.URL + current)
			if !result.Success {
				continue
			}
			for _, link := range result.Links {
				u := link.URL
				if strings.HasPrefix(u, srv.URL) {
					u = strings.TrimPrefix(u, srv.URL)
				}
				if u == "" {
					u = "/"
				}
				if _, ok := visited[u]; !ok {
					queue = append(queue, u)
				}
			}
		}
	}
}

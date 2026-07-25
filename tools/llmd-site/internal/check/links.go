package check

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"sync"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

// Checker runs link validation against a built site.
type Checker struct {
	RepoRoot   string
	Config     Config
	Manifest   *manifest.Manifest
	server     *Server
	sourceMap  map[string]SourceInfo
	client     *http.Client
	crawlCache map[string]crawlResult
	crawlMu    sync.RWMutex
}

type linkMeta struct {
	sourcePages map[string]struct{}
	linkType    string
}

// checkURLsConcurrently validates urls in parallel (bounded by MaxConcurrent),
// printing progress every 10 checks, and streams each result to onResult.
func (c *Checker) checkURLsConcurrently(
	urls []string,
	label, token string,
	onResult func(url string, res validateResult),
) int {
	rl := newRateLimiter(c.Config.MaxConcurrent)
	results := make(chan struct {
		url string
		res validateResult
	}, len(urls))
	var wg sync.WaitGroup
	for _, url := range urls {
		wg.Add(1)
		go func(u string) {
			defer wg.Done()
			res := rl.run(func() validateResult {
				return validateExternalURL(c.client, u, c.Config.ExternalTimeout(), token)
			})
			results <- struct {
				url string
				res validateResult
			}{url: u, res: res}
		}(url)
	}
	go func() {
		wg.Wait()
		close(results)
	}()

	checked := 0
	for r := range results {
		checked++
		onResult(r.url, r.res)
		if checked%10 == 0 || checked == len(urls) {
			fmt.Printf("   Checked %d/%d %s...\n", checked, len(urls), label)
		}
	}
	return checked
}

// CheckLinks crawls the built site and returns exit code (0 ok, 1 broken links).
func CheckLinks(repoRoot string, m *manifest.Manifest) (int, error) {
	return CheckLinksWithOptions(repoRoot, m, CheckOptions{})
}

// CheckOptions configures link checking behavior.
type CheckOptions struct {
	WarnOnly bool
}

// CheckLinksWithOptions crawls the built site and validates links.
func CheckLinksWithOptions(repoRoot string, m *manifest.Manifest, opts CheckOptions) (int, error) {
	cfg := LoadConfig(repoRoot)
	if _, err := os.Stat(cfg.BuildDir); err != nil {
		return 1, fmt.Errorf("build directory not found at %s — run build first", cfg.BuildDir)
	}

	versioned := detectVersionedPaths(cfg.BuildDir)
	cfg.IgnorePatterns = append(cfg.IgnorePatterns, versioned...)
	if len(versioned) > 0 {
		fmt.Printf("📦 Auto-ignoring versioned paths: %s\n\n", stringsJoin(versioned, ", "))
	}

	c := newChecker(repoRoot, cfg, m)

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
		if opts.WarnOnly {
			fmt.Println("\n⚠️  Broken links reported (warn-only mode; exiting 0)")
			return 0, nil
		}
		return 1, nil
	}

	fmt.Println("\n🎉 No broken links found!")
	return 0, nil
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

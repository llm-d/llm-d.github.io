package check

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

const prCommentMarker = "<!-- check-links-report -->"
const githubCommentMaxLength = 65536

func postPullRequestComment(report string) {
	token := os.Getenv("GITHUB_TOKEN")
	repo := os.Getenv("GITHUB_REPOSITORY")
	pr := pullRequestNumber()
	if token == "" || repo == "" || pr == 0 {
		return
	}

	parts := strings.SplitN(repo, "/", 2)
	if len(parts) != 2 {
		return
	}
	owner, repoName := parts[0], parts[1]

	body := prCommentMarker + "\n" + report
	if len(body) > githubCommentMaxLength {
		body = body[:githubCommentMaxLength-200] + "\n\n… _(report truncated)_"
	}

	headers := map[string]string{
		"Authorization":       "Bearer " + token,
		"Accept":              "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"Content-Type":        "application/json",
		"User-Agent":          "llm-d-link-checker",
	}

	listURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/comments?per_page=100", owner, repoName, pr)
	comments, err := githubAPI(listURL, "GET", headers, nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n⚠️  Failed to post PR comment: %v\n", err)
		return
	}

	var existingID float64
	if arr, ok := comments.([]any); ok {
		for _, item := range arr {
			m, _ := item.(map[string]any)
			if m == nil {
				continue
			}
			if b, _ := m["body"].(string); strings.Contains(b, prCommentMarker) {
				existingID, _ = m["id"].(float64)
				break
			}
		}
	}

	payload, _ := json.Marshal(map[string]string{"body": body})
	if existingID > 0 {
		url := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/comments/%.0f", owner, repoName, existingID)
		if _, err := githubAPI(url, "PATCH", headers, payload); err != nil {
			fmt.Fprintf(os.Stderr, "\n⚠️  Failed to update PR comment: %v\n", err)
			return
		}
		fmt.Printf("\n💬 Updated PR #%d comment with broken links report\n", pr)
		return
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/comments", owner, repoName, pr)
	if _, err := githubAPI(url, "POST", headers, payload); err != nil {
		fmt.Fprintf(os.Stderr, "\n⚠️  Failed to post PR comment: %v\n", err)
		return
	}
	fmt.Printf("\n💬 Posted broken links report as PR #%d comment\n", pr)
}

func pullRequestNumber() int {
	if os.Getenv("GITHUB_EVENT_NAME") != "pull_request" {
		return 0
	}
	path := os.Getenv("GITHUB_EVENT_PATH")
	if path == "" {
		return 0
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return 0
	}
	var event struct {
		PullRequest struct {
			Number int `json:"number"`
		} `json:"pull_request"`
	}
	if json.Unmarshal(data, &event) != nil {
		return 0
	}
	return event.PullRequest.Number
}

func githubAPI(url, method string, headers map[string]string, body []byte) (any, error) {
	var r io.Reader
	if body != nil {
		r = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, url, r)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		text := string(data)
		if len(text) > 300 {
			text = text[:300]
		}
		return nil, fmt.Errorf("GitHub API %d: %s", resp.StatusCode, text)
	}
	if resp.StatusCode == 204 {
		return nil, nil
	}
	var out any
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return out, nil
}

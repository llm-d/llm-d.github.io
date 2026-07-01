package check

import (
	"fmt"
	"net/http"
	"time"
)

type validateResult struct {
	Valid  bool
	Reason string
}

func validateExternalURL(raw string, timeout time.Duration, token string) validateResult {
	client := &http.Client{Timeout: timeout}
	req, err := http.NewRequest(http.MethodHead, raw, nil)
	if err != nil {
		return validateResult{Valid: false, Reason: err.Error()}
	}
	req.Header.Set("User-Agent", "llm-d-link-checker/1.0")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := client.Do(req)
	if err != nil {
		return validateResult{Valid: false, Reason: err.Error()}
	}
	resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 400 {
		return validateResult{Valid: true}
	}
	return validateResult{Valid: false, Reason: fmt.Sprintf("HTTP %d", resp.StatusCode)}
}

type rateLimiter struct {
	sem chan struct{}
}

func newRateLimiter(max int) *rateLimiter {
	if max <= 0 {
		max = 10
	}
	return &rateLimiter{sem: make(chan struct{}, max)}
}

func (r *rateLimiter) run(fn func() validateResult) validateResult {
	r.sem <- struct{}{}
	defer func() { <-r.sem }()
	return fn()
}

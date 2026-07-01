package check

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

// Config controls link and image checking.
type Config struct {
	BuildDir           string        `json:"buildDir"`
	ServerPort         int           `json:"serverPort"`
	ServerHost         string        `json:"serverHost"`
	CheckExternalLinks bool          `json:"checkExternalLinks"`
	CheckGitHubLinks   bool          `json:"checkGitHubLinks"`
	MaxConcurrent      int           `json:"maxConcurrent"`
	ExternalTimeoutMs  int           `json:"externalTimeout"`
	IgnorePatterns     []string      `json:"ignorePatterns"`
	GitHubToken        string        `json:"-"`
	externalTimeout    time.Duration `json:"-"`
}

func DefaultConfig(repoRoot string) Config {
	return Config{
		BuildDir:           filepath.Join(repoRoot, "build"),
		ServerPort:         3333,
		ServerHost:         "localhost",
		CheckExternalLinks: false,
		CheckGitHubLinks:   true,
		MaxConcurrent:      10,
		ExternalTimeoutMs:  10000,
	}
}

func (c *Config) ExternalTimeout() time.Duration {
	if c.externalTimeout > 0 {
		return c.externalTimeout
	}
	if c.ExternalTimeoutMs <= 0 {
		c.ExternalTimeoutMs = 10000
	}
	c.externalTimeout = time.Duration(c.ExternalTimeoutMs) * time.Millisecond
	return c.externalTimeout
}

func LoadConfig(repoRoot string) Config {
	cfg := DefaultConfig(repoRoot)
	cfg.GitHubToken = os.Getenv("GITHUB_TOKEN")

	configFile := filepath.Join(repoRoot, "link-checker.config.json")
	data, err := os.ReadFile(configFile)
	if err != nil {
		return cfg
	}
	_ = json.Unmarshal(data, &cfg)
	if cfg.BuildDir == "" {
		cfg.BuildDir = filepath.Join(repoRoot, "build")
	}
	if cfg.ServerPort == 0 {
		cfg.ServerPort = 3333
	}
	if cfg.ServerHost == "" {
		cfg.ServerHost = "localhost"
	}
	if cfg.MaxConcurrent == 0 {
		cfg.MaxConcurrent = 10
	}
	cfg.GitHubToken = os.Getenv("GITHUB_TOKEN")
	return cfg
}

func (c Config) BaseURL() string {
	return "http://" + c.ServerHost + ":" + itoa(c.ServerPort)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

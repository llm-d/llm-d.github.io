package manifest

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

const CurrentVersion = 1

// Manifest is the single source of truth for doc sync, edit URLs, and source mapping.
type Manifest struct {
	Version int `yaml:"version"`

	Sources Sources `yaml:"sources"`

	Community []CommunityFile `yaml:"community,omitempty"`

	Releases Releases `yaml:"releases,omitempty"`

	// Directories created under preview/docs before copies run.
	Directories []string `yaml:"directories,omitempty"`

	Copies []Copy `yaml:"copies,omitempty"`

	// Slugs set frontmatter slug on preview/docs files (published URL path).
	Slugs []Slug `yaml:"slugs,omitempty"`

	// EditURLs map local doc paths to upstream edit paths (replaces docusaurus.config.ts logic).
	EditURLs []EditURL `yaml:"edit_urls,omitempty"`

	// Conditionals are mutually exclusive copy groups (e.g. foundations vs capabilities layout).
	Conditionals []Conditional `yaml:"conditionals,omitempty"`

	// ReleaseFixups are sed-style replacements applied to release-branch committed docs during build.
	ReleaseFixups []Replacement `yaml:"release_fixups,omitempty"`

	// TransformRules are scoped post-copy link and content fixups applied during sync.
	TransformRules []TransformRuleGroup `yaml:"transform_rules,omitempty"`

	Stubs Stubs `yaml:"stubs,omitempty"`
}

type Sources struct {
	LLMD SourceRepo `yaml:"llm-d"`
}

type SourceRepo struct {
	Remote RemoteSource `yaml:"remote"`
	Local  LocalSource  `yaml:"local"`
}

type RemoteSource struct {
	URL           string `yaml:"url"`
	DefaultBranch string `yaml:"default_branch"`
	DocsRoot      string `yaml:"docs_root"`
}

type LocalSource struct {
	Path  string `yaml:"path,omitempty"`
	Fetch bool   `yaml:"fetch,omitempty"`
}

type Releases struct {
	Remote string `yaml:"remote"`
	Local  string `yaml:"local"`
}

type CommunityFile struct {
	From      string `yaml:"from"`
	To        string `yaml:"to"`
	Transform string `yaml:"transform,omitempty"`
	Title     string `yaml:"title,omitempty"`
}

type Copy struct {
	From    string   `yaml:"from"`
	To      string   `yaml:"to"`
	Prefer  []string `yaml:"prefer,omitempty"`
	When    string   `yaml:"when,omitempty"`
	Comment string   `yaml:"comment,omitempty"`
}

type Slug struct {
	File string `yaml:"file"`
	Slug string `yaml:"slug"`
}

type EditURL struct {
	Match       string `yaml:"match"`
	Upstream    string `yaml:"upstream"`
	Description string `yaml:"description,omitempty"`
}

type Conditional struct {
	Name        string `yaml:"name"`
	When        string `yaml:"when"`
	Description string `yaml:"description,omitempty"`
	Copies      []Copy `yaml:"copies"`
}

type Replacement struct {
	Pattern     string `yaml:"pattern"`
	Replace     string `yaml:"replace"`
	Scope       string `yaml:"scope,omitempty"`
	Description string `yaml:"description,omitempty"`
}

type Stubs struct {
	Enabled    bool `yaml:"enabled"`
	FailInCI   bool `yaml:"fail_in_ci,omitempty"`
}

type TransformRuleGroup struct {
	Scope string          `yaml:"scope"`
	Rules []TransformRule `yaml:"rules"`
}

type TransformRule struct {
	Pattern string `yaml:"pattern"`
	Replace string `yaml:"replace"`
}

func Default() *Manifest {
	return &Manifest{
		Version: CurrentVersion,
		Sources: Sources{
			LLMD: SourceRepo{
				Remote: RemoteSource{
					URL:           "https://github.com/llm-d/llm-d",
					DefaultBranch: "main",
					DocsRoot:      "docs",
				},
				Local: LocalSource{
					Path:  "~/repos/llm-d",
					Fetch: false,
				},
			},
		},
		Releases: Releases{
			Remote: "github-api",
			Local:  "preview/static/releases.json",
		},
		Stubs: Stubs{
			Enabled:  true,
			FailInCI: false,
		},
	}
}

func Load(path string) (*Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	m := Default()
	if err := yaml.Unmarshal(data, m); err != nil {
		return nil, fmt.Errorf("parse manifest %s: %w", path, err)
	}
	return m, nil
}

func (m *Manifest) Save(path string) error {
	data, err := yaml.Marshal(m)
	if err != nil {
		return err
	}
	header := []byte("# Generated/maintained by llmd-site. See tools/llmd-site/README.md.\n")
	content := append(header, data...)
	return os.WriteFile(path, content, 0o644)
}

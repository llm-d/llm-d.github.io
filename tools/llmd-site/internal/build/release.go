package build

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
)

var errSkipRelease = errors.New("skip release build")

type releaseJob struct {
	Version  string
	IsLatest bool
}

func buildRelease(repoRoot string, m *manifest.Manifest, job releaseJob) error {
	version := job.Version
	ref := releaseBranchRef(version)
	wt := worktreePath(repoRoot, version)

	_ = exec.Command("git", "worktree", "remove", "--force", wt).Run()

	add := exec.Command("git", "worktree", "add", wt, ref)
	add.Dir = repoRoot
	if out, err := add.CombinedOutput(); err != nil {
		fmt.Printf("  ⚠ Warning: Could not create worktree for %s, skipping: %v\n%s", ref, err, string(out))
		return errSkipRelease
	}
	defer func() { _ = exec.Command("git", "worktree", "remove", "--force", wt).Run() }()

	fmt.Printf("  Syncing UX from main into worktree...\n")
	if err := overlayUX(repoRoot, wt); err != nil {
		return err
	}

	fmt.Printf("  Applying link fixups to release branch docs...\n")
	if err := applyReleaseFixups(wt, m); err != nil {
		return err
	}

	if err := overlayPR1820(wt); err != nil {
		return err
	}

	preview := filepath.Join(wt, "preview")
	if err := runNPM(preview, nil, "install", "--silent"); err != nil {
		return err
	}

	buildDir := filepath.Join(repoRoot, "build", "docs", version)
	if err := runNPM(preview, []string{"DOCS_BASE_URL=/docs/" + version + "/"}, "run", "build"); err != nil {
		return err
	}
	if err := os.MkdirAll(buildDir, 0o755); err != nil {
		return err
	}
	if err := copyDir(filepath.Join(preview, "build"), buildDir); err != nil {
		return err
	}
	fmt.Printf("  ✓ Built /docs/%s/\n", version)

	if job.IsLatest {
		if err := runNPM(preview, []string{"DOCS_BASE_URL=/docs/"}, "run", "build"); err != nil {
			return err
		}
		latestDir := filepath.Join(repoRoot, "build", "docs")
		if err := os.MkdirAll(latestDir, 0o755); err != nil {
			return err
		}
		if err := copyDir(filepath.Join(preview, "build"), latestDir); err != nil {
			return err
		}
		fmt.Printf("  ✓ Built /docs/ (latest = %s)\n", version)
	}

	return nil
}

func overlayUX(repoRoot, worktree string) error {
	previewMain := filepath.Join(repoRoot, "preview")
	previewWT := filepath.Join(worktree, "preview")

	pairs := [][2]string{
		{filepath.Join(previewMain, "docusaurus.config.ts"), filepath.Join(previewWT, "docusaurus.config.ts")},
		{filepath.Join(previewMain, "package.json"), filepath.Join(previewWT, "package.json")},
		{filepath.Join(previewMain, "package-lock.json"), filepath.Join(previewWT, "package-lock.json")},
	}
	for _, p := range pairs {
		if err := copyFile(p[0], p[1], 0o644); err != nil {
			return err
		}
	}

	srcDir := filepath.Join(previewMain, "src")
	dstDir := filepath.Join(previewWT, "src")
	_ = os.RemoveAll(dstDir)
	if err := copyDir(srcDir, dstDir); err != nil {
		return err
	}

	if err := copyDir(filepath.Join(previewMain, "static"), filepath.Join(previewWT, "static")); err != nil {
		return err
	}

	imgDir := filepath.Join(previewWT, "static", "img")
	for _, asset := range []string{"CNCF-logo.svg", "llm-d-logo-light.svg", "llm-d-logo-dark.svg", "background.png"} {
		_ = copyFile(filepath.Join(previewMain, "static", "img", asset), filepath.Join(imgDir, asset), 0o644)
	}
	_ = copyDir(filepath.Join(previewMain, "static", "img", "new-social"), filepath.Join(imgDir, "new-social"))
	_ = copyDir(filepath.Join(previewMain, "static", "img", "logos"), filepath.Join(imgDir, "logos"))
	_ = copyFile(filepath.Join(previewMain, "static", "releases.json"), filepath.Join(previewWT, "static", "releases.json"), 0o644)

	return nil
}

func applyReleaseFixups(worktree string, m *manifest.Manifest) error {
	docsDir := filepath.Join(worktree, "preview", "docs")
	var rules []*regexp.Regexp
	var repls []string

	for _, f := range m.ReleaseFixups {
		if f.Scope != "" && f.Scope != "release_branch_docs" {
			continue
		}
		re, err := regexp.Compile(f.Pattern)
		if err != nil {
			return fmt.Errorf("release fixup pattern %q: %w", f.Pattern, err)
		}
		rules = append(rules, re)
		repls = append(repls, f.Replace)
	}

	// Additional regex fixups from build-all.sh not yet in manifest.
	extra := []struct{ pattern, replace string }{}
	for _, e := range extra {
		re, err := regexp.Compile(e.pattern)
		if err != nil {
			return err
		}
		rules = append(rules, re)
		repls = append(repls, e.replace)
	}

	return filepath.Walk(docsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".md") {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		content := string(data)
		for i, re := range rules {
			content = re.ReplaceAllString(content, repls[i])
		}
		return os.WriteFile(path, []byte(content), info.Mode())
	})
}

func overlayPR1820(worktree string) error {
	repo := os.Getenv("PR1820_REPO")
	if repo == "" {
		repo = "/tmp/llm-d-pr1820"
	}
	src := filepath.Join(repo, "docs", "getting-started", "README.mdx")
	if _, err := os.Stat(src); err != nil {
		return nil
	}
	dst := filepath.Join(worktree, "preview", "docs", "getting-started", "index.mdx")
	if err := copyFile(src, dst, 0o644); err != nil {
		return err
	}
	_ = os.Remove(filepath.Join(worktree, "preview", "docs", "getting-started", "index.md"))
	data, err := os.ReadFile(dst)
	if err != nil {
		return err
	}
	content := strings.ReplaceAll(string(data), "https://llm-d.ai/img/", "/img/")
	return os.WriteFile(dst, []byte(content), 0o644)
}

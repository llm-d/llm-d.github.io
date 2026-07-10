package golden

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/manifest"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/repo"
	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/sync"
)

// Engine selects which sync implementation to run in golden tests.
type Engine string

const (
	EngineLegacy Engine = "legacy"
	EngineGo     Engine = "go"
)

// Record holds a checksum snapshot of sync output for one branch label.
type Record struct {
	Branch   string            `yaml:"branch"`
	FileHash string            `yaml:"file_hash"`
	Files    map[string]string `yaml:"files,omitempty"`
}

// CaptureOptions configures golden capture.
type CaptureOptions struct {
	Root         string
	Branch       string
	UpstreamRepo string
	Fetch        bool
	Engine       Engine
	Local        bool
}

// Capture runs sync and hashes preview/docs output.
func Capture(opts CaptureOptions) (*Record, error) {
	if opts.Engine == "" {
		opts.Engine = EngineGo
	}

	switch opts.Engine {
	case EngineLegacy:
		if err := runLegacySync(opts); err != nil {
			return nil, err
		}
	case EngineGo:
		m, err := manifest.Load(repo.ManifestPath(opts.Root))
		if err != nil {
			return nil, err
		}
		local := opts.Local || opts.UpstreamRepo != ""
		_, err = sync.Run(m, sync.Options{
			RepoRoot:    opts.Root,
			Branch:      opts.Branch,
			Local:       local,
			Fetch:       opts.Fetch,
			LocalConfig: repo.LocalConfigPath(opts.Root),
		})
		if err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unknown sync engine %q", opts.Engine)
	}

	docsDir := repo.DocsDir(opts.Root)
	if opts.Engine == EngineLegacy {
		docsDir = repo.PreviewDocsDir(opts.Root)
	}
	files, aggregate, err := hashTree(docsDir)
	if err != nil {
		return nil, err
	}

	return &Record{
		Branch:   opts.Branch,
		FileHash: aggregate,
		Files:    files,
	}, nil
}

func runLegacySync(opts CaptureOptions) error {
	script := filepath.Join(opts.Root, "legacy", "preview", "scripts", "sync-docs.sh")
	cmd := exec.Command("bash", script, opts.Branch)
	cmd.Dir = opts.Root
	cmd.Env = os.Environ()
	if opts.UpstreamRepo != "" {
		cmd.Env = append(cmd.Env, "LLMD_REPO="+opts.UpstreamRepo)
		if opts.Fetch {
			cmd.Env = append(cmd.Env, "LLMD_FETCH=1")
		}
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("sync-docs.sh %s: %w\n%s", opts.Branch, err, string(out))
	}
	return nil
}

func hashTree(dir string) (map[string]string, string, error) {
	files := map[string]string{}
	hasher := sha256.New()

	var paths []string
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}
		paths = append(paths, rel)
		return nil
	})
	if err != nil {
		return nil, "", err
	}
	sort.Strings(paths)

	for _, rel := range paths {
		sum, err := fileSHA256(filepath.Join(dir, rel))
		if err != nil {
			return nil, "", err
		}
		files[rel] = sum
		line := rel + "\t" + sum + "\n"
		if _, err := hasher.Write([]byte(line)); err != nil {
			return nil, "", err
		}
	}

	return files, hex.EncodeToString(hasher.Sum(nil)), nil
}

func fileSHA256(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// CompareRecords returns a diff summary between expected and actual golden records.
func CompareRecords(expected, actual *Record) []string {
	var diffs []string
	if expected.FileHash != actual.FileHash {
		diffs = append(diffs, fmt.Sprintf("aggregate hash mismatch: expected %s got %s", expected.FileHash, actual.FileHash))
	}
	all := map[string]struct{}{}
	for k := range expected.Files {
		all[k] = struct{}{}
	}
	for k := range actual.Files {
		all[k] = struct{}{}
	}
	var keys []string
	for k := range all {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		e, okE := expected.Files[k]
		a, okA := actual.Files[k]
		switch {
		case okE && !okA:
			diffs = append(diffs, "missing file: "+k)
		case !okE && okA:
			diffs = append(diffs, "unexpected file: "+k)
		case e != a:
			diffs = append(diffs, fmt.Sprintf("content changed: %s", k))
		}
	}
	return diffs
}

// LoadRecord reads a golden record from testdata/golden/<branch>.json (simple line format for phase 1).
func LoadRecord(path string) (*Record, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	rec := &Record{Files: map[string]string{}}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "branch:") {
			rec.Branch = strings.TrimSpace(strings.TrimPrefix(line, "branch:"))
			continue
		}
		if strings.HasPrefix(line, "hash:") {
			rec.FileHash = strings.TrimSpace(strings.TrimPrefix(line, "hash:"))
			continue
		}
		parts := strings.SplitN(line, "\t", 2)
		if len(parts) == 2 {
			rec.Files[parts[0]] = parts[1]
		}
	}
	return rec, nil
}

func SaveRecord(path string, rec *Record) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	var b strings.Builder
	fmt.Fprintf(&b, "branch:%s\n", rec.Branch)
	fmt.Fprintf(&b, "hash:%s\n", rec.FileHash)
	var keys []string
	for k := range rec.Files {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Fprintf(&b, "%s\t%s\n", k, rec.Files[k])
	}
	return os.WriteFile(path, []byte(b.String()), 0o644)
}

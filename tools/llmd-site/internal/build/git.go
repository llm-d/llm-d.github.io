package build

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// DiscoverReleases returns sorted release version strings and the latest stable version.
func DiscoverReleases(repoRoot string) ([]string, string, error) {
	fetch := exec.Command("git", "fetch", "origin")
	fetch.Dir = repoRoot
	_ = fetch.Run() // best-effort

	out, err := exec.Command("git", "branch", "-r").Output()
	if err != nil {
		return nil, "", fmt.Errorf("git branch -r: %w", err)
	}

	var versions []string
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "origin/release-") || strings.Contains(line, "HEAD") {
			continue
		}
		ver := strings.TrimPrefix(line, "origin/release-")
		versions = append(versions, ver)
	}

	sort.Slice(versions, func(i, j int) bool {
		return compareVersion(versions[i], versions[j]) < 0
	})

	latest := ""
	if len(versions) > 0 {
		latest = versions[len(versions)-1]
	}
	return versions, latest, nil
}

func compareVersion(a, b string) int {
	ap := strings.Split(a, ".")
	bp := strings.Split(b, ".")
	n := len(ap)
	if len(bp) > n {
		n = len(bp)
	}
	for i := 0; i < n; i++ {
		var av, bv int
		if i < len(ap) {
			av, _ = strconv.Atoi(ap[i])
		}
		if i < len(bp) {
			bv, _ = strconv.Atoi(bp[i])
		}
		if av != bv {
			return av - bv
		}
	}
	return 0
}

func releaseBranchRef(version string) string {
	return "origin/release-" + version
}

func worktreePath(repoRoot, version string) string {
	return filepath.Join(filepath.Dir(repoRoot), "release-"+version)
}

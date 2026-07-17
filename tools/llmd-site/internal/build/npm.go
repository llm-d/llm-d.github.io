package build

import (
	"fmt"
	"os"
	"os/exec"
)

func runNPM(dir string, env []string, args ...string) error {
	cmd := exec.Command("npm", args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), env...)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("npm %v in %s: %w", args, dir, err)
	}
	return nil
}

// RunNode executes node with the given script path and arguments.
func RunNode(dir, script string, args ...string) error {
	all := append([]string{script}, args...)
	cmd := exec.Command("node", all...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("node %v in %s: %w", all, dir, err)
	}
	return nil
}

// RunNPX executes npx with the given arguments.
func RunNPX(dir string, args ...string) error {
	cmd := exec.Command("npx", args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("npx %v in %s: %w", args, dir, err)
	}
	return nil
}

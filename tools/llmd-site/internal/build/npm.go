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

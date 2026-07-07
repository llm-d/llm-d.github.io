package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		var exitErr cmd.ExitError
		if errors.As(err, &exitErr) {
			os.Exit(exitErr.Code)
		}
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

package cmd

import "testing"

func TestNewRootSilencesUsageOnRuntimeErrors(t *testing.T) {
	root := NewRoot()
	if !root.SilenceUsage {
		t.Fatal("expected root command to silence usage on runtime errors")
	}
	if !root.SilenceErrors {
		t.Fatal("expected root command to silence cobra error printing")
	}
}

package report

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

// SyncReport is written after each sync for CI and link checker consumption.
type SyncReport struct {
	Branch    string    `json:"branch"`
	DocCount  int       `json:"doc_count"`
	Source    string    `json:"source"`
	Timestamp time.Time `json:"timestamp"`
	Stubs     int       `json:"stubs,omitempty"`
	Missing   []string  `json:"missing,omitempty"`
}

func (r *SyncReport) Write(repoRoot string) error {
	r.Timestamp = time.Now().UTC()
	data, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return err
	}
	path := filepath.Join(repoRoot, "sync-report.json")
	return os.WriteFile(path, append(data, '\n'), 0o644)
}

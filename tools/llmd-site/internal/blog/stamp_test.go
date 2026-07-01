package blog

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestUpsertDateReplace(t *testing.T) {
	in := "---\ntitle: Test\nslug: test\ndate: 2026-03-13T09:00\n---\n\nbody\n"
	out, err := upsertDate(in, "2026-07-01T09:00")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "date: 2026-07-01T09:00") {
		t.Fatalf("expected updated date, got:\n%s", out)
	}
}

func TestUpsertDateInsert(t *testing.T) {
	in := "---\ntitle: News\nslug: news\n\ntags: [news]\n---\n\nbody\n"
	out, err := upsertDate(in, "2026-07-01T09:00")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "date: 2026-07-01T09:00") {
		t.Fatalf("expected inserted date, got:\n%s", out)
	}
}

func TestUpsertDateNoopSameDay(t *testing.T) {
	in := "---\ntitle: Test\ndate: 2026-07-01T09:00\n---\n\nbody\n"
	out, err := upsertDate(in, "2026-07-01T12:00")
	if err != nil {
		t.Fatal(err)
	}
	if out != in {
		t.Fatalf("expected no change for same calendar day")
	}
}

func TestStampFileRename(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "2026-03-13_sample-post.md")
	content := "---\ntitle: Sample\nslug: sample\ndate: 2026-03-13T09:00\n---\n\nHello\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	when := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	res, err := StampFile(path, StampOptions{When: when, Rename: true})
	if err != nil {
		t.Fatal(err)
	}
	if !res.Changed {
		t.Fatal("expected change")
	}
	want := filepath.Join(dir, "2026-07-01_sample-post.md")
	if res.NewPath != want {
		t.Fatalf("new path %q want %q", res.NewPath, want)
	}
	if _, err := os.Stat(want); err != nil {
		t.Fatalf("renamed file missing: %v", err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("old file should be removed")
	}
	data, _ := os.ReadFile(want)
	if !strings.Contains(string(data), "date: 2026-07-01T09:00") {
		t.Fatalf("date not updated in %q", string(data))
	}
}

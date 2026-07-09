package sync

import (
	"io"
	"os"
	"path/filepath"
	"testing"
)

func copyDirBench(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.Create(target)
		if err != nil {
			return err
		}
		defer out.Close()
		_, err = io.Copy(out, in)
		return err
	})
}

func benchDocsSource(b *testing.B) string {
	b.Helper()
	candidates := []string{
		"../../../preview/docs",
		"../../../../preview/docs",
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && st.IsDir() {
			return c
		}
	}
	b.Skip("preview/docs not found")
	return ""
}

func setupBenchEngine(b *testing.B) (*engine, string) {
	b.Helper()
	src := benchDocsSource(b)
	tmp := b.TempDir()
	docsDir := filepath.Join(tmp, "docs")
	if err := copyDirBench(src, docsDir); err != nil {
		b.Fatal(err)
	}
	e := &engine{
		docsDir:     docsDir,
		staticDir:   filepath.Join(tmp, "static"),
		upstreamRef: "main",
		opts:        Options{Quiet: true},
	}
	return e, docsDir
}

func BenchmarkPostprocess(b *testing.B) {
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		e, _ := setupBenchEngine(b)
		b.StartTimer()
		if err := e.postprocess(); err != nil {
			b.Fatal(err)
		}
	}
}

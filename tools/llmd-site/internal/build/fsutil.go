package build

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
)

func copyDir(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("copyDir: %s is not a directory", src)
	}
	if err := os.MkdirAll(dst, info.Mode()); err != nil {
		return err
	}
	return filepath.Walk(src, func(path string, fi os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if fi.IsDir() {
			return os.MkdirAll(target, fi.Mode())
		}
		return copyFile(path, target, fi.Mode())
	})
}

func copyFile(src, dst string, mode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

func copyDirIfExists(src, dst string) error {
	if _, err := os.Stat(src); err != nil {
		return nil
	}
	return copyDir(src, dst)
}

func copyGlob(srcDir, pattern, dstDir string) error {
	matches, err := filepath.Glob(filepath.Join(srcDir, pattern))
	if err != nil {
		return err
	}
	for _, src := range matches {
		info, err := os.Stat(src)
		if err != nil || info.IsDir() {
			continue
		}
		if err := copyFile(src, filepath.Join(dstDir, filepath.Base(src)), info.Mode()); err != nil {
			return err
		}
	}
	return nil
}

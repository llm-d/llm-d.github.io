package sync

import (
	"io"
	"os"
	"path/filepath"
	"strings"
)

func (e *engine) copyAssets() error {
	assets := filepath.Join(e.wip, "assets")
	_ = os.MkdirAll(e.staticDir, 0o755)

	// Partial clones (--filter=blob:none) may not have image blobs until checkout.
	_ = e.src.Materialize(
		"docs/assets",
		"docs/infrastructure/rdma/networking-stack.svg",
		"docs/architecture/core/images/flow_control_dashboard.png",
		"docs/architecture/advanced/autoscaling/hpa-architecture.svg",
		"assets/no-kubernetes-deployment.svg",
		"docs/infrastructure/providers",
	)

	_ = copyGlob(assets, "*.svg", e.staticDir)
	_ = copyGlob(filepath.Join(assets, "images"), "*.svg", e.staticDir)
	_ = copyGlob(filepath.Join(assets, "images"), "*.png", e.staticDir)

	for _, rel := range []string{
		"infrastructure/rdma/networking-stack.svg",
		"architecture/core/images/flow_control_dashboard.png",
		"architecture/advanced/autoscaling/hpa-architecture.svg",
		"assets/no-kubernetes-deployment.svg",
	} {
		src := filepath.Join(e.src.Root, "docs", filepath.FromSlash(rel))
		if strings.HasPrefix(rel, "assets/") {
			src = filepath.Join(e.src.Root, filepath.FromSlash(rel))
		}
		if e.fileExists(src) {
			_ = copyFileSimple(src, filepath.Join(e.staticDir, filepath.Base(src)))
		}
	}

	_ = filepath.Walk(filepath.Join(e.wip, "infrastructure", "providers"), func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if ext == ".png" || ext == ".jpg" || ext == ".svg" {
			_ = copyFileSimple(path, filepath.Join(e.staticDir, filepath.Base(path)))
		}
		return nil
	})

	guidesStatic := filepath.Join(e.staticDir, "guides")
	_ = os.MkdirAll(guidesStatic, 0o755)
	e.copyGuideImages(guidesStatic, "images")
	e.copyGuideImages(guidesStatic, "benchmark-results")
	return nil
}

func (e *engine) copyGuideImages(guidesStatic, dirName string) {
	root := filepath.Join(e.src.Root, "guides")
	_ = filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || !info.IsDir() || filepath.Base(path) != dirName {
			return nil
		}
		if strings.Contains(path, "/prereq/") || strings.Contains(path, "/experimental/") {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return nil
		}
		rel = filepath.ToSlash(rel)
		var destDir string
		if dirName == "images" {
			destDir = filepath.Join(guidesStatic, strings.TrimSuffix(rel, "/images"))
		} else {
			destDir = filepath.Join(guidesStatic, rel)
		}
		_ = os.MkdirAll(destDir, 0o755)
		entries, _ := os.ReadDir(path)
		for _, ent := range entries {
			if ent.IsDir() {
				continue
			}
			ext := strings.ToLower(filepath.Ext(ent.Name()))
			if ext != ".png" && ext != ".jpg" && ext != ".svg" && ext != ".gif" {
				continue
			}
			_ = copyFileSimple(filepath.Join(path, ent.Name()), filepath.Join(destDir, ent.Name()))
		}
		return nil
	})
}

func copyDirFiles(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		target := filepath.Join(dst, rel)
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		return copyFileSimple(path, target)
	})
}

func copyReaderToFile(r io.Reader, dst string) error {
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, r)
	return err
}

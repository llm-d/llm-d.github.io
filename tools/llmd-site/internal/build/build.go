package build

import (
	"fmt"
	"os"
)

// Run performs the single-site Docusaurus build.
//
// The site lives at the repo root (websiteRoot): docs/ are the synced,
// preprocessed docs and versioned_docs/ hold frozen releases, so Docusaurus
// handles versioning natively. We only build the landing CSS then the site.
func Run(websiteRoot string) error {
	if _, err := os.Stat(websiteRoot); err != nil {
		return err
	}
	fmt.Println("==> Building landing CSS (npm run landing:css)...")
	if err := runNPM(websiteRoot, nil, "run", "landing:css"); err != nil {
		return err
	}
	fmt.Println("==> Building site (npm run build)...")
	if err := runNPM(websiteRoot, nil, "run", "build"); err != nil {
		return err
	}
	return nil
}

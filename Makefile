.PHONY: llmd-site test-llmd-site sync-docs build check-links check-images ci

LLMD_SITE_DIR := tools/llmd-site
LLMD_SITE_BIN := bin/llmd-site

llmd-site:
	cd $(LLMD_SITE_DIR) && go build -o ../../$(LLMD_SITE_BIN) ./cmd/llmd-site

test-llmd-site:
	cd $(LLMD_SITE_DIR) && go test ./...

sync-docs: llmd-site
	./$(LLMD_SITE_BIN) sync

build: llmd-site
	./$(LLMD_SITE_BIN) build

check-links: llmd-site
	./$(LLMD_SITE_BIN) check links

check-images: llmd-site
	./$(LLMD_SITE_BIN) check images

ci: llmd-site
	./$(LLMD_SITE_BIN) ci

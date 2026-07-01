.PHONY: llmd-site test-llmd-site validate-manifest extract-manifest sync-docs build-all check-links check-images ci

LLMD_SITE_DIR := tools/llmd-site
LLMD_SITE_BIN := bin/llmd-site

llmd-site:
	cd $(LLMD_SITE_DIR) && go build -o ../../$(LLMD_SITE_BIN) ./cmd/llmd-site

test-llmd-site:
	cd $(LLMD_SITE_DIR) && go test ./...

validate-manifest: llmd-site
	./$(LLMD_SITE_BIN) validate

extract-manifest: llmd-site
	./$(LLMD_SITE_BIN) extract-manifest --write

sync-docs: llmd-site
	./$(LLMD_SITE_BIN) sync main

golden-capture: llmd-site
	./$(LLMD_SITE_BIN) golden capture main

golden-verify: llmd-site
	./$(LLMD_SITE_BIN) golden verify main

build-all: llmd-site
	./$(LLMD_SITE_BIN) build main

check-links: llmd-site
	./$(LLMD_SITE_BIN) check links

check-images: llmd-site
	./$(LLMD_SITE_BIN) check images

ci: llmd-site
	./$(LLMD_SITE_BIN) ci main

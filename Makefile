.PHONY: llmd-site test-llmd-site validate-manifest sync-docs build build-all check-links check-images ci golden-capture golden-verify

LLMD_SITE_DIR := tools/llmd-site
LLMD_SITE_BIN := bin/llmd-site

llmd-site:
	cd $(LLMD_SITE_DIR) && go build -o ../../$(LLMD_SITE_BIN) ./cmd/llmd-site

test-llmd-site:
	cd $(LLMD_SITE_DIR) && go test ./...

validate-manifest: llmd-site
	./$(LLMD_SITE_BIN) validate

sync-docs: llmd-site
	./$(LLMD_SITE_BIN) sync main

build: llmd-site
	@if [ ! -d docs ]; then \
		echo "docs/ not found; running initial sync (llmd-site sync main)..."; \
		./$(LLMD_SITE_BIN) sync main; \
	fi
	./$(LLMD_SITE_BIN) build

build-all: build

golden-capture: llmd-site
	./$(LLMD_SITE_BIN) golden capture main

golden-verify: llmd-site
	./$(LLMD_SITE_BIN) golden verify main

check-links: llmd-site
	./$(LLMD_SITE_BIN) check links

check-images: llmd-site
	./$(LLMD_SITE_BIN) check images

ci: llmd-site
	./$(LLMD_SITE_BIN) ci main

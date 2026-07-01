# Active scripts

Site builds and checks are handled by the **`llmd-site`** Go CLI (`tools/llmd-site/`).
See [legacy/README.md](../legacy/README.md) for archived bash/Node scripts.

## merge-search-index.mjs

Merges the root-site and docs-site lunr search indexes after a full build.

**Called from:** `llmd-site build` (`internal/search/merge.go`)

**Manual run** (after `make build-all` or `./bin/llmd-site build main`):

```bash
npm run merge-search-index
```

## Common commands

| Task | Command |
|------|---------|
| Full site build | `npm run build:all` → `make build-all` → `./bin/llmd-site build main` |
| Link check | `npm run check-links` → `./bin/llmd-site check links` |
| Image check | `npm run test:images` → `./bin/llmd-site check images` |
| Sync docs | `./bin/llmd-site sync [branch]` |
| CI (build + checks) | `./bin/llmd-site ci main` |

# llmd-site — Go orchestrator for llm-d.github.io

Phase 1–3: manifest, sync, build orchestration, and golden tests.

## Build

```bash
make llmd-site
# or
cd tools/llmd-site && go build -o ../../bin/llmd-site ./cmd/llmd-site
```

## Commands

| Command | Description |
|---------|-------------|
| `llmd-site validate` | Validate `docs-sync.yaml` |
| `llmd-site extract-manifest --write` | Regenerate manifest from `legacy/preview/scripts/sync-docs.sh` |
| `llmd-site sync [branch]` | Sync docs (native Go, Phase 2.1) |
| `llmd-site sync --local` | Sync using `llmd-site.local.yaml` upstream path |
| `llmd-site build [branch]` | **Phase 3** — full site build (replaces `build-all.sh`) |
| `llmd-site build --parallel 3` | Build release branches concurrently |
| `llmd-site golden capture main` | Snapshot sync output checksums |
| `llmd-site golden verify main` | Compare sync output to golden |
| `llmd-site check links` | **Phase 4** — crawl built site, validate links, write report |
| `llmd-site check images` | Verify all images load via HTTP |
| `llmd-site ci [branch]` | Full CI pipeline: `build` + `check links` |

## Phase 4: `llmd-site check`

Native reimplementation of `legacy/scripts/check-links.mjs` and `legacy/tests/image_verifier.js`:

```bash
make build-all          # build site first
make check-links        # llmd-site check links
llmd-site check images
```

- Starts `docusaurus serve` on port 3333 (configurable via `link-checker.config.json`)
- Seeds crawl from sitemaps; auto-ignores versioned `/docs/X.Y.Z/` paths
- Validates internal links + GitHub links (with `GITHUB_TOKEN`)
- Writes `broken-links-report.md`; upserts PR comment in CI
- Source map built from `docs-sync.yaml` (not sync-docs.sh)

## Phase 3: `llmd-site build`

Native reimplementation of `legacy/scripts/build-all.sh`:

1. Sync dev docs (`llmd-site sync`)
2. `npm run build` — main site
3. Discover `release-*` branches, build dev docs subsite
4. Parallel release worktree builds with UX overlay + link fixups from `docs-sync.yaml`
5. Merge search index via `scripts/merge-search-index.mjs`

```bash
make build-all          # llmd-site build main
llmd-site build main
LLMD_REPO=~/repos/llm-d llmd-site build --local
```

| `llmd-site check images` | Verify all images load via HTTP |

## Phase 5: CI cutover

Workflows use the composite action [`.github/actions/setup-llmd-site`](../../.github/actions/setup-llmd-site/action.yml) and invoke the CLI directly:

| Workflow | Command |
|----------|---------|
| `test-deploy.yml` | `./bin/llmd-site ci main` |
| `deploy.yml` | `./bin/llmd-site build main` |
| `sync-release-docs.yml` | `./bin/llmd-site sync` |
| `create-release-branch.yml` | `./bin/llmd-site sync` |
| `image-verification.yml` | `./bin/llmd-site check images` |

Local equivalents:

```bash
npm run build:all    # make build-all → llmd-site build
npm run check-links  # make check-links → llmd-site check links
make ci              # llmd-site ci (build + link check)
```

Legacy scripts live under [`legacy/`](../../legacy/README.md) for reference and golden `--legacy` baselines.

## Phase 2.1: native Go sync

`llmd-site sync` is fully native Go — no embedded bash, no `sync-docs.sh` delegation:

1. **Go** resolves upstream (`--local`, shallow clone, or `LLMD_REPO`)
2. **Go** copies from `docs-sync.yaml` (manifest-driven copies, conditionals, slugs)
3. **Go** applies link fixups via `internal/sync/rules_generated.go` (from `sync-docs.sh` sed rules)
4. **Go** applies MDX transforms via `internal/transform/`
5. **Go** writes `sync-report.json`

Regenerate sed rules after editing `legacy/preview/scripts/sync-docs.sh`:

```bash
cd tools/llmd-site/internal/sync && go generate
```

Golden tests compare Go output to legacy `sync-docs.sh`:

```bash
llmd-site golden capture main --legacy   # baseline from sync-docs.sh
llmd-site golden verify main             # verify Go engine matches
```

## Golden tests

Requires a local `llm-d/llm-d` clone (or uses shallow clone from GitHub):

```bash
export LLMD_REPO=~/repos/llm-d
llmd-site golden capture main
llmd-site golden verify main
```

## Local config

Copy `llmd-site.local.yaml.example` to `llmd-site.local.yaml` (gitignored) and set upstream paths for `--local` mode.

## Manifest

[`docs-sync.yaml`](../../docs-sync.yaml) at repo root is the single source of truth for:

- Upstream copy mappings
- Published URL slugs
- Edit URL mappings
- Conditional layout branches (foundations vs capabilities)
- Release-branch link fixups

Post-copy sed rules live in `internal/sync/rules_generated.go` (regenerate with `go generate`).

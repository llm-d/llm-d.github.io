# llmd-site — Go orchestrator for llm-d.github.io

Native CLI for the single-site Docusaurus build: sync docs from `llm-d/llm-d`, build, and validate links/images.

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
| `llmd-site sync [branch]` | Mirror upstream `docs/**` into `docs/` + community pages |
| `llmd-site sync --local` | Sync using `llmd-site.local.yaml` upstream path |
| `llmd-site build` | `npm run landing:css` + `npm run build` (native versioning) |
| `llmd-site golden capture main` | Snapshot sync output checksums |
| `llmd-site golden verify main` | Compare sync output to golden |
| `llmd-site check links` | Crawl built site, validate links, write report |
| `llmd-site check images` | Verify images load via HTTP |
| `llmd-site ci [branch]` | Sync + build + link check |
| `llmd-site version cut <x.y>` | Freeze dev docs as a released version (bake + `docs:version` + resync) |
| `llmd-site blog stamp [files...]` | Set blog frontmatter `date` on publish |

## Typical workflow

```bash
make sync-docs          # llmd-site sync main
make build              # llmd-site build
make check-links        # after build
make ci                 # full pipeline
```

## Cutting a docs release

`llmd-site version cut <x.y>` freezes the synced dev `docs/` as version `<x.y>`:
it copies doc images to `static/img/versioned/<x.y>/`, bakes the build-time
preprocess fixups into `docs/` with every `llm-d/llm-d` GitHub link (and the
guide pages' "Run this guide" checkout ref) pinned to the release tag `v<x.y>`,
runs `docusaurus docs:version` (which also snapshots `docs/menu-config.json`,
the version's sidebar config), then re-syncs `docs/` from `main`.

1. **Tag llm-d first.** Make sure the `v<x.y>` tag exists in `llm-d/llm-d`
   before the release is deployed; until it does, the released version's
   GitHub links 404.
2. **Sync from the release branch**, so the frozen docs match the tag their
   links point at (syncing `main` after it has moved on can reference files
   that are not in the tag):

   ```bash
   make llmd-site
   ./bin/llmd-site sync release-<x.y>
   ./bin/llmd-site version cut <x.y>
   ```

3. **Review and commit** `versioned_docs/version-<x.y>/`, `versioned_sidebars/`,
   `versions.json` and `static/img/versioned/<x.y>/`, plus any banner/landing
   updates, then open the PR.

Released versions never change with upstream: links stay on `v<x.y>` and the
sidebar comes from `versioned_docs/version-<x.y>/menu-config.json`. To fix a
released version, edit its files under `versioned_docs/` directly.

## Link checking

- Default **static file server** (fast); set `serveMode: docusaurus` in `link-checker.config.json` to use `docusaurus serve`
- Parallel BFS crawl with shared HTTP client and result cache
- Writes `broken-links-report.md`; upserts PR comment in CI when `GITHUB_TOKEN` is set

## Sync

- Mirrors upstream `docs/**` verbatim into `docs/` (link fixups run at build time via `scripts/lib/preprocess.mjs`)
- Copies doc images to `static/img/docs/`
- Regenerates `community/*.md` from upstream repo-root files
- `--refresh-upstream` bypasses shallow-clone cache for remote syncs

## Manifest

[`docs-sync.yaml`](../../docs-sync.yaml) lists upstream sources and community mirror pages. Edit it directly.

## Local config

Copy `llmd-site.local.yaml.example` to `llmd-site.local.yaml` (gitignored) for `--local` upstream paths.

## Legacy

Archived bash/Node scripts live under [`legacy/`](../../legacy/README.md). `golden capture --legacy` compares against archived `sync-docs.sh` (writes `preview/docs/`).

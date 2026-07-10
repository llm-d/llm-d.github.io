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
| `llmd-site blog stamp [files...]` | Set blog frontmatter `date` on publish |

## Typical workflow

```bash
make sync-docs          # llmd-site sync main
make build              # llmd-site build
make check-links        # after build
make ci                 # full pipeline
```

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

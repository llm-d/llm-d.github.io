# llm-d website

Source for [llm-d.ai](https://llm-d.ai) — landing page, documentation, blog, and
community — built with [Docusaurus](https://docusaurus.io) in this repository
([llm-d/llm-d.github.io](https://github.com/llm-d/llm-d.github.io)).

Doc content is synced from [llm-d/llm-d](https://github.com/llm-d/llm-d); released
versions are frozen in `versioned_docs/`.

## Prerequisites

- Node.js ≥ 20
- Go ≥ 1.22 (for the `llmd-site` CLI)
- npm

## Quick start

```bash
npm run llmd-site   # build ./bin/llmd-site (once)
npm ci          # install javascript modules
npm run build:all   # pull docs/ + community pages from llm-d/llm-d@main and build the site
npm start               # dev server at http://localhost:3000
```

For day-to-day doc editing, sync when you want fresh upstream content (`npm run sync`), then use
`npm start`. You do not need a full production build for local preview.

## Production build (matches deploy CI)

Deploy and Netlify run **sync then build** every time:

```bash
npm ci
npm run llmd-site
npm run build:full
npm run serve                   # optional: preview the production build locally
```

`npm run build` alone only auto-syncs if `docs/` is missing; to match CI, `npm run build:all` explicitly.

## Validation (matches PR CI)

```bash
npm run ci                 # sync + build + link check (same as ci-website-test)
npm run check-links        # link check only (requires existing ./build/)
npm run check-images       # image check only (requires existing ./build/)
npm run test:llmd-site     # Go unit tests
```

PR workflows also run `ci-website-images` (sync + build + image check).

## npm script aliases

Most wrappers delegate to the Makefile / `llmd-site` CLI:

| npm script | Runs |
|------------|------|
| `npm run build:all` | `make build` |
| `npm run ci` | `make ci` |
| `npm run check-links` | `make check-links` |
| `npm run check-images` | `make check-images` |
| `npm run version:cut -- 0.9` | `./bin/llmd-site version cut 0.9` |
| `npm start` | `docusaurus start` (dev only) |
| `npm run build` | `docusaurus build` (skips landing CSS — prefer `make build`) |

See [`tools/llmd-site/README.md`](tools/llmd-site/README.md) for the full CLI.

## Local upstream clone

To sync from a local `llm-d` checkout instead of cloning in CI:

```bash
cp llmd-site.local.yaml.example llmd-site.local.yaml   # gitignored
# edit paths, then:
./bin/llmd-site sync --local main
```

Or set `LLMD_REPO=/path/to/llm-d`.

## Layout

```
├── docs/                  # Synced dev docs (gitignored) — "dev" version at /docs/dev
├── docs-sync.yaml         # Sync manifest (sources, community mirror pages)
├── versioned_docs/        # Frozen releases (0.7, 0.8) + versioned_sidebars/ + versions.json
├── blog/                  # Posts (.mdx) + authors.yml + tags.yml
├── community/             # index/events (authored); mirror pages generated on sync
├── src/                   # Landing page, theme swizzles, shared components
├── static/img/            # Site assets; synced doc images under img/docs/ (gitignored)
├── scripts/               # Build-time: landing CSS, preprocess, sidebar helper
├── tools/llmd-site/       # Go CLI (sync, build, check, version cut, …)
├── legacy/                # Archived bash/Node scripts (not used in CI)
├── preview/               # Archived two-site prototype (not used in CI)
├── Makefile
└── docusaurus.config.js
```

## How it works

- **Dev docs** — `docs/` is mirrored from `llm-d/llm-d` by `./bin/llmd-site sync`.
  Sidebar labels and order come from `docs/menu-config.json` (synced with the docs).
- **Versioning** — Latest release (**0.8**) at `/docs`; older at `/docs/0.7`; unreleased
  dev at `/docs/dev`. Cut a release: `./bin/llmd-site version cut 0.9`.
- **Community** — `contribute`, `code-of-conduct`, `security`, and `sigs` are generated
  on sync from upstream repo-root files (see `docs-sync.yaml`).
- **Markdown fixups** — Applied at build time via `scripts/lib/preprocess.mjs` so synced
  sources stay pristine.
- **Landing page** — Edit `src/landing/`, then `npm run landing:css` (included in
  `make build`).

## Deployment

Production deploys to **GitHub Pages** via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
on push to `main` (sync → build → publish). PR previews may use Netlify
([`netlify.toml`](netlify.toml)) with the same sync + build steps.

## Optional config

- `llmd-site.local.yaml` — local upstream paths for `llmd-site sync --local`
- `link-checker.config.json` — link checker tuning (copy from `link-checker.config.json.example`)

## Notes

- A few harmless anchor warnings remain at build time (GitHub vs. Docusaurus heading
  slugs in synced content).
- The old scripts under `legacy/` are kept for reference only.

# Legacy build scripts (archived)

These bash and Node scripts are **not used by CI, Netlify, or `make build`**. Kept for
manual release workflows, golden `--legacy` baselines, and reference.

## Use instead (active path)

| Old script | Replacement |
|------------|-------------|
| `legacy/scripts/build-all.sh` | `make build` or `./bin/llmd-site build` |
| `legacy/scripts/check-links.mjs` | `make check-links` or `./bin/llmd-site check links` |
| `legacy/preview/scripts/sync-docs.sh` | `./bin/llmd-site sync [branch]` |
| `legacy/scripts/sync-community.mjs` | `./bin/llmd-site sync` (community pages in Go) |
| `legacy/tests/image_verifier.js` | `./bin/llmd-site check images` |
| `legacy/preview/scripts/create-version.sh` | `./bin/llmd-site version cut X.Y` |

## Still active at repo root (`scripts/`)

Only scripts on the build/CI path remain outside `legacy/`:

| Path | Purpose |
|------|---------|
| `scripts/build-landing-css.mjs` | Landing Tailwind compile (`npm run landing:css`, called from `llmd-site build`) |
| `scripts/lib/preprocess.mjs` | Docusaurus markdown preprocessor (imported by `docusaurus.config.js`) |
| `scripts/lib/sidebar.mjs` | Docs sidebar from `docs/menu-config.json` (imported by `docusaurus.config.js`) |

## Manual / release-only (this directory)

| Path | Purpose |
|------|---------|
| `legacy/scripts/bake-docs.mjs` | Called by `llmd-site version cut` — bake preprocess fixups into docs |
| `legacy/scripts/validate-menu-config.mjs` | `npm run validate:menu` — lint `docs/menu-config.json` |
| `legacy/scripts/lib/rewrite.mjs` | Link rewriter used by archived `sync-community.mjs` (ported to Go) |

## Archived layout

```
legacy/
├── README.md
├── scripts/
│   ├── bake-docs.mjs
│   ├── build-all.sh
│   ├── check-links.mjs
│   ├── sync-community.mjs
│   ├── validate-menu-config.mjs
│   └── lib/
│       └── rewrite.mjs
├── preview/scripts/
│   ├── sync-docs.sh
│   ├── transformations.sh
│   └── create-version.sh
└── tests/
    └── image_verifier.js
```

## When you might still run archived scripts

- **`llmd-site golden capture main --legacy`** — compares Go sync output against `sync-docs.sh`
- **Release cut** — `./bin/llmd-site version cut 0.9` (or `npm run version:cut -- 0.9`)
- **Manual archaeology** — understanding why a transform exists

## Archived date

June 2026 — Phase 5 CI cutover to `llmd-site` (`llmd-site ci`, `./bin/llmd-site build`).

July 2026 — Non-build root `scripts/` moved here (`bake-docs`, `validate-menu-config`). Version cut moved to `llmd-site version cut`.

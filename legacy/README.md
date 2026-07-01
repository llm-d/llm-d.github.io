# Legacy build scripts (archived)

These bash and Node scripts powered site builds before the **`llmd-site`** Go CLI
(`tools/llmd-site/`). They are **not used by CI, Netlify, or `npm run build:all`**
anymore. Kept for reference, golden `--legacy` baselines, and rule extraction.

## Use instead

| Old script | Replacement |
|------------|-------------|
| `legacy/scripts/build-all.sh` | `make build-all` or `./bin/llmd-site build main` |
| `legacy/scripts/check-links.mjs` | `make check-links` or `./bin/llmd-site check links` |
| `legacy/preview/scripts/sync-docs.sh` | `./bin/llmd-site sync [branch]` |
| `legacy/tests/image_verifier.js` | `./bin/llmd-site check images` |
| `legacy/preview/scripts/create-version.sh` | Release worktrees in `./bin/llmd-site build` |

## Still active (not archived)

| Path | Purpose |
|------|---------|
| `scripts/merge-search-index.mjs` | Merges lunr search indexes (called from `llmd-site build`) |

## Archived layout

```
legacy/
├── README.md
├── scripts/
│   ├── build-all.sh          # Full site build orchestrator (bash)
│   └── check-links.mjs       # Post-build link crawler (Node)
├── preview/scripts/
│   ├── sync-docs.sh          # Upstream doc sync (bash)
│   ├── transformations.sh    # Copy for legacy sync + golden --legacy
│   └── create-version.sh     # Old Docusaurus docs:version helper
└── tests/
    └── image_verifier.js     # Image HTTP checker (Node)
```

## When you might still run archived scripts

- **`llmd-site golden capture main --legacy`** — compares Go sync output against `sync-docs.sh`
- **`llmd-site extract-manifest --write`** — regenerates `docs-sync.yaml` from archived `sync-docs.sh`
- **`go generate ./internal/sync/...`** — regenerates sed rules from archived `sync-docs.sh`
- **Manual archaeology** — understanding why a transform exists

## Archived date

June 2026 — Phase 5 CI cutover to `llmd-site` (`llmd-site ci`, `./bin/llmd-site build`).

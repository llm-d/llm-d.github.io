# Golden sync output snapshots

Compares SHA-256 hashes of `preview/docs/` after sync to detect drift between
engines or upstream changes.

## Verify (Go sync engine)

```bash
export LLMD_REPO=~/repos/llm-d   # optional; otherwise shallow-clones from GitHub
llmd-site golden capture main
llmd-site golden verify main
```

## Legacy baseline

Capture from archived bash sync (`legacy/preview/scripts/sync-docs.sh`):

```bash
llmd-site golden capture main --legacy
```

See [legacy/README.md](../../../legacy/README.md) for archived script layout.

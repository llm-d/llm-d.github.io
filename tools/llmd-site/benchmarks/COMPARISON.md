# Build system comparison: `main` (legacy) vs Go CLI

Machine: Apple M2 Max, Darwin arm64  
Runs: 3 timed iterations per step (median reported)  
Upstream: shallow clone from GitHub (`main` branch), no `LLMD_REPO`  
Link-check fixture: existing `build/` directory

## What each branch uses

| Step | `main` (production today) | `feat/consolidate-build` (Go CLI) |
|------|---------------------------|-----------------------------------|
| Doc sync | `preview/scripts/sync-docs.sh` | `llmd-site sync main` |
| Link check | `scripts/check-links.mjs` | `llmd-site check links` |
| Full site build | `scripts/build-all.sh` | `llmd-site build` |

Full site builds are not timed here — both paths spend most of their time in `npm run build` (Docusaurus).

## End-to-end results

| Step | `main` (legacy) | Go CLI | Speedup (median) |
|------|-----------------|--------|------------------|
| Doc sync | **14.21s** | **0.48s** | ~30× |
| Link check | **4.95s** | **0.13s** | ~38× |

First-run cold starts (includes upstream clone / server boot):

| Step | `main` run 1 | Go CLI run 1 |
|------|--------------|--------------|
| Doc sync | 14.81s | 2.02s |
| Link check | 15.11s | 0.79s |

Go CLI link check uses a native static file server; legacy uses `npx docusaurus serve` (slower cold start).

Raw results:

- `main`: [`results/main-latest.txt`](results/main-latest.txt) (commit `be76f1d`)
- Go CLI: [`results/go-cli-latest.txt`](results/go-cli-latest.txt) (commit `93d0481`, with performance optimizations)

## How to reproduce

### 1. Benchmark `main` (legacy only)

```bash
git stash push -u -m "wip"
git checkout main
tools/llmd-site/benchmarks/benchmark-main.sh
cp /tmp/main-benchmark-latest.txt tools/llmd-site/benchmarks/results/main-latest.txt
git checkout feat/consolidate-build
git stash pop
```

### 2. Benchmark Go CLI (feature branch)

```bash
tools/llmd-site/benchmarks/benchmark-go-cli.sh
cp /tmp/go-cli-benchmark-latest.txt tools/llmd-site/benchmarks/results/go-cli-latest.txt
```

Optional: `export LLMD_REPO=~/repos/llm-d` for stable sync timings without network clone variance.

## Go micro-benchmarks (sync engine internals)

These measure postprocess/transform code paths only. See [`results/before-latest.txt`](results/before-latest.txt) vs [`results/after-latest.txt`](results/after-latest.txt) for the effect of Go-side optimizations within the CLI (~4× faster `BenchmarkPostprocess`).

```bash
cd tools/llmd-site
GOMODCACHE=$HOME/go/pkg/mod ./benchmarks/run.sh after
```

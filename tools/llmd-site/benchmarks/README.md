# llmd-site benchmarks

## System comparison (`main` legacy vs Go CLI)

See [COMPARISON.md](COMPARISON.md).

```bash
# On main (legacy bash + Node):
tools/llmd-site/benchmarks/benchmark-main.sh

# On feat/consolidate-build (Go CLI):
tools/llmd-site/benchmarks/benchmark-go-cli.sh
```

## Go micro-benchmarks (sync/check internals)

```bash
cd tools/llmd-site
GOMODCACHE=$HOME/go/pkg/mod ./benchmarks/run.sh after
```

Results go to `benchmarks/results/`.

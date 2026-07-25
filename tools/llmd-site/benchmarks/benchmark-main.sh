#!/usr/bin/env bash
# Benchmark the build tooling that ships on main (bash + Node only).
# Run from a clean checkout of main:
#   git checkout main
#   tools/llmd-site/benchmarks/benchmark-main.sh
#
# Save results, then return to your feature branch:
#   cp /tmp/main-benchmark-latest.txt tools/llmd-site/benchmarks/results/main-latest.txt
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
RUNS="${BENCH_RUNS:-3}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${MAIN_BENCH_OUT:-/tmp/main-benchmark-latest.txt}"

time_run() {
  local label="$1"
  shift
  local out
  out="$(/usr/bin/time -p "$@" 2>&1)" || true
  echo "$out" | awk -v label="$label" '
    /^real / { real=$2 }
    /^user / { user=$2 }
    /^sys /  { sys=$2 }
    END { printf "%s real=%ss user=%ss sys=%ss\n", label, real, user, sys }
  '
}

median() {
  printf '%s\n' "$@" | sort -n | awk '{
    a[NR]=$1
  } END {
    if (NR==0) exit
    if (NR%2) print a[(NR+1)/2]
    else print (a[NR/2]+a[NR/2+1])/2
  }'
}

bench_step() {
  local name="$1"
  shift
  echo "== $name =="
  echo "command: $*"
  local -a reals=()
  local i line
  for ((i=1; i<=RUNS; i++)); do
    line="$(time_run "${name} run ${i}/${RUNS}" "$@")"
    echo "  $line"
    reals+=("$(echo "$line" | sed -n 's/.*real=\([0-9.]*\)s.*/\1/p')")
  done
  echo "  median real: $(median "${reals[@]}")s"
  echo ""
}

{
  echo "main branch build system benchmark"
  echo "timestamp: $STAMP"
  echo "git branch: $(git -C "$ROOT" branch --show-current)"
  echo "git commit: $(git -C "$ROOT" rev-parse --short HEAD)"
  echo "machine: $(uname -srm)"
  echo "node: $(node --version 2>/dev/null || echo n/a)"
  echo "runs per step: $RUNS"
  if [[ -n "${LLMD_REPO:-}" ]]; then echo "LLMD_REPO: $LLMD_REPO"; fi
  echo ""

  bench_step "doc sync (preview/scripts/sync-docs.sh)" \
    bash -c "cd '$ROOT/preview' && bash '$ROOT/preview/scripts/sync-docs.sh' main"

  if [[ -d "$ROOT/build" ]]; then
    bench_step "link check (scripts/check-links.mjs)" \
      node "$ROOT/scripts/check-links.mjs"
  else
    echo "== link check: SKIP (no build/ directory) =="
    echo ""
  fi
} 2>&1 | tee "$OUT"

echo "Wrote $OUT"

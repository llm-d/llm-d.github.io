#!/usr/bin/env bash
set -euo pipefail

LABEL="${1:-run}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/benchmarks/results"
mkdir -p "$OUT_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$OUT_DIR/${LABEL}-${STAMP}.txt"
LATEST="$OUT_DIR/${LABEL}-latest.txt"

export GOMODCACHE="${GOMODCACHE:-${HOME}/go/pkg/mod}"

{
  echo "llmd-site benchmarks ($LABEL)"
  echo "timestamp: $STAMP"
  echo "go: $(go version)"
  echo ""
  cd "$ROOT"
  go test -bench=. -benchmem -count=5 ./internal/transform/... ./internal/sync/... ./internal/check/...
} 2>&1 | tee "$OUT"

cp "$OUT" "$LATEST"
echo ""
echo "Saved: $OUT"
echo "Latest symlink copy: $LATEST"

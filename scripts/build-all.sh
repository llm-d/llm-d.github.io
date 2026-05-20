#!/usr/bin/env bash
# build-all.sh — Unified build script for local dev, Netlify, and GitHub Actions
#
# This script ensures consistency across all deployment environments by:
# 1. Building the main site (landing page, blog, community)
# 2. Syncing preview docs from upstream llm-d/llm-d repo
# 3. Building the preview docs site
# 4. Merging preview build into main build at /docs
#
# Usage:
#   ./scripts/build-all.sh                                        # clone from GitHub (main)
#   ./scripts/build-all.sh release-0.7                           # clone from GitHub (branch)
#   LLMD_REPO=/path/to/local/llm-d ./scripts/build-all.sh        # use local clone as-is
#   LLMD_REPO=/path/to/local/llm-d LLMD_FETCH=1 ./scripts/build-all.sh  # fetch before sync

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Allow passing branch as first argument (defaults to main)
DOCS_BRANCH="${1:-main}"

echo "========================================="
echo "llm-d.ai Unified Build Script"
echo "========================================="
echo ""

# Step 1: Build main site
echo "Step 1/4: Building main site..."
cd "$PROJECT_DIR"
npm run build
echo "✓ Main site built to build/"
echo ""

# Step 2: Sync preview docs from upstream
echo "Step 2/4: Syncing preview docs from llm-d/llm-d @ $DOCS_BRANCH..."
cd "$PROJECT_DIR/preview"
bash scripts/sync-docs.sh "$DOCS_BRANCH"
echo "✓ Preview docs synced"
echo ""

# Step 3: Build preview docs site
echo "Step 3/4: Building preview docs site..."
cd "$PROJECT_DIR/preview"
npm install
npm run build
echo "✓ Preview docs built to preview/build/"
echo ""

# Step 4: Merge preview into main build as /docs
echo "Step 4/4: Merging preview build into main build at /docs..."
cd "$PROJECT_DIR"
cp -r preview/build build/docs
echo "✓ Preview merged to build/docs/"

# Also copy preview images to build/img/docs for absolute path references
echo "   Copying preview images to build/img/docs for absolute paths..."
mkdir -p build/img/docs
cp -r preview/build/img/docs/* build/img/docs/
echo "✓ Preview images copied to build/img/docs/"
echo ""

# Optional: Include merge report if it exists (from GitHub Actions workflow)
if [[ -n "${LLMD_REPO:-}" ]] && [[ -f "$LLMD_REPO/merge-report.txt" ]]; then
    echo "Including merge report..."
    cp "$LLMD_REPO/merge-report.txt" build/docs/merge-report.txt
fi

echo "========================================="
echo "Build Complete!"
echo "========================================="
echo ""
echo "Output directory: build/"
echo "  - Main site: build/"
echo "  - Docs site: build/docs/"
echo ""
echo "To serve locally:"
echo "  npm run serve"
echo ""

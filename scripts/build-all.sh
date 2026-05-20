#!/usr/bin/env bash
# build-all.sh — Unified build script for local dev, Netlify, and GitHub Actions
#
# This script ensures consistency across all deployment environments by:
# 1. Building the main site (landing page, blog, community)
# 2. Syncing preview docs from upstream llm-d/llm-d repo
# 3. Building the preview docs site
# 4. Merging preview build into main build at /docs
# 5. Building all release branches to /docs/{version}
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
echo "Step 1/5: Building main site..."
cd "$PROJECT_DIR"
npm run build
echo "✓ Main site built to build/"
echo ""

# Step 2: Sync preview docs from upstream
echo "Step 2/5: Syncing preview docs from llm-d/llm-d @ $DOCS_BRANCH..."
cd "$PROJECT_DIR/preview"
bash scripts/sync-docs.sh "$DOCS_BRANCH"
echo "✓ Preview docs synced"
echo ""

# Step 3: Build preview docs site
echo "Step 3/5: Building preview docs site..."
cd "$PROJECT_DIR/preview"
npm install
npm run build
echo "✓ Preview docs built to preview/build/"
echo ""

# Step 4: Merge preview into main build as /docs
echo "Step 4/5: Merging preview build into main build at /docs..."
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

# Step 5: Build and merge release branches
echo "Step 5/5: Building release branches..."
cd "$PROJECT_DIR"

# Fetch all remote branches (needed for finding release branches)
git fetch origin 2>/dev/null || true

# Find all release branches (keep origin/ prefix for worktree refs)
RELEASE_BRANCHES=$(git branch -r | grep 'origin/release-' | grep -v HEAD || true)

if [ -z "$RELEASE_BRANCHES" ]; then
  echo "No release branches found, skipping"
else
  echo "Found release branches:"
  echo "$RELEASE_BRANCHES"
  echo ""

  for branch in $RELEASE_BRANCHES; do
    # Extract version (e.g., origin/release-0.7.0 -> 0.7.0)
    VERSION=${branch#origin/release-}

    echo "Building docs for version $VERSION from $branch"

    # Checkout the release branch (in a worktree to avoid conflicts)
    WORKTREE_PATH="../release-${VERSION}"
    # Clean up any existing worktree first to ensure fresh builds
    git worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true
    git worktree add "$WORKTREE_PATH" "$branch" 2>/dev/null || {
      echo "⚠ Warning: Could not create worktree for $branch, skipping"
      continue
    }

    # Build the release docs with version-specific baseUrl
    cd "${WORKTREE_PATH}/preview"
    npm install --silent
    DOCS_BASE_URL=/docs/${VERSION}/ npm run build

    # Copy build output to versioned path
    cd "$PROJECT_DIR"
    mkdir -p "build/docs/${VERSION}"
    cp -r "${WORKTREE_PATH}/preview/build/"* "build/docs/${VERSION}/"

    # Clean up worktree
    git worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true

    echo "✓ Built version $VERSION"
    echo ""
  done
fi

echo "========================================="
echo "Build Complete!"
echo "========================================="
echo ""
echo "Output directory: build/"
echo "  - Main site: build/"
echo "  - Docs site: build/docs/"
if [ -n "${RELEASE_BRANCHES:-}" ]; then
  for branch in $RELEASE_BRANCHES; do
    VERSION=${branch#origin/release-}
    echo "  - Version $VERSION: build/docs/$VERSION/"
  done
fi
echo ""
echo "To serve locally:"
echo "  npm run serve"
echo ""

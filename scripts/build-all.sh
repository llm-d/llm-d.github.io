#!/usr/bin/env bash
# build-all.sh — Unified build script for local dev, Netlify, and GitHub Actions
#
# Layout produced:
#   build/                  — main site (landing, blog, community)
#   build/docs/             — latest stable release docs (canonical URL)
#   build/docs/{version}/   — every release-X.Y.Z branch (stable deep-links)
#   build/docs/dev/         — development docs from llm-d/llm-d@<DEV_DOCS_BRANCH>
#
# If no release-X.Y.Z branches exist yet, dev docs are served at build/docs/
# (preserving the historical pre-release behavior).
#
# Usage:
#   ./scripts/build-all.sh                                        # dev docs from llm-d/llm-d@main
#   ./scripts/build-all.sh release-0.7                            # dev docs from a different branch
#   LLMD_REPO=/path/to/local/llm-d ./scripts/build-all.sh         # use local clone as-is
#   LLMD_REPO=/path/to/local/llm-d LLMD_FETCH=1 ./scripts/build-all.sh  # fetch before sync

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Branch in llm-d/llm-d that backs the "dev" docs (defaults to main)
DEV_DOCS_BRANCH="${1:-main}"

echo "========================================="
echo "llm-d.ai Unified Build Script"
echo "========================================="
echo ""

# Step 1: Build main site (landing, blog, community)
echo "Step 1: Building main site..."
cd "$PROJECT_DIR"
npm run build
echo "✓ Main site built to build/"
echo ""

# Step 2: Discover release branches and pick the latest stable
echo "Step 2: Discovering release branches..."
cd "$PROJECT_DIR"
git fetch origin 2>/dev/null || true
RELEASE_BRANCHES=$(git branch -r | grep 'origin/release-' | grep -v HEAD || true)

LATEST_VERSION=""
if [ -n "$RELEASE_BRANCHES" ]; then
  LATEST_VERSION=$(echo "$RELEASE_BRANCHES" | sed 's|.*origin/release-||' | sort -V | tail -1)
  echo "Found release branches:"
  echo "$RELEASE_BRANCHES"
  echo "Latest stable: $LATEST_VERSION"
else
  echo "No release branches found"
fi
echo ""

# When a stable release exists, dev moves under /docs/dev/ and /docs/ serves latest.
# Without a stable release, dev keeps the canonical /docs/ URL.
if [ -n "$LATEST_VERSION" ]; then
  DEV_BASE_URL="/docs/dev/"
  DEV_OUTPUT_SUBDIR="docs/dev"
else
  DEV_BASE_URL="/docs/"
  DEV_OUTPUT_SUBDIR="docs"
fi

# Step 3: Build dev docs from llm-d/llm-d@$DEV_DOCS_BRANCH
echo "Step 3: Syncing and building dev docs from llm-d/llm-d @ $DEV_DOCS_BRANCH..."
echo "        Output: build/$DEV_OUTPUT_SUBDIR/ (baseUrl: $DEV_BASE_URL)"
cd "$PROJECT_DIR/preview"
bash scripts/sync-docs.sh "$DEV_DOCS_BRANCH"

# === INJECT PRISM DASHBOARD ===
echo "Injecting Prism dashboard into dev optimized-baseline.md..."
echo -e '\n## Results Dashboard\n\nThe graphs below are powered by [Prism](https://prism.llm-d.ai/?view=intelligent-routing), our visualization dashboard for analyzing inference benchmark results. This specific view shows the performance of intelligent routing.\n\n<div style={{width: "100%", height: "600px", overflow: "hidden", position: "relative"}}><iframe src="https://prism.llm-d.ai/?view=intelligent-routing" style={{width: "150%", height: "150%", transform: "scale(0.67)", transformOrigin: "0 0", border: 0, position: "absolute", top: 0, left: 0}} allowFullScreen title="Prism Intelligent Routing Dashboard"></iframe></div>' >> "$PROJECT_DIR/preview/docs/guides/optimized-baseline.md"
echo "✓ Dashboard injected"
echo ""

npm install
DOCS_BASE_URL="$DEV_BASE_URL" npm run build
cd "$PROJECT_DIR"
mkdir -p "build/$DEV_OUTPUT_SUBDIR"
cp -r preview/build/* "build/$DEV_OUTPUT_SUBDIR/"
echo "✓ Dev docs built to build/$DEV_OUTPUT_SUBDIR/"

# Expose preview images at /img/docs/ for absolute-path references in shared assets
mkdir -p build/img/docs
cp -r preview/build/img/docs/* build/img/docs/ 2>/dev/null || true

# Optional: Include merge report if it exists (from GitHub Actions workflow)
if [[ -n "${LLMD_REPO:-}" ]] && [[ -f "$LLMD_REPO/merge-report.txt" ]]; then
    echo "Including merge report..."
    cp "$LLMD_REPO/merge-report.txt" "build/$DEV_OUTPUT_SUBDIR/merge-report.txt"
fi
echo ""

# Step 4: Build release branches
if [ -z "$RELEASE_BRANCHES" ]; then
  echo "Step 4: No release branches to build"
else
  echo "Step 4: Building release branches..."
  for branch in $RELEASE_BRANCHES; do
    VERSION=${branch#origin/release-}
    if [ "$VERSION" = "$LATEST_VERSION" ]; then
      IS_LATEST="yes"
    else
      IS_LATEST="no"
    fi

    echo ""
    echo "Building docs for version $VERSION from $branch (latest: $IS_LATEST)"

    WORKTREE_PATH="../release-${VERSION}"
    git worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true
    git worktree add "$WORKTREE_PATH" "$branch" 2>/dev/null || {
      echo "⚠ Warning: Could not create worktree for $branch, skipping"
      continue
    }

    # Override site UX (theme components, navbar, version dropdown, config,
    # package deps) with main's copies so improvements propagate to every
    # version. Doc CONTENT in preview/docs/ comes from the worktree and is
    # left untouched.
    echo "  Syncing UX from main into worktree..."
    cp "$PROJECT_DIR/preview/docusaurus.config.ts" \
       "${WORKTREE_PATH}/preview/docusaurus.config.ts"
    cp "$PROJECT_DIR/preview/package.json" \
       "${WORKTREE_PATH}/preview/package.json"
    cp "$PROJECT_DIR/preview/package-lock.json" \
       "${WORKTREE_PATH}/preview/package-lock.json"
    rm -rf "${WORKTREE_PATH}/preview/src"
    cp -r "$PROJECT_DIR/preview/src" "${WORKTREE_PATH}/preview/src"

    # Apply fixups for known stale GitHub links in committed release-branch content.
    # These patch specific link targets that changed in upstream after the branch was cut.
    echo "  Applying link fixups to release branch docs..."
    if [[ "$(uname)" == "Darwin" ]]; then
      SED_INPLACE=(sed -i '')
    else
      SED_INPLACE=(sed -i)
    fi
    while IFS= read -r -d '' file; do
      "${SED_INPLACE[@]}" \
        -e 's|github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-aware|github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-routing|g' \
        -e 's|github.com/llm-d/llm-d/tree/main/guides/predicted-latency-based-scheduling|github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing|g' \
        "$file"
    done < <(find "${WORKTREE_PATH}/preview/docs" -name "*.md" -print0)

    # Inject Prism dashboard into the worktree docs as well
    echo "  Injecting Prism dashboard into release ${VERSION} optimized-baseline.md..."
    echo -e '\n## Results Dashboard\n\nThe graphs below are powered by [Prism](https://prism.llm-d.ai/?view=intelligent-routing), our visualization dashboard for analyzing inference benchmark results. This specific view shows the performance of intelligent routing.\n\n<div style={{width: "100%", height: "600px", overflow: "hidden", position: "relative"}}><iframe src="https://prism.llm-d.ai/?view=intelligent-routing" style={{width: "150%", height: "150%", transform: "scale(0.67)", transformOrigin: "0 0", border: 0, position: "absolute", top: 0, left: 0}} allowFullScreen title="Prism Intelligent Routing Dashboard"></iframe></div>' >> "${WORKTREE_PATH}/preview/docs/guides/optimized-baseline.md"

    cd "${WORKTREE_PATH}/preview"
    npm install --silent

    # Always produce the versioned URL so external links remain stable
    DOCS_BASE_URL=/docs/${VERSION}/ npm run build
    cd "$PROJECT_DIR"
    mkdir -p "build/docs/${VERSION}"
    cp -r "${WORKTREE_PATH}/preview/build/"* "build/docs/${VERSION}/"
    echo "  ✓ Built /docs/${VERSION}/"

    # The latest stable is also served at /docs/ (the canonical URL)
    if [ "$IS_LATEST" = "yes" ]; then
      cd "${WORKTREE_PATH}/preview"
      DOCS_BASE_URL=/docs/ npm run build
      cd "$PROJECT_DIR"
      cp -r "${WORKTREE_PATH}/preview/build/"* "build/docs/"
      echo "  ✓ Built /docs/ (latest = $VERSION)"
    fi

    git worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true
  done
fi

# Step 5: Merge /docs pages into the main site search index
echo "Step 5: Merging docs into unified search index..."
cd "$PROJECT_DIR"
node scripts/merge-search-index.mjs
echo "✓ Unified search index updated"
echo ""

echo ""
echo "========================================="
echo "Build Complete!"
echo "========================================="
echo ""
echo "Output directory: build/"
echo "  - Main site:       build/"
if [ -n "$LATEST_VERSION" ]; then
  echo "  - /docs/           latest stable ($LATEST_VERSION)"
  echo "  - /docs/dev/       development (from llm-d/llm-d@$DEV_DOCS_BRANCH)"
else
  echo "  - /docs/           development (from llm-d/llm-d@$DEV_DOCS_BRANCH)"
fi
if [ -n "$RELEASE_BRANCHES" ]; then
  for branch in $RELEASE_BRANCHES; do
    VERSION=${branch#origin/release-}
    echo "  - /docs/$VERSION/"
  done
fi
echo ""
echo "To serve locally:"
echo "  npm run serve"
echo ""

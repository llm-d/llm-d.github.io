#!/usr/bin/env bash
# create-version.sh — Snapshot current docs as a versioned release
#
# Usage:
#   ./scripts/create-version.sh 0.5
#   ./scripts/create-version.sh 0.6
#
# This:
#   1. Syncs docs from the release branch in llm-d/llm-d (e.g., release-0.5)
#   2. Creates a Docusaurus versioned snapshot
#
# The version will appear in the version dropdown on the docs site.

set -euo pipefail

VERSION="${1:?Usage: $0 <version> (e.g., 0.5)}"
BRANCH="release-${VERSION}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Creating docs version $VERSION from branch $BRANCH"

# Step 1: Sync docs from the release branch
echo "    Step 1: Syncing docs from $BRANCH..."
"$SCRIPT_DIR/sync-docs.sh" "$BRANCH"

# Step 2: Create Docusaurus version snapshot
echo "    Step 2: Creating Docusaurus version snapshot..."
cd "$PROJECT_DIR"
npx docusaurus docs:version "$VERSION"

echo "==> Version $VERSION created."
echo "    Versioned docs are in: versioned_docs/version-$VERSION/"
echo "    Sidebar snapshot is in: versioned_sidebars/version-$VERSION-sidebars.json"
echo ""
echo "    Don't forget to sync docs/ back to 'main' for the 'Next' version:"
echo "    ./scripts/sync-docs.sh main"

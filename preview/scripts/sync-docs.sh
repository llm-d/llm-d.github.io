#!/usr/bin/env bash
# sync-docs.sh — Mirror docs from llm-d/llm-d into preview/docs.
#
# The docs site builds DIRECTLY from the upstream docs/ tree: the folder
# structure IS the site structure, _category_.json files drive the sidebar,
# and page frontmatter controls order/labels. No path remapping, flattening,
# or slug injection — relative Markdown links are kept and resolved natively
# by Docusaurus.
#
# Usage:
#   ./scripts/sync-docs.sh                                  # clone main from GitHub
#   ./scripts/sync-docs.sh release-0.7                      # clone a branch
#   LLMD_REPO=/path/to/local/llm-d ./scripts/sync-docs.sh   # use a local clone as-is
#   LLMD_REPO=/path/to/local/llm-d LLMD_FETCH=1 ./scripts/sync-docs.sh  # fetch first

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Shared MDX transformations (callouts, tabs, MDX escaping, image rewrites, ...)
source "$SCRIPT_DIR/transformations.sh"

BRANCH="${1:-main}"
REPO_URL="https://github.com/llm-d/llm-d.git"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="$PROJECT_DIR/docs"
STATIC_DIR="$PROJECT_DIR/static/img/docs"
UPSTREAM_REF="$BRANCH"

echo "==> Syncing docs from llm-d/llm-d @ $BRANCH (mirror mode)"

# --- Source: local clone or fresh shallow clone ---
if [[ -n "${LLMD_REPO:-}" ]]; then
    echo "    Using local repo: $LLMD_REPO"
    SRC="$LLMD_REPO"
    if [[ -n "${LLMD_FETCH:-}" ]]; then
        echo "    Fetching latest $BRANCH from origin..."
        (cd "$SRC" && git fetch origin "$BRANCH" --quiet && git reset --hard origin/"$BRANCH" --quiet)
    fi
else
    TMPDIR=$(mktemp -d)
    trap "rm -rf $TMPDIR" EXIT
    echo "    Cloning into temp dir..."
    git clone --depth 1 --branch "$BRANCH" --filter=blob:none "$REPO_URL" "$TMPDIR" --quiet
    SRC="$TMPDIR"
fi

WIP="$SRC/docs"
ASSETS="$WIP/assets"

if [[ ! -d "$WIP" ]]; then
    echo "ERROR: no docs/ directory found in $SRC" >&2
    exit 1
fi

echo "    Cleaning docs/ ..."
rm -rf "$DOCS_DIR"/*
mkdir -p "$DOCS_DIR"

# --- 1) Mirror the docs/ tree (everything except the assets dir) ---
echo "    Mirroring docs tree..."
( cd "$WIP" && find . -type d -not -path './assets' -not -path './assets/*' ) | while read -r d; do
    mkdir -p "$DOCS_DIR/$d"
done
( cd "$WIP" && find . -type f -not -path './assets/*' ) | while read -r f; do
    cp "$WIP/$f" "$DOCS_DIR/$f"
done

# --- 2) README.{md,mdx} -> index.{md,mdx} (Docusaurus convention) ---
echo "    Renaming README -> index..."
find "$DOCS_DIR" -type f \( -name 'README.md' -o -name 'README.mdx' \) | while read -r f; do
    ext="${f##*.}"
    mv "$f" "$(dirname "$f")/index.$ext"
done

# --- 3) Assets: copy images into static/img/docs (flat) ---
echo "    Copying image assets..."
mkdir -p "$STATIC_DIR"
# Everything under docs/assets
if [[ -d "$ASSETS" ]]; then
    find "$ASSETS" -type f \( -name '*.svg' -o -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.gif' \) \
        -exec cp {} "$STATIC_DIR/" \; 2>/dev/null || true
fi
# Any other in-tree images (folder-local images/, diagrams next to pages, etc.)
find "$WIP" -path "$ASSETS" -prune -o -type f \( -name '*.svg' -o -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.gif' \) -print \
    -exec cp {} "$STATIC_DIR/" \; 2>/dev/null || true
# Remove image binaries that got mirrored into docs/ (refs are rewritten to /img/docs)
find "$DOCS_DIR" -type f \( -name '*.svg' -o -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.gif' \) -delete 2>/dev/null || true

# --- 4) Apply shared MDX transformations to every page ---
echo "    Applying markdown transformations (callouts, tabs, MDX escaping, images)..."
find "$DOCS_DIR" \( -name '*.md' -o -name '*.mdx' \) -print0 | while IFS= read -r -d '' file; do
    apply_transformations "$file"
done

# --- 5) Link/image fixups that survive the mirror ---
# README links -> index (we renamed the files); flatten any /img/docs/images/
# segment the transforms introduce; rewrite folder-local image refs.
echo "    Fixing README/index links and image paths..."
find "$DOCS_DIR" \( -name '*.md' -o -name '*.mdx' \) -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\](\([^):]*\)/README\.md)|](\1/index.md)|g' \
        -e 's|\](\([^):]*\)/README\.mdx)|](\1/index.mdx)|g' \
        -e 's|\](README\.md)|](index.md)|g' \
        -e 's|\](README\.mdx)|](index.mdx)|g' \
        -e 's|\](\([^):]*\)/README\.md#|](\1/index.md#|g' \
        -e 's|\](\([^):]*\)/README\.mdx#|](\1/index.mdx#|g' \
        -e 's|\](README\.md#|](index.md#|g' \
        -e 's|\](README\.mdx#|](index.mdx#|g' \
        -e 's|\](/docs/guides/|](/docs/well-lit-paths/|g' \
        -e 's|\](/guides/|](/well-lit-paths/|g' \
        -e 's|\](/docs/guides)|](/docs/well-lit-paths)|g' \
        -e 's|\](/guides)|](/well-lit-paths)|g' \
        -e 's|to="/guides|to="/well-lit-paths|g' \
        -e 's|/img/docs/images/|/img/docs/|g' \
        -e 's|!\[\([^]]*\)\](\.\{1,2\}/\([^)]*/\)\{0,1\}\([^)/]*\))|![\1](/img/docs/\3)|g' \
        -e 's|!\[\([^]]*\)\](images/\([^)]*/\)\{0,1\}\([^)/]*\))|![\1](/img/docs/\3)|g' \
        -e 's|!\[\([^]]*\)\](\([^)/:][^)/]*\))|![\1](/img/docs/\2)|g' \
        -e 's|src="\.\{1,2\}/\([^"]*/\)\{0,1\}\([^"/]*\)"|src="/img/docs/\2"|g' \
        -e 's|src="images/\([^"]*/\)\{0,1\}\([^"/]*\)"|src="/img/docs/\2"|g' \
        "$file"
done

# --- 5b) Repoint links to repo-root dirs (guides/, helpers/) to GitHub ---
# These dirs are siblings of docs/, not part of the synced tree, so relative
# links to them overshoot the docs/ tree and 404 in-site. Point them at GitHub
# on the synced ref (our README->index rename is reversed for the target).
echo "    Repointing repo-root guides/ + helpers/ links to GitHub..."
find "$DOCS_DIR" \( -name '*.md' -o -name '*.mdx' \) -print0 | while IFS= read -r -d '' file; do
    sed_inplace -E \
        -e "s@\]\((\.\./)+guides/index\.mdx?(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/guides/README.md\2)@g" \
        -e "s@\]\((\.\./)+guides/([^)#]*)/index\.mdx?(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/guides/\2/README.md\3)@g" \
        -e "s@\]\((\.\./)+guides/([^)#]*\.mdx?)(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/guides/\2\3)@g" \
        -e "s@\]\((\.\./)+guides/([^)]*)\)@](https://github.com/llm-d/llm-d/tree/$UPSTREAM_REF/guides/\2)@g" \
        -e "s@\]\((\.\./)+helpers/([^)#]*)/index\.mdx?(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/helpers/\2/README.md\3)@g" \
        -e "s@\]\((\.\./)+helpers/([^)#]*\.mdx?)(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/helpers/\2\3)@g" \
        -e "s@\]\((\.\./)+helpers/([^)]*)\)@](https://github.com/llm-d/llm-d/tree/$UPSTREAM_REF/helpers/\2)@g" \
        "$file"
done

# --- 6) Rewrite upstream repo links to the synced branch ---
# Dev docs point at main; release docs point at their matching release branch.
echo "    Repointing llm-d upstream links to $UPSTREAM_REF..."
find "$DOCS_DIR" \( -name '*.md' -o -name '*.mdx' \) -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e "s|https://github.com/llm-d/llm-d/tree/main/|https://github.com/llm-d/llm-d/tree/$UPSTREAM_REF/|g" \
        -e "s|https://github.com/llm-d/llm-d/blob/main/|https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/|g" \
        "$file"
done

# --- 7) MDX hygiene: void tags, autolinks, standalone display-math ---
# Upstream is GitHub-flavored Markdown, not MDX. No math renderer is configured,
# so a standalone "$$ ... $$" display-math line (whose { } MDX would parse as a
# broken JS expression) becomes inline code.
echo "    Normalizing bare HTML void tags + autolinks + display-math for MDX..."
find "$DOCS_DIR" \( -name '*.md' -o -name '*.mdx' \) -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|^\$\$\(.*\)\$\$[[:space:]]*$|`\1`|g' \
        -e 's|<br>|<br/>|g' \
        -e 's|<hr>|<hr/>|g' \
        -e 's|<\([A-Za-z0-9._%+-]\{1,\}@[A-Za-z0-9.-]\{1,\}\.[A-Za-z]\{2,\}\)>|\1|g' \
        -e 's|<\(https\{0,1\}://[^ >]*\)>|\1|g' \
        "$file"
done

# --- 8) Absolute asset URLs -> root-relative (founder/CNCF logos in the intro) ---
echo "    Rewriting absolute llm-d.ai/img asset URLs to root-relative..."
find "$DOCS_DIR" \( -name '*.md' -o -name '*.mdx' \) -print0 | while IFS= read -r -d '' file; do
    sed_inplace -e 's|https://llm-d.ai/img/|/img/|g' "$file"
done

DOC_COUNT=$(find "$DOCS_DIR" \( -name '*.md' -o -name '*.mdx' \) | wc -l | tr -d ' ')
CAT_COUNT=$(find "$DOCS_DIR" -name '_category_.json' | wc -l | tr -d ' ')
echo "==> Done. Mirrored $DOC_COUNT docs and $CAT_COUNT category files from llm-d/llm-d @ $BRANCH"

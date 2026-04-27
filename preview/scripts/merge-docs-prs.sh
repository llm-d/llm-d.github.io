#!/usr/bin/env bash
# merge-docs-prs.sh — Clone llm-d/llm-d@main and merge open docs PRs
#
# Discovers all open PRs that touch docs/wip-docs-new/ or docs/assets/,
# then merges each into a local clone. PRs that conflict are skipped.
#
# Usage:
#   ./scripts/merge-docs-prs.sh /tmp/llmd-merged
#   ./scripts/merge-docs-prs.sh                    # uses mktemp -d
#
# Requires: gh CLI, git, python3

set -euo pipefail

REPO_URL="https://github.com/llm-d/llm-d.git"
CLONE_DIR="${1:-$(mktemp -d)}"
REPORT="$CLONE_DIR/merge-report.txt"

echo "==> Cloning llm-d/llm-d@main into $CLONE_DIR"
if [[ ! -d "$CLONE_DIR/.git" ]]; then
    git clone --depth 100 --branch main --filter=blob:none --sparse \
        "$REPO_URL" "$CLONE_DIR" --quiet
    (cd "$CLONE_DIR" && git sparse-checkout set docs/wip-docs-new docs/assets)
else
    echo "    Using existing clone at $CLONE_DIR"
fi

cd "$CLONE_DIR"
git config user.email "ci@llm-d.ai"
git config user.name "llm-d preview builder"

echo "==> Discovering open PRs with docs changes..."
DOCS_PRS=$(gh pr list --repo llm-d/llm-d --state open \
    --json number,headRefName,title,files --limit 100 2>/dev/null | \
    python3 -c "
import json, sys
prs = json.load(sys.stdin)
result = []
for pr in prs:
    has_docs = any(
        f['path'].startswith('docs/wip-docs-new/') or f['path'].startswith('docs/assets/')
        for f in pr.get('files', [])
    )
    if has_docs:
        result.append({'number': pr['number'], 'branch': pr['headRefName'], 'title': pr['title']})
result.sort(key=lambda x: x['number'])
json.dump(result, sys.stdout)
")

PR_COUNT=$(echo "$DOCS_PRS" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")
echo "    Found $PR_COUNT PRs with docs changes"

if [[ "$PR_COUNT" -eq 0 ]]; then
    echo "    No docs PRs to merge"
    : > "$REPORT"
    exit 0
fi

echo "==> Merging PRs..."
: > "$REPORT"

echo "$DOCS_PRS" | python3 -c "
import json, sys
for pr in json.load(sys.stdin):
    # Tab-delimited so titles with spaces parse correctly
    print(f\"{pr['number']}\t{pr['title']}\")
" | while IFS=$'\t' read -r PR_NUM PR_TITLE; do
    echo "    Fetching PR #$PR_NUM ($PR_TITLE)..."
    if ! git fetch origin "pull/${PR_NUM}/head:pr-${PR_NUM}" --quiet 2>/dev/null; then
        echo "SKIPPED (fetch failed): #$PR_NUM - $PR_TITLE" | tee -a "$REPORT"
        continue
    fi

    if git merge --no-edit "pr-${PR_NUM}" --quiet 2>/dev/null; then
        echo "INCLUDED: #$PR_NUM - $PR_TITLE" | tee -a "$REPORT"
    else
        git merge --abort 2>/dev/null || true
        echo "SKIPPED (conflict): #$PR_NUM - $PR_TITLE" | tee -a "$REPORT"
    fi
done

echo ""
echo "==> Merge report:"
cat "$REPORT"

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

    # Try merge with theirs strategy (prefer PR changes for content conflicts)
    if git merge --no-edit "pr-${PR_NUM}" -X theirs 2>/dev/null; then
        echo "INCLUDED: #$PR_NUM - $PR_TITLE" | tee -a "$REPORT"
    else
        # Merge failed - try to auto-resolve common conflicts
        echo "    Attempting auto-conflict resolution..."

        # Check for directory rename conflicts (guides/ → well-lit-paths/)
        if git status --porcelain | grep -q "DU\|UD\|AA\|UA\|AU"; then
            # Handle deleted/modified and rename conflicts
            git status --porcelain | while read status file; do
                case "$status" in
                    DU|UD)
                        # Deleted in one branch, modified in other - keep modified version
                        git add "$file" 2>/dev/null || true
                        ;;
                    AA|UA|AU)
                        # Both added/modified - keep PR version
                        git checkout --theirs "$file" 2>/dev/null && git add "$file" || true
                        ;;
                esac
            done

            # Try to complete the merge
            if git commit --no-edit 2>/dev/null; then
                echo "INCLUDED (auto-resolved): #$PR_NUM - $PR_TITLE" | tee -a "$REPORT"
            else
                git merge --abort 2>/dev/null || true
                echo "SKIPPED (unresolvable conflict): #$PR_NUM - $PR_TITLE" | tee -a "$REPORT"
            fi
        else
            git merge --abort 2>/dev/null || true
            echo "SKIPPED (conflict): #$PR_NUM - $PR_TITLE" | tee -a "$REPORT"
        fi
    fi
done

echo ""
echo "==> Merge report:"
cat "$REPORT"

#!/usr/bin/env bash
# sync-docs.sh — Pull WiP docs from a specific branch of llm-d/llm-d
#
# Usage:
#   ./scripts/sync-docs.sh                    # clone from GitHub (main branch)
#   ./scripts/sync-docs.sh release-0.5        # clone from GitHub (release-0.5 branch)
#   LLMD_REPO=/path/to/local/llm-d ./scripts/sync-docs.sh        # use local clone as-is
#   LLMD_REPO=/path/to/local/llm-d LLMD_FETCH=1 ./scripts/sync-docs.sh  # fetch before sync

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Source shared transformations
source "$SCRIPT_DIR/transformations.sh"

cp_doc() {
    if [[ -f "$1" && -n "$2" ]]; then
        cp "$1" "$2"
    fi
}

set_doc_slug() {
    local file="$1"
    local slug="$2"

    if [[ ! -f "$file" ]]; then
        return
    fi

    local first_line
    IFS= read -r first_line < "$file" || true

    if [[ "$first_line" == "---" ]]; then
        awk -v slug="$slug" '
            BEGIN {in_frontmatter=1; slug_set=0}
            NR==1 {print; next}
            in_frontmatter==1 && /^---$/ {
                if (!slug_set) {
                    print "slug: " slug
                }
                print
                in_frontmatter=0
                next
            }
            in_frontmatter==1 && /^slug:[[:space:]]*/ {
                print "slug: " slug
                slug_set=1
                next
            }
            {print}
        ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        return
    fi

    {
        printf -- "---\n"
        printf -- "slug: %s\n" "$slug"
        printf -- "---\n\n"
        cat "$file"
    } > "$file.tmp" && mv "$file.tmp" "$file"
}

BRANCH="${1:-main}"
REPO_URL="https://github.com/llm-d/llm-d.git"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="$PROJECT_DIR/docs"
GUIDES_DIR="$PROJECT_DIR/guides"
STATIC_DIR="$PROJECT_DIR/static/img/docs"
UPSTREAM_REF="$BRANCH"

echo "==> Syncing docs from llm-d/llm-d @ $BRANCH"

# Use local clone if LLMD_REPO is set, otherwise clone from GitHub into a temp dir
if [[ -n "${LLMD_REPO:-}" ]]; then
    echo "    Using local repo: $LLMD_REPO"
    SRC="$LLMD_REPO"
    # Optionally fetch latest from origin (set LLMD_FETCH=1 to enable)
    if [[ -n "${LLMD_FETCH:-}" ]]; then
        echo "    Fetching latest $BRANCH from origin..."
        (cd "$SRC" && git fetch origin "$BRANCH" --quiet && git reset --hard origin/"$BRANCH" --quiet)
    fi
else
    # Clone into a temp dir
    TMPDIR=$(mktemp -d)
    trap "rm -rf $TMPDIR" EXIT
    echo "    Cloning into temp dir..."
    git clone --depth 1 --branch "$BRANCH" --filter=blob:none "$REPO_URL" "$TMPDIR" --quiet
    SRC="$TMPDIR"
fi

WIP="$SRC/docs"
ASSETS="$SRC/docs/assets"

echo "    Cleaning docs/ directory..."
rm -rf "$DOCS_DIR"/*

echo "    Creating directory structure from outline..."
mkdir -p \
    "$DOCS_DIR/getting-started" \
    "$DOCS_DIR/architecture/core/router/epp" \
    "$DOCS_DIR/architecture/advanced/disaggregation" \
    "$DOCS_DIR/architecture/advanced/autoscaling" \
    "$DOCS_DIR/architecture/advanced/batch" \
    "$DOCS_DIR/architecture/advanced/kv-management" \
    "$DOCS_DIR/guides" \
    "$DOCS_DIR/guides/agentic-serving" \
    "$DOCS_DIR/resources/gateway" \
    "$DOCS_DIR/resources/observability" \
    "$DOCS_DIR/resources/operations" \
    "$DOCS_DIR/resources/operations/rollouts" \
    "$DOCS_DIR/resources/infrastructure" \
    "$DOCS_DIR/resources/rdma" \
    "$DOCS_DIR/resources/infra-providers" \
    "$DOCS_DIR/api-reference" \
    "$DOCS_DIR/accelerators"

echo "    Copying content..."

# === Getting Started ===
# Prefer the combined-landing MDX (llm-d/llm-d#1820) when upstream ships it;
# fall back to the plain README.md intro otherwise.
if [[ -f "$WIP/getting-started/README.mdx" ]]; then
  cp_doc "$WIP/getting-started/README.mdx"    "$DOCS_DIR/getting-started/index.mdx"
else
  cp_doc "$WIP/getting-started/README.md"     "$DOCS_DIR/getting-started/index.md"
fi
cp_doc "$WIP/getting-started/quickstart.md"   "$DOCS_DIR/getting-started/quickstart.md"
cp_doc "$WIP/getting-started/feature-matrix.md" "$DOCS_DIR/getting-started/feature-matrix.md"
cp_doc "$WIP/getting-started/accelerators.md" "$DOCS_DIR/getting-started/accelerators.md"

# === Architecture ===
cp_doc "$WIP/architecture/README.md"          "$DOCS_DIR/architecture/index.md"

# Architecture / Core
cp_doc "$WIP/architecture/core/inferencepool.md"   "$DOCS_DIR/architecture/core/inferencepool.md"
cp_doc "$WIP/architecture/core/model-servers.md"   "$DOCS_DIR/architecture/core/model-servers.md"

# Architecture / Core / Router
cp_doc "$WIP/architecture/core/router/README.md"          "$DOCS_DIR/architecture/core/router/index.md"
cp_doc "$WIP/architecture/core/router/proxy.md"           "$DOCS_DIR/architecture/core/router/proxy.md"

# Architecture / Core / Router / EPP
cp_doc "$WIP/architecture/core/router/epp/README.md"           "$DOCS_DIR/architecture/core/router/epp/index.md"
cp_doc "$WIP/architecture/core/router/epp/scheduling.md"       "$DOCS_DIR/architecture/core/router/epp/scheduling.md"
cp_doc "$WIP/architecture/core/router/epp/flow-control.md"     "$DOCS_DIR/architecture/core/router/epp/flow-control.md"
cp_doc "$WIP/architecture/core/router/epp/request-handling.md"  "$DOCS_DIR/architecture/core/router/epp/request-handling.md"
cp_doc "$WIP/architecture/core/router/epp/configuration.md"     "$DOCS_DIR/architecture/core/router/epp/configuration.md"
cp_doc "$WIP/architecture/core/router/epp/datalayer.md"         "$DOCS_DIR/architecture/core/router/epp/datalayer.md"

# Architecture / Advanced / Disaggregation
cp_doc "$WIP/architecture/advanced/disaggregation/README.md"               "$DOCS_DIR/architecture/advanced/disaggregation/index.md"
cp_doc "$WIP/architecture/advanced/disaggregation/operations-vllm.md"      "$DOCS_DIR/architecture/advanced/disaggregation/operations-vllm.md"
cp_doc "$WIP/architecture/advanced/disaggregation/operations-sglang.md"    "$DOCS_DIR/architecture/advanced/disaggregation/operations-sglang.md"

# Architecture / Advanced
cp_doc "$WIP/architecture/advanced/latency-predictor.md" "$DOCS_DIR/architecture/advanced/latency-predictor.md"

# Architecture / Advanced / KV Management
cp_doc "$WIP/architecture/advanced/kv-management/README.md"                     "$DOCS_DIR/architecture/advanced/kv-management/index.md"
cp_doc "$WIP/architecture/advanced/kv-management/kv-indexer.md"                "$DOCS_DIR/architecture/advanced/kv-management/kv-indexer.md"
cp_doc "$WIP/architecture/advanced/kv-management/kv-offloader.md"              "$DOCS_DIR/architecture/advanced/kv-management/kv-offloader.md"
cp_doc "$WIP/architecture/advanced/kv-management/prefix-cache-aware-routing.md" "$DOCS_DIR/architecture/advanced/kv-management/prefix-cache-aware-routing.md"

# Architecture / Advanced / Autoscaling
cp_doc "$WIP/architecture/advanced/autoscaling/README.md"                       "$DOCS_DIR/architecture/advanced/autoscaling/index.md"
cp_doc "$WIP/architecture/advanced/autoscaling/hpa-wva.md"                     "$DOCS_DIR/architecture/advanced/autoscaling/workload-variant-autoscaling.md"
cp_doc "$WIP/architecture/advanced/autoscaling/hpa-epp.md"                     "$DOCS_DIR/architecture/advanced/autoscaling/igw-hpa.md"
cp "$WIP/architecture/advanced/autoscaling/"*.svg "$DOCS_DIR/architecture/advanced/autoscaling/" 2>/dev/null || true

# Architecture / Advanced / Batch
cp_doc "$WIP/architecture/advanced/batch/README.md"           "$DOCS_DIR/architecture/advanced/batch/index.md"
cp_doc "$WIP/architecture/advanced/batch/batch-gateway.md"    "$DOCS_DIR/architecture/advanced/batch/batch-gateway.md"
cp_doc "$WIP/architecture/advanced/batch/async-processor.md"  "$DOCS_DIR/architecture/advanced/batch/async-processor.md"

# === Well-Lit Paths ===
echo "    Copying well-lit-paths overview pages..."

# well-lit-paths/capabilities/ was renamed to foundations/ upstream, and
# flow-control + workload-autoscaling were folded in from traffic-control/.
# Resolve whichever layout the synced ref ships so the dev build (post-rename
# main) AND pre-rename refs (release branches, or main before the content PR
# merges) both produce the same flat guides/ pages.
if [[ -d "$WIP/well-lit-paths/foundations" ]]; then
  WLP="$WIP/well-lit-paths/foundations"
  FC_SRC="$WLP/flow-control.md"
  WA_SRC="$WLP/workload-autoscaling.md"
else
  WLP="$WIP/well-lit-paths/capabilities"
  FC_SRC="$WIP/well-lit-paths/traffic-control/flow-control.md"
  WA_SRC="$WIP/well-lit-paths/traffic-control/workload-autoscaling.md"
fi

cp_doc "$WIP/well-lit-paths/README.md"                      "$DOCS_DIR/guides/index.md"
cp_doc "$WLP/optimized-baseline.md"                         "$DOCS_DIR/guides/optimized-baseline.md"
cp_doc "$WIP/well-lit-paths/workloads/multimodal-serving.md"             "$DOCS_DIR/guides/multimodal-serving.md"
cp_doc "$WLP/precise-prefix-cache-routing.md"               "$DOCS_DIR/guides/precise-prefix-cache-routing.md"
cp_doc "$WLP/tiered-prefix-cache.md"                        "$DOCS_DIR/guides/tiered-prefix-cache.md"
cp_doc "$WIP/well-lit-paths/workloads/batch-serving/asynchronous-processing.md" "$DOCS_DIR/guides/asynchronous-processing.md"
cp_doc "$FC_SRC"                                            "$DOCS_DIR/guides/flow-control.md"
cp_doc "$WLP/pd-disaggregation.md"                          "$DOCS_DIR/guides/pd-disaggregation.md"
cp_doc "$WLP/predicted-latency.md"                          "$DOCS_DIR/guides/predicted-latency.md"
cp_doc "$WLP/wide-expert-parallelism.md"                    "$DOCS_DIR/guides/wide-expert-parallelism.md"
cp_doc "$WA_SRC"                                            "$DOCS_DIR/guides/workload-autoscaling.md"
cp_doc "$WIP/infrastructure/no-kubernetes-deployment.md"                 "$DOCS_DIR/guides/no-kubernetes-deployment.md"
cp_doc "$WIP/well-lit-paths/workloads/batch-serving/batch-gateway.md"    "$DOCS_DIR/guides/batch-gateway.md"
# Agentic Serving overview lives at well-lit-paths/workloads/agentic-serving.md; synced
# as a directory doc (index.md) so the editUrl branch resolves correctly.
cp_doc "$WIP/well-lit-paths/workloads/agentic-serving.md"                "$DOCS_DIR/guides/agentic-serving/index.md"

# Section overview pages — the upstream well-lit-paths/{foundations,workloads}/README.md
# files. These are the landing pages for the Foundations / Workloads nav sections.
# Synced flat into guides/ (the foundations README keeps the historical guides/capabilities.md
# filename so its /well-lit-paths/capabilities URL is unchanged) and slugged under
# /well-lit-paths/<section>; their internal links point at the flattened guide pages.
cp_doc "$WLP/README.md"                                 "$DOCS_DIR/guides/capabilities.md"
cp_doc "$WIP/well-lit-paths/workloads/README.md"        "$DOCS_DIR/guides/workloads.md"
for _sec in capabilities workloads; do
    _secfile="$DOCS_DIR/guides/$_sec.md"
    [[ -f "$_secfile" ]] || continue
    sed_inplace \
        -e 's|\](optimized-baseline\.md)|\](/well-lit-paths/optimized-baseline)|g' \
        -e 's|\](predicted-latency\.md)|\](/well-lit-paths/predicted-latency)|g' \
        -e 's|\](precise-prefix-cache-routing\.md)|\](/well-lit-paths/precise-prefix-cache-routing)|g' \
        -e 's|\](tiered-prefix-cache\.md)|\](/well-lit-paths/tiered-prefix-cache)|g' \
        -e 's|\](pd-disaggregation\.md)|\](/well-lit-paths/pd-disaggregation)|g' \
        -e 's|\](wide-expert-parallelism\.md)|\](/well-lit-paths/wide-expert-parallelism)|g' \
        -e 's|\](flow-control\.md)|\](/well-lit-paths/flow-control)|g' \
        -e 's|\](workload-autoscaling\.md)|\](/well-lit-paths/workload-autoscaling)|g' \
        -e 's|\](multimodal-serving\.md)|\](/well-lit-paths/multimodal-serving)|g' \
        -e 's|\](agentic-serving\.md)|\](/well-lit-paths/agentic-serving)|g' \
        -e 's|\](batch-serving/README\.md)|\](/well-lit-paths/asynchronous-processing)|g' \
        -e 's|\](\.\./foundations/README\.md)|\](/well-lit-paths/capabilities)|g' \
        -e 's|\](\.\./capabilities/README\.md)|\](/well-lit-paths/capabilities)|g' \
        "$_secfile"
done
set_doc_slug "$DOCS_DIR/guides/capabilities.md"    "/well-lit-paths/capabilities"
set_doc_slug "$DOCS_DIR/guides/workloads.md"       "/well-lit-paths/workloads"

sed_inplace \
    -e 's|\](optimized-baseline\.md)|\](/guides/optimized-baseline)|g' \
    -e 's|\](predicted-latency\.md)|\](/guides/predicted-latency)|g' \
    -e 's|\](precise-prefix-cache-aware\.md)|\](/guides/precise-prefix-cache-routing)|g' \
    -e 's|\](precise-prefix-cache-routing\.md)|\](/guides/precise-prefix-cache-routing)|g' \
    -e 's|\](tiered-prefix-cache\.md)|\](/guides/tiered-prefix-cache)|g' \
    -e 's|\](pd-disaggregation\.md)|\](/guides/pd-disaggregation)|g' \
    -e 's|\](wide-expert-parallelism\.md)|\](/guides/wide-expert-parallelism)|g' \
    -e 's|\](flow-control\.md)|\](/guides/flow-control)|g' \
    -e 's|\](workload-autoscaling\.md)|\](/guides/workload-autoscaling)|g' \
    -e 's|\](asynchronous-processing\.md)|\](/guides/asynchronous-processing)|g' \
    -e 's|\](batch-gateway\.md)|\](/guides/batch-gateway)|g' \
    -e 's|\](experimental/batch-gateway\.md)|\](/guides/batch-gateway)|g' \
    -e 's|\](\./multimodal-serving/optimized-baseline/README\.md)|\](/guides/multimodal-serving)|g' \
    -e 's|\](no-kubernetes-deployment\.md)|\](/guides/no-kubernetes-deployment)|g' \
    -e 's|\](../workloads/README\.md)|\](https://github.com/llm-d/llm-d/blob/main/docs/workloads/README.md)|g' \
    -e 's|\](foundations/README\.md)|\](/well-lit-paths/capabilities)|g' \
    -e 's|\](capabilities/README\.md)|\](/well-lit-paths/capabilities)|g' \
    -e 's|\](traffic-control/README\.md)|\](/well-lit-paths/capabilities)|g' \
    -e 's|\](workloads/README\.md)|\](/well-lit-paths/workloads)|g' \
    -e 's|\](operations/README\.md)|\](/well-lit-paths)|g' \
    "$DOCS_DIR/guides/index.md"

# Publish well-lit paths at /well-lit-paths/* while keeping source files and doc IDs
# under docs/guides/* for sync/edit compatibility.
set_doc_slug "$DOCS_DIR/guides/index.md" "/well-lit-paths"
set_doc_slug "$DOCS_DIR/guides/optimized-baseline.md" "/well-lit-paths/optimized-baseline"
set_doc_slug "$DOCS_DIR/guides/multimodal-serving.md" "/well-lit-paths/multimodal-serving"
set_doc_slug "$DOCS_DIR/guides/precise-prefix-cache-routing.md" "/well-lit-paths/precise-prefix-cache-routing"
set_doc_slug "$DOCS_DIR/guides/tiered-prefix-cache.md" "/well-lit-paths/tiered-prefix-cache"
set_doc_slug "$DOCS_DIR/guides/asynchronous-processing.md" "/well-lit-paths/asynchronous-processing"
set_doc_slug "$DOCS_DIR/guides/flow-control.md" "/well-lit-paths/flow-control"
set_doc_slug "$DOCS_DIR/guides/pd-disaggregation.md" "/well-lit-paths/pd-disaggregation"
set_doc_slug "$DOCS_DIR/guides/predicted-latency.md" "/well-lit-paths/predicted-latency"
set_doc_slug "$DOCS_DIR/guides/wide-expert-parallelism.md" "/well-lit-paths/wide-expert-parallelism"
set_doc_slug "$DOCS_DIR/guides/workload-autoscaling.md" "/well-lit-paths/workload-autoscaling"
set_doc_slug "$DOCS_DIR/guides/no-kubernetes-deployment.md" "/well-lit-paths/no-kubernetes-deployment"
set_doc_slug "$DOCS_DIR/guides/batch-gateway.md" "/well-lit-paths/batch-gateway"
set_doc_slug "$DOCS_DIR/guides/agentic-serving/index.md" "/well-lit-paths/agentic-serving"

# Patch agentic-serving internal links (sibling well-lit-paths -> site URLs; full guide -> upstream).
if [[ -f "$DOCS_DIR/guides/agentic-serving/index.md" ]]; then
    sed_inplace \
        -e 's|\](../capabilities/optimized-baseline\.md)|\](/well-lit-paths/optimized-baseline)|g' \
        -e 's|\](../well-lit-paths/capabilities/optimized-baseline\.md)|\](/well-lit-paths/optimized-baseline)|g' \
        -e 's|\](../capabilities/tiered-prefix-cache\.md)|\](/well-lit-paths/tiered-prefix-cache)|g' \
        -e 's|\](../well-lit-paths/capabilities/tiered-prefix-cache\.md)|\](/well-lit-paths/tiered-prefix-cache)|g' \
        -e 's|\](../capabilities/precise-prefix-cache-routing\.md)|\](/well-lit-paths/precise-prefix-cache-routing)|g' \
        -e 's|\](../well-lit-paths/capabilities/precise-prefix-cache-routing\.md)|\](/well-lit-paths/precise-prefix-cache-routing)|g' \
        -e 's|\](../capabilities/pd-disaggregation\.md)|\](/well-lit-paths/pd-disaggregation)|g' \
        -e 's|\](../well-lit-paths/capabilities/pd-disaggregation\.md)|\](/well-lit-paths/pd-disaggregation)|g' \
        -e 's|\](../foundations/optimized-baseline\.md)|\](/well-lit-paths/optimized-baseline)|g' \
        -e 's|\](../foundations/tiered-prefix-cache\.md)|\](/well-lit-paths/tiered-prefix-cache)|g' \
        -e 's|\](../foundations/precise-prefix-cache-routing\.md)|\](/well-lit-paths/precise-prefix-cache-routing)|g' \
        -e 's|\](../foundations/pd-disaggregation\.md)|\](/well-lit-paths/pd-disaggregation)|g' \
        -e 's|\](../../guides/agentic-serving)|\](https://github.com/llm-d/llm-d/tree/main/guides/agentic-serving)|g' \
        -e 's|\](agentic-code-generation\.md)|\](https://github.com/llm-d/llm-d/blob/main/guides/agentic-serving/agentic-code-generation.md)|g' \
        "$DOCS_DIR/guides/agentic-serving/index.md"
fi

# Patch upstream multimodal markdown for Docusaurus MDX compatibility and local links.
if [[ -f "$DOCS_DIR/guides/multimodal-serving.md" ]]; then
    sed_inplace \
        -e 's|^\$\$\\text{Tokens} = \\frac{\\text{Image Width} \\times \\text{Image Height}}{\\text{Factor}}\$\$|`Tokens = (Image Width * Image Height) / Factor`|g' \
        -e 's|\](../../guides/multimodal-serving/optimized-baseline)|\](https://github.com/llm-d/llm-d/tree/main/guides/multimodal-serving/optimized-baseline)|g' \
        -e 's|\](../well-lit-paths/optimized-baseline\.md)|\](/guides/optimized-baseline)|g' \
        -e 's|\](../well-lit-paths/optimized-baseline\.md#architecture)|\](/guides/optimized-baseline#architecture)|g' \
        -e 's|\](../../guides/multimodal-serving/e-disaggregation)|\](/guides/pd-disaggregation)|g' \
        -e 's|\](../advanced/kv-management/kv-indexer\.md)|\](/architecture/advanced/kv-management/kv-indexer)|g' \
        -e 's|\](../well-lit-paths/capabilities/optimized-baseline\.md#\([^)]*\))|\](/guides/optimized-baseline#\1)|g' \
        -e 's|\](../well-lit-paths/capabilities/optimized-baseline\.md)|\](/guides/optimized-baseline)|g' \
        -e 's|\](../capabilities/optimized-baseline\.md#\([^)]*\))|\](/well-lit-paths/optimized-baseline#\1)|g' \
        -e 's|\](../capabilities/optimized-baseline\.md)|\](/well-lit-paths/optimized-baseline)|g' \
        -e 's|\](../foundations/optimized-baseline\.md#\([^)]*\))|\](/well-lit-paths/optimized-baseline#\1)|g' \
        -e 's|\](../foundations/optimized-baseline\.md)|\](/well-lit-paths/optimized-baseline)|g' \
        -e 's|\](../architecture/core/router/epp/README\.md)|\](/architecture/core/router/epp)|g' \
        "$DOCS_DIR/guides/multimodal-serving.md"
fi

# ============================================================================
# === How-To Guides (deployment recipes from repo-root guides/) ==============
# ============================================================================
# Bring the well-lit-path *deployment guides* — the top-level READMEs under the
# llm-d/llm-d repo-root guides/ dir — into the docs site as first-class pages at
# /how-to/*. Only the top-level README of each guide is published; deeper
# manifests and sub-guides stay linked to GitHub. The Well-Lit Paths overview
# pages' "Deploy" links (and other in-doc references to these guides) are
# repointed from GitHub to these new in-site pages at the end of this section.
echo "    Copying How-To Guides..."
mkdir -p "$DOCS_DIR/how-to"

# Top-level guides that get an in-site page. Keep in sync with preview/sidebars.ts
# (the "How-to Guides" section) and the editUrl resolver in docusaurus.config.ts.
HOWTO_GUIDES="optimized-baseline predicted-latency-routing precise-prefix-cache-routing tiered-prefix-cache pd-disaggregation wide-ep-lws flow-control workload-autoscaling agentic-serving multimodal-serving asynchronous-processing batch-gateway"
# Same list as an ERE alternation for sed -E patterns.
HOWTO_ALT="optimized-baseline|predicted-latency-routing|precise-prefix-cache-routing|tiered-prefix-cache|pd-disaggregation|wide-ep-lws|flow-control|workload-autoscaling|agentic-serving|multimodal-serving|asynchronous-processing|batch-gateway"

cp_doc "$SRC/guides/README.md" "$DOCS_DIR/how-to/index.md"
for _g in $HOWTO_GUIDES; do
    cp_doc "$SRC/guides/$_g/README.md" "$DOCS_DIR/how-to/$_g.md"
done

# Multimodal sub-guides published as nested pages under the Multimodal Serving
# guide (/guides/multimodal-serving/{aggregation,e-disaggregation}).
mkdir -p "$DOCS_DIR/how-to/multimodal-serving"
cp_doc "$SRC/guides/multimodal-serving/aggregation/README.md"      "$DOCS_DIR/how-to/multimodal-serving/aggregation.md"
cp_doc "$SRC/guides/multimodal-serving/e-disaggregation/README.md" "$DOCS_DIR/how-to/multimodal-serving/e-disaggregation.md"

# --- Rewrite links inside each imported guide page --------------------------
for _g in $HOWTO_GUIDES; do
    _file="$DOCS_DIR/how-to/$_g.md"
    [[ -f "$_file" ]] || continue

    # (a) Links into docs/ content -> in-site absolute URLs. Order matters:
    #     anchored/longer patterns first.
    sed_inplace \
        -e 's|](../../docs/architecture/core/router/proxy.md)|](/architecture/core/router/proxy)|g' \
        -e 's|](../../docs/architecture/core/epp/flow-control.md)|](/architecture/core/router/epp/flow-control)|g' \
        -e 's|](../../docs/architecture/core/router/epp/flow-control.md)|](/architecture/core/router/epp/flow-control)|g' \
        -e 's|](../../docs/architecture/advanced/latency-predictor.md#observability)|](/architecture/advanced/latency-predictor#observability)|g' \
        -e 's|](../../docs/architecture/advanced/latency-predictor.md)|](/architecture/advanced/latency-predictor)|g' \
        -e 's|](../../docs/architecture/advanced/disaggregation/operations-sglang.md)|](/architecture/advanced/disaggregation/operations-sglang)|g' \
        -e 's|](../../docs/api-reference/epp-http-headers.md)|](/api-reference/epp-http-headers)|g' \
        -e 's|](../../docs/operations/observability/setup.md)|](/resources/observability/setup)|g' \
        -e 's|](../../docs/infrastructure/gateway/README.md)|](/resources/gateway)|g' \
        -e 's|](../../docs/infrastructure/gateway)|](/resources/gateway)|g' \
        -e 's|](../../docs/infra-providers/gke/README.md#gpu-dynamic-resource-allocation-dra-and-dranet-roce-on-gke)|](/resources/infra-providers/gke)|g' \
        -e 's|](../../docs/well-lit-paths/capabilities/tiered-prefix-cache.md)|](/well-lit-paths/tiered-prefix-cache)|g' \
        -e 's|](../../docs/well-lit-paths/workloads/agentic-serving.md#direction)|](/well-lit-paths/agentic-serving#direction)|g' \
        -e 's|](../../docs/well-lit-paths/workloads/agentic-serving.md)|](/well-lit-paths/agentic-serving)|g' \
        "$_file"

    # (b) Links into repo-root helpers/ -> GitHub (not published to this site).
    sed_inplace \
        -e 's|](../../helpers/benchmark.md#available-workload-profiles)|](https://github.com/llm-d/llm-d/blob/main/helpers/benchmark.md#available-workload-profiles)|g' \
        -e 's|](../../helpers/benchmark.md)|](https://github.com/llm-d/llm-d/blob/main/helpers/benchmark.md)|g' \
        -e 's|](../../helpers/client-setup/README.md)|](https://github.com/llm-d/llm-d/tree/main/helpers/client-setup)|g' \
        -e 's|](../../helpers/hf-token.md)|](https://github.com/llm-d/llm-d/blob/main/helpers/hf-token.md)|g' \
        -e 's|](../../helpers/mooncake-client/)|](https://github.com/llm-d/llm-d/tree/main/helpers/mooncake-client)|g' \
        -e 's|](../../helpers/mooncake-master-store/)|](https://github.com/llm-d/llm-d/tree/main/helpers/mooncake-master-store)|g' \
        "$_file"

    # (c) Links to sibling top-level guides -> their new in-site /how-to pages.
    sed_inplace -E \
        -e "s@\]\((\.\./)+($HOWTO_ALT)(/README\.md|/)?(#[^)]*)?\)@](/how-to/\2\4)@g" \
        "$_file"

    # Known upstream dead-links: source READMEs reference files that don't exist
    # in guides/. Repoint to a valid in-site page / existing GitHub file so the
    # imported page passes the link checker.
    sed_inplace \
        -e 's|](../agentic-serving/agentic-code-generation.md#benchmarking)|](/how-to/agentic-serving)|g' \
        -e 's|](../agentic-serving/agentic-code-generation.md)|](/how-to/agentic-serving)|g' \
        -e 's|](benchmark-results-gpt-oss-120b.md)|](https://github.com/llm-d/llm-d/blob/main/guides/tiered-prefix-cache/benchmark-results/vllm-gpt-oss-120b-h100.md)|g' \
        "$_file"

    # Multimodal Serving guide -> its nested aggregation / e-disaggregation pages
    # (published in-site; see the multimodal sub-guide block below).
    sed_inplace \
        -e 's|](./aggregation/README.md)|](/how-to/multimodal-serving/aggregation)|g' \
        -e 's|](./e-disaggregation/README.md)|](/how-to/multimodal-serving/e-disaggregation)|g' \
        "$_file"

    # (images) benchmark-result and inline images -> /img/docs/guides/<g>/...
    # (sync copies these assets to static/img/docs/guides/<g>/ further below).
    sed_inplace -E \
        -e "s@src=\"\.?/?benchmark-results/([^\"]*)\"@src=\"/img/docs/guides/$_g/benchmark-results/\1\"@g" \
        -e "s@!\[([^]]*)\]\(\.?/?benchmark-results/([^)]*)\)@![\1](/img/docs/guides/$_g/benchmark-results/\2)@g" \
        -e "s@!\[([^]]*)\]\(\.?/?images/([^)]*)\)@![\1](/img/docs/guides/$_g/\2)@g" \
        "$_file"

    # (d) Everything else still relative -> GitHub (deeper sub-pages, manifests,
    #     YAML, scripts not published to this site). ../ resolves to guides/,
    #     ./ and bare filenames resolve to guides/<g>/.
    sed_inplace -E \
        -e "s@\]\(\.\./([^)]+\.(md|ya?ml|sh|py|json|txt))(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/main/guides/\1\3)@g" \
        -e "s@\]\(\.\./([^)#]+)\)@](https://github.com/llm-d/llm-d/tree/main/guides/\1)@g" \
        -e "s@\]\(\./([^)]+\.(md|ya?ml|sh|py|json|txt))(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/main/guides/$_g/\1\3)@g" \
        -e "s@\]\(\./([^)#]+)\)@](https://github.com/llm-d/llm-d/tree/main/guides/$_g/\1)@g" \
        -e "s@\]\(([A-Za-z0-9][^):#]*\.(md|ya?ml|sh|py|json|txt))(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/main/guides/$_g/\1\3)@g" \
        "$_file"
done

# --- Rewrite links inside the Multimodal sub-guide pages (one level deeper, so
#     ../../../ reaches the repo root and ../../ reaches guides/). ------------
for _sub in aggregation e-disaggregation; do
    _file="$DOCS_DIR/how-to/multimodal-serving/$_sub.md"
    [[ -f "$_file" ]] || continue

    # docs/ -> in-site (anchored first); helpers/ -> GitHub; sibling top-level
    # guide -> /how-to (renamed to /guides at the end of the sync).
    sed_inplace \
        -e 's|](../../../docs/infrastructure/gateway/gke.md#cleanup)|](/resources/gateway/gke#cleanup)|g' \
        -e 's|](../../../docs/infrastructure/gateway)|](/resources/gateway)|g' \
        -e 's|](../../../docs/operations/observability)|](/resources/observability)|g' \
        -e 's|](../../../helpers/client-setup/README.md)|](https://github.com/llm-d/llm-d/tree/main/helpers/client-setup)|g' \
        -e 's|](../../../helpers/hf-token.md)|](https://github.com/llm-d/llm-d/blob/main/helpers/hf-token.md)|g' \
        -e 's|](../../pd-disaggregation/README.md#pd-best-practices)|](/how-to/pd-disaggregation#pd-best-practices)|g' \
        -e 's|](../../pd-disaggregation/README.md)|](/how-to/pd-disaggregation)|g' \
        "$_file"

    # images (e.g. aggregation benchmark-results) -> /img/docs/guides/multimodal-serving/<sub>/...
    sed_inplace -E \
        -e "s@src=\"\.?/?benchmark-results/([^\"]*)\"@src=\"/img/docs/guides/multimodal-serving/$_sub/benchmark-results/\1\"@g" \
        -e "s@!\[([^]]*)\]\(\.?/?benchmark-results/([^)]*)\)@![\1](/img/docs/guides/multimodal-serving/$_sub/benchmark-results/\2)@g" \
        "$_file"

    # Defensive catch-all: any remaining relative link -> GitHub, resolved against
    # this sub-guide's dir (deepest-prefix first).
    sed_inplace -E \
        -e "s@\]\(\.\./\.\./\.\./([^)]+\.(md|ya?ml|sh|py|json|txt))(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/main/\1\3)@g" \
        -e "s@\]\(\.\./\.\./\.\./([^)#]+)\)@](https://github.com/llm-d/llm-d/tree/main/\1)@g" \
        -e "s@\]\(\.\./\.\./([^)]+\.(md|ya?ml|sh|py|json|txt))(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/main/guides/\1\3)@g" \
        -e "s@\]\(\.\./\.\./([^)#]+)\)@](https://github.com/llm-d/llm-d/tree/main/guides/\1)@g" \
        -e "s@\]\(\.\./([^)]+\.(md|ya?ml|sh|py|json|txt))(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/main/guides/multimodal-serving/\1\3)@g" \
        -e "s@\]\(\.\./([^)#]+)\)@](https://github.com/llm-d/llm-d/tree/main/guides/multimodal-serving/\1)@g" \
        -e "s@\]\(\./([^)]+\.(md|ya?ml|sh|py|json|txt))(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/main/guides/multimodal-serving/$_sub/\1\3)@g" \
        -e "s@\]\(\./([^)#]+)\)@](https://github.com/llm-d/llm-d/tree/main/guides/multimodal-serving/$_sub/\1)@g" \
        "$_file"
done

# --- Index page (guides/README.md): its links are relative to guides/ root ---
if [[ -f "$DOCS_DIR/how-to/index.md" ]]; then
    sed_inplace -E \
        -e "s@\]\(\./($HOWTO_ALT)/README\.md(#[^)]*)?\)@](/how-to/\1\2)@g" \
        "$DOCS_DIR/how-to/index.md"
    sed_inplace \
        -e 's|](./rollouts/README.md)|](/resources/operations/rollouts)|g' \
        -e 's|](./multimodal-serving/e-disaggregation/README.md)|](/how-to/multimodal-serving/e-disaggregation)|g' \
        -e 's|](../docs/well-lit-paths/workloads/README.md)|](/well-lit-paths/workloads)|g' \
        "$DOCS_DIR/how-to/index.md"
    # Remaining relative links in the index -> GitHub (env.sh, recipes/, helpers/).
    sed_inplace -E \
        -e "s@\]\(\./([^)]+\.(md|ya?ml|sh|py|json|txt))(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/main/guides/\1\3)@g" \
        -e "s@\]\(\./([^)#]+)\)@](https://github.com/llm-d/llm-d/tree/main/guides/\1)@g" \
        -e "s@\]\(\.\./([^)]+\.(md|ya?ml|sh|py|json|txt))(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/main/\1\3)@g" \
        -e "s@\]\(\.\./([^)#]+)\)@](https://github.com/llm-d/llm-d/tree/main/\1)@g" \
        "$DOCS_DIR/how-to/index.md"
fi

# --- Repoint Well-Lit Paths "Deploy" links (and any other in-doc references)
#     for the published top-level guides to their new in-site How-To pages.
#     This runs before the generic "repoint repo-root guides/ deep-links to
#     GitHub" pass below, so only deeper/unpublished guides/ links fall through
#     to GitHub. multimodal aggregation/e-disaggregation deep-links resolve to
#     their dedicated in-site sub-pages.
echo "    Repointing Well-Lit Paths Deploy links to in-site How-To pages..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace -E \
        -e "s@\]\((\.\./)+guides/multimodal-serving/(aggregation|e-disaggregation)(/README\.md)?(#[^)]*)?\)@](/how-to/multimodal-serving/\2\4)@g" \
        -e "s@\]\((\.\./)+guides/($HOWTO_ALT)(/README\.md|/)?(#[^)]*)?\)@](/how-to/\2\4)@g" \
        "$file"
done

# === Resources / Observability ===
# Fall back through earlier paths for release branches cut before each change.
if [[ -f "$WIP/operations/observability/setup.md" ]]; then
    cp_doc "$WIP/operations/observability/README.md"          "$DOCS_DIR/resources/observability/index.md"
    cp_doc "$WIP/operations/observability/setup.md"           "$DOCS_DIR/resources/observability/setup.md"
    cp_doc "$WIP/operations/observability/metrics.md"         "$DOCS_DIR/resources/observability/metrics.md"
    cp_doc "$WIP/operations/observability/tracing.md"         "$DOCS_DIR/resources/observability/tracing.md"
    cp_doc "$WIP/operations/observability/promql.md"          "$DOCS_DIR/resources/observability/promql.md"
elif [[ -f "$WIP/resources/observability/setup.md" ]]; then
    cp_doc "$WIP/resources/observability/README.md"           "$DOCS_DIR/resources/observability/index.md"
    cp_doc "$WIP/resources/observability/setup.md"            "$DOCS_DIR/resources/observability/setup.md"
    cp_doc "$WIP/resources/observability/metrics.md"          "$DOCS_DIR/resources/observability/metrics.md"
    cp_doc "$WIP/resources/observability/tracing.md"          "$DOCS_DIR/resources/observability/tracing.md"
    cp_doc "$WIP/resources/observability/promql.md"           "$DOCS_DIR/resources/observability/promql.md"
else
    cp_doc "$WIP/resources/monitoring/metrics.md"             "$DOCS_DIR/resources/observability/metrics.md"
    cp_doc "$WIP/resources/monitoring/tracing.md"             "$DOCS_DIR/resources/observability/tracing.md"
    cp_doc "$WIP/guides/monitoring/metrics.md"                "$DOCS_DIR/resources/observability/metrics.md"
    cp_doc "$WIP/guides/monitoring/tracing.md"                "$DOCS_DIR/resources/observability/tracing.md"
fi
# Upstream moved observability docs from docs/resources/observability/ to
# docs/operations/observability/. Pulls from the current location; the
# block above stays as a no-op fallback if the legacy paths re-appear.
cp_doc "$WIP/operations/observability/README.md"  "$DOCS_DIR/resources/observability/index.md"
cp_doc "$WIP/operations/observability/setup.md"   "$DOCS_DIR/resources/observability/setup.md"
cp_doc "$WIP/operations/observability/metrics.md" "$DOCS_DIR/resources/observability/metrics.md"
cp_doc "$WIP/operations/observability/tracing.md" "$DOCS_DIR/resources/observability/tracing.md"
cp_doc "$WIP/operations/observability/promql.md"  "$DOCS_DIR/resources/observability/promql.md"

# === Resources / Gateway ===
cp_doc "$WIP/infrastructure/gateway/README.md"         "$DOCS_DIR/resources/gateway/index.md"
cp_doc "$WIP/infrastructure/gateway/envoy-ai-gateway.md" "$DOCS_DIR/resources/gateway/envoy-ai-gateway.md"
cp_doc "$WIP/infrastructure/gateway/install-crds.md"   "$DOCS_DIR/resources/gateway/install-crds.md"
cp_doc "$WIP/infrastructure/gateway/istio.md"          "$DOCS_DIR/resources/gateway/istio.md"
cp_doc "$WIP/infrastructure/gateway/gke.md"            "$DOCS_DIR/resources/gateway/gke.md"
cp_doc "$WIP/infrastructure/gateway/agentgateway.md"   "$DOCS_DIR/resources/gateway/agentgateway.md"

cp_doc "$WIP/infrastructure/rdma/README.md"                  "$DOCS_DIR/resources/rdma/rdma-configuration.md"

# === Operations (new pages) ===
cp_doc "$WIP/operations/router.md"                          "$DOCS_DIR/resources/operations/router.md"
cp_doc "$WIP/operations/readiness-probes.md"                "$DOCS_DIR/resources/operations/readiness-probes.md"
cp_doc "$WIP/operations/rollouts/README.md"                 "$DOCS_DIR/resources/operations/rollouts/index.md"
cp_doc "$WIP/operations/rollouts/adapter-rollout.md"        "$DOCS_DIR/resources/operations/rollouts/adapter-rollout.md"
cp_doc "$WIP/operations/rollouts/blue-green-update.md"      "$DOCS_DIR/resources/operations/rollouts/blue-green-update.md"

# Fix cross-references in operations/rollouts pages. These files are synced from
# docs/operations/rollouts/ but placed at resources/operations/rollouts/, so all
# ../../ relative links now point one directory too deep (into resources/ instead
# of the docs root). Convert to absolute site URLs.
for _opfile in \
    "$DOCS_DIR/resources/operations/rollouts/adapter-rollout.md" \
    "$DOCS_DIR/resources/operations/rollouts/blue-green-update.md" \
    "$DOCS_DIR/resources/operations/rollouts/index.md" \
    "$DOCS_DIR/resources/operations/readiness-probes.md" \
    "$DOCS_DIR/resources/operations/router.md"; do
    [[ -f "$_opfile" ]] || continue
    sed_inplace \
        -e 's|\](../../api-reference/\([^)]*\)\.md)|\](/api-reference/\1)|g' \
        -e 's|\](../../getting-started/README\.md)|\](/getting-started)|g' \
        -e 's|\](../../getting-started/README\.mdx)|\](/getting-started)|g' \
        -e 's|\](../../getting-started/quickstart\.md)|\](/getting-started/quickstart)|g' \
        -e 's|\](../../infrastructure/gateway)|\](/resources/gateway)|g' \
        -e 's|\](../../well-lit-paths/capabilities/optimized-baseline\.md[^)#]*)|\](/well-lit-paths/optimized-baseline)|g' \
        -e 's|\](../../well-lit-paths/capabilities/optimized-baseline\.md#\([^)]*\))|\](/well-lit-paths/optimized-baseline#\1)|g' \
        -e 's|\](../../well-lit-paths/foundations/optimized-baseline\.md[^)#]*)|\](/well-lit-paths/optimized-baseline)|g' \
        -e 's|\](../../well-lit-paths/foundations/optimized-baseline\.md#\([^)]*\))|\](/well-lit-paths/optimized-baseline#\1)|g' \
        -e 's|\](observability/README\.md)|\](/resources/observability)|g' \
        -e 's|\](../../README\.md)|](https://github.com/llm-d/llm-d/blob/main/README.md)|g' \
        -e 's|\](adapter-rollout-example/kustomization\.yaml)|](https://github.com/llm-d/llm-d/blob/main/docs/operations/rollouts/adapter-rollout-example/kustomization.yaml)|g' \
        -e 's|\](adapter-rollout-example/patch-lora-config\.yaml)|](https://github.com/llm-d/llm-d/blob/main/docs/operations/rollouts/adapter-rollout-example/patch-lora-config.yaml)|g' \
        "$_opfile"
done

# === Infrastructure (new pages) ===
cp_doc "$WIP/infrastructure/README.md"                      "$DOCS_DIR/resources/infrastructure/index.md"
cp_doc "$WIP/infrastructure/multi-node.md"                  "$DOCS_DIR/resources/infrastructure/multi-node.md"
cp_doc "$WIP/infrastructure/no-kubernetes-deployment.md"    "$DOCS_DIR/resources/infrastructure/no-kubernetes-deployment.md"

# === Infrastructure Providers ===
cp_doc "$WIP/infrastructure/providers/README.md"         "$DOCS_DIR/resources/infra-providers/index.md"
cp_doc "$WIP/infrastructure/providers/aks/README.md"     "$DOCS_DIR/resources/infra-providers/aks.md"
cp_doc "$WIP/infrastructure/providers/digitalocean/README.md" "$DOCS_DIR/resources/infra-providers/digitalocean.md"
cp_doc "$WIP/infrastructure/providers/gke/README.md"     "$DOCS_DIR/resources/infra-providers/gke.md"
cp_doc "$WIP/infrastructure/providers/minikube/README.md" "$DOCS_DIR/resources/infra-providers/minikube.md"
cp_doc "$WIP/infrastructure/providers/openshift/README.md" "$DOCS_DIR/resources/infra-providers/openshift.md"
cp_doc "$WIP/infrastructure/providers/openshift-aws/README.md" "$DOCS_DIR/resources/infra-providers/openshift-aws.md"

# Fix Infrastructure index cross-references. Upstream docs/infrastructure/README.md
# links to sibling dirs (providers/, rdma/, gateway/) with upstream-relative paths
# that don't exist in the flattened site layout, so they 404. Repoint them to the
# synced locations (relative .md links, resolved to proper URLs by Docusaurus).
if [[ -f "$DOCS_DIR/resources/infrastructure/index.md" ]]; then
    sed_inplace \
        -e 's|](providers/README\.md)|](../infra-providers/index.md)|g' \
        -e 's|](providers/\([^/)]*\)/README\.md)|](../infra-providers/\1.md)|g' \
        -e 's|](rdma/README\.md)|](../rdma/rdma-configuration.md)|g' \
        -e 's|](gateway/README\.md)|](../gateway/index.md)|g' \
        "$DOCS_DIR/resources/infrastructure/index.md"
fi

# === API Reference ===
cp_doc "$WIP/api-reference/README.md"         "$DOCS_DIR/api-reference/index.md"
cp_doc "$WIP/api-reference/glossary.md"       "$DOCS_DIR/api-reference/glossary.md"
cp_doc "$WIP/api-reference/inferencepool.md"         "$DOCS_DIR/api-reference/inferencepool.md"
cp_doc "$WIP/api-reference/inferenceobjective.md"    "$DOCS_DIR/api-reference/inferenceobjective.md"
cp_doc "$WIP/api-reference/inferencemodelrewrite.md" "$DOCS_DIR/api-reference/inferencemodelrewrite.md"
cp_doc "$WIP/api-reference/endpointpickerconfig.md"  "$DOCS_DIR/api-reference/endpointpickerconfig.md"
cp_doc "$WIP/api-reference/epp-http-headers.md"      "$DOCS_DIR/api-reference/epp-http-headers.md"
cp_doc "$WIP/api-reference/epp-http-apis.md"         "$DOCS_DIR/api-reference/epp-http-apis.md"
cp_doc "$WIP/api-reference/epp-grpc-apis.md"         "$DOCS_DIR/api-reference/epp-grpc-apis.md"
cp_doc "$WIP/api-reference/artifacts.md"             "$DOCS_DIR/api-reference/artifacts.md"

# === Accelerators ===
cp_doc "$WIP/getting-started/accelerators.md"        "$DOCS_DIR/accelerators/index.md"
if [[ ! -f "$DOCS_DIR/accelerators/index.md" ]]; then
    cp_doc "$WIP/accelerators/README.md"             "$DOCS_DIR/accelerators/index.md"
fi
for _accfile in "$DOCS_DIR/accelerators/index.md" "$DOCS_DIR/getting-started/accelerators.md"; do
    [[ -f "$_accfile" ]] || continue
    sed_inplace \
        -e 's|\.\./infra-providers/gke/README\.md|/resources/infra-providers/gke|g' \
        -e 's|\.\./infrastructure/providers/gke/README\.md|/resources/infra-providers/gke|g' \
        -e 's|\.\./infrastructure/providers/gke/README\.md#[^)]*|/resources/infra-providers/gke|g' \
        "$_accfile"
done

# === Assets ===
echo "    Copying image assets..."
mkdir -p "$STATIC_DIR"
cp "$ASSETS"/*.svg "$STATIC_DIR/" 2>/dev/null || true
cp "$ASSETS"/images/*.svg "$STATIC_DIR/" 2>/dev/null || true
cp "$ASSETS"/images/*.png "$STATIC_DIR/" 2>/dev/null || true
cp_doc "$WIP/infrastructure/rdma/networking-stack.svg" "$STATIC_DIR/" 2>/dev/null || true
cp_doc "$WIP/architecture/core/images/flow_control_dashboard.png" "$STATIC_DIR/" 2>/dev/null || true
cp_doc "$WIP/architecture/advanced/autoscaling/hpa-architecture.svg" "$STATIC_DIR/" 2>/dev/null || true
cp_doc "$WIP/assets/no-kubernetes-deployment.svg" "$STATIC_DIR/" 2>/dev/null || true

# Infrastructure Providers images
echo "    Copying infrastructure provider images..."
find "$WIP/infrastructure/providers" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.svg" \) -exec cp {} "$STATIC_DIR/" \; 2>/dev/null || true

echo "    Copying guide images..."
mkdir -p "$STATIC_DIR/guides"
find "$SRC/guides" -type d -name "images" 2>/dev/null | grep -v "/prereq/" | grep -v "/experimental/" | while read -r img_dir; do
    rel_path="${img_dir#$SRC/guides/}"
    dest_dir="$STATIC_DIR/guides/${rel_path%/images}"
    mkdir -p "$dest_dir"
    find "$img_dir" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.svg" -o -name "*.gif" \) -exec cp {} "$dest_dir/" \; 2>/dev/null || true
done

echo "    Copying guide benchmark-results..."
find "$SRC/guides" -type d -name "benchmark-results" 2>/dev/null | grep -v "/prereq/" | grep -v "/experimental/" | while read -r bench_dir; do
    rel_path="${bench_dir#$SRC/guides/}"
    dest_dir="$STATIC_DIR/guides/${rel_path}"
    mkdir -p "$dest_dir"
    find "$bench_dir" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.svg" -o -name "*.gif" \) -exec cp {} "$dest_dir/" \; 2>/dev/null || true
done

# === Fix specific image paths for Docusaurus ===
echo "    Fixing specific image references..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\(\.\.\/\)\{1,\}images/flow_control_dashboard\.png|/img/docs/flow_control_dashboard.png|g' \
        -e 's|networking-stack.svg|/img/docs/networking-stack.svg|g' \
        -e 's|hpa-architecture.svg|/img/docs/hpa-architecture.svg|g' \
        "$file"
done

# === Fix infra-providers image paths and links ===
echo "    Fixing infra-providers image paths and cross-references..."
find "$DOCS_DIR/resources/infra-providers" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\./images/\([^)]*\)|/img/docs/\1|g' \
        -e 's|](images/\([^)]*\))|](/img/docs/\1)|g' \
        -e 's|\.\./\.\./\.\./guides/optimized-baseline/README\.md|/guides/optimized-baseline|g' \
        -e 's|\.\./\.\./\.\./guides/precise-prefix-cache-aware/README\.md|/guides/precise-prefix-cache-routing|g' \
        -e 's|\.\./\.\./\.\./guides/precise-prefix-cache-routing/README\.md|/guides/precise-prefix-cache-routing|g' \
        -e 's|\.\./\.\./\.\./guides/pd-disaggregation/README\.md|/guides/pd-disaggregation|g' \
        -e 's|\.\./\.\./\.\./guides/wide-ep-lws/README\.md|https://github.com/llm-d/llm-d/tree/main/guides/wide-ep-lws|g' \
        -e 's|\.\./\.\./\.\./guides/tiered-prefix-cache/README\.md|https://github.com/llm-d/llm-d/tree/main/guides/tiered-prefix-cache|g' \
        -e 's|\.\./\.\./\.\./guides/index\.md|/guides|g' \
        -e 's|\.\./\.\./\.\./guides/)|/guides)|g' \
        -e 's|\.\./\.\./\.\./guides)|/guides)|g' \
        -e 's|\.\./\.\./\.\./helpers/client-setup/README\.md|https://github.com/llm-d/llm-d/tree/main/helpers/client-setup|g' \
        "$file"
done

# === Fix internal cross-references ===
# Upstream files reference filenames that get renamed during copy.
# how-to/ pages are excluded: their links are already finalized (in-site or
# GitHub) by the How-To Guides section above, and some unanchored rules here
# (e.g. epp.md -> epp/index.md) would corrupt those final URLs.
echo "    Fixing internal cross-references..."
find "$DOCS_DIR" -name "*.md" -not -path "*/how-to/*" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\./hpa-epp\.md|./igw-hpa.md|g' \
        -e 's|\./hpa-epp/index\.md|./igw-hpa.md|g' \
        -e 's|\./hpa-keda\.md|./igw-hpa.md|g' \
        -e 's|\./hpa-wva\.md|./workload-variant-autoscaling.md|g' \
        -e 's|\./wva\.md|./workload-variant-autoscaling.md|g' \
        -e 's|epp\.md|epp/index.md|g' \
        -e 's|core/epp/README\.md|core/epp/index.md|g' \
        -e 's|advanced/autoscaling/README\.md|advanced/autoscaling/index.md|g' \
        -e 's|advanced/disaggregation/README\.md|advanced/disaggregation/index.md|g' \
        -e 's|\](README\.md)|\](index.md)|g' \
        -e 's|resources/gateway/README\.md|resources/gateway/index.md|g' \
        -e 's|resources/gateways/README\.md|../resources/gateway/index.md|g' \
        -e 's|\](.*guides/prereq/gateways/README\.md)|\](/resources/gateway)|g' \
        -e 's|\](.*guides/prereq/gateways/istio\.md)|\](/resources/gateway/istio)|g' \
        -e 's|\](.*guides/prereq/gateways/gke\.md)|\](/resources/gateway/gke)|g' \
        -e 's|\](.*guides/prereq/gateways/agentgateway\.md)|\](/resources/gateway/agentgateway)|g' \
        -e 's|\](../../../infrastructure/gateway/README\.md)|\](/resources/gateway)|g' \
        -e 's|\](../../../infrastructure/gateway/envoy-ai-gateway\.md)|\](/resources/gateway/envoy-ai-gateway)|g' \
        -e 's|\](../../../infrastructure/gateway/istio\.md)|\](/resources/gateway/istio)|g' \
        -e 's|\](../../../infrastructure/gateway/gke\.md)|\](/resources/gateway/gke)|g' \
        -e 's|\](../../../infrastructure/gateway/agentgateway\.md)|\](/resources/gateway/agentgateway)|g' \
        -e 's|guides/README\.md|guides/index.md|g' \
        -e 's|architecture/introduction\.md|architecture/index.md|g' \
        -e 's|architecture/README\.md|architecture/index.md|g' \
        -e 's|\](\.\.\/getting-started/README\.md)|\](/getting-started)|g' \
        -e 's|\](\.\.\/\.\.\/getting-started/README\.md)|\](/getting-started)|g' \
        -e 's|\](\.\.\/\.\.\/\.\.\/getting-started/README\.md)|\](/getting-started)|g' \
        -e 's|getting-started/README\.md|getting-started/index.md|g' \
        -e 's|api-reference/README\.md|api-reference/index.md|g' \
        -e 's|resources/rdma/README\.md|resources/rdma/rdma-configuration.md|g' \
        -e 's|advanced/batch/README\.md|advanced/batch/index.md|g' \
        -e 's|\](/docs/guides/README)|\](/docs/guides)|g' \
        -e 's|\](/docs/experimental/batch-gateway)|\](/guides/batch-gateway)|g' \
        -e 's|\](/docs/architecture/core/epp)|\](/docs/architecture/core/router/epp)|g' \
        -e 's|\](/docs/well-lit-paths/\([^)]*\)\.md)|\](/docs/guides/\1)|g' \
        -e 's|\](well-lit-paths/\([^)]*\))|\](/guides/\1)|g' \
        -e 's|\](.*\/docs/infra-providers)|\](/resources/infra-providers)|g' \
        -e 's|\](.*\/infra-providers)|\](/resources/infra-providers)|g' \
        -e 's|\](/docs/infra-providers)|\](/docs/resources/infra-providers)|g' \
        -e 's|\](infra-providers/\([^)]*\))|\](/resources/infra-providers/\1)|g' \
        -e 's|\](/docs/\([^)]*\)/README\.md)|\](/docs/\1)|g' \
        -e 's|\](../../../getting-started/quickstart\.md)|\](/getting-started/quickstart)|g' \
        -e 's|\](../../getting-started/quickstart\.md)|\](/getting-started/quickstart)|g' \
        -e 's|\](../../architecture/advanced/batch/batch-gateway\.md)|\](/architecture/advanced/batch/batch-gateway)|g' \
        -e 's|llm-d-router/tree/main/pkg/epp/framework/plugins/scheduling/profile)|llm-d-router/tree/main/pkg/epp/framework/plugins/scheduling/profilehandler)|g' \
        -e 's|\](../../guides/optimized-baseline)|\](https://github.com/llm-d/llm-d/tree/main/guides/optimized-baseline)|g' \
        -e 's|\](../../guides/multimodal/optimized-baseline/README\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/multimodal-serving/optimized-baseline)|g' \
        -e 's|\](../../guides/precise-prefix-cache-routing)|\](https://github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-routing)|g' \
        -e 's|\](../../../../../guides/precise-prefix-cache-routing/README\.md)|\](/guides/precise-prefix-cache-routing)|g' \
        -e 's|\](../../guides/tiered-prefix-cache)|\](https://github.com/llm-d/llm-d/tree/main/guides/tiered-prefix-cache)|g' \
        -e 's|\](../../guides/asynchronous-processing)|\](https://github.com/llm-d/llm-d/tree/main/guides/asynchronous-processing)|g' \
        -e 's|\](../../guides/flow-control)|\](https://github.com/llm-d/llm-d/tree/main/guides/flow-control)|g' \
        -e 's|\](../../guides/pd-disaggregation)|\](https://github.com/llm-d/llm-d/tree/main/guides/pd-disaggregation)|g' \
        -e 's|\](../../guides/predicted-latency-routing)|\](https://github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing)|g' \
        -e 's|\](../../guides/wide-ep-lws)|\](https://github.com/llm-d/llm-d/tree/main/guides/wide-ep-lws)|g' \
        -e 's|\](../../guides/workload-autoscaling)|\](https://github.com/llm-d/llm-d/tree/main/guides/workload-autoscaling)|g' \
        -e 's|\](../../guides/no-kubernetes-deployment)|\](https://github.com/llm-d/llm-d/tree/main/guides/no-kubernetes-deployment)|g' \
        -e 's|\](../../../guides/batch-gateway)|\](https://github.com/llm-d/llm-d/tree/main/guides/batch-gateway)|g' \
        -e 's|\](../../../guides/asynchronous-processing)|\](https://github.com/llm-d/llm-d/tree/main/guides/asynchronous-processing)|g' \
        -e 's|\](../../../../guides/tiered-prefix-cache)|\](/guides/tiered-prefix-cache)|g' \
        -e 's|\](/guides/tiered-prefix-cache)|\](/guides/tiered-prefix-cache)|g' \
        -e 's|\](../../../../guides/batch-gateway)|\](/guides/batch-gateway)|g' \
        -e 's|\](/guides/batch-gateway)|\](/guides/batch-gateway)|g' \
        -e 's|\](../../../guides/batch-gateway)|\](/guides/batch-gateway)|g' \
        -e 's|\](../../../guides/asynchronous-processing)|\](/guides/asynchronous-processing)|g' \
        -e 's|\](../../guides/pd-disaggregation/README\.md)|\](/guides/pd-disaggregation)|g' \
        "$file"
done

# === Fix guide internal cross-references ===
# Guides contain relative links to README.md files that need to be converted to index.md
echo "    Fixing guide internal cross-references..."
find "$DOCS_DIR/guides" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\](README\.md)|\](index.md)|g' \
        -e 's|\](./README\.md)|\](./index.md)|g' \
        -e 's|\](../README\.md)|\](../index.md)|g' \
        -e 's|\](../../README\.md)|\](../../index.md)|g' \
        -e 's|\](../../../README\.md)|\](../index.md)|g' \
        -e 's|\](../../../../README\.md)|\](../../index.md)|g' \
        -e 's|\]\(cpu/README\.md\)|\](cpu/index.md)|g' \
        -e 's|\]\(storage/README\.md\)|\](storage/index.md)|g' \
        -e 's|\]\(gcp-pubsub/README\.md\)|\](gcp-pubsub/index.md)|g' \
        -e 's|\]\(redis/README\.md\)|\](redis/index.md)|g' \
        -e 's|\]\(./gcp-pubsub/README\.md\)|\](./gcp-pubsub/index.md)|g' \
        -e 's|\]\(./redis/README\.md\)|\](./redis/index.md)|g' \
        -e 's|\]\(./gcp-pubsub/README\.md#testing\)|\](./gcp-pubsub/index.md#testing)|g' \
        -e 's|\]\(./redis/README\.md#testing\)|\](./redis/index.md#testing)|g' \
        -e 's|\](../optimized-baseline/README\.md)|\](../optimized-baseline/index.md)|g' \
        -e 's|\](../prereq/gateway-provider/README\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateway-provider)|g' \
        -e 's|\](../../prereq/gateway-provider/README\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateway-provider)|g' \
        -e 's|\](../prereq/gateway-provider/index\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateway-provider)|g' \
        -e 's|\](../../prereq/gateway-provider/index\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateway-provider)|g' \
        -e 's|\](../asynchronous-processing/README\.md)|\](../asynchronous-processing/index.md)|g' \
        -e 's|\](../pd-disaggregation/README\.md)|\](/guides/pd-disaggregation)|g' \
        -e 's|\](/docs/guides/cpu/README\.md)|\](/docs/guides/tiered-prefix-cache/cpu)|g' \
        -e 's|\](/docs/guides/storage/README\.md)|\](/docs/guides/tiered-prefix-cache/storage)|g' \
        -e 's|\](/docs/guides/redis/README\.md)|\](/docs/guides/asynchronous-processing/redis)|g' \
        -e 's|\](/docs/guides/gcp-pubsub/README\.md)|\](/docs/guides/asynchronous-processing/gcp-pubsub)|g' \
        -e 's|\](/docs/guides/README\.md)|\](/docs/guides)|g' \
        -e 's|\](../README\.md#installation)|\](../index.md#installation)|g' \
        -e 's|\](../../recipes/gateway/README\.md)|\](/guides/recipes/gateway)|g' \
        -e 's|\](../gateway)|\](/guides/recipes/gateway)|g' \
        -e 's|\](/docs/guides/gateway)|\](/docs/guides/recipes/gateway)|g' \
        -e 's|\](/docs/guides/tiered-prefix-cache/manifests/backends/lustre/README\.md)|\](/docs/guides/tiered-prefix-cache/storage/manifests/backends/lustre)|g' \
        -e 's|\](/docs/guides/tiered-prefix-cache/manifests/backends/aws/README\.md)|\](/docs/guides/tiered-prefix-cache/storage/manifests/backends/aws)|g' \
        -e 's|\](./manifests/backends/lustre/README\.md)|\](./manifests/backends/lustre/index.md)|g' \
        -e 's|\](./manifests/backends/aws/README\.md)|\](./manifests/backends/aws/index.md)|g' \
        "$file"

    rel_from_guides="${file#$DOCS_DIR/guides/}"
    guide_subdir="$(dirname "$rel_from_guides")"

    if [[ "$guide_subdir" != "." ]]; then
        sed_inplace \
            -e "s|!\[\([^]]*\)\](images/\([^)]*\))|![\1](/img/docs/guides/$guide_subdir/\2)|g" \
            -e "s|!\[\([^]]*\)\](./images/\([^)]*\))|![\1](/img/docs/guides/$guide_subdir/\2)|g" \
            "$file"
    fi

    if [[ "$guide_subdir" != "." ]] && \
       find "$STATIC_DIR/guides/$guide_subdir/benchmark-results" -maxdepth 1 -name '*.png' -print -quit 2>/dev/null | grep -q .; then
        sed_inplace \
            -e "s|src=\"\./benchmark-results/\([^\"]*\)\"|src=\"/img/docs/guides/$guide_subdir/benchmark-results/\1\"|g" \
            -e "s|src=\"benchmark-results/\([^\"]*\)\"|src=\"/img/docs/guides/$guide_subdir/benchmark-results/\1\"|g" \
            -e "s|!\[\([^]]*\)\](./benchmark-results/\([^)]*\))|![\1](/img/docs/guides/$guide_subdir/benchmark-results/\2)|g" \
            -e "s|!\[\([^]]*\)\](benchmark-results/\([^)]*\))|![\1](/img/docs/guides/$guide_subdir/benchmark-results/\2)|g" \
            "$file"
    fi
done

# === Fix prereq and helper references ===
echo "    Fixing prereq and helper file references..."
find "$DOCS_DIR/guides" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\](../prereq/gateways)|\](/resources/gateway)|g' \
        -e 's|\](../../prereq/gateways)|\](/resources/gateway)|g' \
        -e 's|\](/docs/prereq/gateways)|\](/resources/gateway)|g' \
        -e 's|\](/docs/guides/prereq/gateway-provider)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateway-provider)|g' \
        -e 's|\](../../prereq/gateway-provider/README\.md#supported-providers)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateway-provider#supported-providers)|g' \
        -e 's|\](../../prereq/gateway-provider/common-configurations)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateway-provider#common-configurations)|g' \
        -e 's|\](/docs/prereq/gateway-provider/index\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateway-provider)|g' \
        -e 's|\](../../helpers/client-setup/README\.md)|\](https://github.com/llm-d/llm-d/tree/main/helpers/client-setup)|g' \
        -e 's|\](../../../helpers/client-setup/README\.md)|\](https://github.com/llm-d/llm-d/tree/main/helpers/client-setup)|g' \
        -e 's|\](/helpers/client-setup/README\.md)|\](https://github.com/llm-d/llm-d/tree/main/helpers/client-setup)|g' \
        -e 's|\](../../helpers/hf-token\.md)|\](https://github.com/llm-d/llm-d/tree/main/helpers/hf-token.md)|g' \
        -e 's|\](../../../helpers/hf-token\.md)|\](https://github.com/llm-d/llm-d/tree/main/helpers/hf-token.md)|g' \
        -e 's|\](/helpers/hf-token\.md)|\](https://github.com/llm-d/llm-d/tree/main/helpers/hf-token.md)|g' \
        -e 's|\](../../helpers/benchmark\.md)|\](https://github.com/llm-d/llm-d/tree/main/helpers/benchmark.md)|g' \
        -e 's|\](../../../helpers/benchmark\.md)|\](https://github.com/llm-d/llm-d/tree/main/helpers/benchmark.md)|g' \
        -e 's|\](/helpers/benchmark\.md)|\](https://github.com/llm-d/llm-d/tree/main/helpers/benchmark.md)|g' \
        -e 's|\](../../docs/resources/observability/setup\.md)|\](/resources/observability/setup)|g' \
        -e 's|\](../../../docs/resources/observability/setup\.md)|\](/resources/observability/setup)|g' \
        -e 's|\](../../docs/resources/observability/README\.md)|\](/resources/observability)|g' \
        -e 's|\](../../../docs/resources/observability/README\.md)|\](/resources/observability)|g' \
        -e 's|\](../../docs/resources/observability/metrics\.md)|\](/resources/observability/metrics)|g' \
        -e 's|\](../../../docs/resources/observability/metrics\.md)|\](/resources/observability/metrics)|g' \
        -e 's|\](../../docs/resources/observability/metrics\.md#\([^)]*\))|\](/resources/observability/metrics#\1)|g' \
        -e 's|\](../../../docs/resources/observability/metrics\.md#\([^)]*\))|\](/resources/observability/metrics#\1)|g' \
        -e 's|\](../../docs/resources/observability/tracing\.md)|\](/resources/observability/tracing)|g' \
        -e 's|\](../../../docs/resources/observability/tracing\.md)|\](/resources/observability/tracing)|g' \
        -e 's|\](../../docs/monitoring/README\.md)|\](/resources/observability/setup)|g' \
        -e 's|\](../../../docs/monitoring/README\.md)|\](/resources/observability/setup)|g' \
        -e 's|\](/docs/monitoring/README\.md)|\](/resources/observability/setup)|g' \
        -e 's|\](../../docs/monitoring/README\.md#\([^)]*\))|\](/resources/observability/metrics#\1)|g' \
        -e 's|\](../../../docs/monitoring/README\.md#\([^)]*\))|\](/resources/observability/metrics#\1)|g' \
        -e 's|\](../../../../../prereq/infrastructure/README\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/multi-node-serving)|g' \
        -e 's|\](/docs/prereq/infrastructure/README\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/multi-node-serving)|g' \
        "$file"
done

# getting-started pages also reference repo-root helpers/ files that aren't
# published to this site (the rewrites above are scoped to guides/ only).
find "$DOCS_DIR/getting-started" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\](../../helpers/hf-token\.md)|\](https://github.com/llm-d/llm-d/tree/main/helpers/hf-token.md)|g' \
        "$file"
done

# === Fix placeholder and missing file references ===
echo "    Fixing placeholder and missing file references..."
find "$DOCS_DIR/guides" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\](placeholder-link)|\](https://github.com/llm-d/llm-d)|g' \
        -e 's|\](/docs/guides/placeholder-link)|\](https://github.com/llm-d/llm-d)|g' \
        -e 's|\](tuning\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/flow-control/tuning.md)|g' \
        -e 's|\](/docs/guides/tuning\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/flow-control/tuning.md)|g' \
        -e 's|\](./objectives\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/flow-control/objectives.yaml)|g' \
        -e 's|\](/docs/guides/objectives\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/flow-control/objectives.yaml)|g' \
        -e 's|\](scheduler/precise-prefix-cache-aware\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-routing/scheduler/precise-prefix-cache-aware.values.yaml)|g' \
        -e 's|\](/docs/guides/scheduler/precise-prefix-cache-aware\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-routing/scheduler/precise-prefix-cache-aware.values.yaml)|g' \
        -e 's|\](router/precise-prefix-cache-routing\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-routing/router/precise-prefix-cache-routing.values.yaml)|g' \
        -e 's|\](/docs/guides/router/precise-prefix-cache-routing\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-routing/router/precise-prefix-cache-routing.values.yaml)|g' \
        -e 's|\](./scheduler/predicted-latency\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing/scheduler/predicted-latency.values.yaml)|g' \
        -e 's|\](/docs/guides/scheduler/predicted-latency\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing/scheduler/predicted-latency.values.yaml)|g' \
        -e 's|\](./router/predicted-latency\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing/router/predicted-latency.values.yaml)|g' \
        -e 's|\](/docs/guides/router/predicted-latency\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing/router/predicted-latency.values.yaml)|g' \
        -e 's|\](./scheduler/predicted-latency-slo\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing/scheduler/predicted-latency-slo.values.yaml)|g' \
        -e 's|\](/docs/guides/scheduler/predicted-latency-slo\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing/scheduler/predicted-latency-slo.values.yaml)|g' \
        -e 's|\](./router/predicted-latency-slo\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing/router/predicted-latency-slo.values.yaml)|g' \
        -e 's|\](/docs/guides/router/predicted-latency-slo\.values\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/predicted-latency-routing/router/predicted-latency-slo.values.yaml)|g' \
        -e 's|\](./storage_class\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/tiered-prefix-cache/storage/manifests/backends/lustre/storage_class.yaml)|g' \
        -e 's|\](/docs/guides/tiered-prefix-cache/storage/manifests/backends/storage_class\.yaml)|\](https://github.com/llm-d/llm-d/tree/main/guides/tiered-prefix-cache/storage/manifests/backends/lustre/storage_class.yaml)|g' \
        -e 's|\](./README\.hpa-epp/index\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/workload-autoscaling)|g' \
        -e 's|\](/docs/guides/README\.hpa-epp/index\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/workload-autoscaling)|g' \
        -e 's|\](./README\.wva\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/workload-autoscaling)|g' \
        -e 's|\](/docs/guides/README\.wva\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/workload-autoscaling)|g' \
        -e 's|\](../optimized-baseline/modelserver)|\](https://github.com/llm-d/llm-d/tree/main/guides/optimized-baseline/modelserver)|g' \
        -e 's|\](../optimized-baseline/modelserver/)|\](https://github.com/llm-d/llm-d/tree/main/guides/optimized-baseline/modelserver)|g' \
        -e 's|\](../optimized-baseline/modelserver/gpu/vllm/base/patch-vllm\.yaml)|\](https://github.com/llm-d/llm-d/blob/main/guides/optimized-baseline/modelserver/gpu/vllm/base/patch-vllm.yaml)|g' \
        -e 's|\](./router/epp/config\.yaml)|\](https://github.com/llm-d/llm-d/blob/main/guides/no-kubernetes-deployment/router/epp/config.yaml)|g' \
        -e 's|\](./router/epp/endpoints\.yaml)|\](https://github.com/llm-d/llm-d/blob/main/guides/no-kubernetes-deployment/router/epp/endpoints.yaml)|g' \
        -e 's|\](./router/envoy/envoy\.yaml)|\](https://github.com/llm-d/llm-d/blob/main/guides/no-kubernetes-deployment/router/envoy/envoy.yaml)|g' \
        -e 's|\](../../04_customizing_a_guide\.md)|\](/resources/gateway)|g' \
        -e 's|\](/docs/04_customizing_a_guide\.md)|\](/resources/gateway)|g' \
        -e 's|\](../../02_verifying_a_guide\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/optimized-baseline)|g' \
        -e 's|\](/docs/02_verifying_a_guide\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/optimized-baseline)|g' \
        -e 's|\](../../02_verifying_a_guide\.md#following-logs-for-requests)|\](https://github.com/llm-d/llm-d/tree/main/guides/optimized-baseline)|g' \
        "$file"
done

# === Fix architecture and other cross-references ===
echo "    Fixing architecture references..."
find "$DOCS_DIR/guides" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\](../../docs/architecture/advanced/latency-predictor\.md)|\](/architecture/advanced/latency-predictor)|g' \
        -e 's|\](/docs/architecture/advanced/latency-predictor\.md)|\](/architecture/advanced/latency-predictor)|g' \
        -e 's|\](../../docs/architecture/advanced/latency-predictor\.md#observability)|\](/architecture/advanced/latency-predictor#observability)|g' \
        -e 's|\](../../docs/architecture/core/router/epp/flow-control\.md)|\](/architecture/core/router/epp/flow-control)|g' \
        -e 's|\](/docs/architecture/core/router/epp/flow-control\.md)|\](/architecture/core/router/epp/flow-control)|g' \
        -e 's|\](../../docs/architecture/core/epp/flow-control\.md)|\](/architecture/core/router/epp/flow-control)|g' \
        -e 's|\](/docs/architecture/core/epp/flow-control\.md)|\](/architecture/core/router/epp/flow-control)|g' \
        -e 's|\](../../docs/api-reference/epp-http-headers\.md)|\](/api-reference/epp-http-headers)|g' \
        -e 's|\](/docs/api-reference/epp-http-headers\.md)|\](/api-reference/epp-http-headers)|g' \
        -e 's|\](../optimized-baseline/README\.md#supported-hardware-backends)|\](https://github.com/llm-d/llm-d/tree/main/guides/optimized-baseline#supported-hardware-backends)|g' \
        -e 's|\](/docs/optimized-baseline/README\.md#supported-hardware-backends)|\](https://github.com/llm-d/llm-d/tree/main/guides/optimized-baseline#supported-hardware-backends)|g' \
        -e 's|\](../optimized-baseline)|\](/guides/optimized-baseline)|g' \
        -e 's|\](/docs/optimized-baseline)|\](/docs/guides/optimized-baseline)|g' \
        -e 's|\](../optimized-baseline/README\.md#2-deploy-the-model-server)|\](/guides/optimized-baseline#2-deploy-the-model-server)|g' \
        -e 's|\](../optimized-baseline/README\.md#3-enable-monitoring-optional)|\](/guides/optimized-baseline#3-enable-monitoring-optional)|g' \
        "$file"
done

# === Fix gateway index.md links ===
# gateway/index.md comes from docs/resources/gateway/README.md — fix relative paths
if [[ -f "$DOCS_DIR/resources/gateway/index.md" ]]; then
    sed_inplace \
        -e 's|\](../../guides/README\.md)|\](/guides)|g' \
        -e 's|\](../../guides/index\.md)|\](/guides)|g' \
        -e 's|\](./gke\.md)|\](/resources/gateway/gke)|g' \
        -e 's|\](./istio\.md)|\](/resources/gateway/istio)|g' \
        -e 's|\](./agentgateway\.md)|\](/resources/gateway/agentgateway)|g' \
        "$DOCS_DIR/resources/gateway/index.md"
fi

# === Fix rdma well-lit-paths links ===
# rdma/rdma-configuration.md comes from resources-new/rdma/README.md
if [[ -f "$DOCS_DIR/resources/rdma/rdma-configuration.md" ]]; then
    sed_inplace \
        -e 's|\](../../well-lit-paths/capabilities/pd-disaggregation\.md)|\](/guides/pd-disaggregation)|g' \
        -e 's|\](../../well-lit-paths/capabilities/wide-expert-parallelism\.md)|\](/guides/wide-expert-parallelism)|g' \
        -e 's|\](../../well-lit-paths/foundations/pd-disaggregation\.md)|\](/guides/pd-disaggregation)|g' \
        -e 's|\](../../well-lit-paths/foundations/wide-expert-parallelism\.md)|\](/guides/wide-expert-parallelism)|g' \
        -e 's|\](../../architecture/core/model-servers\.md)|\](/architecture/core/model-servers)|g' \
        "$DOCS_DIR/resources/rdma/rdma-configuration.md"
fi

# === Fix observability doc links ===
# Link to github for repo-only paths; rewrite in-site cross-links under /resources/observability/
for obs_file in index.md setup.md metrics.md tracing.md promql.md; do
    if [[ -f "$DOCS_DIR/resources/observability/$obs_file" ]]; then
        sed_inplace \
            -e 's|\](./setup\.md)|\](/resources/observability/setup)|g' \
            -e 's|\](./metrics\.md)|\](/resources/observability/metrics)|g' \
            -e 's|\](./tracing\.md)|\](/resources/observability/tracing)|g' \
            -e 's|\](./promql\.md)|\](/resources/observability/promql)|g' \
            -e 's|\](../../getting-started/quickstart\.md)|\](/getting-started/quickstart)|g' \
            -e 's|\](../../../guides/recipes/modelserver/components/monitoring/)|\](https://github.com/llm-d/llm-d/tree/main/guides/recipes/modelserver/components/monitoring)|g' \
            -e 's|\`](../../../guides/recipes/modelserver/components/monitoring/)|\`](https://github.com/llm-d/llm-d/tree/main/guides/recipes/modelserver/components/monitoring)|g' \
            -e 's|\](../../../guides/recipes/observability/)|\](https://github.com/llm-d/llm-d/tree/main/guides/recipes/observability)|g' \
            -e 's|\](../../../guides/recipes/observability/\([^)]*\))|\](https://github.com/llm-d/llm-d/blob/main/guides/recipes/observability/\1)|g' \
            "$DOCS_DIR/resources/observability/$obs_file"
    fi
done

# === Fix API reference links ===
echo "    Fixing API reference links..."
sed_inplace \
    -e 's|\](inferencepool\.md)|\](/api-reference/inferencepool)|g' \
    -e 's|\](inferenceobjective\.md)|\](/api-reference/inferenceobjective)|g' \
    -e 's|\](inferencemodelrewrite\.md)|\](/api-reference/inferencemodelrewrite)|g' \
    -e 's|\](endpointpickerconfig\.md)|\](/api-reference/endpointpickerconfig)|g' \
    -e 's|\](epp-http-headers\.md)|\](/api-reference/epp-http-headers)|g' \
    -e 's|\](epp-http-apis\.md)|\](/api-reference/epp-http-apis)|g' \
    -e 's|\](epp-grpc-apis\.md)|\](https://github.com/llm-d/llm-d/blob/main/docs/api-reference/epp-grpc-apis.md)|g' \
    -e 's|\](glossary\.md)|\](/api-reference/glossary)|g' \
    "$DOCS_DIR/api-reference/index.md"

# epp-http-apis.md links to a multimodal guide path that doesn't exist in the
# repo; point it at the multimodal-serving doc that does.
sed_inplace \
    -e 's|guides/multimodal-serving/optimized-baseline/README\.md|docs/well-lit-paths/workloads/multimodal-serving.md|g' \
    "$DOCS_DIR/api-reference/epp-http-apis.md"

# === Fix architecture index.md relative paths ===
echo "    Fixing architecture index.md relative paths..."
sed_inplace \
    -e 's|\(\[.*\]\)(\./core/inferencepool)|\1(/architecture/core/inferencepool)|g' \
    -e 's|\(\[.*\]\)(\./core/model-servers)|\1(/architecture/core/model-servers)|g' \
    -e 's|\(\[.*\]\)(\./core/router/proxy)|\1(/architecture/core/router/proxy)|g' \
    -e 's|\(\[.*\]\)(\./core/router/)|\1(/architecture/core/router)|g' \
    -e 's|\(\[.*\]\)(\./core/router)|\1(/architecture/core/router)|g' \
    -e 's|\(\[.*\]\)(\./core/router/epp/)|\1(/architecture/core/router/epp)|g' \
    -e 's|\(\[.*\]\)(\./advanced/kv-management/)|\1(/architecture/advanced/kv-management)|g' \
    -e 's|\(\[.*\]\)(\./advanced/kv-management)|\1(/architecture/advanced/kv-management)|g' \
    -e 's|\](core/router/README\.md)|\](/architecture/core/router)|g' \
    -e 's|\](core/router/epp/README\.md)|\](/architecture/core/router/epp)|g' \
    -e 's|\](core/inferencepool\.md)|\](/architecture/core/inferencepool)|g' \
    -e 's|\](core/model-servers\.md)|\](/architecture/core/model-servers)|g' \
    -e 's|\](advanced/kv-management/README\.md)|\](/architecture/advanced/kv-management)|g' \
    -e 's|\](/core/router/README\.md)|\](/architecture/core/router)|g' \
    -e 's|\](/core/router/epp/README\.md)|\](/architecture/core/router/epp)|g' \
    -e 's|\](/advanced/kv-management/README\.md)|\](/architecture/advanced/kv-management)|g' \
    "$DOCS_DIR/architecture/index.md"

# === Fix router index.md relative paths ===
sed_inplace \
    -e 's|\](\.\/epp/)|\](/architecture/core/router/epp)|g' \
    -e 's|\](\.\/epp)|\](/architecture/core/router/epp)|g' \
    -e 's|\](epp/README\.md)|\](/architecture/core/router/epp)|g' \
    -e 's|\](/architecture/core/epp/README\.md)|\](/architecture/core/router/epp)|g' \
    "$DOCS_DIR/architecture/core/router/index.md"


# Fix URLs in angle brackets (MDX interprets them as HTML tags)
# Replace <https://...> with https://...
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace 's|<\(https\?://[^<>]*\)>|\1|g' "$file"
done

# === Apply markdown transformations (shared with test-transformations.sh) ===
echo "    Applying markdown transformations (callouts, tabs, MDX escaping, well-lit-paths links)..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    apply_transformations "$file"
done

# === Fix /img/docs/images/ paths created by transformations ===
# The transformations convert ../assets/images/foo.svg to /img/docs/images/foo.svg
# but we copy all assets flat to /img/docs/, so remove the /images/ segment
echo "    Fixing /img/docs/images/ paths..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace 's|/img/docs/images/|/img/docs/|g' "$file"
done

# === Canonicalize in-site guide links to /well-lit-paths ===
echo "    Canonicalizing /guides links to /well-lit-paths..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\](/docs/guides/\([^)]*\))|\](/docs/well-lit-paths/\1)|g' \
        -e 's|\](/docs/guides)|\](/docs/well-lit-paths)|g' \
        -e 's|\](/guides/\([^)]*\))|\](/well-lit-paths/\1)|g' \
        -e 's|\](/guides)|\](/well-lit-paths)|g' \
        -e 's|\](/docs/well-lit-paths/foundations/\([^)]*\))|\](/docs/well-lit-paths/\1)|g' \
        -e 's|\](/well-lit-paths/foundations/\([^)]*\))|\](/well-lit-paths/\1)|g' \
        "$file"
done

# === Canonicalize /guides in MDX (JSX <Link to=...> + markdown links) ===
# The combined-landing intro (getting-started/index.mdx) uses JSX
# <Link to="/guides">See all Well-Lit Paths</Link>. The .md-only pass above
# misses both .mdx files and JSX to="" attributes, so /guides 404s. This site
# serves that section at /well-lit-paths (the guides/index.md slug).
echo "    Canonicalizing /guides -> /well-lit-paths in MDX..."
find "$DOCS_DIR" -name "*.mdx" -print0 | while IFS= read -r -d '' file; do
    sed_inplace -E \
        -e 's@(to=")/guides(/[^"]*)?"@\1/well-lit-paths\2"@g' \
        -e 's@\]\(/guides(/[^)]*)?\)@](/well-lit-paths\1)@g' \
        "$file"
done

# === Fix flattened-guide -> architecture cross-references ===
# Well-Lit Paths overview pages are flattened from docs/well-lit-paths/<subdir>/
# into a single guides/ level, so their relative ../../ or ../../../ links to
# architecture/ pages over-shoot and 404 (e.g. the "Further reading" links on
# asynchronous-processing and flow-control). From a flat guides/<page>.md the
# correct relative path is ../architecture/. Collapse the extra ../ segments.
# Scoped to top-level guides/*.md so deeper guide dirs keep their own depth.
echo "    Fixing flattened-guide architecture cross-references..."
find "$DOCS_DIR/guides" -maxdepth 1 -name "*.md" -print0 2>/dev/null | while IFS= read -r -d '' file; do
    sed_inplace -E -e "s@\]\((\.\./){2,}architecture/@](../architecture/@g" "$file"
done

# === Repoint repo-root guides/ deep-links to GitHub (Well-Lit Paths "Deploy" links) ===
# Well-Lit Paths overview pages link to deployment recipes that live in the
# llm-d/llm-d *repo-root* guides/ dir, which is NOT published to this docs site,
# e.g. [optimized baseline guide](../../../guides/optimized-baseline). Those
# relative paths resolve to nonexistent in-site routes (page-not-found). Repoint
# them at GitHub on the synced branch: directory targets -> tree/, .md -> blob/.
echo "    Repointing repo-root guides/ deep-links to GitHub..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace -E \
        -e "s@\]\((\.\./)+guides/index\.md(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/guides/README.md\2)@g" \
        -e "s@\]\((\.\./)+guides/([^)#]*\.md)(#[^)]*)?\)@](https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/guides/\2\3)@g" \
        -e "s@\]\((\.\./)+guides/([^)]*)\)@](https://github.com/llm-d/llm-d/tree/$UPSTREAM_REF/guides/\2)@g" \
        "$file"
done

# === Rewrite upstream repo links to the synced branch ===
# Keeps dev docs pointing to main while making release docs point to their
# matching upstream release branch.
echo "    Repointing llm-d upstream links to $UPSTREAM_REF..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e "s|https://github.com/llm-d/llm-d/tree/main/|https://github.com/llm-d/llm-d/tree/$UPSTREAM_REF/|g" \
        -e "s|https://github.com/llm-d/llm-d/blob/main/|https://github.com/llm-d/llm-d/blob/$UPSTREAM_REF/|g" \
        "$file"
done

# === MDX hygiene: void tags + bare email/URL autolinks ===
echo "    Normalizing bare HTML void tags + autolinks for MDX..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|<br>|<br/>|g' \
        -e 's|<hr>|<hr/>|g' \
        -e 's|<\([A-Za-z0-9._%+-]\{1,\}@[A-Za-z0-9.-]\{1,\}\.[A-Za-z]\{2,\}\)>|\1|g' \
        -e 's|<\(https\{0,1\}://[^ >]*\)>|\1|g' \
        "$file"
done

# === Absolute asset URLs -> root-relative ===
# The combined-landing intro (llm-d/llm-d#1820, now merged upstream) hardcodes
# absolute https://llm-d.ai/img/ URLs for the founder + CNCF logos. Those 404 on
# deploy previews, where the assets ship in THIS repo rather than on the live
# origin. Rewrite to root-relative so they resolve on every deploy; on production
# /img/ is the same origin, so prod is unaffected. Covers .md and .mdx — the
# landing page is getting-started/index.mdx.
echo "    Rewriting absolute llm-d.ai/img asset URLs to root-relative..."
find "$DOCS_DIR" \( -name "*.md" -o -name "*.mdx" \) -print0 | while IFS= read -r -d '' file; do
    sed_inplace -e 's|https://llm-d.ai/img/|/img/|g' "$file"
done

# === Publish the How-To Guides at /guides/* (final namespace rename) ===
# The How-To Guides section is authored under doc IDs how-to/* because the
# guides/* doc-id namespace is already taken by the Well-Lit Paths overview
# pages. Throughout the sync we emit /how-to/* links so the /guides ->
# /well-lit-paths canonicalization above never rewrites them; here, after ALL
# link canonicalization has run, we flip /how-to/* -> /guides/* and set the page
# slugs to /guides/*. (See createRedirects in docusaurus.config.ts, which frees
# /guides for these pages only when the how-to docs are present, keeping frozen
# release builds unaffected.)
if [[ -d "$DOCS_DIR/how-to" ]]; then
    echo "    Publishing How-To Guides at /guides/* ..."
    find "$DOCS_DIR" \( -name "*.md" -o -name "*.mdx" \) -print0 | while IFS= read -r -d '' file; do
        sed_inplace \
            -e 's|](/how-to/|](/guides/|g' \
            -e 's|](/docs/how-to/|](/docs/guides/|g' \
            "$file"
    done
    set_doc_slug "$DOCS_DIR/how-to/index.md" "/guides"
    for _g in $HOWTO_GUIDES; do
        set_doc_slug "$DOCS_DIR/how-to/$_g.md" "/guides/$_g"
    done
    # Nested Multimodal sub-guides.
    set_doc_slug "$DOCS_DIR/how-to/multimodal-serving/aggregation.md"      "/guides/multimodal-serving/aggregation"
    set_doc_slug "$DOCS_DIR/how-to/multimodal-serving/e-disaggregation.md" "/guides/multimodal-serving/e-disaggregation"
fi

# === Generate stubs for pages in outline that don't have source content yet ===
echo "    Generating stubs for missing pages..."

generate_stub() {
    local filepath="$1"
    local title="$2"
    local desc="$3"

    if [[ ! -s "$filepath" ]]; then
        mkdir -p "$(dirname "$filepath")"
        cat > "$filepath" << STUBEOF
---
title: "$title"
description: "$desc"
---

# $title

:::caution Work in Progress
This page is under active development. Content coming soon.
:::
STUBEOF
    fi
}

# Resources stubs
generate_stub "$DOCS_DIR/resources/gateway/index.md" "Gateway" "Gateway deployment and configuration guides"
generate_stub "$DOCS_DIR/resources/gateway/install-crds.md" "Gateway CRD Installation" "Installing Gateway API and Inference Extension CRDs"
generate_stub "$DOCS_DIR/resources/gateway/istio.md" "Istio" "Deploying llm-d with Istio gateway"
generate_stub "$DOCS_DIR/resources/gateway/gke.md" "GKE" "Deploying llm-d with GKE gateway"
generate_stub "$DOCS_DIR/resources/gateway/agentgateway.md" "Agent Gateway" "Deploying llm-d with Agent Gateway"
generate_stub "$DOCS_DIR/resources/gateway/install-crds.md" "Install CRDs" "Installing Gateway API CRDs"
generate_stub "$DOCS_DIR/architecture/advanced/batch/index.md" "Batch Processing" "Asynchronous batch inference architecture"
generate_stub "$DOCS_DIR/architecture/advanced/batch/batch-gateway.md" "Batch Gateway" "Gateway for batch inference requests"
generate_stub "$DOCS_DIR/architecture/advanced/batch/async-processor.md" "Async Processor" "Asynchronous request processing component"
generate_stub "$DOCS_DIR/architecture/core/router/epp/datalayer.md" "Data Layer" "EPP data layer architecture"
generate_stub "$DOCS_DIR/architecture/advanced/disaggregation/index.md" "Disaggregation" "Prefill/decode disaggregation architecture"
generate_stub "$DOCS_DIR/architecture/advanced/disaggregation/operations-vllm.md" "vLLM Operations" "vLLM-specific operations for disaggregated serving"
generate_stub "$DOCS_DIR/architecture/advanced/kv-management/index.md" "KV Cache Management" "KV cache optimization and management"
generate_stub "$DOCS_DIR/architecture/advanced/kv-management/prefix-cache-aware-routing.md" "Prefix Cache Aware Routing" "Routing requests to maximize KV cache hits"
generate_stub "$DOCS_DIR/architecture/advanced/kv-management/kv-indexer.md" "KV-Cache Indexer" "Globally consistent KV cache block tracking"
generate_stub "$DOCS_DIR/architecture/advanced/kv-management/kv-offloader.md" "KV Offloader" "Tiered KV cache storage hierarchy"
# Autoscaling sub-pages — kept as defensive stubs so the sidebar resolves
# even when the cp_doc lines above silently no-op (e.g. against a snapshot
# of upstream that doesn't have hpa-wva.md / hpa-epp.md). generate_stub is
# null-safe, so it skips when the cp_doc lines produced real content.
generate_stub "$DOCS_DIR/architecture/advanced/autoscaling/workload-variant-autoscaling.md" "Workload-Variant Autoscaling" "Signal-aware autoscaler that scales inference workloads on real-time inference metrics rather than generic infra signals."
generate_stub "$DOCS_DIR/architecture/advanced/autoscaling/igw-hpa.md" "EndPoint Picker HPA/KEDA Integration" "EndPoint Picker integration with HorizontalPodAutoscaler and KEDA."
generate_stub "$DOCS_DIR/api-reference/index.md" "API Reference" "API specification and reference documentation"
generate_stub "$DOCS_DIR/api-reference/glossary.md" "Glossary" "Terminology and definitions for llm-d"
generate_stub "$DOCS_DIR/resources/observability/index.md" "Observability" "Metrics, dashboards, and distributed tracing for llm-d"
generate_stub "$DOCS_DIR/resources/observability/setup.md" "Observability Setup" "Prometheus, Grafana, and tracing quickstart for llm-d"
generate_stub "$DOCS_DIR/resources/observability/metrics.md" "Metrics" "Prometheus metrics collection and configuration"
generate_stub "$DOCS_DIR/resources/observability/tracing.md" "Distributed Tracing" "Setting up distributed tracing with OpenTelemetry"
generate_stub "$DOCS_DIR/resources/observability/promql.md" "PromQL Query Reference" "Ready-to-use PromQL queries for llm-d deployments"
generate_stub "$DOCS_DIR/resources/rdma/rdma-configuration.md" "RDMA Configuration" "RDMA network configuration"

# Infrastructure Providers stubs
generate_stub "$DOCS_DIR/resources/infra-providers/index.md" "Infrastructure Providers" "Kubernetes provider setup and configuration"
generate_stub "$DOCS_DIR/resources/infra-providers/aks.md" "Azure Kubernetes Service" "Deploy llm-d on AKS"
generate_stub "$DOCS_DIR/resources/infra-providers/digitalocean.md" "DigitalOcean Kubernetes" "Deploy llm-d on DigitalOcean"
generate_stub "$DOCS_DIR/resources/infra-providers/gke.md" "Google Kubernetes Engine" "Deploy llm-d on GKE"
generate_stub "$DOCS_DIR/resources/infra-providers/minikube.md" "Minikube" "Deploy llm-d on Minikube"
generate_stub "$DOCS_DIR/resources/infra-providers/openshift.md" "OpenShift" "Deploy llm-d on OpenShift"
generate_stub "$DOCS_DIR/resources/infra-providers/openshift-aws.md" "OpenShift on AWS" "Deploy llm-d on OpenShift on AWS"

# Guides stubs
generate_stub "$DOCS_DIR/guides/multimodal-serving.md" "Multimodal Serving" "Multimodal serving guide"
set_doc_slug "$DOCS_DIR/guides/multimodal-serving.md" "/well-lit-paths/multimodal-serving"

TOTAL=$(find "$DOCS_DIR" -name "*.md" | wc -l | tr -d ' ')
echo "==> Done. $TOTAL docs synced from llm-d/llm-d @ $BRANCH"

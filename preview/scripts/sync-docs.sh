#!/usr/bin/env bash
# sync-docs.sh — Pull WiP docs from a specific branch of llm-d/llm-d
#
# Usage:
#   ./scripts/sync-docs.sh                    # sync from 'main'
#   ./scripts/sync-docs.sh release-0.5        # sync from 'release-0.5'
#   LLMD_REPO=/path/to/local/llm-d ./scripts/sync-docs.sh  # use local clone

set -euo pipefail

if [[ "$(uname)" == "Darwin" ]]; then
    sed_inplace() { sed -i '' "$@"; }
else
    sed_inplace() { sed -i "$@"; }
fi

BRANCH="${1:-main}"
REPO_URL="https://github.com/llm-d/llm-d.git"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="$PROJECT_DIR/docs"
STATIC_DIR="$PROJECT_DIR/static/img/docs"

echo "==> Syncing docs from llm-d/llm-d @ $BRANCH"

# Use local clone if LLMD_REPO is set, otherwise do a sparse checkout
if [[ -n "${LLMD_REPO:-}" ]]; then
    echo "    Using local repo: $LLMD_REPO"
    SRC="$LLMD_REPO"
    # Ensure we're on the right branch
    (cd "$SRC" && git checkout "$BRANCH" --quiet 2>/dev/null || git fetch origin "$BRANCH" --quiet && git checkout "$BRANCH" --quiet)
else
    # Sparse checkout into a temp dir
    TMPDIR=$(mktemp -d)
    trap "rm -rf $TMPDIR" EXIT
    echo "    Cloning sparse checkout into temp dir..."
    git clone --depth 1 --branch "$BRANCH" --filter=blob:none --sparse "$REPO_URL" "$TMPDIR" --quiet
    (cd "$TMPDIR" && git sparse-checkout set docs/wip-docs-new docs/assets)
    SRC="$TMPDIR"
fi

WIP="$SRC/docs/wip-docs-new"
ASSETS="$SRC/docs/assets"

if [[ ! -d "$WIP" ]]; then
    echo "ERROR: docs/wip-docs-new not found in branch '$BRANCH'"
    exit 1
fi

echo "    Cleaning docs/ directory..."
rm -rf "$DOCS_DIR"/*

echo "    Creating directory structure from outline..."
mkdir -p \
    "$DOCS_DIR/getting-started" \
    "$DOCS_DIR/architecture/core/epp" \
    "$DOCS_DIR/architecture/advanced/autoscaling" \
    "$DOCS_DIR/well-lit-paths/intelligent-inference-scheduling" \
    "$DOCS_DIR/user-guides/gateway" \
    "$DOCS_DIR/user-guides/monitoring" \
    "$DOCS_DIR/api-reference"

echo "    Copying content..."

# === Getting Started ===
cp "$WIP/getting-started/README.md"       "$DOCS_DIR/getting-started/index.md"
cp "$WIP/getting-started/quickstart.md"   "$DOCS_DIR/getting-started/quickstart.md"
cp "$WIP/getting-started/feature-matrix.md" "$DOCS_DIR/getting-started/feature-matrix.md"
cp "$WIP/getting-started/artifacts.md"    "$DOCS_DIR/getting-started/artifacts.md"

# === Architecture ===
cp "$WIP/architecture/README.md"          "$DOCS_DIR/architecture/index.md"

# Architecture / Core
cp "$WIP/architecture/core/proxy.md"           "$DOCS_DIR/architecture/core/proxy.md"
cp "$WIP/architecture/core/inferencepool.md"   "$DOCS_DIR/architecture/core/inferencepool.md"
cp "$WIP/architecture/core/model-servers.md"   "$DOCS_DIR/architecture/core/model-servers.md"

# Architecture / Core / EPP
cp "$WIP/architecture/core/epp/README.md"           "$DOCS_DIR/architecture/core/epp/index.md"
cp "$WIP/architecture/core/epp/scheduling.md"       "$DOCS_DIR/architecture/core/epp/scheduling.md"
cp "$WIP/architecture/core/epp/flow-control.md"     "$DOCS_DIR/architecture/core/epp/flow-control.md"
cp "$WIP/architecture/core/epp/request-handling.md"  "$DOCS_DIR/architecture/core/epp/request-handling.md"
cp "$WIP/architecture/core/epp/configuration.md"     "$DOCS_DIR/architecture/core/epp/configuration.md"

# Architecture / Advanced
cp "$WIP/architecture/advanced/disaggregation/README.md"   "$DOCS_DIR/architecture/advanced/disaggregation.md"
cp "$WIP/architecture/advanced/kv-indexer.md"       "$DOCS_DIR/architecture/advanced/kv-indexer.md"
cp "$WIP/architecture/advanced/kv-offloader.md"     "$DOCS_DIR/architecture/advanced/kv-offloading.md"
cp "$WIP/architecture/advanced/latency-predictor.md" "$DOCS_DIR/architecture/advanced/latency-predictor.md"

# Architecture / Advanced / Autoscaling
cp "$WIP/architecture/advanced/autoscaling/README.md"                       "$DOCS_DIR/architecture/advanced/autoscaling/index.md"
cp "$WIP/architecture/advanced/autoscaling/wva.md"                         "$DOCS_DIR/architecture/advanced/autoscaling/workload-variant-autoscaling.md"
cp "$WIP/architecture/advanced/autoscaling/hpa-keda.md"                    "$DOCS_DIR/architecture/advanced/autoscaling/igw-hpa.md"

# === Well-Lit Paths ===
cp "$WIP/well-lit-paths/README.md"        "$DOCS_DIR/well-lit-paths/index.md"
# Sub-pages are stubs until content lands in the source branch

# === User Guides ===
cp "$WIP/guides/monitoring/metrics.md"           "$DOCS_DIR/user-guides/monitoring/metrics.md"
cp "$WIP/guides/monitoring/tracing.md"           "$DOCS_DIR/user-guides/monitoring/tracing.md"
cp "$WIP/guides/deploying-multiple-model.md"     "$DOCS_DIR/user-guides/deploying-multiple-models.md"
cp "$WIP/guides/user-apis.md"                    "$DOCS_DIR/user-guides/configuring-user-facing-apis.md"
cp "$WIP/guides/rdma/README.md"                  "$DOCS_DIR/user-guides/rdma-configuration.md"

# === API Reference ===
cp "$WIP/api-reference/README.md"         "$DOCS_DIR/api-reference/index.md"

# === Assets ===
echo "    Copying image assets..."
mkdir -p "$STATIC_DIR"
cp "$ASSETS/basic-architecture.svg"   "$STATIC_DIR/" 2>/dev/null || true
cp "$ASSETS/epp-design.svg"           "$STATIC_DIR/" 2>/dev/null || true
cp "$ASSETS/standalone-design.svg"    "$STATIC_DIR/" 2>/dev/null || true
cp "$ASSETS/gateway-design.svg"       "$STATIC_DIR/" 2>/dev/null || true
cp "$WIP/guides/rdma/networking-stack.svg" "$STATIC_DIR/" 2>/dev/null || true
cp "$WIP/architecture/core/images/flow_control_dashboard.png" "$STATIC_DIR/" 2>/dev/null || true

# === Fix image paths for Docusaurus ===
echo "    Fixing image references..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|../../assets/basic-architecture.svg|/img/docs/basic-architecture.svg|g' \
        -e 's|../../../assets/standalone-design.svg|/img/docs/standalone-design.svg|g' \
        -e 's|../../../assets/gateway-design.svg|/img/docs/gateway-design.svg|g' \
        -e 's|../../../../assets/epp-design.svg|/img/docs/epp-design.svg|g' \
        -e 's|../images/flow_control_dashboard.png|/img/docs/flow_control_dashboard.png|g' \
        -e 's|networking-stack.svg|/img/docs/networking-stack.svg|g' \
        "$file"
done

# === Clean up known issues ===
# Remove "NEEDS TO BE REDONE" from configuration.md
sed_inplace '/^NEEDS TO BE REDONE/d' "$DOCS_DIR/architecture/core/epp/configuration.md" 2>/dev/null || true

# === Generate stubs for pages in outline that don't have source content yet ===
echo "    Generating stubs for missing pages..."

generate_stub() {
    local filepath="$1"
    local title="$2"
    local desc="$3"

    # Only create if doesn't exist or is empty
    if [[ ! -s "$filepath" ]]; then
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

# Well-Lit Paths stubs
generate_stub "$DOCS_DIR/well-lit-paths/index.md" "Well-Lit Paths" "Tested, benchmarked deployment recipes for production workloads"
generate_stub "$DOCS_DIR/well-lit-paths/intelligent-inference-scheduling/index.md" "Intelligent Inference Scheduling" "Default well-lit path for intelligent request routing"
generate_stub "$DOCS_DIR/well-lit-paths/intelligent-inference-scheduling/default.md" "Default Scheduling" "Default intelligent scheduling configuration"
generate_stub "$DOCS_DIR/well-lit-paths/intelligent-inference-scheduling/precise-prefix-cache-aware-routing.md" "Precise Prefix Cache-Aware Routing" "Routing requests based on precise prefix cache state"
generate_stub "$DOCS_DIR/well-lit-paths/intelligent-inference-scheduling/predicted-latency.md" "Predicted Latency Scheduling" "ML-based latency prediction for SLO-aware routing"
generate_stub "$DOCS_DIR/well-lit-paths/intelligent-inference-scheduling/flow-control.md" "Flow Control" "Admission control and queuing for well-lit path deployments"
generate_stub "$DOCS_DIR/well-lit-paths/prefill-decode-disaggregation.md" "Prefill/Decode Disaggregation" "Well-lit path for separating prefill and decode phases"
generate_stub "$DOCS_DIR/well-lit-paths/wide-expert-parallelism.md" "Wide Expert Parallelism" "Well-lit path for MoE models with expert parallelism"
generate_stub "$DOCS_DIR/well-lit-paths/tiered-prefix-cache.md" "Tiered Prefix Cache" "Well-lit path for hierarchical KV-cache offloading"
generate_stub "$DOCS_DIR/well-lit-paths/workload-autoscaling.md" "Workload Autoscaling" "Well-lit path for workload-aware autoscaling"

# User Guides / Gateway stubs
generate_stub "$DOCS_DIR/user-guides/gateway/index.md" "Gateway" "Gateway deployment and configuration guides"
generate_stub "$DOCS_DIR/user-guides/gateway/istio.md" "Istio" "Deploying llm-d with Istio gateway"
generate_stub "$DOCS_DIR/user-guides/gateway/gke.md" "GKE" "Deploying llm-d with GKE gateway"
generate_stub "$DOCS_DIR/user-guides/gateway/agentgateway.md" "Agent Gateway" "Deploying llm-d with Agent Gateway"

# Other stubs
generate_stub "$DOCS_DIR/api-reference/index.md" "API Reference" "API specification and reference documentation"
generate_stub "$DOCS_DIR/user-guides/configuring-user-facing-apis.md" "Configuring User-Facing APIs" "OpenAI-compatible API configuration"
generate_stub "$DOCS_DIR/user-guides/deploying-multiple-models.md" "Deploying Multiple Models" "Multi-model inference deployment"
generate_stub "$DOCS_DIR/user-guides/monitoring/metrics.md" "Metrics" "Prometheus metrics collection and configuration"
generate_stub "$DOCS_DIR/user-guides/monitoring/tracing.md" "Distributed Tracing" "Setting up distributed tracing with OpenTelemetry"

TOTAL=$(find "$DOCS_DIR" -name "*.md" | wc -l | tr -d ' ')
echo "==> Done. $TOTAL docs synced from llm-d/llm-d @ $BRANCH"

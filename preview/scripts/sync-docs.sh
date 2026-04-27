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

cp_doc() {
    if [[ -f "$1" && -n "$2" ]]; then
        cp "$1" "$2"
    fi
}

cp_doc() {
    if [[ -f "$1" && -n "$2" ]]; then
        cp "$1" "$2"
    fi
}

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
    "$DOCS_DIR/architecture/advanced/disaggregation" \
    "$DOCS_DIR/architecture/advanced/disaggregation" \
    "$DOCS_DIR/architecture/advanced/autoscaling" \
    "$DOCS_DIR/architecture/advanced/batch" \
    "$DOCS_DIR/guides/experimental" \
    "$DOCS_DIR/resources/gateway" \
    "$DOCS_DIR/resources/monitoring" \
    "$DOCS_DIR/resources/rdma" \
    "$DOCS_DIR/api-reference"

echo "    Copying content..."

# === Getting Started ===
cp_doc "$WIP/getting-started/README.md"       "$DOCS_DIR/getting-started/index.md"
cp_doc "$WIP/getting-started/quickstart.md"   "$DOCS_DIR/getting-started/quickstart.md"
cp_doc "$WIP/getting-started/feature-matrix.md" "$DOCS_DIR/getting-started/feature-matrix.md"
cp_doc "$WIP/getting-started/artifacts.md"    "$DOCS_DIR/getting-started/artifacts.md"
cp_doc "$WIP/getting-started/README.md"       "$DOCS_DIR/getting-started/index.md"
cp_doc "$WIP/getting-started/quickstart.md"   "$DOCS_DIR/getting-started/quickstart.md"
cp_doc "$WIP/getting-started/feature-matrix.md" "$DOCS_DIR/getting-started/feature-matrix.md"
cp_doc "$WIP/getting-started/artifacts.md"    "$DOCS_DIR/getting-started/artifacts.md"

# === Architecture ===
cp_doc "$WIP/architecture/README.md"          "$DOCS_DIR/architecture/index.md"
cp_doc "$WIP/architecture/README.md"          "$DOCS_DIR/architecture/index.md"

# Architecture / Core
cp_doc "$WIP/architecture/core/proxy.md"           "$DOCS_DIR/architecture/core/proxy.md"
cp_doc "$WIP/architecture/core/inferencepool.md"   "$DOCS_DIR/architecture/core/inferencepool.md"
cp_doc "$WIP/architecture/core/model-servers.md"   "$DOCS_DIR/architecture/core/model-servers.md"
cp_doc "$WIP/architecture/core/proxy.md"           "$DOCS_DIR/architecture/core/proxy.md"
cp_doc "$WIP/architecture/core/inferencepool.md"   "$DOCS_DIR/architecture/core/inferencepool.md"
cp_doc "$WIP/architecture/core/model-servers.md"   "$DOCS_DIR/architecture/core/model-servers.md"

# Architecture / Core / EPP
cp_doc "$WIP/architecture/core/epp/README.md"           "$DOCS_DIR/architecture/core/epp/index.md"
cp_doc "$WIP/architecture/core/epp/scheduling.md"       "$DOCS_DIR/architecture/core/epp/scheduling.md"
cp_doc "$WIP/architecture/core/epp/flow-control.md"     "$DOCS_DIR/architecture/core/epp/flow-control.md"
cp_doc "$WIP/architecture/core/epp/request-handling.md"  "$DOCS_DIR/architecture/core/epp/request-handling.md"
cp_doc "$WIP/architecture/core/epp/configuration.md"     "$DOCS_DIR/architecture/core/epp/configuration.md"
cp_doc "$WIP/architecture/core/epp/datalayer.md"         "$DOCS_DIR/architecture/core/epp/datalayer.md"

# Architecture / Advanced / Disaggregation
cp_doc "$WIP/architecture/advanced/disaggregation/README.md"            "$DOCS_DIR/architecture/advanced/disaggregation/index.md"
cp_doc "$WIP/architecture/advanced/disaggregation/configuration.md"     "$DOCS_DIR/architecture/advanced/disaggregation/configuration.md"
cp_doc "$WIP/architecture/advanced/disaggregation/operations-vllm.md"   "$DOCS_DIR/architecture/advanced/disaggregation/operations-vllm.md"
cp_doc "$WIP/architecture/core/epp/README.md"           "$DOCS_DIR/architecture/core/epp/index.md"
cp_doc "$WIP/architecture/core/epp/scheduling.md"       "$DOCS_DIR/architecture/core/epp/scheduling.md"
cp_doc "$WIP/architecture/core/epp/flow-control.md"     "$DOCS_DIR/architecture/core/epp/flow-control.md"
cp_doc "$WIP/architecture/core/epp/request-handling.md"  "$DOCS_DIR/architecture/core/epp/request-handling.md"
cp_doc "$WIP/architecture/core/epp/configuration.md"     "$DOCS_DIR/architecture/core/epp/configuration.md"
cp_doc "$WIP/architecture/core/epp/datalayer.md"         "$DOCS_DIR/architecture/core/epp/datalayer.md"

# Architecture / Advanced / Disaggregation
cp_doc "$WIP/architecture/advanced/disaggregation/README.md"            "$DOCS_DIR/architecture/advanced/disaggregation/index.md"
cp_doc "$WIP/architecture/advanced/disaggregation/configuration.md"     "$DOCS_DIR/architecture/advanced/disaggregation/configuration.md"
cp_doc "$WIP/architecture/advanced/disaggregation/operations-vllm.md"   "$DOCS_DIR/architecture/advanced/disaggregation/operations-vllm.md"

# Architecture / Advanced
cp_doc "$WIP/architecture/advanced/kv-indexer.md"       "$DOCS_DIR/architecture/advanced/kv-indexer.md"
cp_doc "$WIP/architecture/advanced/kv-offloader.md"     "$DOCS_DIR/architecture/advanced/kv-offloading.md"
cp_doc "$WIP/architecture/advanced/latency-predictor.md" "$DOCS_DIR/architecture/advanced/latency-predictor.md"
cp_doc "$WIP/architecture/advanced/kv-indexer.md"       "$DOCS_DIR/architecture/advanced/kv-indexer.md"
cp_doc "$WIP/architecture/advanced/kv-offloader.md"     "$DOCS_DIR/architecture/advanced/kv-offloading.md"
cp_doc "$WIP/architecture/advanced/latency-predictor.md" "$DOCS_DIR/architecture/advanced/latency-predictor.md"

# Architecture / Advanced / Autoscaling
cp_doc "$WIP/architecture/advanced/autoscaling/README.md"                       "$DOCS_DIR/architecture/advanced/autoscaling/index.md"
cp_doc "$WIP/architecture/advanced/autoscaling/wva.md"                         "$DOCS_DIR/architecture/advanced/autoscaling/workload-variant-autoscaling.md"
cp_doc "$WIP/architecture/advanced/autoscaling/hpa-keda.md"                    "$DOCS_DIR/architecture/advanced/autoscaling/igw-hpa.md"
cp "$WIP/architecture/advanced/autoscaling/"*.svg "$DOCS_DIR/architecture/advanced/autoscaling/" 2>/dev/null || true

# Architecture / Advanced / Batch
cp_doc "$WIP/architecture/advanced/batch/README.md"           "$DOCS_DIR/architecture/advanced/batch/index.md"
cp_doc "$WIP/architecture/advanced/batch/batch-gateway.md"    "$DOCS_DIR/architecture/advanced/batch/batch-gateway.md"
cp_doc "$WIP/architecture/advanced/batch/async-processor.md"  "$DOCS_DIR/architecture/advanced/batch/async-processor.md"

# === Guides (formerly well-lit-paths) ===
cp_doc "$WIP/guides/README.md"                              "$DOCS_DIR/guides/index.md"
cp_doc "$WIP/guides/intelligent-inference-scheduling.md"    "$DOCS_DIR/guides/intelligent-inference-scheduling.md"
cp_doc "$WIP/guides/flow-control.md"                        "$DOCS_DIR/guides/flow-control.md"
cp_doc "$WIP/guides/kv-cache-management.md"                 "$DOCS_DIR/guides/kv-cache-management.md"
cp_doc "$WIP/guides/pd-disaggregation.md"                   "$DOCS_DIR/guides/pd-disaggregation.md"
cp_doc "$WIP/guides/wide-expert-parallelism.md"             "$DOCS_DIR/guides/wide-expert-parallelism.md"
cp_doc "$WIP/guides/experimental/predicted-latency.md"      "$DOCS_DIR/guides/experimental/predicted-latency.md"
cp_doc "$WIP/guides/experimental/batch-gateway.md"          "$DOCS_DIR/guides/experimental/batch-gateway.md"
cp_doc "$WIP/guides/predicted-latency.md"                   "$DOCS_DIR/guides/predicted-latency.md"
cp_doc "$WIP/guides/workload-autoscaling.md"                "$DOCS_DIR/guides/workload-autoscaling.md"
# PR #1249 uses the pre-rename well-lit-paths/ directory — map as fallback
cp_doc "$WIP/well-lit-paths/README.md"                              "$DOCS_DIR/guides/index.md"
cp_doc "$WIP/well-lit-paths/flow-control.md"                        "$DOCS_DIR/guides/flow-control.md"
cp_doc "$WIP/well-lit-paths/kv-cache-management.md"                 "$DOCS_DIR/guides/kv-cache-management.md"
cp_doc "$WIP/well-lit-paths/pd-disaggregation.md"                   "$DOCS_DIR/guides/pd-disaggregation.md"
cp_doc "$WIP/well-lit-paths/wide-expert-parallelism.md"             "$DOCS_DIR/guides/wide-expert-parallelism.md"
cp_doc "$WIP/well-lit-paths/intelligent-inference-scheduling.md"    "$DOCS_DIR/guides/intelligent-inference-scheduling.md"
cp_doc "$WIP/well-lit-paths/experimental/predicted-latency.md"      "$DOCS_DIR/guides/experimental/predicted-latency.md"

# === Resources (formerly guides) ===
cp_doc "$WIP/resources/deploying-multiple-model.md"         "$DOCS_DIR/resources/deploying-multiple-models.md"
cp_doc "$WIP/resources/user-apis.md"                        "$DOCS_DIR/resources/configuring-user-facing-apis.md"
cp_doc "$WIP/resources/profiling.md"                        "$DOCS_DIR/resources/profiling.md"
cp_doc "$WIP/resources/rollout-new-version.md"              "$DOCS_DIR/resources/rollout-new-version.md"
cp_doc "$WIP/resources/monitoring/metrics.md"               "$DOCS_DIR/resources/monitoring/metrics.md"
cp_doc "$WIP/resources/monitoring/tracing.md"               "$DOCS_DIR/resources/monitoring/tracing.md"
# PR #1207 places monitoring under guides/monitoring/ — use as fallback
cp_doc "$WIP/guides/monitoring/metrics.md"                  "$DOCS_DIR/resources/monitoring/metrics.md"
cp_doc "$WIP/guides/monitoring/tracing.md"                  "$DOCS_DIR/resources/monitoring/tracing.md"
cp_doc "$WIP/resources/gateways/istio.md"                   "$DOCS_DIR/resources/gateway/istio.md"
cp_doc "$WIP/resources/gateways/gke.md"                     "$DOCS_DIR/resources/gateway/gke.md"
cp_doc "$WIP/resources/gateways/agentgateway.md"            "$DOCS_DIR/resources/gateway/agentgateway.md"
cp_doc "$WIP/resources/rdma/README.md"                      "$DOCS_DIR/resources/rdma/rdma-configuration.md"

# === API Reference ===
cp_doc "$WIP/api-reference/README.md"         "$DOCS_DIR/api-reference/index.md"
cp_doc "$WIP/api-reference/glossary.md"       "$DOCS_DIR/api-reference/glossary.md"
cp_doc "$WIP/api-reference/README.md"         "$DOCS_DIR/api-reference/index.md"
cp_doc "$WIP/api-reference/glossary.md"       "$DOCS_DIR/api-reference/glossary.md"

# === Assets ===
echo "    Copying image assets..."
mkdir -p "$STATIC_DIR"
cp "$ASSETS"/*.svg "$STATIC_DIR/" 2>/dev/null || true
cp_doc "$WIP/resources/rdma/networking-stack.svg" "$STATIC_DIR/" 2>/dev/null || true
cp_doc "$WIP/architecture/core/images/flow_control_dashboard.png" "$STATIC_DIR/" 2>/dev/null || true
cp_doc "$WIP/architecture/advanced/autoscaling/hpa-architecture.svg" "$STATIC_DIR/" 2>/dev/null || true

# === Fix image paths for Docusaurus ===
echo "    Fixing image references..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\(\.\./\)*assets/\([^)]*\)|/img/docs/\2|g' \
        -e 's|\(\.\./\)*assets/\([^)]*\)|/img/docs/\2|g' \
        -e 's|../images/flow_control_dashboard.png|/img/docs/flow_control_dashboard.png|g' \
        -e 's|networking-stack.svg|/img/docs/networking-stack.svg|g' \
        -e 's|hpa-architecture.svg|/img/docs/hpa-architecture.svg|g' \
        "$file"
done

# === Fix internal cross-references ===
# Upstream files reference filenames that get renamed during copy
echo "    Fixing internal cross-references..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|epp\.md|epp/index.md|g' \
        -e 's|\./hpa-keda\.md|./igw-hpa.md|g' \
        -e 's|\./wva\.md|./workload-variant-autoscaling.md|g' \
        -e 's|core/epp/README\.md|core/epp/index.md|g' \
        -e 's|advanced/autoscaling/README\.md|advanced/autoscaling/index.md|g' \
        -e 's|advanced/disaggregation/README\.md|advanced/disaggregation/index.md|g' \
        -e 's|resources/gateways/README\.md|../resources/gateway/index.md|g' \
        -e 's|guides/README\.md|guides/index.md|g' \
        -e 's|architecture/introduction\.md|architecture/index.md|g' \
        -e 's|architecture/README\.md|architecture/index.md|g' \
        -e 's|getting-started/README\.md|getting-started/index.md|g' \
        -e 's|api-reference/README\.md|api-reference/index.md|g' \
        -e 's|resources/rdma/README\.md|resources/rdma/rdma-configuration.md|g' \
        -e 's|advanced/disaggregation\.md|advanced/disaggregation/index.md|g' \
        -e 's|advanced/autoscaling/autoscaling\.md|advanced/autoscaling/index.md|g' \
        -e 's|advanced/batch/README\.md|advanced/batch/index.md|g' \
        "$file"
done

# === Clean up known issues ===
# Remove "NEEDS TO BE REDONE" from configuration.md
sed_inplace '/^NEEDS TO BE REDONE/d' "$DOCS_DIR/architecture/core/epp/configuration.md" 2>/dev/null || true
# Escape <-> in markdown (MDX parses it as JSX)
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace 's|<->|\\<->|g' "$file"
done

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

# Guides stubs
generate_stub "$DOCS_DIR/guides/index.md" "Guides" "Step-by-step adoption procedures for production workloads"
generate_stub "$DOCS_DIR/guides/intelligent-inference-scheduling.md" "Intelligent Inference Scheduling" "Intelligent request routing and scheduling"
generate_stub "$DOCS_DIR/guides/flow-control.md" "Flow Control" "Admission control and queuing"
generate_stub "$DOCS_DIR/guides/kv-cache-management.md" "KV Cache Management" "Hierarchical KV-cache offloading"
generate_stub "$DOCS_DIR/guides/pd-disaggregation.md" "Prefill/Decode Disaggregation" "Separating prefill and decode phases"
generate_stub "$DOCS_DIR/guides/wide-expert-parallelism.md" "Wide Expert Parallelism" "MoE models with expert parallelism"
generate_stub "$DOCS_DIR/guides/experimental/predicted-latency.md" "Predicted Latency Scheduling" "ML-based latency prediction for SLO-aware routing"
generate_stub "$DOCS_DIR/guides/experimental/batch-gateway.md" "Batch Gateway Guide" "Step-by-step guide for deploying batch inference"
generate_stub "$DOCS_DIR/guides/predicted-latency.md" "Predicted Latency" "Predicted latency scheduling guide"
generate_stub "$DOCS_DIR/guides/workload-autoscaling.md" "Workload Autoscaling" "Configuring autoscaling for inference workloads"

# Resources stubs
generate_stub "$DOCS_DIR/resources/gateway/index.md" "Gateway" "Gateway deployment and configuration guides"
generate_stub "$DOCS_DIR/resources/gateway/istio.md" "Istio" "Deploying llm-d with Istio gateway"
generate_stub "$DOCS_DIR/resources/gateway/gke.md" "GKE" "Deploying llm-d with GKE gateway"
generate_stub "$DOCS_DIR/resources/gateway/agentgateway.md" "Agent Gateway" "Deploying llm-d with Agent Gateway"
generate_stub "$DOCS_DIR/architecture/advanced/batch/index.md" "Batch Processing" "Asynchronous batch inference architecture"
generate_stub "$DOCS_DIR/architecture/advanced/batch/batch-gateway.md" "Batch Gateway" "Gateway for batch inference requests"
generate_stub "$DOCS_DIR/architecture/advanced/batch/async-processor.md" "Async Processor" "Asynchronous request processing component"
generate_stub "$DOCS_DIR/architecture/core/epp/datalayer.md" "Data Layer" "EPP data layer architecture"
generate_stub "$DOCS_DIR/architecture/advanced/disaggregation/index.md" "Disaggregation" "Prefill/decode disaggregation architecture"
generate_stub "$DOCS_DIR/architecture/advanced/disaggregation/configuration.md" "Disaggregation Configuration" "Configuration guide for disaggregated serving"
generate_stub "$DOCS_DIR/architecture/advanced/disaggregation/operations-vllm.md" "vLLM Operations" "vLLM-specific operations for disaggregated serving"
generate_stub "$DOCS_DIR/api-reference/index.md" "API Reference" "API specification and reference documentation"
generate_stub "$DOCS_DIR/api-reference/glossary.md" "Glossary" "Terminology and definitions for llm-d"
generate_stub "$DOCS_DIR/resources/configuring-user-facing-apis.md" "Configuring User-Facing APIs" "OpenAI-compatible API configuration"
generate_stub "$DOCS_DIR/resources/deploying-multiple-models.md" "Deploying Multiple Models" "Multi-model inference deployment"
generate_stub "$DOCS_DIR/resources/monitoring/metrics.md" "Metrics" "Prometheus metrics collection and configuration"
generate_stub "$DOCS_DIR/resources/monitoring/tracing.md" "Distributed Tracing" "Setting up distributed tracing with OpenTelemetry"
generate_stub "$DOCS_DIR/resources/profiling.md" "Profiling" "Performance profiling guides"
generate_stub "$DOCS_DIR/resources/rollout-new-version.md" "Rollout New Version" "Rolling out a new version of the inference service"
generate_stub "$DOCS_DIR/resources/rdma/rdma-configuration.md" "RDMA Configuration" "RDMA network configuration"

TOTAL=$(find "$DOCS_DIR" -name "*.md" | wc -l | tr -d ' ')
echo "==> Done. $TOTAL docs synced from llm-d/llm-d @ $BRANCH"

#!/usr/bin/env bash
# sync-docs.sh — Pull WiP docs from a specific branch of llm-d/llm-d
#
# Usage:
#   ./scripts/sync-docs.sh                    # sync from 'main'
#   ./scripts/sync-docs.sh release-0.5        # sync from 'release-0.5'
#   LLMD_REPO=/path/to/local/llm-d ./scripts/sync-docs.sh  # use local clone

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Source shared transformations
source "$SCRIPT_DIR/transformations.sh"

cp_doc() {
    if [[ -f "$1" && -n "$2" ]]; then
        cp "$1" "$2"
    fi
}

BRANCH="${1:-main}"
REPO_URL="https://github.com/llm-d/llm-d.git"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="$PROJECT_DIR/docs"
GUIDES_DIR="$PROJECT_DIR/guides"
STATIC_DIR="$PROJECT_DIR/static/img/docs"

echo "==> Syncing docs from llm-d/llm-d @ $BRANCH"

# Use local clone if LLMD_REPO is set, otherwise do a sparse checkout
if [[ -n "${LLMD_REPO:-}" ]]; then
    echo "    Using local repo: $LLMD_REPO"
    SRC="$LLMD_REPO"
    # ALWAYS fetch and reset to ensure we have the latest content from origin
    #echo "    Fetching latest $BRANCH from origin..."
    #(cd "$SRC" && git fetch origin "$BRANCH" --quiet && git reset --hard origin/"$BRANCH" --quiet)
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

# Directory check no longer needed - docs/ always exists in llm-d/llm-d

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
    "$DOCS_DIR/resources/gateway" \
    "$DOCS_DIR/resources/monitoring" \
    "$DOCS_DIR/resources/rdma" \
    "$DOCS_DIR/api-reference" \
    "$DOCS_DIR/accelerators"

echo "    Copying content..."

# === Getting Started ===
cp_doc "$WIP/getting-started/README.md"       "$DOCS_DIR/getting-started/index.md"
cp_doc "$WIP/getting-started/quickstart.md"   "$DOCS_DIR/getting-started/quickstart.md"
cp_doc "$WIP/getting-started/feature-matrix.md" "$DOCS_DIR/getting-started/feature-matrix.md"
cp_doc "$WIP/getting-started/artifacts.md"    "$DOCS_DIR/getting-started/artifacts.md"

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
cp_doc "$WIP/architecture/advanced/disaggregation/README.md"            "$DOCS_DIR/architecture/advanced/disaggregation/index.md"
cp_doc "$WIP/architecture/advanced/disaggregation/configuration.md"     "$DOCS_DIR/architecture/advanced/disaggregation/configuration.md"
cp_doc "$WIP/architecture/advanced/disaggregation/operations-vllm.md"   "$DOCS_DIR/architecture/advanced/disaggregation/operations-vllm.md"

# Architecture / Advanced
cp_doc "$WIP/architecture/advanced/latency-predictor.md" "$DOCS_DIR/architecture/advanced/latency-predictor.md"

# Architecture / Advanced / KV Management
cp_doc "$WIP/architecture/advanced/kv-management/README.md"                     "$DOCS_DIR/architecture/advanced/kv-management/index.md"
cp_doc "$WIP/architecture/advanced/kv-management/kv-indexer.md"                "$DOCS_DIR/architecture/advanced/kv-management/kv-indexer.md"
cp_doc "$WIP/architecture/advanced/kv-management/kv-offloader.md"              "$DOCS_DIR/architecture/advanced/kv-management/kv-offloader.md"
cp_doc "$WIP/architecture/advanced/kv-management/prefix-cache-aware-routing.md" "$DOCS_DIR/architecture/advanced/kv-management/prefix-cache-aware-routing.md"

# Architecture / Advanced / Autoscaling
cp_doc "$WIP/architecture/advanced/autoscaling/README.md"                       "$DOCS_DIR/architecture/advanced/autoscaling/index.md"
cp_doc "$WIP/architecture/advanced/autoscaling/wva.md"                         "$DOCS_DIR/architecture/advanced/autoscaling/workload-variant-autoscaling.md"
cp_doc "$WIP/architecture/advanced/autoscaling/hpa-keda.md"                    "$DOCS_DIR/architecture/advanced/autoscaling/igw-hpa.md"
cp "$WIP/architecture/advanced/autoscaling/"*.svg "$DOCS_DIR/architecture/advanced/autoscaling/" 2>/dev/null || true

# Architecture / Advanced / Batch
cp_doc "$WIP/architecture/advanced/batch/README.md"           "$DOCS_DIR/architecture/advanced/batch/index.md"
cp_doc "$WIP/architecture/advanced/batch/batch-gateway.md"    "$DOCS_DIR/architecture/advanced/batch/batch-gateway.md"
cp_doc "$WIP/architecture/advanced/batch/async-processor.md"  "$DOCS_DIR/architecture/advanced/batch/async-processor.md"

# === Guides (from well-lit-paths directory) ===
# Copy exactly what exists in source repo
cp_doc "$WIP/well-lit-paths/README.md"                    "$DOCS_DIR/guides/index.md"
cp_doc "$WIP/well-lit-paths/optimized-baseline.md"        "$DOCS_DIR/guides/optimized-baseline.md"
cp_doc "$WIP/well-lit-paths/precise-prefix-cache-aware.md" "$DOCS_DIR/guides/precise-prefix-cache-aware.md"
cp_doc "$WIP/well-lit-paths/tiered-prefix-cache.md"       "$DOCS_DIR/guides/tiered-prefix-cache.md"
cp_doc "$WIP/well-lit-paths/asynchronous-processing.md"   "$DOCS_DIR/guides/asynchronous-processing.md"
cp_doc "$WIP/well-lit-paths/flow-control.md"              "$DOCS_DIR/guides/flow-control.md"
cp_doc "$WIP/well-lit-paths/pd-disaggregation.md"         "$DOCS_DIR/guides/pd-disaggregation.md"
cp_doc "$WIP/well-lit-paths/predicted-latency.md"         "$DOCS_DIR/guides/predicted-latency.md"
cp_doc "$WIP/well-lit-paths/wide-expert-parallelism.md"   "$DOCS_DIR/guides/wide-expert-parallelism.md"
cp_doc "$WIP/well-lit-paths/workload-autoscaling.md"      "$DOCS_DIR/guides/workload-autoscaling.md"

# Experimental guides
mkdir -p "$DOCS_DIR/guides/experimental"
cp_doc "$WIP/well-lit-paths/experimental/batch-gateway.md" "$DOCS_DIR/guides/experimental/batch-gateway.md"

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
# PR #1259 moved gateway docs to guides/prereq/gateways/
cp_doc "$SRC/guides/prereq/gateways/istio.md"               "$DOCS_DIR/resources/gateway/istio.md"
cp_doc "$SRC/guides/prereq/gateways/gke.md"                 "$DOCS_DIR/resources/gateway/gke.md"
cp_doc "$SRC/guides/prereq/gateways/agentgateway.md"        "$DOCS_DIR/resources/gateway/agentgateway.md"
cp_doc "$WIP/resources/rdma/README.md"                      "$DOCS_DIR/resources/rdma/rdma-configuration.md"

# === API Reference ===
cp_doc "$WIP/api-reference/README.md"         "$DOCS_DIR/api-reference/index.md"
cp_doc "$WIP/api-reference/glossary.md"       "$DOCS_DIR/api-reference/glossary.md"
cp_doc "$WIP/api-reference/inferencepool.md"         "$DOCS_DIR/api-reference/inferencepool.md"
cp_doc "$WIP/api-reference/inferenceobjective.md"    "$DOCS_DIR/api-reference/inferenceobjective.md"
cp_doc "$WIP/api-reference/inferencemodelrewrite.md" "$DOCS_DIR/api-reference/inferencemodelrewrite.md"
cp_doc "$WIP/api-reference/endpointpickerconfig.md"  "$DOCS_DIR/api-reference/endpointpickerconfig.md"
cp_doc "$WIP/api-reference/epp-http-headers.md"      "$DOCS_DIR/api-reference/epp-http-headers.md"

# === Accelerators ===
cp_doc "$WIP/accelerators/README.md"                 "$DOCS_DIR/accelerators/index.md"

# === Deployment Guides ===
# Note: Deployment guides live in llm-d/guides/ and are linked via GitHub URLs
# See transformation section below that converts ../../guides/ links to GitHub

# === Assets ===
echo "    Copying image assets..."
mkdir -p "$STATIC_DIR"
cp "$ASSETS"/*.svg "$STATIC_DIR/" 2>/dev/null || true
cp "$ASSETS"/images/*.svg "$STATIC_DIR/" 2>/dev/null || true
cp "$ASSETS"/images/*.png "$STATIC_DIR/" 2>/dev/null || true
cp_doc "$WIP/resources/rdma/networking-stack.svg" "$STATIC_DIR/" 2>/dev/null || true
cp_doc "$WIP/architecture/core/images/flow_control_dashboard.png" "$STATIC_DIR/" 2>/dev/null || true
cp_doc "$WIP/architecture/advanced/autoscaling/hpa-architecture.svg" "$STATIC_DIR/" 2>/dev/null || true

# === Generate dark mode variants for all SVGs ===

# === Fix specific image paths for Docusaurus ===
echo "    Fixing specific image references..."
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace \
        -e 's|\(\.\.\/\)\{1,\}images/flow_control_dashboard\.png|/img/docs/flow_control_dashboard.png|g' \
        -e 's|networking-stack.svg|/img/docs/networking-stack.svg|g' \
        -e 's|hpa-architecture.svg|/img/docs/hpa-architecture.svg|g' \
        "$file"
done
# Note: Generic ../assets/ paths are handled by apply_transformations() below

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
        -e 's|\](/docs/guides/README)|\](/docs/guides)|g' \
        -e 's|\](/docs/experimental/batch-gateway)|\](/docs/guides/experimental/batch-gateway)|g' \
        -e 's|\](/docs/architecture/core/epp)|\](/docs/architecture/core/router/epp)|g' \
        -e 's|\](/docs/well-lit-paths/\([^)]*\)\.md)|\](/docs/guides/\1)|g' \
        -e 's|\](well-lit-paths/\([^)]*\))|\](/docs/guides/\1)|g' \
        -e 's|\](.*\/guides/tiered-prefix-cache)|\](https://github.com/llm-d/llm-d/tree/main/guides/tiered-prefix-cache)|g' \
        -e 's|\](.*\/guides/batch-gateway)|\](https://github.com/llm-d/llm-d/tree/main/guides/batch-gateway)|g' \
        -e 's|\](.*\/guides/asynchronous-processing)|\](https://github.com/llm-d/llm-d/tree/main/guides/asynchronous-processing)|g' \
        -e 's|\](.*\/guides/optimized-baseline)|\](https://github.com/llm-d/llm-d/tree/main/guides/optimized-baseline)|g' \
        -e 's|\](.*\/guides/precise-prefix-cache-aware)|\](https://github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-aware)|g' \
        -e 's|\](.*\/guides/pd-disaggregation)|\](https://github.com/llm-d/llm-d/tree/main/guides/pd-disaggregation)|g' \
        -e 's|\](.*\/guides/wide-ep-lws)|\](https://github.com/llm-d/llm-d/tree/main/guides/wide-ep-lws)|g' \
        -e 's|\](.*\/guides/predicted-latency-based-scheduling)|\](https://github.com/llm-d/llm-d/tree/main/guides/predicted-latency-based-scheduling)|g' \
        -e 's|\](.*\/guides/workload-autoscaling)|\](https://github.com/llm-d/llm-d/tree/main/guides/workload-autoscaling)|g' \
        -e 's|\](.*\/guides/flow-control)|\](https://github.com/llm-d/llm-d/tree/main/guides/flow-control)|g' \
        -e 's|\](/guides/tiered-prefix-cache)|\](https://github.com/llm-d/llm-d/tree/main/guides/tiered-prefix-cache)|g' \
        -e 's|\](/guides/batch-gateway)|\](https://github.com/llm-d/llm-d/tree/main/guides/batch-gateway)|g' \
        -e 's|\](/guides/asynchronous-processing)|\](https://github.com/llm-d/llm-d/tree/main/guides/asynchronous-processing)|g' \
        -e 's|\](/guides/optimized-baseline)|\](https://github.com/llm-d/llm-d/tree/main/guides/optimized-baseline)|g' \
        -e 's|\](/guides/precise-prefix-cache-aware)|\](https://github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-aware)|g' \
        -e 's|\](/docs/\([^)]*\)/README\.md)|\](/docs/\1)|g' \
        "$file"
done

# === Fix API reference links ===
# API reference pages link to each other with .md extensions
# Convert them to Docusaurus-compatible paths
echo "    Fixing API reference links..."
sed_inplace \
    -e 's|\](inferencepool\.md)|\](/docs/api-reference/inferencepool)|g' \
    -e 's|\](inferenceobjective\.md)|\](/docs/api-reference/inferenceobjective)|g' \
    -e 's|\](inferencemodelrewrite\.md)|\](/docs/api-reference/inferencemodelrewrite)|g' \
    -e 's|\](endpointpickerconfig\.md)|\](/docs/api-reference/endpointpickerconfig)|g' \
    -e 's|\](epp-http-headers\.md)|\](/docs/api-reference/epp-http-headers)|g' \
    -e 's|\](glossary\.md)|\](/docs/api-reference/glossary)|g' \
    "$DOCS_DIR/api-reference/index.md"

# === Fix architecture index.md relative paths ===
# When architecture/README.md becomes index.md, relative paths break
# Convert ./core/* and ./advanced/* to absolute paths with /architecture/ prefix
echo "    Fixing architecture index.md relative paths..."
sed_inplace \
    -e 's|\(\[.*\]\)(\./core/inferencepool)|\1(/docs/architecture/core/inferencepool)|g' \
    -e 's|\(\[.*\]\)(\./core/model-servers)|\1(/docs/architecture/core/model-servers)|g' \
    -e 's|\(\[.*\]\)(\./core/router/proxy)|\1(/docs/architecture/core/router/proxy)|g' \
    -e 's|\(\[.*\]\)(\./core/router/)|\1(/docs/architecture/core/router)|g' \
    -e 's|\(\[.*\]\)(\./core/router)|\1(/docs/architecture/core/router)|g' \
    -e 's|\(\[.*\]\)(\./core/router/epp/)|\1(/docs/architecture/core/router/epp)|g' \
    -e 's|\(\[.*\]\)(\./advanced/kv-management/)|\1(/docs/architecture/advanced/kv-management)|g' \
    -e 's|\(\[.*\]\)(\./advanced/kv-management)|\1(/docs/architecture/advanced/kv-management)|g' \
    -e 's|\](core/router/README\.md)|\](/docs/architecture/core/router)|g' \
    -e 's|\](core/router/epp/README\.md)|\](/docs/architecture/core/router/epp)|g' \
    -e 's|\](core/inferencepool\.md)|\](/docs/architecture/core/inferencepool)|g' \
    -e 's|\](core/model-servers\.md)|\](/docs/architecture/core/model-servers)|g' \
    -e 's|\](advanced/kv-management/README\.md)|\](/docs/architecture/advanced/kv-management)|g' \
    -e 's|\](/docs/core/router/README\.md)|\](/docs/architecture/core/router)|g' \
    -e 's|\](/docs/core/router/epp/README\.md)|\](/docs/architecture/core/router/epp)|g' \
    -e 's|\](/docs/advanced/kv-management/README\.md)|\](/docs/architecture/advanced/kv-management)|g' \
    "$DOCS_DIR/architecture/index.md"

# === Fix router index.md relative paths ===
# Similar issue with router/index.md
sed_inplace \
    -e 's|\](\.\/epp/)|\](/docs/architecture/core/router/epp)|g' \
    -e 's|\](\.\/epp)|\](/docs/architecture/core/router/epp)|g' \
    -e 's|\](epp/README\.md)|\](/docs/architecture/core/router/epp)|g' \
    -e 's|\](/docs/architecture/core/epp/README\.md)|\](/docs/architecture/core/router/epp)|g' \
    "$DOCS_DIR/architecture/core/router/index.md"

# === Clean up known issues ===
# Remove "NEEDS TO BE REDONE" from configuration.md
sed_inplace '/^NEEDS TO BE REDONE/d' "$DOCS_DIR/architecture/core/router/epp/configuration.md" 2>/dev/null || true

# Fix unclosed <br> tags (MDX requires self-closing tags)
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace 's|<br>|<br />|g' "$file"
done

# Fix email addresses in angle brackets (MDX interprets them as HTML tags)
# Replace <email@domain.com> with email@domain.com
find "$DOCS_DIR" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    sed_inplace 's|<\([^<>]*@[^<>]*\)>|\1|g' "$file"
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

# === Convert SVG images to theme-aware dual images ===

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

# Guides stubs (only for files that exist in source repo)
generate_stub "$DOCS_DIR/guides/index.md" "Guides" "Well-lit paths for production deployments"
generate_stub "$DOCS_DIR/guides/optimized-baseline.md" "Optimized Baseline" "Baseline deployment with intelligent routing"
generate_stub "$DOCS_DIR/guides/precise-prefix-cache-aware.md" "Precise Prefix Cache Aware" "Prefix-aware routing configuration"
generate_stub "$DOCS_DIR/guides/tiered-prefix-cache.md" "Tiered Prefix Cache" "Multi-tier KV cache management"
generate_stub "$DOCS_DIR/guides/asynchronous-processing.md" "Asynchronous Processing" "Batch and async inference workflows"
generate_stub "$DOCS_DIR/guides/flow-control.md" "Flow Control" "Admission control and queuing"
generate_stub "$DOCS_DIR/guides/pd-disaggregation.md" "Prefill/Decode Disaggregation" "Separating prefill and decode phases"
generate_stub "$DOCS_DIR/guides/predicted-latency.md" "Predicted Latency" "ML-based latency prediction"
generate_stub "$DOCS_DIR/guides/wide-expert-parallelism.md" "Wide Expert Parallelism" "MoE models with expert parallelism"
generate_stub "$DOCS_DIR/guides/workload-autoscaling.md" "Workload Autoscaling" "Configuring autoscaling for inference workloads"

# Resources stubs
generate_stub "$DOCS_DIR/resources/gateway/index.md" "Gateway" "Gateway deployment and configuration guides"
generate_stub "$DOCS_DIR/resources/gateway/istio.md" "Istio" "Deploying llm-d with Istio gateway"
generate_stub "$DOCS_DIR/resources/gateway/gke.md" "GKE" "Deploying llm-d with GKE gateway"
generate_stub "$DOCS_DIR/resources/gateway/agentgateway.md" "Agent Gateway" "Deploying llm-d with Agent Gateway"
generate_stub "$DOCS_DIR/architecture/advanced/batch/index.md" "Batch Processing" "Asynchronous batch inference architecture"
generate_stub "$DOCS_DIR/architecture/advanced/batch/batch-gateway.md" "Batch Gateway" "Gateway for batch inference requests"
generate_stub "$DOCS_DIR/architecture/advanced/batch/async-processor.md" "Async Processor" "Asynchronous request processing component"
generate_stub "$DOCS_DIR/architecture/core/router/epp/datalayer.md" "Data Layer" "EPP data layer architecture"
generate_stub "$DOCS_DIR/architecture/advanced/disaggregation/index.md" "Disaggregation" "Prefill/decode disaggregation architecture"
generate_stub "$DOCS_DIR/architecture/advanced/disaggregation/configuration.md" "Disaggregation Configuration" "Configuration guide for disaggregated serving"
generate_stub "$DOCS_DIR/architecture/advanced/disaggregation/operations-vllm.md" "vLLM Operations" "vLLM-specific operations for disaggregated serving"
generate_stub "$DOCS_DIR/architecture/advanced/kv-management/index.md" "KV Cache Management" "KV cache optimization and management"
generate_stub "$DOCS_DIR/architecture/advanced/kv-management/prefix-cache-aware-routing.md" "Prefix Cache Aware Routing" "Routing requests to maximize KV cache hits"
generate_stub "$DOCS_DIR/architecture/advanced/kv-management/kv-indexer.md" "KV-Cache Indexer" "Globally consistent KV cache block tracking"
generate_stub "$DOCS_DIR/architecture/advanced/kv-management/kv-offloader.md" "KV Offloader" "Tiered KV cache storage hierarchy"
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

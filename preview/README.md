# llm-d Documentation (Work in Progress)

> **This is a temporary documentation site for the next-generation llm-d docs.**
> The current stable documentation is at [llm-d.ai](https://llm-d.ai).

This site hosts the work-in-progress documentation for [llm-d](https://github.com/llm-d/llm-d), a Kubernetes-native distributed inference serving stack for LLMs.

## Development

```bash
npm install
npm start
```

This starts a local dev server at `http://localhost:3000/llm-d-docs-wip/`.

## Syncing Docs from llm-d/llm-d

Docs are synced from the upstream `llm-d/llm-d` repo before building. Run from the repo root:

```bash
# Clone from GitHub and build everything (CI/production)
npm run build:all

# Use a local llm-d clone (fast, no network required)
LLMD_REPO=~/repos/llm-d npm run build:all

# Use local clone but pull latest from origin first
LLMD_REPO=~/repos/llm-d LLMD_FETCH=1 npm run build:all
```

To sync docs only (without a full build):

```bash
# From the preview/ directory
LLMD_REPO=~/repos/llm-d bash scripts/sync-docs.sh
```

## Build

```bash
npm run build
```

## Deployment

The site is automatically deployed to GitHub Pages via GitHub Actions on push to `main`.

Published at: `https://llm-d.github.io/llm-d-docs-wip/`

## Structure

```
docs/
  getting-started/     # Introduction, quickstart, artifacts, feature matrix
  architecture/        # Core components and advanced features
    core/              # Proxy, InferencePool, Model Servers, EPP
    advanced/          # Disaggregation, KV-cache, Latency Predictor, Autoscaling
  guides/              # Deployment, monitoring, profiling guides
  well-lit-paths/      # Tested deployment recipes
  api-reference/       # API specification
  infrastructure-providers/  # AKS, GKE, OpenShift, DigitalOcean, Minikube
  observability/       # Prometheus, Grafana, tracing
```

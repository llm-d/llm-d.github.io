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

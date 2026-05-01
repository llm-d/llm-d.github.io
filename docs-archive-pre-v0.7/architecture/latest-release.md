---
title: "Latest Release: v0.6.0"
description: "llm-d v0.6.0 release - component versions and documentation"
sidebar_label: Latest Release
sidebar_position: 1
---

# llm-d v0.6.0

**Released**: April 3, 2026

**Full Release Notes**: [View on GitHub](https://github.com/llm-d/llm-d/releases/tag/v0.6.0)

The llm-d ecosystem consists of multiple interconnected components that work together to provide distributed inference capabilities for large language models.

## Components

| Component | Description | Repository | Version |
|-----------|-------------|------------|---------|
| **[Inference Scheduler](./Components/inference-scheduler)** | The scheduler that makes optimized routing decisions for inference requests to the llm-d inference framework. | [llm-d/llm-d-inference-scheduler](https://github.com/llm-d/llm-d-inference-scheduler) | [v0.7.1](https://github.com/llm-d/llm-d-inference-scheduler/releases/tag/v0.7.1) |
| **[Model Service](./Components/modelservice)** | `modelservice` is a Helm chart that simplifies LLM deployment on llm-d by declaratively managing Kubernetes resources for serving base models. It enables reproducible, scalable, and tunable model deployments through modular presets, and clean integration with llm-d ecosystem components (including vLLM, Gateway API Inference Extension, LeaderWorkerSet). | [llm-d-incubation/llm-d-modelservice](https://github.com/llm-d-incubation/llm-d-modelservice) | [llm-d-modelservice-v0.4.9](https://github.com/llm-d-incubation/llm-d-modelservice/releases/tag/llm-d-modelservice-v0.4.9) |
| **[Inference Simulator](./Components/inference-sim)** | A light weight vLLM simulator emulates responses to the HTTP REST endpoints of vLLM. | [llm-d/llm-d-inference-sim](https://github.com/llm-d/llm-d-inference-sim) | [v0.8.2](https://github.com/llm-d/llm-d-inference-sim/releases/tag/v0.8.2) |
| **[Infrastructure](./Components/infra)** | A helm chart for deploying gateway and gateway related infrastructure assets for llm-d. | [llm-d-incubation/llm-d-infra](https://github.com/llm-d-incubation/llm-d-infra) | [v1.4.0](https://github.com/llm-d-incubation/llm-d-infra/releases/tag/v1.4.0) |
| **[KV Cache](./Components/kv-cache)** | The libraries for tokenization, KV-events processing, and KV-cache indexing and offloading. | [llm-d/llm-d-kv-cache](https://github.com/llm-d/llm-d-kv-cache) | [v0.7.1](https://github.com/llm-d/llm-d-kv-cache/releases/tag/v0.7.1) |
| **[Benchmark Tools](./Components/benchmark)** | This repository provides an automated workflow for benchmarking LLM inference using the llm-d stack. It includes tools for deployment, experiment execution, data collection, and teardown across multiple environments and deployment styles. | [llm-d/llm-d-benchmark](https://github.com/llm-d/llm-d-benchmark) | [v0.3.0](https://github.com/llm-d/llm-d-benchmark/releases/tag/v0.3.0) |
| **[Workload Variant Autoscaler](./Components/workload-variant-autoscaler)** | Graduated from experimental to core component. Provides saturation-based autoscaling for llm-d deployments. | [llm-d-incubation/workload-variant-autoscaler](https://github.com/llm-d-incubation/workload-variant-autoscaler) | [v0.6.0](https://github.com/llm-d-incubation/workload-variant-autoscaler/releases/tag/v0.6.0) |
| **[Gateway API Inference Extension](https://github.com/kubernetes-sigs/gateway-api-inference-extension)** | A Helm chart to deploy an InferencePool, a corresponding EndpointPicker (epp) deployment, and any other related assets. | [kubernetes-sigs/gateway-api-inference-extension](https://github.com/kubernetes-sigs/gateway-api-inference-extension) | [v1.4.0](https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases/tag/v1.4.0) |

## Container Images

Container images are published to the [GitHub Container Registry](https://github.com/orgs/llm-d/packages).

```
ghcr.io/llm-d/<image-name>:<version>
```

| Image | Description | Version | Pull Command |
|-------|-------------|---------|--------------|
| [llm-d-cuda](https://github.com/llm-d/llm-d/pkgs/container/llm-d-cuda) | CUDA-based inference image for NVIDIA GPUs | v0.6.0 | `ghcr.io/llm-d/llm-d-cuda:v0.6.0` |
| [llm-d-xpu](https://github.com/llm-d/llm-d/pkgs/container/llm-d-xpu) | Intel XPU inference image | v0.6.0 | `ghcr.io/llm-d/llm-d-xpu:v0.6.0` |
| [llm-d-cpu](https://github.com/llm-d/llm-d/pkgs/container/llm-d-cpu) | CPU-only inference image (New in v0.5.0) | v0.6.0 | `ghcr.io/llm-d/llm-d-cpu:v0.6.0` |
| [llm-d-inference-scheduler](https://github.com/llm-d/llm-d-inference-scheduler/pkgs/container/llm-d-inference-scheduler) | Inference scheduler for optimized routing | v0.7.1 | `ghcr.io/llm-d/llm-d-inference-scheduler:v0.7.1` |
| [llm-d-routing-sidecar](https://github.com/llm-d/llm-d-inference-scheduler/pkgs/container/llm-d-routing-sidecar) | Routing sidecar for request redirection | v0.7.1 | `ghcr.io/llm-d/llm-d-routing-sidecar:v0.7.1` |
| [llm-d-inference-sim](https://github.com/llm-d/llm-d-inference-sim/pkgs/container/llm-d-inference-sim) | Lightweight vLLM simulator | v0.8.2 | `ghcr.io/llm-d/llm-d-inference-sim:v0.8.2` |
| [llm-d-aws](https://github.com/llm-d/llm-d/pkgs/container/llm-d-aws) | AWS inference image (Re-enabled in v0.5.1) | v0.6.0 | `ghcr.io/llm-d/llm-d-aws:v0.6.0` |
| [llm-d-rocm](https://github.com/orgs/llm-d/packages/container/package/llm-d-rocm) | ROCm inference image (New in v0.5.1) | v0.6.0 | `ghcr.io/llm-d/llm-d-rocm:v0.6.0` |
| [llm-d-hpu](https://github.com/orgs/llm-d/packages/container/package/llm-d-hpu) | HPU inference image (New in v0.5.1) | v0.6.0 | `ghcr.io/llm-d/llm-d-hpu:v0.6.0` |

## Getting Started

Each component has its own detailed documentation page accessible from the sidebar. For a comprehensive view of how these components work together, see the main [Architecture Overview](./architecture.mdx).

### Quick Links

- [Main llm-d Repository](https://github.com/llm-d/llm-d) - Core platform and orchestration
- [llm-d-incubation Organization](https://github.com/llm-d-incubation) - Experimental and supporting components
- [Full Release Notes](https://github.com/llm-d/llm-d/releases/tag/v0.6.0) - Release v0.6.0
- [All Releases](https://github.com/llm-d/llm-d/releases) - Complete release history

## Previous Releases

For information about previous versions and their features, visit the [GitHub Releases page](https://github.com/llm-d/llm-d/releases).

## Contributing

To contribute to any of these components, visit their respective repositories and follow their contribution guidelines. Each component maintains its own development workflow and contribution process.

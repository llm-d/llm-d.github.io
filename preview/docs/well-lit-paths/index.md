---
title: Well-Lit Paths
description: Documented, tested, and benchmarked deployment strategies for production LLM inference on Kubernetes
sidebar_position: 1
---

# Well-Lit Paths

A **well-lit path** is a documented, tested, and benchmarked solution of choice to reduce adoption risk and maintenance cost. These are the central best practices common to production deployments of large language model serving.

These paths are targeted at startups and enterprises deploying production LLM serving that want the best possible performance while minimizing operational complexity. State of the art LLM inference involves multiple optimizations that offer meaningful tradeoffs, depending on use case. The well-lit paths help identify those key optimizations, understand their tradeoffs, and verify the gains against your own workload.

We focus on the following use cases:

- Deploying a self-hosted LLM behind a single workload across tens or hundreds of nodes
- Running a production model-as-a-service platform that supports many users and workloads sharing one or more LLM deployments

## Paths

We currently offer the following tested and benchmarked paths to help you deploy large models:

- [**Intelligent Inference Scheduling**](./intelligent-inference-scheduling/index.md) -- Deploy vLLM behind the [Inference Gateway (IGW)](https://github.com/kubernetes-sigs/gateway-api-inference-extension) to decrease latency and increase throughput via precise prefix-cache aware routing and customizable scheduling policies.
- [**Prefill/Decode Disaggregation**](./prefill-decode-disaggregation.md) -- Reduce time to first token (TTFT) and get more predictable time per output token (TPOT) by splitting inference into prefill servers handling prompts and decode servers handling responses, primarily on large models and when processing very long prompts.
- [**Wide Expert Parallelism**](./wide-expert-parallelism.md) -- Deploy very large Mixture-of-Experts (MoE) models like DeepSeek-R1 and significantly reduce end-to-end latency and increase throughput by scaling up with Data Parallelism and Expert Parallelism over fast accelerator networks.
- [**Tiered Prefix Cache**](./tiered-prefix-cache.md) -- Increase prefix cache reuse, reduce TTFT, and increase throughput for long context or high concurrency workloads by adding tiered prefix cache (e.g., offloading to CPU memory) beyond accelerator memory. Tiered prefix cache can be combined with any of the paths above.
- [**Workload Autoscaling**](./workload-autoscaling.md) -- Scale model server deployments using inference-specific signals (queue depth, KV-cache utilization, running requests) instead of GPU utilization, with cost-optimized variant selection and scale-to-zero support.

llm-d builds entirely on upstream components -- it does not fork vLLM, the Gateway API, or LeaderWorkerSets. Requirements are driven directly into upstream projects, ensuring access to community regression testing, new optimizations, and resilience against rapid architectural shifts.

## Composability

Well-lit paths compose. Each path is a deployment primitive that can be combined with others:

- **Intelligent Scheduling** -- the foundation, always active, composes with every other path
- **P/D Disaggregation + Wide EP** -- the recommended configuration for frontier MoE models
- **Tiered Prefix Cache** -- layers onto any path to extend effective cache capacity
- **Workload Autoscaling** -- adds elastic scaling to any deployment

| Combination | Status |
|---|---|
| Scheduling + Tiered Cache | Validated |
| Scheduling + P/D Disaggregation | Validated |
| Scheduling + Wide EP | Validated |
| Scheduling + Autoscaling | Validated |
| P/D Disaggregation + Wide EP | Validated |
| Tiered Cache + P/D Disaggregation | In progress |
| Autoscaling + P/D Disaggregation | Planned |

## Deployment

Each page in this section covers what a path is, when to use it, key decisions, and operational guidance. For step-by-step deployment instructions, see the [deployment guides](https://github.com/llm-d/llm-d/tree/main/guides) -- tested and benchmarked recipes to serve large language models at peak performance with best practices common to production deployments. See each path's page and deployment guide for current hardware support.

> [!IMPORTANT]
> The deployment guides are intended to be a starting point for your own configuration and deployment of model servers. Both guides and their manifests depend on features provided and supported in the [vLLM](https://github.com/vllm-project/vllm) and [Inference Gateway](https://github.com/kubernetes-sigs/gateway-api-inference-extension) open source projects.

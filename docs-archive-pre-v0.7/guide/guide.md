---
title: Guides
description: "Getting started with llm-d and exploring well-lit paths for different use cases"
sidebar_label: Guides
sidebar_position: 1
keywords: [llm-d, guides, documentation, tutorials, distributed inference]
---

# Well-Lit Path Guides

Our well-lit path guides are documented, tested, and benchmarked recipes to serve LLMs with best-practices for high performance.

We currently offer the following:
1. [optimized baseline](/docs/guide/Installation/optimized-baseline) - Deploy vLLM with prefix-cache and load-aware routing enabled by the llm-d EPP. 
2. [optimized baseline - Precise Prefix Cache Routing](/docs/guide/Installation/precise-prefix-cache-aware) - Enhance optimized baseline with precise global indexing of the vLLM KV cache state.
3. [Prefill/Decode Disaggregation](/docs/guide/Installation/pd-disaggregation) - Split inference into specialized prefill and decode instances, improving throughput and quality of service stability for medium and large models like `openai/gpt-oss-120b`.
3. [Wide Expert-Parallelism](/docs/guide/Installation/wide-ep-lws) - Deploy large Mixture-of-Experts (MoE) models like `deepseek-ai/DeepSeek-R1` over mulple nodes via DP/EP configuration, increasing available KV cache space and throughput.
4. [Tiered Prefix Cache](/docs/guide/Installation/tiered-prefix-cache) - Offload KV caches beyond accelerator memory (e.g. to CPU or disk), increasing the "KV-working set size" for multi-turn inference request patterns.

:::info
These guides are intended to be a starting point for your own configuration and deployment of model servers. Our Helm charts provide basic reusable building blocks for vLLM deployments and inference scheduler configuration within these guides but will not support the full range of all possible configurations.
:::

## Experimental Guides

* [Predicted Latency](https://github.com/llm-d/llm-d/blob/main/guides/predicted-latency-based-scheduling/README.md) - enhance optimized baseline with real-time predictions of request latency (via an live-trained XGBoost model) rather than heuristic-based combinations of utilization metrics like queue depth or KV-cache utilization.
* [Workload Autoscaling](/docs/guide/Installation/workload-autoscaling) - autoscale the LLM service via proactive, SLO-aware signals that reflect the true state of the inference system — queue depth, in-flight request counts, and KV cache pressure — so that capacity can be added before end-user latency is impacted.
* [Asynchronous Processing](https://github.com/llm-d/llm-d/blob/main/guides/asynchronous-processing/README.md) - process inference requests asynchronously using a queue-based architecture. This is ideal for latency-insensitive batch workloads or for filling "slack" capacity in your inference pool.

:::note
New guides added to this list enable at least one of the core well-lit paths but may directly include prerequisite steps specific to new hardware or infrastructure providers without full abstraction. A guide added here is expected to eventually become part of an existing well-lit path.
:::

## Supporting Guides

Our supporting guides address common operational challenges with model serving at scale:

* [Simulating model servers](/docs/guide/Installation/simulated-accelerators) can deploy a vLLM model server simulator that allows testing optimized baseline and orchestration at scale as each instance does not need accelerators.
* [Benchmark](https://github.com/llm-d/llm-d/blob/main/helpers/benchmark.md) demonstrates how to use automation for running benchmarks against the llm-d stack.

:::info Content Source
This content is automatically synced from [guides/README.md](https://github.com/llm-d/llm-d/blob/main/guides/README.md) on the `main` branch of the llm-d/llm-d repository.

📝 To suggest changes, please [edit the source file](https://github.com/llm-d/llm-d/edit/main/guides/README.md) or [create an issue](https://github.com/llm-d/llm-d/issues).
:::


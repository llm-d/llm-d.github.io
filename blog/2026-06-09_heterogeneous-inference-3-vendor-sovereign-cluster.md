---
title: "Heterogeneous inference serving across three GPU vendors with llm-d"
description: "Benchmarking llm-d's prefix-cache-aware routing across three anonymized GPU vendor pools (A, B, C) on the NxtGen sovereign cloud — single-vendor and heterogeneous, with up to +91% throughput and 5.4× better TTFT vs plain Kubernetes round-robin."
slug: heterogeneous-inference-3-vendor-sovereign-cluster
date: 2026-06-09T09:00

authors:
  - praveinkannan
  - praveenjayachandran
  - jaikhari
  - varunraste
  - prasadmukhedkar
  - vinodpathangay
  - jayanthreddy
  - abhisyant

tags: [blog, inference, scheduling, kv-cache, sig-benchmarking]
---
# High-volume inference on a three-vendor sovereign cluster

Most production inference clusters today are single-vendor — not because it's an optimal design, but because it's the simplest way to configure a cluster.

That is starting to change. Procurement cycles bring new generations alongside older ones, supply constraints push teams across vendors, and the cost gap between accelerators makes a one-size-fits-all fleet increasingly expensive to defend. Real production fleets are accumulating heterogeneity whether or not the architecture planned for it.

This is an opportunity to unlock real value: lower-cost accelerators can absorb low-priority workloads while premium hardware handles latency-sensitive paths, stranded capacity gets reclaimed, and the organization is no longer held hostage to one supplier's roadmap or pricing. The case is stronger still for sovereign and on-premise deployments, where data residency, regulatory alignment, and the long-term economics of high-volume inference are pushing AI workloads off centralized hyperscaler stacks.

But making it work in practice is hard. Divergent driver stacks, firmware versions, container images, hardware-specific attention kernels, and the absence of standardized performance comparisons across accelerators all combine to make a coherent serving layer over a heterogeneous fleet a non-trivial systems problem.

<!-- truncate -->

## Setup

To evaluate llm-d on a heterogeneous environment, we ran experiments on the **NxtGen sovereign cloud's** mixed GPU environment, with the following accelerator pools within a single OpenShift AI cluster:

| Pool | Hardware | Count |
| :---- | :---- | :---- |
| Vendor A | 2 nodes, each with 2 GPUs | 4 |
| Vendor B | 1 node with 8 GPUs | 8 |
| Vendor C | 1 node with 8 GPUs | 8 |

All nodes are connected over a shared **100 G RoCE** network. We pinned each vLLM replica to a single accelerator card (TP = 1) to maximize the number of independent serving instances and exercise the routing layer.

Models served:

* `ibm-granite/granite-4.1-8b` — 8 B parameter, decoder-only dense transformer model
* `sarvamai/sarvam-30b` — 30 B MoE, Indic-multilingual model

The workload is the prefill-heavy `shared_prefix_synthetic` from [inference-perf](https://github.com/kubernetes-sigs/inference-perf): a long shared system prompt + short question + decode-tolerant output (~7.2K input tokens + 1K output tokens). This matches production RAG, chat, and citizen-services traffic profiles where prefix-cache routing has the most room to win.

## Prefix-aware caching

We deployed llm-d v0.0.7 with prefix-cache-aware routing in two flavours, picked per-model rather than per-pool: **`granite-4.1-8b` runs against the [precise prefix-cache scorer](https://github.com/llm-d/llm-d/tree/main/guides/precise-prefix-cache-routing)** (tokenizer-backed, exact prefix matching), and **`sarvam-30b` runs against the approximate prefix-cache scorer** (xxhash over raw prompt bytes, no tokenizer required). The precise scorer needs a tokenizer, but sarvam's custom HF code requires `trust_remote_code=True` — a flag the v0.8.0 llm-d-router images does not pass through the UDS tokenizer sidecar. The hash-based approximate scorer bridges that gap.

Each vendor's pods are deployed as a separate Helm release in the same namespace; only the `nodeSelector` and a small set of vendor-specific tuning flags (e.g. Vendor C's `--block-size 128`, `--max-num-seqs 256`, `VLLM_BUILD` pin) vary between releases. All pods carry the same selector labels and register with a single InferencePool maintained by llm-d's router. For the baseline, we use a ClusterIP service over the same set of pods to drive plain Kubernetes round-robin scheduling — **same pods, same vLLM, same flags; only the routing layer differs.**

Across every pool we tested — single-vendor (A-only, B-only, C-only) and heterogeneous (A+B, A+B+C) — **llm-d's prefix-cache-aware routing consistently wins over plain k8s round-robin** on both throughput and time-to-first-token (TTFT). The advantage grows with pool size and heterogeneity.

| Pool | Pods | Model | Throughput edge (llm-d vs k8s) | TTFT edge |
| :---- | :---- | :---- | :---- | :---- |
| Vendor A only | 4 GPUs | granite-4.1-8b | +25–36% | 16× |
| Vendor A only | 4 GPUs | sarvam-30b | 2× | 22× |
| Vendor B only | 8 GPUs | granite-4.1-8b | +79% | 21× |
| Vendor B only | 8 GPUs | sarvam-30b | +83% @ 200 qps (28.6 K vs 15.6 K out tok/s) | 5× |
| Vendor C only | 8 GPUs | granite-4.1-8b | +34% | 18× |
| Vendor A + B | 12 GPUs | granite-4.1-8b | +85% (19.4 K vs 10–11 K) | 3.4–5.6× |
| Vendor A + B | 12 GPUs | sarvam-30b | ~3× @ 200 qps | 2.85–4.54× |
| **Vendor A + B + C** | **20 GPUs** | **granite-4.1-8b** | **+91% @ 85 qps** | **5.4×** |

**Why llm-d wins biggest on heterogeneous pools:** k8s round-robin spreads requests evenly regardless of pod speed, so a single slow accelerator becomes a queueing sink that drags total throughput down. llm-d's prefix-cache-aware EPP routes around saturated pods and concentrates cache hits on warm ones, so heterogeneity is no longer a penalty.

:::note Workload caveat

`shared_prefix_synthetic` is a favourable regime for prefix-cache routing: all requests share the same long system prompt, so cache hit rate on llm-d approaches 100% once a prefix is warm on a pod. Results are strongest for workloads with high prefix reuse; gains can vary with prefix diversity.

:::

### Single-vendor pools — granite-4.1-8b

We start with the per-vendor baselines so the heterogeneous results below have a reference point. All runs use ~7.2K ISL + 1K OSL.

**4× Vendor A GPUs.** llm-d improves TTFT by up to 16× compared to k8s, and output throughput by 25–36%.

![Vendor A granite-4.1-8b: llm-d vs k8s round-robin](/img/blogs/heterogeneous-3vendor/vendor-a-granite.png)

**8× Vendor B GPUs.** llm-d delivers up to 21× better TTFT and +79% throughput vs k8s round-robin on this Vendor B-only granite deployment.

![Vendor B granite-4.1-8b: llm-d vs k8s round-robin](/img/blogs/heterogeneous-3vendor/vendor-b-granite.png)

**8× Vendor C GPUs.** At saturation (rate 25), llm-d delivers +34% throughput and ~18× better TTFT vs plain k8s round-robin.

![Vendor C granite-4.1-8b: llm-d vs k8s round-robin](/img/blogs/heterogeneous-3vendor/vendor-c-granite.png)

### Single-vendor pools — sarvam-30b (multilingual MoE)

**4× Vendor A GPUs.** llm-d delivers 2× the throughput and 22× better TTFT. k8s TTFT degrades sharply between rate 15-20 and is fully saturated by rate 25; llm-d keeps scaling.

![Vendor A sarvam-30b: llm-d vs k8s round-robin](/img/blogs/heterogeneous-3vendor/vendor-a-sarvam.png)

**8× Vendor B GPUs.** k8s throughput plateaus at ~17 K out tok/s (peak at rate 175) and declines to 15.6 K at rate 200, while llm-d keeps scaling to **28.6 K out tok/s at rate 200 — +83% over k8s at the same rate** (or +65% peak-vs-peak). TTFT-wise llm-d is up to 5× faster at lower rates.

![Vendor B sarvam-30b: llm-d vs k8s round-robin](/img/blogs/heterogeneous-3vendor/vendor-b-sarvam.png)

We were unable to run sarvam-30b on Vendor C: sarvam's `hotpatch_vllm.py` pins `vllm==0.15.0` and the upstream `sarvam.py` is written against vllm 0.15.x core APIs, but the llm-d image we tested for Vendor C ships a `vllm 0.16`-based fork (with vendor-C-specific patches). We plan to revisit with the llm-d community once the version mismatch is resolved.

### Heterogeneous pools — where llm-d wins biggest

**Vendor A + B (12 pods, granite-4.1-8b).** While k8s throughput plateaus at 10–11 K tok/s, llm-d goes up to 19.4 K — 85% higher throughput. TTFT-wise llm-d is 3.4–5.6× faster at higher rates.

![Vendor A + B mixed pool granite-4.1-8b: llm-d vs k8s round-robin](/img/blogs/heterogeneous-3vendor/vendor-ab-granite.png)

**Vendor A + B (12 pods, sarvam-30b).** llm-d brings down TTFT by 2.85–4.54× and increases throughput by close to 3× at rate 200. llm-d wins biggest in this mixed pool — round-robin is most punished by heterogeneous capacity, and llm-d's prefix-aware routing avoids this trap.

![Vendor A + B mixed pool sarvam-30b: llm-d vs k8s round-robin](/img/blogs/heterogeneous-3vendor/vendor-ab-sarvam.png)

**Vendor A + B + C (20 pods, granite-4.1-8b).** The 20-pod 3-vendor (A + B + C) pool delivers **14.2 K out tok/s peak with llm-d vs 9.6 K with k8s round-robin**. k8s saturates at rate 25 and *declines* to 7.5 K at rate 85 (queue depth dominates) — llm-d delivers **+91% throughput at the same load**. TTFT at rate 85: llm-d 6.8 s, k8s 36.4 s (**5.4× better**).

![3-vendor (A + B + C) granite-4.1-8b: llm-d vs k8s round-robin](/img/blogs/heterogeneous-3vendor/vendor-abc-granite.png)

The rate ladder stopped at 85 QPS because the single-replica EPP became CPU-bound, not because the pool saturated. EPP work scales with `pod_count × QPS`, so the 20-pod 3-vendor (A + B + C) pool hits the CPU ceiling well before a smaller single-vendor pool at the same QPS. Per-pod throughput here sums to ~25 K, so the true pool ceiling is likely higher; EPP horizontal scaling (replicas: 1 → 2) or a higher CPU limit would unblock it further.

## What's next

**Cross-accelerator P/D disaggregation.** We plan to take heterogeneous inference to the next level by enabling prefill and decode to run on mixed accelerator types within the same cluster — for example, routing compute-heavy prefill to one vendor's nodes and memory-bandwidth-intensive decode to another's (or vice versa), based on where each phase runs most efficiently. This requires the KV cache transfer library to work across different GPU vendors on each end, an active area of development in the llm-d community.

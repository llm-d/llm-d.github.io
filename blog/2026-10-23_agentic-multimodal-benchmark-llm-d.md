---
title: "Benchmarking Multi-Turn Multimodal Serving in llm-d"
description: "Evaluating llm-d's multimodal token-aware router against NVIDIA Dynamo's Multimodal KV Router (agg_multimodal_router) and a Kubernetes Service across 90 runs (concurrency 8 to 4,096) on 16× NVIDIA H200 GPUs serving Qwen3-VL-32B-Instruct on real e-commerce shopping sessions (MMShopBench)."
slug: agentic-multimodal-benchmark-llm-d
date: 2026-10-23T09:00

authors:
  - chenghsiangchiu
  - xiyue
  - kaushikmitra

tags: [blog, multimodal, agentic-inference, scheduling, vllm]
---

# Benchmarking Multi-Turn Multimodal Serving in llm-d

*How two-stage multimodal prefix affinity turns an 89.7% cache hit rate into 2.85× effective H200 compute on real multi-turn shopping workloads*

In two recent posts—[*Sticky Until Saturated: Token-Aware Routing in llm-d*](/blog/sticky-until-saturated-token-aware-routing) and [*Serving Multimodal at Scale in llm-d*](/blog/serving-multimodal-at-scale-in-llm-d)—we introduced the two core building blocks of llm-d's multimodal routing stack:
1. **Dynamic Multimodal Token Estimation (token-producer)**: Parsing inline image dimensions directly at the router and pricing each visual asset in model-native spatial patches (32 × 32 px = 1,024 px² per token for Qwen3-VL) without running a GPU or Python tokenizer on the hot path.
2. **Two-Stage Sticky Multimodal Affinity (prefix-cache-affinity-filter + token-load-scorer)**: Keeping multi-turn multimodal sessions pinned to the replica holding their prior Key-Value (KV) and Vision Transformer (ViT) caches whenever prefix overlap clears a retuned multimodal threshold (affinityThreshold: 0.6), up to a calibrated saturation release (maxTTFTPenaltyMs: 36000).

Synthetic single-turn benchmarks on fixed image groups showed promising early gains. However, production multimodal assistants do not behave like synthetic single-turn benchmarks. Real users conduct **multi-turn conversations** (3 to 19 turns long), carry cumulative visual and text histories across turns, and frequently **upload new photos mid-conversation** (on Turn 2, Turn 3, or later) to compare products or refine visual searches.

To evaluate how llm-d performs under realistic production traffic—and how its two-stage filter-then-score design compares against other multimodal KV routers—we ran a 90-run head-to-head benchmark on 16 × NVIDIA H200 (141 GB) GPUs (8 replicas × TP=2 serving Qwen/Qwen3-VL-32B-Instruct on vLLM v0.30.0) using real multi-turn e-commerce logs from [**MMShopBench**](https://huggingface.co/datasets/kellyhao/mmshopbench) across 10 concurrency levels (c = 8 to 4,096 concurrent sessions). We compared three routing layers on the exact same GPU fleet:
* **Arm A — llm-d Multimodal Router (aggregation-epp)**: Two-stage prefix-cache-affinity-filter (affinityThreshold: 0.6, maxTTFTPenaltyMs: 36000) + token-load-scorer + dynamic token-producer (factor: 1024).
* **Arm B — K8s Service**: Standard stateless Kubernetes ClusterIP (kube-proxy) round-robin across the 8 vLLM replicas.
* **Arm C — NVIDIA Dynamo KV Router (ai-dynamo v1.5.1, [agg_multimodal_router.sh](https://github.com/ai-dynamo/dynamo/blob/main/examples/backends/vllm/launch/agg_multimodal_router.sh))**: Dynamo's official Default Rust Multimodal Frontend (--router-mode kv --router-kv-events) paired with real-time ZMQ KV-cache event streaming from all 8 workers.

:::info[Headline results]

* **85.3%–89.7% Multimodal Prefix-Cache Hit Rate**: Across c = 8..4096, llm-d sustains an 85.3%–89.7% vLLM prefix-cache hit rate (89.7% at peak throughput c = 4096), outperforming NVIDIA Dynamo's Multimodal KV Router (69.3%–83.0%) by **11%–16%** and K8s Service (49.0%–63.8% at c ≥ 128) by up to **36%**.
* **+20.0% Higher Peak Total Token Throughput (+54.0% vs. K8s Service) & Up to 2.60× Faster Median TTFT**: At c = 4096, llm-d delivers 121,280.2 total tokens/sec with a 311.85 ms TTFT p50 and 92.43 ms ITL p50—cutting median TTFT by **36%** vs. Dynamo (487.21 ms) and **36.4%** vs. K8s Service (490.01 ms), while achieving up to **1.80×** faster TTFT p50 than Dynamo (61.02 ms vs. 109.93 ms at c = 256) and **2.60×** faster than K8s Service (158.41 ms).
* **The H200 Roofline Revelation (2.85× Effective Compute Multiplier)**: A hardware Roofline analysis reveals that at c = 4096, all three routers saturate the 16 H200 GPUs at the exact same physical compute ceiling (360.6–372.9 Physical TFLOPS/replica). The difference is *what those FLOPs are spent on*: K8s Service wastes 51.4% of its physical GPU compute (185.3 TFLOPS/replica) and Dynamo spends 36.2% (134.9 TFLOPS/replica) recomputing missed prefixes and ViT image encodings, whereas llm-d spends 78.7% of its physical GPU compute (285.0 TFLOPS/replica) generating decode tokens—achieving 1,030.3 Effective Logical TFLOPS/replica (2.85× physical GPU compute).

:::

<!-- truncate -->

---

## 1. The Workload: Why Multi-Turn Multimodal Agents (MMShopBench) Stress-Test Routers

Most multimodal serving benchmarks replay single-turn image captioning requests where every prompt has an identical shape. By contrast, [kellyhao/mmshopbench](https://huggingface.co/datasets/kellyhao/mmshopbench) (*MMShopBench: A Real-Log Benchmark for Multimodal, Multi-Turn Shopping Agents*) captures real e-commerce shopping sessions where users upload product photos and iteratively compare styles, prices, and attributes across multiple turns.

| Workload Property | MMShopBench Empirical Value | Why It Matters for Multimodal Routing |
| :--- | :--- | :--- |
| **Conversations & Turns** | 288 unique sessions (1,301 turns; 3 to 19 turns/session, mean 4.52 turns) | Turn 1 (~22% of requests) is a cold miss for unique session histories; Turns 2–19 (~78% of requests) carry deep cumulative text + visual histories. |
| **Real User Product Photos** | 400 RGB JPEGs with variable resolutions & aspect ratios | Variable dimensions exercise Qwen3-VL's dynamic spatial patch merger (32 × 32 px per visual token) rather than synthetic fixed-size images. |
| **Multi-Image Sessions** | 26.7% of sessions accumulate 2 to 5 images across turns | Cumulative prompts grow to thousands of visual + text tokens by Turns 3–10. |
| **Later-Turn Image Uploads** | 113 / 400 image turns (28.3%) occur on Turn 2+ | The decisive router stress test: when a user uploads a *second* photo on Turn 2 or 3, the new uncached image tokens dilute the cached prefix fraction of the request. |

We replayed MMShopBench using NVIDIA AIPerf (v0.8.0) in multi-turn (WITHOUT_RESPONSES) mode with a 2,000 ms mean inter-turn user think delay, scaling from c = 8 to c = 4,096 concurrent sessions (max(576, 2 × c) sessions per run—up to 9,216 sessions / ~41,632 turns per iteration at c = 4,096). Each (Concurrency, Arm) point was run for 3 independent iterations with matched random seeds (90 runs total) and a complete cold-cache wipe (KV cache, 20 GB CPU multimodal processor cache, GPU ViT encoder cache, and router radix tree) between every run.

---

## 2. Two Multimodal KV Routing Philosophies: llm-d vs. NVIDIA Dynamo

Both **Arm A (llm-d)** and **Arm C (NVIDIA Dynamo v1.5.1)** are multimodal-aware KV routers deployed in front of identical 8 × TP=2 Qwen/Qwen3-VL-32B-Instruct (vLLM v0.30.0, with prefix caching and a 20 GB multimodal processor cache) workers. Why, then, does llm-d sustain an **85.3%–89.7%** prefix-cache hit rate while Dynamo achieves **69.3%–83.0%**?

Let's examine how each router processes a multi-turn multimodal request.

### How NVIDIA Dynamo's Multimodal KV Router Works

NVIDIA Dynamo provides two multimodal KV routing paths for vLLM (--router-mode kv):
1. **Default Rust Frontend (Used in Arm C)**: Recommended by Dynamo for models in its compiled-in Rust llm-multimodal (lightseek_mm) registry, which includes Qwen3-VL. It avoids running Python HuggingFace image processors under the GIL in the frontend pod.
2. **Python Chat Processor**: Runs vLLM's full Python PIL/HuggingFace processor in the frontend and transfers pre-rendered tensors via /dev/shm or NIXL (intended for models outside the Rust registry).

In the recommended **Default Rust Frontend** path:
1. **Media Identity (mm_hash) & Header Inspection**: When an OpenAI /v1/chat/completions request arrives with an inline base64 JPEG data URI, Dynamo's Rust frontend computes a 64-bit xxh3 hash (mm_hash) over the URI string, parses the JPEG (width, height) header without decoding pixel bytes, looks up qwen3_vl in its Rust ModelProcessorSpec registry, expands the &lt;|image_pad|&gt; token (151655) into ⌈H / 32⌉ × ⌈W / 32⌉ tokens in a routing-only token view, and attaches BlockExtraInfo (block_mm_infos) to each 16-token KV block hash.
2. **Backend UUID Forwarding & ZMQ Event Sync**: The frontend forwards mm_hashes to the selected worker, which passes them to vLLM as multi_modal_uuids so the worker's ZMQ KV-cache events (tcp://*:5557) publish matching block hashes back to the frontend.
3. **Single-Stage Linear Cost Scoring**: To pick a worker w in 1..8, Dynamo's dynamo_kv_router evaluates a **single-stage linear cost formula**:
   cost(w) = w_overlap × (total_blocks − overlap_blocks(w)) + active_decode_load(w)
   with a default router_kv_overlap_score_weight (w_overlap = 1.0).

### How llm-d's Multimodal Router Works

llm-d's Endpoint Picker (EPP) executes a **two-stage filter-then-score pipeline** configured declaratively in [aggregation.values.yaml](https://github.com/llm-d/llm-d/blob/main/guides/multimodal-serving/aggregation/router/aggregation.values.yaml):

```yaml
plugins:
  - type: token-producer
    parameters:
      estimate:
        image:
          mode: dynamic
          defaultResolution:
            width: 1280
            height: 720
          dynamic:
            factor: 1024          # 32x32 px per visual token for Qwen3-VL
  - type: approx-prefix-cache-producer
  - type: inflight-load-producer
  - type: prefix-cache-affinity-filter
    parameters:
      affinityThreshold: 0.60     # Lowered from 0.80 so Turn 2+ image uploads stay sticky
      peakPrefillThroughput: 15751
      maxTTFTPenaltyMs: 36000     # Doubled from 18s to absorb ViT encoding bursts
  - type: token-load-scorer
```

### Why llm-d Achieves 11%–16% Higher Prefix-Cache Hit Rate Than Dynamo

The **11%–16% cache-hit gap** between llm-d (85.3%–89.7%) and Dynamo (69.3%–83.0%) stems from two architectural differences:

| Architectural Dimension | llm-d Multimodal Router (aggregation-epp) | NVIDIA Dynamo Multimodal KV Router (agg_multimodal_router.sh) |
| :--- | :--- | :--- |
| **1. Session Stickiness Under Turn 2+ Image Uploads (28.3% of Image Turns)** | **Two-Stage Affinity Gate**:<br/>Stage 1 (prefix-cache-affinity-filter) strictly locks candidate selection to warm pods whenever hit_ratio(w) ≥ 0.60 and estimated queue wait is ≤ 36 s. When a user uploads a second photo on Turn 2 or 3 (dropping the cached prefix ratio from ~95% to ~65–75%), 0.65 ≥ 0.60 still clears the gate—**cold pods are completely excluded** from Stage 2. | **Single-Stage Linear Trade-Off**:<br/>Has no hard affinity filter gate and weights a cached image block (1.0) identically to a cheap text block (ignoring GPU ViT vision-encoder recomputation cost). When a Turn 2+ photo reduces overlap_blocks to 65–75% while the home pod has a transient queue spike, cost(w_cold) is lower than cost(w_warm), causing Dynamo to deflect the session to a cold worker. |
| **2. Separate K8s Frontend Pod Model Config Dependency** | **Zero Model-File Dependency**:<br/>token-producer (mode: dynamic, factor: 1024) computes Qwen3-VL visual token counts directly from inline JPEG headers via YAML config. | **Frontend model_dir Dependency**:<br/>lightseek_mm attempts to read a local filesystem model_dir (config.json / preprocessor_config.json) derived from the worker's ModelDeploymentCard (MDC) in etcd. In multi-pod K8s deployments where the separate CPU-only dynamo-frontend pod does not mount the worker's local HF snapshot path, lightseek_mm disables MM-aware layout expansion and degrades to text-prefix matching unless model configs are mounted on the frontend pod. |

---

## 3. Empirical Results Across 90 Runs (c = 8 to 4,096 on 16 × NVIDIA H200)

All metrics below report the **3-iteration mean ± standard deviation** across the concurrency sweep (0 failed requests across all 90 runs):

| Concurrency | Arm | TTFT p50 (ms) | ITL p50 (ms) | Total Token Throughput (tok/s) | vLLM Prefix Cache Hit (%) |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **8** | **Arm A (llm-d)** | 43.97 ± 0.56 | 10.99 ± 0.01 | 2,464.8 ± 2.6 | **85.5%** |
| 8 | Arm C (dynamo) | 48.80 ± 0.15 | **10.84 ± 0.00** | **2,500.6 ± 2.0** | 83.0% |
| 8 | Arm B (k8s) | **43.34 ± 0.48** | 11.05 ± 0.08 | 2,451.9 ± 16.2 | 81.5% |
| **32** | **Arm A (llm-d)** | 49.63 ± 0.14 | **11.45 ± 0.02** | **8,962.5 ± 5.2** | **85.5%** |
| 32 | Arm C (dynamo) | 53.73 ± 0.26 | 11.50 ± 0.01 | 8,853.9 ± 13.0 | 75.7% |
| 32 | Arm B (k8s) | **48.82 ± 0.22** | 11.70 ± 0.11 | 8,754.5 ± 99.5 | 76.3% |
| **128** | **Arm A (llm-d)** | **54.60 ± 0.57** | **13.40 ± 0.02** | **24,361.2 ± 121.1** | **85.3%** |
| 128 | Arm C (dynamo) | 74.43 ± 1.67 | 14.46 ± 0.04 | 23,060.9 ± 139.0 | 71.4% |
| 128 | Arm B (k8s) | 114.78 ± 3.66 | 15.27 ± 0.06 | 21,696.2 ± 216.2 | 59.2% |
| **256** | **Arm A (llm-d)** | **61.02 ± 0.23** | **15.19 ± 0.04** | **30,996.9 ± 306.3** | **85.4%** |
| 256 | Arm C (dynamo) | 109.93 ± 1.10 | 17.69 ± 0.10 | 28,409.4 ± 182.0 | 69.3% |
| 256 | Arm B (k8s) | 158.41 ± 3.56 | 20.57 ± 0.15 | 25,599.5 ± 107.2 | 49.0% |
| **512** | **Arm A (llm-d)** | **75.40 ± 0.44** | **19.24 ± 0.15** | **50,130.4 ± 234.6** | **87.3%** |
| 512 | Arm C (dynamo) | 121.74 ± 5.74 | 23.28 ± 0.40 | 45,302.9 ± 433.8 | 73.4% |
| 512 | Arm B (k8s) | 166.48 ± 3.30 | 26.72 ± 0.16 | 39,637.8 ± 285.9 | 58.6% |
| **1024** | **Arm A (llm-d)** | **111.40 ± 0.49** | **27.99 ± 0.28** | **75,696.0 ± 1,749.2** | **88.4%** |
| 1024 | Arm C (dynamo) | 163.64 ± 4.10 | 35.07 ± 0.17 | 66,888.9 ± 430.1 | 76.1% |
| 1024 | Arm B (k8s) | 209.62 ± 4.85 | 42.68 ± 0.44 | 55,687.6 ± 25.9 | 60.9% |
| **2048** | **Arm A (llm-d)** | **185.52 ± 1.60** | **47.93 ± 0.78** | **103,354.4 ± 1,894.8** | **89.2%** |
| 2048 | Arm C (dynamo) | 253.44 ± 2.38 | 61.66 ± 0.21 | 87,155.8 ± 85.7 | 77.8% |
| 2048 | Arm B (k8s) | 308.09 ± 6.64 | 75.75 ± 1.28 | 68,622.0 ± 203.2 | 62.1% |
| **4096** | **Arm A (llm-d)** | **311.85 ± 1.61** | **92.43 ± 0.99** | **121,280.2 ± 2,853.3** | **89.7%** |
| 4096 | Arm C (dynamo) | 487.21 ± 2.36 | 116.54 ± 0.09 | 101,060.3 ± 174.7 | 78.3% |
| 4096 | Arm B (k8s) | 490.01 ± 9.07 | 141.86 ± 0.54 | 78,759.3 ± 800.5 | 63.8% |

*(Full 10-concurrency table including c = 16 and c = 64 is available in the [complete benchmark report](https://github.com/cheng-hsiang-chiu/benchmarking_llmd/blob/main/llmd_k8s_dynamo_aggredated_agentic_multimodal/results/MMSHOPBENCH_LLMD_MULTIMODAL_BENCHMARK_REPORT.md).)*

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/agentic-multimodal-benchmarking/ttft_p50_vs_concurrency.png" alt="TTFT p50 vs. Concurrency across llm-d Multimodal Router, NVIDIA Dynamo KV Router, and K8s Service" style={{width: '100%', height: 'auto'}} />
</div>

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/agentic-multimodal-benchmarking/total_token_throughput_vs_concurrency.png" alt="Total Token Throughput vs. Concurrency" style={{width: '100%', height: 'auto'}} />
</div>

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/agentic-multimodal-benchmarking/itl_p50_vs_concurrency.png" alt="Inter-Token Latency p50 vs. Concurrency" style={{width: '100%', height: 'auto'}} />
</div>

### Key Takeaways from the Concurrency Sweep

1. **Up to 2.60× Lower Median TTFT (TTFT p50) Across the Concurrency Sweep**:
   Starting at c = 128, every cache miss on Turn 2+ forces the target worker to re-run Qwen3-VL's 32-layer Vision Transformer (ViT) and language-model prefill over all prior images and text. At c = 256, llm-d holds TTFT p50 at 61.02 ms, compared to 109.93 ms on Dynamo (**1.80×** faster) and 158.41 ms on K8s Service (**2.60×** faster). At peak concurrency (c = 4,096), llm-d maintains a 311.85 ms TTFT p50 while delivering 121,280.2 total tok/s, cutting median TTFT by **36.0%** vs. Dynamo (487.21 ms) and **36.4%** vs. K8s Service (490.01 ms).
2. **Why Better Multimodal Prefix Routing Also Cuts Decode Inter-Token Latency (ITL p50)**:
   In aggregated serving (where Encode, Prefill, and Decode share the same GPUs), every redundant ViT pass and uncached prefill steals GPU SMs and HBM3e bandwidth from active decode batches. By eliminating redundant Turn 2+ prefills and steering heavy Turn 1 image prefills via token-load-scorer, llm-d reduces ITL p50 at c = 4,096 to 92.43 ms—beating Dynamo (116.54 ms, **-20.7%**) and K8s Service (141.86 ms, **-34.8%**).

---

## 4. Hardware & Serving Roofline Analysis

A natural question when seeing a **+20.0% throughput gain over Dynamo** and **+54.0% over K8s Service** at c = 4,096 is: *Are the GPUs under Dynamo or K8s Service sitting idle, or are all 16 H200 GPUs working equally hard?*

To answer this rigorously, we modeled each TP=2 replica (2 × NVIDIA H200 141 GB) using a **Hardware Roofline Model** alongside the **Serving Throughput–Interactivity Pareto Frontier**.

### Hardware & Model Constants (1 Replica = 2 × NVIDIA H200)
* **Peak Dense BF16 Tensor Core Compute (P<sub>peak</sub>)**: 2 × 989 TFLOPS = 1,978 TFLOPS/replica (15.82 PFLOPS across 8 replicas).
* **Peak HBM3e Memory Bandwidth (BW<sub>peak</sub>)**: 2 × 4.8 TB/s = 9.6 TB/s/replica (76.8 TB/s across 8 replicas).
* **Hardware Ridge Point (AI<sub>ridge</sub>)**: 1,978 TFLOPS / 9.6 TB/s ≈ 206.0 FLOPs/Byte.
* **Qwen3-VL-32B-Instruct (BF16) Per-Token Cost**:
  * **Weights (W<sub>LLM</sub>)**: 32.8 × 10⁹ params × 2 Bytes = 65.6 GB streamed per decode step across the TP=2 replica, plus 262.1 KB/token of KV cache (64 layers × 2 × 8 KV heads × 128 head dim × 2 Bytes).
  * **FLOPs per Token**: Derived directly from first principles (2 × N<sub>params</sub> linear weight projections + causal attention + amortized 32-layer ViT encoding), each decode token requires C<sub>decode</sub> ≈ 66.6 GFLOPs and each uncached prefill token requires C<sub>prefill</sub> ≈ 68.5 GFLOPs.

For each replica with output token rate R<sub>out</sub>, input token rate R<sub>in</sub>, and prefix-cache hit rate h in [0, 1], we distinguish between **Physical GPU Compute (P<sub>phys</sub>)** (the actual BF16 Tensor Core FLOPs executed by the silicon on uncached prefill tokens 1 − h plus decode tokens) and **Effective Logical Compute (P<sub>eff</sub>)** (the total logical workload completed, including prefill FLOPs skipped via KV prefix cache hits):

* **P<sub>phys</sub> (TFLOPS/replica)** = [ C<sub>decode</sub> × R<sub>out</sub> + C<sub>prefill</sub> × (1 − h) × R<sub>in</sub> ] / 1000
* **P<sub>eff</sub> (TFLOPS/replica)** = [ C<sub>decode</sub> × R<sub>out</sub> + C<sub>prefill</sub> × R<sub>in</sub> ] / 1000

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/agentic-multimodal-benchmarking/hardware_roofline.png" alt="Hardware & Effective Roofline Analysis on TP=2 NVIDIA H200 SXM" style={{width: '100%', height: 'auto'}} />
</div>

### Two Hardware Regimes Across c = 8 .. 4,096

#### Regime 1: The HBM3e Memory-Bandwidth Floor (c = 8 .. 32, AI<sub>phys</sub> = 1.3–5.9 FLOPs/Byte)
At low concurrency (c = 8), each of the 8 replicas has an active decode batch size of B<sub>dec</sub> ≈ 1.0 (AI<sub>phys</sub> ≈ 1.3 FLOPs/Byte ≪ 206 FLOPs/Byte). Streaming 65.6 GB of BF16 weights at achievable HBM3e bandwidth (~7.2–7.7 TB/s) takes 8.5–9.1 ms, plus 1.0–1.4 ms for 128 TP=2 NVLink AllReduce operations, setting a hard physical floor of ~9.5–10.5 ms/token. All three routers sit right on this HBM3e bandwidth slope at c = 8 (10.84–11.05 ms ITL p50, or 90.5–92.3 tok/s/user).

#### Regime 2: Prefix Caching as an Effective Compute Multiplier at the Physical GPU Ceiling (c = 128 .. 4,096)
Look closely at the Physical GPU Compute vs. Effective Logical Compute at c = 4,096 in the Roofline plot above:

| Metric at Peak Throughput (c = 4,096) | Arm A: llm-d Multimodal Router | Arm C: NVIDIA Dynamo (agg_multimodal_router) | Arm B: K8s Service |
| :--- | :---: | :---: | :---: |
| **Prefix-Cache Hit Rate (h)** | **89.7%** | 78.3% | 63.8% |
| **Uncached Prefill Miss Fraction (1 − h)** | **10.3%** | 21.7% (2.11× higher) | 36.2% (3.51× higher) |
| **Physical GPU Compute (P<sub>phys</sub>, Hollow Markers)** | **362.1 TFLOPS/rep** | **372.9 TFLOPS/rep** | **360.6 TFLOPS/rep** |
| — *Physical GPU FLOPs Spent on Uncached Prefill + ViT* | **77.1 TFLOPS (21.3%)** | 134.9 TFLOPS (36.2%) | 185.3 TFLOPS (51.4%) |
| — *Physical GPU FLOPs Spent on Useful Decode* | **285.0 TFLOPS (78.7%)** | 238.0 TFLOPS (63.8%) | 175.3 TFLOPS (48.6%) |
| **Effective Logical Compute (P<sub>eff</sub>, Solid Markers)** | **1,030.3 TFLOPS/rep (2.85×)** | 858.5 TFLOPS/rep (2.30×) | 669.1 TFLOPS/rep (1.86×) |
| **Total Throughput per H200 GPU** | **7,580.0 tok/s/H200** | 6,316.3 tok/s/H200 | 4,922.5 tok/s/H200 |

This is the central hardware insight of the benchmark:
1. **All three arms hit the exact same physical H200 compute ceiling (~361–373 Physical TFLOPS/replica)** at c = 4,096 (accounting for FlashAttention/ViT kernel efficiency, TP=2 NVLink AllReduce, and mixed prefill-decode tile scheduling). The GPUs under Dynamo and K8s Service are **not** idle—they are running at 100% saturation.
2. **Where the FLOPs go determines serving throughput**: Because K8s Service misses the cache on 36.2% of input tokens, it burns more than half (51.4%) of its physical GPU FLOPs recomputing old turns' prefill and ViT encodings. Dynamo burns 36.2% of its physical FLOPs on uncached prefill. By holding the uncached miss rate to just 10.3%, llm-d dedicates 78.7% of physical GPU compute to decode, breaking through the physical GPU ceiling to deliver 1,030.3 Effective Logical TFLOPS/replica (2.85× physical compute).

### Serving Throughput–Interactivity Pareto Frontier (c = 8 .. 4,096)

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/agentic-multimodal-benchmarking/serving_roofline_pareto.png" alt="Serving Roofline Pareto Frontier across 16x H200 GPUs" style={{width: '100%', height: 'auto'}} />
</div>

Plotting Throughput per H200 GPU (tok/s/H200) against Per-User Interactivity (tok/s/user = 1000 / ITL_p50_ms) illustrates how llm-d's effective compute advantage translates directly into user experience: across every concurrency level from c = 32 through c = 4,096, llm-d strictly dominates the upper-right Pareto frontier—simultaneously delivering higher per-GPU throughput and faster per-user token streaming (7,580.0 total tok/s/H200 at 10.8 tok/s/user at c = 4,096, vs. 6,316.3 total tok/s/H200 at 8.6 tok/s/user for Dynamo and 4,922.5 total tok/s/H200 at 7.0 tok/s/user for K8s Service).

---

## 5. Reproduce This Benchmark Yourself

All manifests, dataset conversion scripts, concurrency sweep runners, raw 90-run AIPerf and Prometheus CSVs, and the Roofline plot generator are open-sourced and ready to run:

* **[Full Benchmark Report & Step-by-Step Reproducibility Guide (benchmarking_llmd)](https://github.com/cheng-hsiang-chiu/benchmarking_llmd/blob/main/llmd_k8s_dynamo_aggredated_agentic_multimodal/results/MMSHOPBENCH_LLMD_MULTIMODAL_BENCHMARK_REPORT.md)** — Complete Kubernetes manifests for Arm A (llm-d), Arm B (K8s Service), and Arm C (dynamo-arm-c.yaml), plus cold-cache reset and sweep scripts.
* **[llm-d Multimodal Serving Aggregation Guide](https://github.com/llm-d/llm-d/tree/main/guides/multimodal-serving/aggregation)** — Shipped Helm values (aggregation.values.yaml) and model-server patches for NVIDIA H200, Intel XPU, and Google Cloud TPU.
* **[llm-d-benchmark agentic_multimodal Workload Profile](https://github.com/llm-d/llm-d-benchmark/tree/main/workload/profiles/aiperf/agentic_multimodal)** — MMShopBench multi-turn downloader, WebP-to-JPEG transcoder (convert_mmshopbench_to_aiperf.py), and AIPerf profile template.

## Get Involved with llm-d

* Explore the llm-d Community Quickstart Guide → [Start here](https://github.com/llm-d/llm-d/blob/main/README.md)
* Join our Slack → [Get your invite](https://inviter.co/llm-d-slack) and connect with maintainers and contributors (including SIG-Benchmarking and SIG-Scheduling)
* Explore the code → [Browse our GitHub organization](https://github.com/llm-d)
* Attend meetings → All meetings are open! Add our [public calendar](https://red.ht/llm-d-public-calendar)

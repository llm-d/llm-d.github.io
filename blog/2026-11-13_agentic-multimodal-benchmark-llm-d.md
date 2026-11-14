---
title: "Benchmarking Multi-Turn Multimodal Serving in llm-d"
description: "Evaluating llm-d's multimodal token-aware router against a standard Kubernetes Service baseline across 60 runs (concurrency 8 to 4,096) on 16× NVIDIA H200 GPUs serving Qwen3-VL-32B-Instruct on real e-commerce shopping sessions (MMShopBench) with NVIDIA AIPerf."
slug: agentic-multimodal-benchmark-llm-d
date: 2026-11-13

authors:
  - chenghsiangchiu
  - xiyue
  - kaushikmitra

tags: [blog, multimodal, agentic-inference, scheduling, vllm]
---

# Benchmarking Multi-Turn Multimodal Serving in llm-d

*How two-stage multimodal prefix affinity turns an 89.7% cache hit rate into +54% higher throughput, 3.9× lower tail TTFT, and 2.85× effective H200 compute on real multi-turn shopping workloads*

In two recent posts—[*Sticky Until Saturated: Token-Aware Routing in llm-d*](/blog/sticky-until-saturated-token-aware-routing) and [*Serving Multimodal at Scale in llm-d*](/blog/serving-multimodal-at-scale-in-llm-d)—we introduced the two core building blocks of `llm-d`'s multimodal routing stack:
1. **Dynamic Multimodal Token Estimation (`token-producer`)**: Parsing inline image dimensions directly from HTTP request headers at the router and pricing each visual asset in model-native spatial patches (32 × 32 px = 1,024 px² per token for `Qwen3-VL`) without running a GPU, Python tokenizer, or mounted model config on the hot path.
2. **Two-Stage Sticky Multimodal Affinity (`prefix-cache-affinity-filter` + `token-load-scorer`)**: Keeping multi-turn multimodal sessions pinned to the replica holding their prior Key-Value (KV) and Vision Transformer (ViT) caches whenever prefix overlap clears a multimodal threshold (`affinityThreshold: 0.6`), up to a calibrated queueing saturation release (`maxTTFTPenaltyMs: 36000`).

Synthetic single-turn benchmarks on uniform image shapes showed promising early gains. However, production multimodal assistants do not behave like synthetic single-turn benchmarks. Real users conduct **multi-turn conversations** (3 to 19 turns long), accumulate large visual and text histories (7.82 : 1 server-side multimodal input-to-output token ratio), and frequently **upload new photos mid-conversation** (on Turn 2, Turn 3, or later) to compare products or refine visual searches.

To evaluate how llm-d performs under realistic production traffic relative to standard Kubernetes load balancing, we ran a 60-run benchmark on 16 × NVIDIA H200 (141 GB) GPUs (8 replicas × TP=2 serving `Qwen/Qwen3-VL-32B-Instruct` on `vLLM v0.30.0`) replaying real multi-turn e-commerce shopping logs from [**MMShopBench**](https://huggingface.co/datasets/kellyhao/mmshopbench) across 10 concurrency levels (c = 8 to 4,096 concurrent sessions, 3 iterations per concurrency with full cold-cache resets between runs) driven by **NVIDIA AIPerf (`v0.8.0`)**. We compared two routing configurations on the exact same GPU fleet:
* **`llm-d` Multimodal Router (`aggregation-epp`)**: Endpoint picker executing dynamic `token-producer` (factor: 1024) + `prefix-cache-affinity-filter` (`affinityThreshold: 0.6, maxTTFTPenaltyMs: 36000`) + `token-load-scorer`.
* **Kubernetes Service Baseline (`ClusterIP` Round-Robin)**: Standard stateless Kubernetes `kube-proxy` round-robin across the same 8 vLLM replicas (with vLLM prefix caching and 20 GB CPU multimodal processor cache enabled on every pod).

:::info[Headline results]

* **85.3%–89.7% Multimodal Prefix-Cache Hit Rate** (vs. 49.0%–63.8% on K8s Service): Across c = 8..4,096, llm-d sustains an **85.3%–89.7%** vLLM prefix-cache hit rate (89.7% at peak throughput c = 4,096), outperforming standard Kubernetes round-robin (49.0%–63.8% at c ≥ 128) by up to +36.4%—even across the 28.3% of image turns where users upload new photos on Turn 2+.
* **+54.0% Higher Peak Token Throughput, Up to 2.60× Faster Median TTFT, and 3.94× Lower Tail TTFT (p90)**: At c = 4,096, llm-d delivers 121,280.2 total tokens/sec (34,233.3 output tokens/sec) compared to 78,759.3 total tokens/sec (22,246.1 output tokens/sec) on K8s Service (+54.0%). Across the sweep, llm-d cuts median TTFT (p50) by up to 2.60× (61.02 ms vs. 158.41 ms at c = 256), cuts high-concurrency tail TTFT (p90 / p99) by 3.94× / 5.51× (1,014.91 ms vs. 3,997.23 ms p90 and 2,796.55 ms vs. 15,411.12 ms p99 at c = 4,096), and reduces Decode Inter-Token Latency (ITL p50) by 34.8% (92.43 ms vs. 141.86 ms).
* **The H200 Roofline Revelation (2.85× Effective Compute Multiplier)**: A Hardware Roofline analysis shows that at c = 4,096, both arms saturate the 16 H200 GPUs at the exact same physical compute ceiling (~360.6–362.1 Physical TFLOPS/replica). The difference is what those FLOPs are spent on: K8s Service wastes 51.4% of its physical GPU compute (185.3 TFLOPS/replica) recomputing missed prefixes and ViT image encodings, whereas llm-d spends 78.7% of its physical GPU compute (285.0 TFLOPS/replica) generating decode tokens—achieving 1,030.3 Effective Logical TFLOPS/replica (2.85× physical GPU compute) with zero extra stateful infrastructure.

:::

<!-- truncate -->

---

## 1. The Workload: Why Multi-Turn Multimodal Agents Stress-Test Routers

Most multimodal serving benchmarks replay single-turn image captioning requests where every prompt has an identical shape. By contrast, [`kellyhao/mmshopbench`](https://huggingface.co/datasets/kellyhao/mmshopbench) (*MMShopBench: A Real-Log Benchmark for Multimodal, Multi-Turn Shopping Agents*) captures production e-commerce shopping sessions where users upload product photos and iteratively compare styles, prices, and attributes across multiple turns.

| Workload Property | MMShopBench Empirical Value | Why It Matters for Multimodal Routing |
| :--- | :--- | :--- |
| Conversations & Turns | 288 unique sessions (1,301 turns; 3 to 19 turns/session, mean 4.52 turns) | Turn 1 (~22% of requests) is a cold miss for unique session histories; Turns 2–19 (~78% of requests) carry deep cumulative text + visual histories. |
| Real User Product Photos | 400 RGB JPEGs with variable resolutions & aspect ratios | Variable dimensions exercise `Qwen3-VL`'s dynamic spatial patch merger (32 × 32 px per visual token) rather than synthetic fixed-size images. |
| Multi-Image Sessions | 26.7% of sessions accumulate 2 to 5 images across turns | Cumulative prompts grow to thousands of visual + text tokens by Turns 3–10. |
| Later-Turn Image Uploads | 113 / 400 image turns (28.3%) occur on Turn 2+ | Crucial router stress test: when a user uploads a second photo on Turn 2 or 3, the new uncached image tokens dilute the cached prefix fraction of the request. |
| Input Sequence Length (ISL) | • Server-Side Multimodal (vllm:prompt_tokens): 1,695.9 mean tokens/turn (551.8 text + 1,144.1 `Qwen3-VL` visual patch tokens)<br/>• Client-Side Text-Only (AIPerf): 551.8 mean tokens/turn (p50: 436, p90: 1,155, p99: 2,579) | Inline Base64 JPEG images expand into ~1,144 visual patch tokens/turn on the GPU—making actual server prefill over 3× larger than the raw client text token count. |
| Output Sequence Length (OSL) & ISL : OSL Ratio | • Mean OSL: 216.9 output tokens/turn (p50: 216, p90: 292, range: 64–512)<br/>• Server-Side Multimodal ISL : OSL Ratio: 7.82 : 1 (1,695.9 / 216.9)<br/>• Client Text-Only ISL : OSL Ratio: 2.54 : 1 (551.8 / 216.9) | Because multimodal prefill tokens outnumber decode tokens by 7.82 to 1, preserving KV and ViT cache hits across turns dominates both TTFT and total cluster throughput. |

We replayed `MMShopBench` using NVIDIA AIPerf (v0.8.0) in `--custom-dataset-type multi_turn` (WITHOUT_RESPONSES) mode with a 2,000 ms mean inter-turn user think delay, scaling from c = 8 to c = 4,096 concurrent sessions. Each (Concurrency, Arm) point was run for 3 independent iterations with matched random seeds (60 runs total) and a complete cold-cache wipe before every run (vLLM KV prefix cache, 20 GB CPU multimodal processor cache, GPU ViT encoder cache, and the router's in-memory prefix hash tree).

---

## 2. Architecture: State-of-the-Art Multimodal Routing with Minimal Operational Cost

All benchmark runs served traffic on the exact same 16 × NVIDIA H200 (141 GB) fleet (8 replicas × `TP=2`, `vLLM v0.30.0`, `Qwen/Qwen3-VL-32B-Instruct`, `--mm-processor-cache-gb 20`, `--enable-prefix-caching`).

### Why Standard Round-Robin Breaks Down on Multi-Turn Multimodal Sessions

Under a standard Kubernetes Service (`ClusterIP` round-robin), each HTTP `POST /v1/chat/completions` turn in a multi-turn conversation is dispatched independently across the 8 vLLM replicas:
1. **7/8 Probability of Landing on a Cold Replica on Turn 2**: Even though every vLLM replica has `--enable-prefix-caching` and a 20 GB CPU multimodal cache enabled, a Turn 2 request routed via round-robin has an 87.5% chance of landing on a replica that has never seen Turn 1's product photo or conversation history (until wrap-around session reuse partially warms the fleet at very long run durations).
2. **Compound Penalty of Multimodal Cache Misses**: A cache miss on Turn t does not merely recompute text tokens—it forces the target replica to decode the Base64 JPEG on CPU, run `Qwen3-VL`'s 32-layer Vision Transformer (ViT) over ~1,144 spatial patches on GPU, and recompute the full 1,696-token language-model prefill, stealing GPU Tensor Cores and HBM3e bandwidth from active decode batches.
3. **Blindness to Multimodal Prefill Queue Spikes**: Round-robin treats a 100-token text turn and a 3,500-token multi-image turn as equal (1 HTTP request = 1 unit of load), creating severe head-of-line TTFT queueing spikes under concurrent multi-turn bursts (TTFT p90 reaches 3,997.23 ms and p99 reaches 15,411.12 ms at c = 4,096).

### How llm-d's Multimodal Router Works

llm-d's Endpoint Picker (EPP) executes a **filter-then-score pipeline** configured declaratively in [`aggregation.values.yaml`](https://github.com/llm-d/llm-d/blob/main/guides/multimodal-serving/aggregation/router/aggregation.values.yaml):

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

This design solves three production requirements simultaneously:
1. **Zero Model-File or Sidecar Operational Overhead (`token-producer`)**:
   * Rather than running a Python image processor in the router or requiring shared filesystem mounts of model weights/config.json, `token-producer` inspects the (width, height) header of each inline Base64 JPEG/PNG directly in-flight and computes its exact `Qwen3-VL` visual token count (factor: 1024, i.e., 1 token per 32 × 32 px merged patch) and content hash.
2. **Sticky Affinity Across Turn 2+ Image Uploads (`prefix-cache-affinity-filter`)**:
   * In `MMShopBench`, 28.3% of image turns occur on Turn 2+ when a shopper uploads a new comparison photo mid-session. A new ~1,144-token image on Turn 2 or 3 lowers the cached prefix fraction of the prompt from ~95% to ~65%–75%.
   * Lowering `affinityThreshold` from the text-only default (0.80) to 0.60 ensures that sessions with Turn 2+ image uploads still clear Stage 1's sticky filter, strictly excluding cold pods from candidate selection whenever the home pod's estimated prefill wait is within `maxTTFTPenaltyMs: 36000`.
3. **Multimodal Load-Aware Spillover & Tie-Breaking (`inflight-load-producer` + `token-load-scorer`)**:
   * Because `inflight-load-producer` tracks queued prefill load using the sum of text tokens + dynamically estimated image patch tokens, Stage 1 accurately predicts when a sticky replica's prefill queue is genuinely saturated, and Stage 2 (`token-load-scorer`) steers new Turn 1 sessions (and overflow requests) to the replica with the lowest true multimodal prefill load.

---

## 3. Empirical Results (c = 8 to 4,096 on 16 × NVIDIA H200)

All metrics below report the **3-iteration mean ± standard deviation** across all 10 concurrency levels (0 failed requests across all 60 runs):

| Concurrency | Routing Arm | TTFT p50 (ms) | TTFT p90 (ms) | ITL p50 (ms) | Total Token Throughput (tok/s) | Output Token Throughput (tok/s) | vLLM Prefix Cache Hit (%) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **8** | **llm-d** | 43.97 ± 0.56 | 93.74 ± 1.66 | **10.99 ± 0.01** | **2,464.8 ± 2.6** | **695.9 ± 0.9** | **85.5%** |
| 8 | K8s Service | **43.34 ± 0.48** | **88.91 ± 1.82** | 11.05 ± 0.08 | 2,451.9 ± 16.2 | 692.1 ± 4.6 | 81.5% |
| **16** | **llm-d** | **47.82 ± 0.25** | **103.52 ± 0.30** | **11.13 ± 0.01** | **4,771.2 ± 10.6** | **1,347.1 ± 3.1** | **85.5%** |
| 16 | K8s Service | 53.77 ± 0.65 | 132.49 ± 1.04 | 11.25 ± 0.05 | 4,672.1 ± 37.8 | 1,319.1 ± 10.8 | 68.8% |
| **32** | **llm-d** | 49.63 ± 0.14 | **110.22 ± 1.54** | **11.45 ± 0.02** | **8,962.5 ± 5.2** | **2,530.4 ± 1.2** | **85.5%** |
| 32 | K8s Service | **48.82 ± 0.22** | 115.65 ± 0.87 | 11.70 ± 0.11 | 8,754.5 ± 99.5 | 2,471.6 ± 28.0 | 76.3% |
| **64** | **llm-d** | **51.63 ± 0.08** | **124.21 ± 1.25** | **12.10 ± 0.03** | **15,980.3 ± 166.9** | **4,511.8 ± 46.8** | **85.4%** |
| 64 | K8s Service | 56.11 ± 0.72 | 162.88 ± 5.45 | 12.76 ± 0.04 | 15,074.0 ± 100.3 | 4,255.7 ± 28.5 | 68.7% |
| **128** | **llm-d** | **54.60 ± 0.57** | **138.64 ± 3.31** | **13.40 ± 0.02** | **24,361.2 ± 121.1** | **6,878.0 ± 34.0** | **85.3%** |
| 128 | K8s Service | 114.78 ± 3.66 | 240.32 ± 5.19 | 15.27 ± 0.06 | 21,696.2 ± 216.2 | 6,125.6 ± 61.3 | 59.2% |
| **256** | **llm-d** | **61.02 ± 0.23** | **163.98 ± 1.56** | **15.19 ± 0.04** | **30,996.9 ± 306.3** | **8,751.4 ± 86.2** | **85.4%** |
| 256 | K8s Service | 158.41 ± 3.56 | 309.51 ± 4.89 | 20.57 ± 0.15 | 25,599.5 ± 107.2 | 7,227.6 ± 30.1 | 49.0% |
| **512** | **llm-d** | **75.40 ± 0.44** | **275.41 ± 7.12** | **19.24 ± 0.15** | **50,130.4 ± 234.6** | **14,154.0 ± 65.8** | **87.3%** |
| 512 | K8s Service | 166.48 ± 3.30 | 875.59 ± 19.63 | 26.72 ± 0.16 | 39,637.8 ± 285.9 | 11,191.2 ± 80.5 | 58.6% |
| **1024** | **llm-d** | **111.40 ± 0.49** | **542.66 ± 17.56** | **27.99 ± 0.28** | **75,696.0 ± 1,749.2** | **21,369.5 ± 493.8** | **88.4%** |
| 1024 | K8s Service | 209.62 ± 4.85 | 1,711.44 ± 48.06 | 42.68 ± 0.44 | 55,687.6 ± 25.9 | 15,722.6 ± 7.4 | 60.9% |
| **2048** | **llm-d** | **185.52 ± 1.60** | **824.97 ± 23.40** | **47.93 ± 0.78** | **103,354.4 ± 1,894.8** | **29,171.3 ± 536.0** | **89.2%** |
| 2048 | K8s Service | 308.09 ± 6.64 | 2,869.18 ± 46.81 | 75.75 ± 1.28 | 68,622.0 ± 203.2 | 19,375.5 ± 58.1 | 62.1% |
| **4096** | **llm-d** | **311.85 ± 1.61** | **1,014.91 ± 25.75** | **92.43 ± 0.99** | **121,280.2 ± 2,853.3** | **34,233.3 ± 807.6** | **89.7%** |
| 4096 | K8s Service | 490.01 ± 9.07 | 3,997.23 ± 64.91 | 141.86 ± 0.54 | 78,759.3 ± 800.5 | 22,246.1 ± 226.4 | 63.8% |

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/agentic-multimodal-benchmarking/ttft_p50_vs_concurrency.png" alt="TTFT p50 vs. Concurrency across llm-d and K8s Service" style="width:100%; height:auto" />
</div>

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/agentic-multimodal-benchmarking/total_token_throughput_vs_concurrency.png" alt="Total Token Throughput vs. Concurrency across llm-d and K8s Service" style="width:100%; height:auto" />
</div>

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/agentic-multimodal-benchmarking/itl_p50_vs_concurrency.png" alt="Inter-Token Latency p50 vs. Concurrency across llm-d and K8s Service" style="width:100%; height:auto" />
</div>

### Key Takeaways from the Concurrency Sweep

1. **Up to 2.60× Lower Median TTFT (p50) and 3.94×–5.51× Lower Tail TTFT (p90 / p99)**:
   * Starting at c = 128, every cache miss on Turn 2+ forces the target worker to re-run `Qwen3-VL`'s 32-layer Vision Transformer (ViT) and language-model prefill over all prior images and text. At c = 256, llm-d holds TTFT p50 at 61.02 ms vs. 158.41 ms on K8s Service (2.60× faster).
   * At high concurrency (c = 512..4,096), llm-d's dynamic multimodal load accounting prevents head-of-line prefill pileups: at c = 4,096, llm-d holds TTFT p90 to 1,014.91 ms vs. 3,997.23 ms on K8s Service (3.94× faster) and TTFT p99 to 2,796.55 ms vs. 15,411.12 ms on K8s Service (5.51× faster).
2. **Why Multimodal Prefix Routing Cuts Decode Inter-Token Latency (ITL p50) by 34.8% and Boosts Throughput by +54.0%**:
   * In aggregated serving (where Vision Encode, Prefill, and Decode share the same GPUs), every redundant ViT pass and uncached 1,696-token prefill steals GPU SMs and HBM3e bandwidth from active decode batches.
   * By avoiding ~90% of redundant Turn 2+ prefills and steering heavy Turn 1 image prefills via `token-load-scorer`, llm-d reduces ITL p50 at c = 4,096 from 141.86 ms to 92.43 ms (-34.8%) while boosting total cluster throughput from 78,759.3 to 121,280.2 tokens/sec (+54.0%).

---

## 4. Hardware & Serving Roofline Analysis (TP=2 NVIDIA H200 SXM)

A natural question when seeing a +54.0% throughput gain over K8s Service at c = 4,096 is: **Are the GPUs under K8s Service sitting idle, or are all 16 H200 GPUs working equally hard?**

To answer this rigorously, we modeled each TP=2 replica (2 × NVIDIA H200 141 GB) using a **Hardware Roofline Model** alongside the **Serving Throughput–Interactivity Pareto Frontier**.

### Hardware & Model Constants (1 Replica = 2 × NVIDIA H200 SXM)
* Peak Dense BF16 Tensor Core Compute (*P*<sub>peak</sub>): 2 × 989 TFLOPS = 1,978 TFLOPS/replica (15.82 PFLOPS across 8 replicas).
* Peak HBM3e Memory Bandwidth (BW<sub>peak</sub>): 2 × 4.8 TB/s = 9.6 TB/s/replica (76.8 TB/s across 8 replicas).
* Hardware Ridge Point (AI<sub>ridge</sub>): 1,978 TFLOPS / 9.6 TB/s ≈ 206.0 FLOPs/Byte.
* `Qwen3-VL-32B-Instruct` (BF16) Per-Token Cost:
  * Weights (*W*<sub>LLM</sub>): 32.8 × 10⁹ params × 2 Bytes = 65.6 GB streamed per decode step across the TP=2 replica, plus 262.1 KB/token of KV cache (64 layers × 2 × 8 KV heads × 128 head dim × 2 Bytes).
  * FLOPs per Token: Derived from first principles (2 × N_params linear weight projections + causal attention + amortized 32-layer ViT encoding), each decode token requires *C*<sub>decode</sub> ≈ 66.6 GFLOPs and each uncached prefill token requires *C*<sub>prefill</sub> ≈ 68.5 GFLOPs.

For each replica with output token rate *R*<sub>out</sub>, input token rate *R*<sub>in</sub>, and prefix-cache hit rate *h* ∈ [0, 1], we distinguish between Physical GPU Compute (*P*<sub>phys</sub>) (the actual BF16 Tensor Core FLOPs executed by the silicon on uncached prefill tokens 1 − *h* plus decode tokens) and Effective Logical Compute (*P*<sub>eff</sub>) (the total logical workload completed, including prefill FLOPs skipped via KV prefix cache hits):

```text
P_phys (TFLOPS/replica) = [ C_decode × R_out + C_prefill × (1 − h) × R_in ] / 1000
P_eff  (TFLOPS/replica) = [ C_decode × R_out + C_prefill × R_in ] / 1000
```

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/agentic-multimodal-benchmarking/hardware_roofline.png" alt="Hardware & Effective Roofline Analysis on TP=2 NVIDIA H200 SXM across llm-d and K8s Service" style="width:100%; height:auto" />
</div>

### Two Hardware Regimes Across c = 8 .. 4,096

#### Regime 1: The HBM3e Memory-Bandwidth Floor (c = 8 .. 32, AI<sub>phys</sub> = 1.3–5.9 FLOPs/Byte)
At low concurrency (c = 8), each of the 8 replicas has an active decode batch size of *B*<sub>dec</sub> ≈ 1.0 (AI<sub>phys</sub> ≈ 1.3 FLOPs/Byte ≪ 206 FLOPs/Byte). Streaming 65.6 GB of BF16 weights at achievable HBM3e bandwidth (~7.2–7.7 TB/s) takes 8.5–9.1 ms, plus 1.0–1.4 ms for 128 TP=2 NVLink AllReduce operations, setting a hard physical floor of ~9.5–10.5 ms/token. Both arms sit right on this HBM3e bandwidth slope at c = 8 (10.99–11.05 ms ITL p50, or 90.5–91.0 tok/s/user).

#### Regime 2: Prefix Caching as an Effective Compute Multiplier at the Physical GPU Ceiling (c = 128 .. 4,096)
Comparing Physical GPU Compute vs. Effective Logical Compute at c = 4,096 reveals the hardware mechanism behind llm-d's throughput gain:

| Metric at Peak Throughput (c = 4,096) | llm-d Multimodal Router (`aggregation-epp`) | K8s Service (`ClusterIP` Round-Robin) |
| :--- | :---: | :---: |
| Prefix-Cache Hit Rate (*h*) | **89.7%** | 63.8% |
| Uncached Prefill Miss Fraction (1 − *h*) | **10.3%** | 36.2% (3.51× higher) |
| Physical GPU Compute (*P*<sub>phys</sub>) | **362.1 TFLOPS/rep** | **360.6 TFLOPS/rep** |
| — Physical GPU FLOPs Spent on Uncached Prefill + ViT | **77.1 TFLOPS (21.3%)** | 185.3 TFLOPS (51.4%) |
| — Physical GPU FLOPs Spent on Useful Decode | **285.0 TFLOPS (78.7%)** | 175.3 TFLOPS (48.6%) |
| Effective Logical Compute (*P*<sub>eff</sub>) | **1,030.3 TFLOPS/rep (2.85×)** | 669.1 TFLOPS/rep (1.86×) |
| Total Throughput per H200 GPU | **7,580.0 tok/s/H200** | 4,922.5 tok/s/H200 |

This is the central hardware takeaway of the benchmark:
1. **Both arms hit the exact same physical H200 compute ceiling (~360.6–362.1 Physical TFLOPS/replica)** at c = 4,096 (accounting for FlashAttention/ViT kernel efficiency, TP=2 NVLink AllReduce, and mixed prefill-decode tile scheduling). The GPUs under K8s Service are not idle—they are running at 100% physical saturation.
2. **Where the FLOPs go determines serving throughput**: Because K8s Service misses the cache on 36.2% of input tokens, it burns more than half (51.4%) of its physical GPU FLOPs recomputing old turns' prefill and ViT encodings. By holding the uncached miss rate to just 10.3%, llm-d dedicates 78.7% of physical GPU compute to useful decode, breaking through the physical GPU ceiling to deliver 1,030.3 Effective Logical TFLOPS/replica (2.85× physical compute) and 7,580.0 total tok/s/H200 (vs. 4,922.5 tok/s/H200 on K8s Service).

### Serving Throughput–Interactivity Pareto Frontier (c = 8 .. 4,096)

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/agentic-multimodal-benchmarking/serving_roofline_pareto.png" alt="Serving Roofline Pareto Frontier across 16x H200 GPUs for llm-d and K8s Service" style="width:100%; height:auto" />
</div>

---

## Get Involved with `llm-d`

* Explore the `llm-d` Community Quickstart Guide → [Start here](https://github.com/llm-d/llm-d/blob/main/README.md)
* Join our Slack → [Get your invite](https://inviter.co/llm-d-slack) and connect with maintainers and contributors (including SIG-Benchmarking and SIG-Scheduling)
* Explore the code → [Browse our GitHub organization](https://github.com/llm-d)
* Attend meetings → All meetings are open! Add our [public calendar](https://red.ht/llm-d-public-calendar)

---
title: "Spec-Decode for RL; a pipedream or SotA?"
description: "The first in a series of blogs to investigate ways to improve RL throughput"
slug: suffix-decode-for-rl
date: 2026-10-26T10:00
authors:
  - kfswain
tags: [blog, updates, llm-d, rl]
---

# Spec-Decode for RL; a pipedream or SotA?

## TL;DR

- Traditional Speculative decoding has had difficulty gaining traction in RL
- Alternate ideas such as [DAS](https://arxiv.org/pdf/2511.13841) present promising results, but have not been seen in RL frameworks  
  - We implement it [here](https://github.com/verl-project/verl/pull/8396)  
- We present the results of our ablation study to test the limits of DAS & speculative decoding to offer guidance when you should consider including it into your RL jobs
- We ran a job on VeRL and found a \~20% improvement in generation time on Deepmath103k (attached figure below)  
- Analysis into a multi-turn workload on a larger MoE model in a follow-up post


<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/suffix-decode-for-rl/suffixDecodingWandB.png" alt="Weights & Biases chart comparing generation time per step on DeepMath-103K with and without suffix decoding, showing roughly 20% faster generation" style={{width: '100%', height: 'auto'}} />
</div>

## Intro

Reinforcement Learning with Verifiable Rewards (RLVR) is a common post training method to improve models beyond what the standard training allows. Three of the latest open source models call out reinforcement learning as one of the pillars of improvement ([Mistral 4](https://mistral.ai/news/mistral-large-4/), [Reflection's Beam](https://reflection.ai/blog/introducing-beam), & [Kimi K3](https://arxiv.org/pdf/2607.24653)).  For the sake of brevity, we will assume the reader is familiar with the fundamentals of an RL loop. 

The primary point is this: SotA RL loops are often sampling bound, and any optimizations that improve sampling speed will have significant impact on the overall loop. 

### Why Speculative Decode is not used for RL

[Speculative decoding](https://docs.vllm.ai/en/latest/features/speculative_decoding/) is a method commonly implemented during inference as a means to improve decode speed, and would seemingly be straightforward to apply for RL, but hasn't yet landed as an optimization that is easily adopted.

The why is rather simple, but requires understanding the properties that allow speculative decode to work:

- Decode is typically memory bandwidth bound, and so the GPU chip can sit idle while streaming the weights/KV cache  
  - At high batch size, decode steps become compute bound as the [arithmetic intensity](https://modal.com/gpu-glossary/perf/arithmetic-intensity) per forward pass increases to saturate the accelerator  
- This idle compute capacity is leveraged to power a small draft model, which generates tokens significantly faster than the target model  
- The target model then verifies these extra tokens (the number of extra tokens selected is oft labeled as `k`), and if any are accepted, that is a net reduction in decode time  
- If tokens are never accepted, the work is wasted (both in draft compute time & verification)  
  - *Also*, if the model server is running at high concurrency the model server approaches its compute bottleneck, and the spare capacity for running a draft model or verification starts to compete with decode, and cause a drop in overall throughput, effectively eliminating any gains found from speculative decode

RL can conflict with speculative decode in the following ways:

*  Typically the hardware and batch are configured for maximal utilization of the accelerators  
  * This leaves little room for a draft model or compute capacity for that draft model to generate tokens that may or may not be accepted   
* The model weights are updated throughout the job, which can cause a drift between the target model and the draft model, reducing the number of tokens accepted from the drafter (acceptance rate)

### SuffixDecoding as an alternative

This [paper](https://arxiv.org/pdf/2411.04975) from Snowflake AI Research presents ‘SuffixDecoding’, a drafter that is based on a suffix tree built from the models previous output. This pushes the drafting responsibility to the CPU, and works well for structured outputs (like coding and agentic work; The paper claims up to 5.3x speedup over standard decoding on an AgenticSQL job). Suffix decoding performs poorly for stochastic or creative workloads, and fortunately RL inference is often structured by nature:

- verifiable rewards will trend the model towards specific behavior patterns  
- agentic work is often extremely structured

Additionally, SuffixDecoding solves one-half of the speculative decode issues by moving the drafting component to be offloaded to the CPU, removing the need for a draft model to consume GPU resources to generate tokens.

The paper [DAS](https://arxiv.org/pdf/2511.13841) addresses SuffixDecoding in RL directly. They propose a per-problem suffix tree, as well as more aggressive token counts for long tail problems. The ‘long tail’ problems are identified through simple bucketization of total OSL over multiple epochs. In the published benchmarks, DAS boasts a 50% reduction in rollout time (on a single-turn dataset using a distilled 7B model).

---

## Investigation

Both DAS & SuffixDecoding indicate that SuffixDecoding may be a solution to improving RL throughput via speculative decode. With DAS specifically, there was no implementation referenced in the work or able to be found online, so we implemented this.

Our study:

- An ablation study on a single model server to observe how different hyper-params impact suffixDecoding:  
  - Ran on Dense(32B) & MoE(30B-A3B) sized models  
  - Inference-only  
    - For a smaller hardware footprint  
  - Suffix-tree was preloaded to have a constant acceptance rate(warm tree) & tested with empty data (cold tree)  
    - **Warm tree** \- a quick runthrough of the prompts in question (to imitate GRPO), which then populates the suffix tree for the test run  
    - **Cold tree** \- starting with no seed data to intentionally apply pressure on the worst case, to help find suffix boundaries  
- A job in verl 32B dense model using Deepmath-103k

### Ablation Results

---

Setup:
  
- Since this was an ablation study, we focused on a single model server using H200s (32B at TP=2, 30B-A3B at TP=1),  
- A client holding a fixed number of concurrent requests (`C`)  
  - This is just a simple load generation tool to facilitate distribution of requests  
- [DeepMath](https://huggingface.co/datasets/zwhe99/DeepMath-103K) dataset  
- vLLM's built-in suffix drafter  
  - global tree only, no per-problem tree since we don't have enough data per-problem in this ablation study  
- Every number is spec throughput divided by plain throughput at the same `C` (so a ratio of 1.00x is parity performance)

**Greedy decoding(T=0), warm tree, k=5** (the paper setting; \~4.5 of 5 drafted tokens accepted):

|  | C=8 | C=64 | C=256 | C=512 |
| :---- | ----: | ----: | ----: | ----: |
| Dense 32B | 2.74x | 1.85x | 1.14x | 1.01x |
| MoE 30B-A3B | 1.98x | 2.87x | 1.67x | 1.47x |

 

**Sampled decoding (T=0.7=1.0) cold tree:**

|  | C=64 | C=128 | C=256 | C=512 | C=1024 |
| :---- | ----: | ----: | ----: | ----: | ----: |
| Dense 32B, T=0.7, k=2 | 1.01x | 0.92x | 0.83x | 0.80x | 0.85x |
| Dense 32B, T=0.7, k=3 | 1.08x | 0.85x | 0.78x | 0.75x | 0.82x |
| Dense 32B, T=0.7, k=8 | 0.85x | 0.65x | 0.58x | \- | \- |
| Dense 32B, T=1.0, k=8 | 0.80x | 0.61x | 0.53x | \- | \- |
| MoE 30B-A3B, T=0.7, k=8 | 1.31x | 1.19x | 1.05x | 0.91x | 0.93x |
| MoE 30B-A3B, T=1.0, k=8 | 1.24x | 1.11x | 0.98x | 0.82x | 0.86x |

 

**Long generations (thinking on, 6-8k-token responses), T=0.7, cold tree:**

|  | C=8 | C=16 | C=32 | C=64 | C=128 | C=256 |
| :---- | ----: | ----: | ----: | ----: | ----: | ----: |
| Dense 32B, k=3 | 1.43x | 1.44x | 1.36x | 1.14x | 0.96x | 0.95x |
| Dense 32B, k=8 | 1.44x | 1.42x | 1.14x | 0.87x | 0.74x | 0.77x |
| MoE 30B-A3B, k=3 | 1.12x | 1.23x | 1.32x | 1.34x | 1.38x | 1.34x |
| MoE 30B-A3B, k=8 | 1.08x | 1.24x | 1.28x | 1.30x | 1.25x | 1.26x |

 

- With these longer responses the KV cache fills at C=128 on both models, so C=128 is the most an engine can usefully run.  
- Dense: suffix decoding wins at C\<=32, k=3 is still \+14% at C=64, and at the KV-limited optimum it is parity (k=3) or 0.74x (k=8). The MoE holds 1.25-1.38x all the way through the wall.  
- Acceptance is lower again (0.75-1.15 accepted of 2.8-6.2 drafted)

#### Ablation conclusion

---

- At high concurrencies, the decode step becomes compute bound, so there is no longer idle compute to be used speculating on draft tokens  
  - Additional requests and additional draft tokens for those requests increases the decode step time, which compounds (`C` \* `k`), causing each forward pass to add significant computational work. Since the acceptance rate can never be perfect, the increase in step time does not have a corresponding improvement in output token generation  
- The MoE model has better performance with suffixDecoding overall, but still reaches a point where performance dips into the negatives  
  - the same inflection point  
- Pre-warming the tree with sampled completions buys 3 to 8 points at C=64 and about 2 points above it. It does not change the sign.  
- vLLM silently disables async scheduling for suffix drafting ([here](https://github.com/vllm-project/vllm/blob/bc150f50299199599673614f80d12a196f377655/vllm/config/vllm.py#L810-L820)), so the spec arm also loses CPU/GPU overlap.  
- This was patched back in, but won't impact the GPU bottlenecking at high concurrencies . The drafter sits on the critical path either way.  
- At C=1024 there is some thrash on KV; so plain forward pass time loses more than spec, which explains the gap closure

### VeRL results

---

Two A/B runs with the same recipe: Qwen3-32B (TP=2), DeepMath-103K, 8 samples per prompt, T=1.0, 16k response cap, step-synchronous (staleness 0\) so both arms see identical load. Arm A is plain decoding, arm C is our DAS implementation (per-problem suffix trees). The only thing that differs between the runs is how hard the engines are pushed.

**Run 1: verl's default admission limit.** verl's rollouter admits 16 prompts per engine ([hard-coded](https://github.com/verl-project/verl/blob/334d9f8b03816382cbd72e898bc8ae04efca6fbe/verl/experimental/fully_async_policy/fully_async_rollouter.py#L441-L442)), which keeps the engines well inside their KV budget. 16 H200s for rollout, 16 H100s for training, 128 problems x 10 epochs, 37 aligned steps

|  | plain (A) | DAS (C) | delta |
| :---- | ----: | ----: | ----: |
| **generation time per step** | 234.5 s | 194.8 s | **\-17%** |
| mean response length | 5,705 tok | 6,278 tok | \+10% |
| generation time per response token | 41.3 ms | 31.1 ms | **\-24%** |
| accepted per drafting round | \- | 1.28 of 8.0 (16%) |  |
| reward | 0.921 | 0.907 | \~lossless |


**Run 2: engines at capacity.** Same model and dataset on one H200 node (4 engines), admission raised to 128 prompts per engine (512 prompts x 8 per step) so the engines sit at their KV limit: \~90 running sequences each, KV at 100%, hundreds waiting.

|  | plain (A) | DAS (C) |
| :---- | ----: | ----: |
| aggregate generation rate | 10-13k tok/s | \~7.5k tok/s |
| tokens generated, aligned first step | 1.0 | \~0.8 |
| engine-core CPU / step time | \- | 100% / 87 ms |
| accepted per draft | \- | 0.83 of 5.3 (16%) |

 
Same acceptance, opposite sign. At verl's default admission DAS is a 17-24% generation win; at the engines' concurrency limit it is \~20% slower, which is where the dense ablation rows put it (0.80x at C=64, 0.61x at C=128, T=1.0).

# Conclusion and Next Steps

SuffixDecoding & DAS show promise as a means of improving throughput in Reinforcement Learning. Since RL is batch & throughput oriented, the GPUs are likely to be saturated & compute bound in the context ranges we explored.

For default VeRL, the `max_concurrent_samples` per rollout worker is set to [16](https://github.com/verl-project/verl/blob/257d4fa0364aacab5fc388dc60f5c7dd7e628dcd/verl/experimental/fully_async_policy/fully_async_rollouter.py#L215) and so GPU saturation may not occur, allowing for the generation time improvement shown in the VeRL results. But when removing that restriction, the results displayed in the ablation study also show.

## When should you used DAS?

For users that perfer speed, they can provision their sampling capacity to allow for concurrency that allows space for validation tokens, creating a meaninful improvement in speed, without consuming any accelerator resources for drafting. While not all users, for those focused entirely on the speed of sampling, SuffixDecoding & DAS deliver.

### What's Next?

**Large-scale SWE-Bench job**

---

Given the above, benchmarks exploring larger models on SWE-bench work is at the top of our list. A longer RL job testing this was being conducted, but all of this work was done on preemptible hardware, and so the preemptions were interrupting the job, skewing results.

**Nuanced application of SuffixDecoding**

---

In this blog, we apply the research papers naively. We seek to dive deeper into how suffixDecoding can help RL, without less batch-size restrictions, as well as more effectively managing the per-problem suffixTrees.
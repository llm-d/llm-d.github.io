---
title: "MoRI in llm-d: P/D Disaggregation and Expert Parallelism for Long Context with GLM-5.3 on MI355X"
description: "AMD MoRI carries RDMA KV transfer and expert parallelism in llm-d, with a long-context case study of amd/GLM-5.3-Quark-MXFP4-AttnFP8 on AMD Instinct™ MI355X GPUs."
slug: serving-long-context-workloads-with-llm-d-and-mori
date: 2026-11-25T09:00
authors:
  - shikhapatel
  - ravigupta
  - prateekkumar
  - vincentcave
  - nitinsingh
  - anshuraina
  - chaitanyalolla
  - aswinmathews
  - onilgunawardana
  - pengsun
  - emadbarsoum
  - niliguy-ibm
  - maroonayoub-rh
  - robertshaw-rh
tags: [blog, inference, agentic-inference, long-context, large-models, kv-cache, disaggregation, vllm, mori]
---

# MoRI in llm-d: P/D Disaggregation and Expert Parallelism for Long Context with GLM-5.3 on MI355X

Serving a large mixture-of-experts (MoE) model with llm-d moves two kinds of data between GPUs. With
prefill/decode disaggregation (P/D), the KV cache that prefill computes has to reach the decode GPUs.
With expert parallelism, every MoE layer sends tokens to the GPUs that hold their experts and gathers
the results. We wanted AMD users of llm-d to carry both through the AMD communication library
MoRI (Modular RDMA Interface), straight from stock llm-d and vLLM.

We wired MoRI upstream into the llm-d routing sidecar and
vLLM's KV connector and expert-parallel backend. We then ran [`amd/GLM-5.3-Quark-MXFP4-AttnFP8`](https://huggingface.co/amd/GLM-5.3-Quark-MXFP4-AttnFP8), a MoE model, at 128k–512k
context on AMD Instinct™ MI355X GPUs. The first half of this post covers the stack; the second covers the
case study: where P/D helped and what it cost.

<!-- truncate -->

## At a glance

The AMD MoRI path runs on stock upstream llm-d and vLLM. vLLM's MoRI-IO connector carries the KV cache, and its MoRI-EP backend carries expert traffic. The routing sidecar coordinates each P/D request, and llm-d's gateway and Endpoint Picker are unchanged. The case study adds routing and model settings from its recipe.

- **Model:** `amd/GLM-5.3-Quark-MXFP4-AttnFP8` (MXFP4 experts, FP8 attention) at 128k–512k context on AMD Instinct MI355X GPUs.
- **Result:** on the focus workload, P/D held ITL p99 more than 4× below colocated serving, at lower throughput per GPU, using the recipe's missing-block READ.
- **Ready to run:** the llm-d P/D and wide-EP guides with MoRI run in nightly CI on AMD GPUs; the case study's guide and recipe are in [Try it](#try-it).

> **Glossary.**
>
> - **P/D, 1P1D, 2P1D:** prefill/decode disaggregation; 1P1D is one prefill and one decode instance,
>   and 2P1D adds a second prefill instance. Here each instance is one 8-GPU node; an instance can
>   also span pods (Figure 3b). **Colocated:** prefill and decode share GPUs.
> - **RDMA:** remote direct memory access, which moves data between machines without a CPU copy.
> - **Missing-block READ:** decode reads only the KV blocks absent from its cached history, a recipe
>   change not yet upstream for this model. **Whole-prompt READ:** decode reads the whole prompt's KV.
> - **Colocated control:** two 4-GPU replicas per node, expert parallel, or tensor parallel where marked
>   TP, whichever gave more throughput when both were run.
> - **TTFT:** time to first token, reported at p90. **ITL:** inter-token latency, here the gap between
>   decode steps. With **MTP-3** speculative decoding, a step delivered 2.55–2.58 tokens in the
>   missing-block P/D runs, so a 150 ms step is about 58 ms per generated token.

## Enabling MoRI in llm-d

[MoRI](https://github.com/ROCm/mori) is an open-source AMD library for moving data directly between GPUs
over RDMA. It gives llm-d one library for both GPU-to-GPU flows in MoE serving: handing the KV cache
from prefill to decode, and exchanging tokens between experts. Figure 1 shows the result (the case
study measures 1P1D and 2P1D), and Figure 2 the software stack underneath.

**What we added.**

- **vLLM:** the [`MoRIIOConnector`](https://github.com/vllm-project/vllm/pull/29304), which moves the
  KV cache over MoRI-IO by READ (decode pulls it) or WRITE (prefill pushes it), and
  [MoRI-EP](https://github.com/vllm-project/vllm/pull/28664) as the expert all-to-all backend.
- **llm-d routing sidecar:** READ runs on its standard P/D path;
  [opt-in `--moriio-*` flags](https://github.com/llm-d/llm-d-router/pull/1564) add WRITE, sent
  serially or in parallel, and support for roles that span pods
  ([README](https://github.com/llm-d/llm-d-router/blob/main/pkg/sidecar/proxy/MORIIO_README.md)).
- **Guides and CI:** the llm-d
  [P/D](https://github.com/llm-d/llm-d/tree/main/guides/pd-disaggregation/modelserver/amd/vllm/moriio)
  and [wide-EP](https://github.com/llm-d/llm-d/tree/main/guides/wide-ep/modelserver/amd/vllm) guides
  deploy MoRI on AMD GPUs, both with WRITE, and run nightly CI
  ([P/D](https://github.com/llm-d/llm-d/actions/workflows/nightly-e2e-pd-disaggregation-amd-ci-acc-rocm-vllm-moriio.yaml),
  [wide-EP](https://github.com/llm-d/llm-d/actions/workflows/nightly-e2e-wide-ep-amd-ci-acc-rocm-vllm-moriio.yaml)).
  On AMD, llm-d's nightly runs cover
  ([nightly matrix](https://github.com/llm-d/llm-d/blob/main/release/README.md#nightly-testing)):
    - Optimized baseline on vLLM, SGLang and ATOM
    - P/D disaggregation with MoRI or NIXL
    - Wide expert parallelism with MoRI-EP
    - Tiered prefix cache: CPU and filesystem tiers, native and LMCache
    - Precise prefix-cache and predicted-latency routing
    - Flow control and KEDA autoscaling

### What MoRI does

- **MoRI-IO** copies KV blocks between GPUs over RDMA, by READ or WRITE
  ([MORI-IO guide](https://rocm.github.io/mori/MORI-IO-GUIDE.html)).
- **MoRI-EP** runs the MoE expert all-to-all over XGMI, the AMD GPU-to-GPU links, inside a node and over
  RDMA across nodes ([MORI-EP guide](https://rocm.github.io/mori/MORI-EP-GUIDE.html)). In vLLM it is
  the all-to-all backend for prefill and decode. Here it stays within each 8-GPU node; the
  [wide-EP guide](https://github.com/llm-d/llm-d/tree/main/guides/wide-ep) and the
  [PyTorch Conference North America 2026 poster](https://events.linuxfoundation.org/pytorch-conference-north-america/program/schedule-posters/?id=1295891)
  cover the inter-node case.

The [MoRI documentation](https://rocm.github.io/mori/) and [Further reading](#further-reading) cover
the rest of MoRI, and the
[vLLM and MoRI recipe for AMD ROCm™ software](https://rocm.docs.amd.com/projects/ai-ecosystem/en/latest/inference/distributed/vllm-mori-recipe.html)
covers deployment.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/llmd-mori-scale.png" alt="Figure 1. For one or more prefill and decode instances, llm-d's gateway and EPP need no changes; MoRI-IO moves KV, and MoRI-EP carries expert traffic." style="width:100%; height:auto" />
  <p style="text-align:center"><em>Figure 1. For one or more prefill and decode instances, llm-d's gateway and EPP need no changes; MoRI-IO moves KV, and MoRI-EP carries expert traffic.</em></p>
</div>

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/llmd-mori-stack-v.png" alt="Figure 2. MoRI sits under vLLM and serves both paths: MoRI-EP for expert traffic, issued from the GPU through MORI-SHMEM, and MoRI-IO for KV blocks, posted from the host." style="width:100%; height:auto" />
  <p style="text-align:center"><em>Figure 2. MoRI sits under vLLM and serves both paths: MoRI-EP for expert traffic, issued from the GPU through MORI-SHMEM, and MoRI-IO for KV blocks, posted from the host.</em></p>
</div>

### Where MoRI plugs into llm-d

llm-d's gateway and Endpoint Picker (EPP) need no changes. The EPP's
P/D decider splits a request across prefill and decode when at least 2,048 input tokens are uncached
(the configured threshold). The routing sidecar then runs the two legs. Figure 3 shows two deployment
shapes: one node per role, and roles spanning two pods.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/llmd-mori-deploy.png" alt="Figure 3. MoRI-EP stays inside the node when each role fits one node (a), and crosses pods over RDMA when a role spans two (b)." style="width:100%; height:auto" />
  <p style="text-align:center"><em>Figure 3. MoRI-EP stays inside the node when each role fits one node (a), and crosses pods over RDMA when a role spans two (b).</em></p>
</div>


### A READ request, step by step

The case study uses MoRI-IO READ; Figure 4 follows one request.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/call-flow.png" alt="Figure 4. Decode pulls prefill's KV with one RDMA READ (step 9); the other steps are small control messages, and the handshake runs once per prefill engine." style="width:100%; height:auto" />
  <p style="text-align:center"><em>Figure 4. Decode pulls prefill's KV with one RDMA READ (step 9); the other steps are small control messages, and the handshake runs once per prefill engine.</em></p>
</div>

The two legs run in order, so decode fetches KV right after prefill finishes. READ needs no
`--moriio-*` sidecar flags; the case-study guide sets `read_mode=true` on vLLM's connector. Because
decode reads from whichever rank prefill names, a second prefill instance (2P1D) needs no extra routing
state. Most P/D runs used missing-block READ (see the glossary), so a transfer scales with a turn's new
tokens, not its context: NIC counters measured about 2.8 GB per +30k turn, which takes under 60 ms (estimated) at the ~390 Gb/s per-NIC bandwidth measured before the runs.

## Case study: long-context GLM-5.3 on MI355X

With the path in place, we asked whether P/D over MoRI-IO helps long agentic sessions on a large MoE
model, and at what cost. Such sessions hold hundreds of thousands of tokens of context and keep adding
to it. When one session sends a new 30k-token turn to a colocated server, the other streams on that
replica slow from under 50 ms to 300–400 ms between chunks until that prefill finishes. P/D prefills
long new prompts on GPUs that aren't streaming tokens.

### The model

[`amd/GLM-5.3-Quark-MXFP4-AttnFP8`](https://huggingface.co/amd/GLM-5.3-Quark-MXFP4-AttnFP8)
is quantized with AMD Quark from [`zai-org/GLM-5.3`](https://huggingface.co/zai-org/GLM-5.3), with
MXFP4 (4-bit microscaling) routed and shared experts, FP8 per-block attention, and the embeddings,
`lm_head`, MTP projection and router gate in their original precision. MI355X matrix cores support MXFP4 directly; AMD
[lists 10.1 PFLOPS of peak MXFP4 matrix throughput](https://www.amd.com/en/products/accelerators/instinct/mi350/mi355x.html).
The checkpoint is 409.5 GB, 54% of the 755.6 GB FP8 `zai-org/GLM-5.3` release. Its
[model card](https://huggingface.co/amd/GLM-5.3-Quark-MXFP4-AttnFP8) reports GSM8K of 91.43 versus
91.96 for `zai-org/GLM-5.3` and 99–101% of the base scores on six other benchmarks.

### Setup and workloads

This case study is an initial deployment of the AMD MoRI path with llm-d, run to study P/D and
colocated serving on long-context workloads. The results are from first, untuned runs of one model on
one hardware and software configuration, and are a starting point rather than a tuned benchmark.

Each node has eight AMD Instinct MI355X GPUs and one RDMA NIC per GPU. 1P1D uses two
nodes (one prefill, one decode), each role running DP8/EP8/TP1, and 2P1D, used for cold prompts only,
uses three (two prefill, one decode). In this setup, an Envoy Lua filter at the gateway pins each
session to one data-parallel rank with a session-hash header, so its KV stays cached. Each P/D layout is compared with colocated nodes at equal
sessions per GPU; Appendix B marks node counts that differ from two. Beyond layout, the arms
differ in prefill batching (16,384-token P/D batches versus 2,048-token colocated chunks), routing
(session-hash rank pinning versus the EPP's prefix-affinity and load scoring) and replica size (8-GPU
roles versus two 4-GPU replicas per node). Each deployment or node ran once, untuned; ranges span them.

Warm workloads are named by cached history plus new tokens per turn: "256k +30k" means about 256k
cached tokens and 30k new ones. Cold prompts have nothing cached. Every request generates 1,000 tokens.
The targets are an ITL p99 of 150 ms and a TTFT p90 that scales with context: 12.8 s at 128k, 25.6 s at
256k and 51.2 s at 512k. Appendix A gives the full method.

| Workload | Sessions: P/D deployment / colocated node | What it models |
|---|---:|---|
| 128k +10k† | 32 / 16 | Coding agent, small tool outputs |
| 128k +30k | 32 / 16 | Coding agent reading new files |
| 128k +70k | 16 / 8 | Copilot adding a large document |
| **256k +30k** (focus, recipe default) | **16 / 8** | **Long coding-agent session** |
| 256k +70k | 16 / 8 | Document or repository analysis |
| 512k +30k | 8 / 4 | Very long agent session |
| Cold 256k, 2P1D | 12 / 4 | First request on a large repository |
| Cold 512k, 1P1D | 4 / 2 | First request on a very large corpus |
| Cold 512k, 2P1D | 6 / 2 | First request on a very large corpus |

† Uses whole-prompt READ (Appendix B).

## Results

### Decode-step latency under long prefills

**P/D kept decode steps mostly under the 150 ms target during long prefills, at 66–92% of the colocated
throughput per GPU.**

In colocated serving, a new 30k-token turn is prefilled in chunks that share engine steps with
decode. Expert parallelism makes the replica's four GPUs wait for each other, so every stream on that
replica slows until the prefill finishes. Figure 5 shows one round of 256k +30k as clients see it. The panels share one time axis; the P/D round
serves twice as many requests (48 versus 24) and runs longer.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/f1-prefill-stalls.png" alt="Figure 5. Colocated streams stall at 300–400 ms for about 15 s during another session's prefill, while P/D streams stay near 45 ms, with brief spikes up to about 640 ms. One round of 256k +30k." style="width:100%; height:auto" />
  <p style="text-align:center"><em>Figure 5. Colocated streams stall at 300–400 ms for about 15 s during another session's prefill, while P/D streams stay near 45 ms, with brief spikes up to about 640 ms. One round of 256k +30k.</em></p>
</div>

The slowest 1 in 100 steps (ITL p99) took 71–73 ms with P/D versus 316–322 ms colocated (Figure 6), and steps
slower than 150 ms fell from about 1 in 75 to fewer than 1 in 1,000.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/pair-f3-f2.png" alt="Figure 6. P/D matches colocated on typical decode steps and cuts the slowest 1 in 100 from 316–322 ms to 71–73 ms (256k +30k). Outlined bars: ≤50 ms." style="width:100%; height:auto" />
  <p style="text-align:center"><em>Figure 6. P/D matches colocated on typical decode steps and cuts the slowest 1 in 100 from 316–322 ms to 71–73 ms (256k +30k). Outlined bars: ≤50 ms.</em></p>
</div>

Figure 7 omits 128k +10k, which used upstream whole-prompt READ; there, P/D's ITL p99 was 311 ms
(Appendix B). Missing-block READ cut 128k +30k ITL p99 from 437 to 129 ms, 256k +30k p99.9 from about 940 to
145–149 ms (though p99 rose from ≤50 to 71–73 ms), and 256k +30k READ traffic per request from 24.1 to
3.6 GB.

In Figure 7, P/D held ITL p99 under 130 ms on warm workloads and at or below 50 ms on cold prompts; on
256k +30k it delivered 31.8 versus 37.6 tok/s/GPU. Colocated serving also met 150 ms at 512k +30k, where
each node runs 4 sessions instead of 8 at 256k.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/pair-f4-f5.png" alt="Figure 7. P/D keeps the slowest decode steps under 150 ms on every workload shown (a); colocated reaches the first token sooner (b). Green: meets target; outlined: ≤50 ms; TP: tensor-parallel colocated." style="width:100%; height:auto" />
  <p style="text-align:center"><em>Figure 7. P/D keeps the slowest decode steps under 150 ms on every workload shown (a); colocated reaches the first token sooner (b). Green: meets target; outlined: ≤50 ms; TP: tensor-parallel colocated.</em></p>
</div>

### Time to first token

**Colocated serving returned the first token 1.5–2.3× sooner on the warm workloads in Figure 7.
P/D dedicates half (1P1D) or two-thirds (2P1D) of its GPUs to
prefill.**

On 256k +30k, TTFT p90 rose from 6.2 s to 14.0 s, within its 25.6 s target. P/D met its TTFT target on
256k +30k and 512k +30k and missed it on the rest of Figure 7; colocated also missed on cold prompts
(Figure 7b). These targets scale with retained context. Against a new-token target, P/D would not meet
both targets on any workload (Appendix A).

- **By design:** at equal sessions per GPU, each 1P1D prefill rank serves twice as many sessions as a
  colocated rank.
- **Measured:** in whole-prompt READ runs of the same workloads, average prefill queue time was under
  2 ms at 256k +30k and 512k +30k, and 1.4–1.7 s at 128k +30k and the +70k workloads.
- **Cold prompts** carry no session ID, so each lands on a random rank; on cold 512k some ranks
  received several and waited for KV capacity.

### Accuracy checks

Before the performance runs we checked the P/D path, with every request sent through KV transfer,
using GSM8K (91.28%; the model card's 91.43 used different settings) and needle-in-a-haystack retrieval
at 64k–512k tokens, which succeeded on 94% of single-turn and multi-turn probes.

## Conclusion

For a large MoE model like `amd/GLM-5.3-Quark-MXFP4-AttnFP8` serving long agentic sessions (128k–512k tokens of
history, 10k–70k new tokens per turn) on 8-GPU MI355X nodes, the choice between P/D and colocated
serving depends on which target matters most. This guidance applies to comparable model sizes, context
lengths and turn sizes.

- **Choose colocated serving** when throughput per GPU or time to first token matters most, or when the
  inter-token latency target is relaxed (a few hundred milliseconds). Smaller prefill chunks bring its
  ITL tail down further, to about 190 ms with 1,024-token chunks at a small TTFT cost (Appendix B).
- **Choose P/D** when sessions keep adding large turns and streaming must stay smooth under a tight
  inter-token target, such as 150 ms. With the context-scaled TTFT target, only P/D met both targets at
  256k +30k, and both layouts did at 512k +30k (Figure 7). For steady decode (Figures 5–6), P/D gives
  up some throughput per GPU and some first-token time. Each session's KV must also fit the decode
  GPUs' smaller KV memory (Appendix C).

## Try it

The llm-d guide deploys the case study's P/D layout and router values. The ROCm MAD recipe holds
every layout's serving command and environment, benchmarks, accuracy checks and reference results.
Build the engine image from the recipe's Dockerfile and set the guide's image entry to it.

- Guide: [llm-d: GLM-5.3 Quark MXFP4 on AMD MI355X with MoRI-IO](https://github.com/llm-d/llm-d/pull/3034)
- Recipe: [ROCm MAD: GLM-5.3-Quark-MXFP4-AttnFP8 P/D image and long-context recipe](https://github.com/ROCm/MAD/pull/304)
- Missing-block READ: [vLLM patch in the recipe](https://github.com/ROCm/MAD/pull/304/files#diff-7b9ce3d2211ba032eaa0ac4065bac373827b0938f93b7f57df58385cd3bb853b)
- Model checkpoint: [`amd/GLM-5.3-Quark-MXFP4-AttnFP8`](https://huggingface.co/amd/GLM-5.3-Quark-MXFP4-AttnFP8)

## What's next

- **Configuration screening:** screen larger P/D configurations with ROCm InferaSim
  ([blog](https://rocm.blogs.amd.com/software-tools-optimization/inferasim/README.html), [paper](https://arxiv.org/abs/2611.04032)) before spending GPU time, such as 2P1D and other prefill/decode
  mixes on warm workloads and wide-EP across nodes. Measure MoRI-IO WRITE, which the upstream guides
  run, on these workloads.
- **Engines and models:** SGLang and ATOM, the AMD inference engine, with MoRI inside llm-d; other
  long-context models, with tool calls and context up to 1M tokens.
- **Routing and measurement:** session-aware rank selection in the EPP, alternative cold-request
  placement, and a per-request TTFT breakdown including KV-transfer time.
- **Tuning and capacity:** kernel, batching and parallelism tuning; larger KV budgets, KV offload and
  FP8 KV for more 512k sessions per GPU.

Try the guide and recipe in [Try it](#try-it) and tell us what you see on other models.

## Further reading

- MoRI: [MORI-SHMEM guide](https://rocm.github.io/mori/MORI-SHMEM-GUIDE.html), [MORI-IO benchmarks](https://rocm.github.io/mori/MORI-IO-BENCHMARK.html), [MORI-EP benchmarks](https://rocm.github.io/mori/MORI-EP-BENCHMARK.html).
- AMD ROCm blogs: [DeepSeek on MI300X](https://rocm.blogs.amd.com/software-tools-optimization/wide-ep-deepseek/README.html), [GLM-5.1-FP8 on 64 MI300X GPUs](https://rocm.blogs.amd.com/software-tools-optimization/di-glm-wideep/README.html), [Kimi-K3 MXFP4 on MI300X and MI325X](https://rocm.blogs.amd.com/software-tools-optimization/di-kimi-k3-mxfp4/README.html).
- vLLM: [MoRI-IO KV connector blog](https://vllm.ai/blog/2026-04-07-moriio-kv-connector), [disaggregated prefilling](https://docs.vllm.ai/en/latest/features/disagg_prefill.html), [MoRI-IO connector guide](https://github.com/vllm-project/vllm/blob/main/docs/features/moriio_connector_usage.md), [expert-parallel deployment](https://github.com/vllm-project/vllm/blob/main/docs/serving/expert_parallel_deployment.md).

## Acknowledgements

We thank the AMD vLLM, AITER, MoRI, SGLang and ATOM teams for their support.

## Join the llm-d community

If you are working on long-context serving, come build with us:

- [Join the llm-d Slack](https://llm-d.ai/slack)
- [Explore llm-d on GitHub](https://github.com/llm-d)
- [Join the public community call](https://llm-d.ai/community)


## Appendix: amd/GLM-5.3-Quark-MXFP4-AttnFP8 case-study details

### A. Methodology

- **Sessions and rounds.** A session is one conversation with its own session ID. Each run has six
  rounds. In every round, each session sends a warm-up turn with its retained context, prefilled from
  scratch only in round 1, then two measured turns that each add the workload's new tokens. Cold
  workloads send one uncached prompt per session. The focus workload, 256k +30k, was fixed before the
  runs as the recipe and guide default.
- **What was measured.** Engine ITL comes from vLLM's step-latency histogram over rounds 2–6, on the
  decode instance for P/D. Client ITL (Figure 5) is the gap between streamed chunks. TTFT p90 is
  client-measured over the measured turns, and tok/s/GPU is output throughput while all sessions are
  active.
- **Targets.** ITL p99 must be at most 150 ms. The TTFT p90 target is max(10 s, retained context ÷ 10k
  tokens/s), using the prompt length for cold prompts. A layout meets its targets only if every
  deployment or node in it does. Scored against new tokens instead, every warm target becomes 10 s,
  and P/D would miss on 256k +30k (14.0 s) and 512k +30k (12.3 s), so it would not meet both
  targets on any workload; colocated would still meet both on 512k +30k (8.4–8.5 s).
- **Histogram resolution.** Engine percentiles are interpolated between bucket edges at 50, 75, 100,
  150, 200, 300 and 400 ms, so values such as 71–73 ms are approximate. "≤50 ms" or "≤300 ms" means
  the percentile falls in the bucket ending there. Because 150 ms is an edge, pass/fail verdicts are
  exact.
- **Why colocated p99 jumps.** Colocated decode steps are either short or stalled 300–400 ms behind a
  prefill. p99 therefore reads ≤50 ms when stalls are under 1% of steps and jumps to the stall range, about 270 ms or more, above that;
  the 256k +30k nodes had 1.3–1.4%. That is why some colocated ranges span ≤50–379 ms.

### B. Full results

The colocated control is expert parallel unless marked TP.

| Workload | tok/s/GPU: P/D / colocated | Ratio | TTFT p90 (s): P/D / colocated | P/D ITL p99 (ms) | Colocated ITL p99 (ms) | Meets both targets: P/D / colocated |
|---|---:|---:|---:|---:|---:|---|
| 128k +10k (whole-prompt READ) | 70.4 / 92.5 TP | 0.76× | 8.9 / 7.5 | 311 | 273–274 | No (ITL) / No (ITL) |
| 128k +30k | 55.0 / 60.7 (one node) | 0.91× | 19.9 / 9.8 | 129 | 358 | No (TTFT) / No (ITL) |
| 128k +70k | 23.9 / 29.6 | 0.81× | 24.0 / 12.4 | ≤50 | 345–354 | No (TTFT) / No (ITL) |
| **256k +30k** | **31.8 / 37.6** | **0.85×** | **14.0–14.1 / 6.2** | **71–73** | **316–322** | **Yes / No (ITL)** |
| 256k +70k | 21.1 / 29.0 | 0.73× | 27.6 / 14.1–14.2 | 65 | 314–327 | No (TTFT) / No (ITL) |
| 512k +30k | 16.6 / 18.1 | 0.92× | 12.3 / 8.4–8.5 | ≤50 | ≤50 | Yes / Yes |
| Cold 256k, 2P1D | 5.5 / 6.7 TP (one node) | 0.82× | 91.8 / 51.3 | ≤50 | 291 | No (TTFT) / No (TTFT, ITL) |
| Cold 512k, 1P1D | 1.61 / 2.43 | 0.66× | 172.4 / 89.0–90.5 | ≤50 | 340–379 | No (TTFT) / No (TTFT, ITL) |
| Cold 512k, 2P1D | 1.65 / 2.44 (three nodes) | 0.68× | 146.7 / 89.0–90.5 | ≤50 | ≤50–379 | No (TTFT) / No (TTFT, ITL) |

- **Smaller colocated chunks.** On 256k +30k, 1,024-token chunks gave ITL p99 of about 190 ms, TTFT p90
  of 7.2 s and 37.7 tok/s/GPU, within a 250 ms target, in one-node runs where a 2,048-token run matched
  the control.

### C. Configuration, memory and capacity

The recipe and guide in [Try it](#try-it) hold the full configuration; these settings explain the results:

| | P/D (DP8/EP8/TP1 per 8-GPU role) | Colocated control (two 4-GPU replicas per node, DP4/EP4/TP1 or TP4) |
|---|---|---|
| Prefill batching | up to 16,384 tokens per step, eager; decode up to 256 tokens per step | 2,048-token chunks |
| KV budget per GPU (GB = 10⁹ bytes) | 80 GB, or 851,856 tokens (2P1D decode: 55 GB, or 585,648) | 100 GB (EP), 149 GB (TP) |
| Rest of 288 GB per GPU | about 66 GB weights and 17 GB MoRI-EP heap; about 80 GB less free memory after registering the KV cache for RDMA READ, per peer instance; about 45 GB activations and runtime | about 133 GB at load, MoRI-EP heap included (EP), plus activations and runtime; no registration |
| Routing | P/D decider and session-pinned ranks (see [Setup](#setup-and-workloads)) | per-rank endpoints, prefix-affinity and load scoring |

The P/D budget is smaller because registering the KV cache for RDMA READ reduced the driver-reported free GPU memory by about the KV size, per peer instance, with no matching allocation in vLLM; the 2P1D decode instance registers once per prefill instance. Each resident token takes 93,912 bytes per GPU (BF16 compressed MLA state in 79 layers plus FP8 indexer keys in 22). Sized by peak footprint (last measured turn plus 1,000 output tokens), an 80 GB decode GPU holds 4 sessions at 128k +30k, 2 at 256k +30k and 1 at 512k +30k: the Setup table's 32, 16 and 8 per decode instance.

**Prefix cap.** The EPP matches at most 131,072 prefix tokens, so requests over 133,120 tokens, including the 256k and 512k warm-up turns, are disaggregated even when fully cached.

## Disclaimer

<div className="disclaimer">

DISCLAIMER: The information contained herein is for informational purposes only and is subject to change without notice. While every precaution has been taken in the preparation of this document, it may contain technical inaccuracies, omissions and typographical errors, and AMD is under no obligation to update or otherwise correct this information. Advanced Micro Devices, Inc. makes no representations or warranties with respect to the accuracy or completeness of the contents of this document, and assumes no liability of any kind, including the implied warranties of noninfringement, merchantability or fitness for particular purposes, with respect to the operation or use of AMD hardware, software or other products described herein. No license, including implied or arising by estoppel, to any intellectual property rights is granted by this document. Terms and limitations applicable to the purchase or use of AMD products are set forth in a signed agreement between the parties or in AMD's Standard Terms and Conditions of Sale. GD-18u.

© 2026 Advanced Micro Devices, Inc. All rights reserved. AMD, the AMD Arrow logo, AMD Instinct, ROCm and combinations thereof are trademarks of Advanced Micro Devices, Inc. Other product names used in this publication are for identification purposes only and may be trademarks of their respective owners. Certain AMD technologies may require third-party enablement or activation. Supported features may vary by operating system. Please confirm with the system manufacturer for specific features. No technology or product can be completely secure.

</div>

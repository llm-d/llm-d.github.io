---
title: "AMD MoRI with llm-d: Long-Context GLM-5.3 on MI355X"
description: "AMD MoRI carries RDMA KV transfer and expert parallelism in llm-d, with a GLM-5.3 long-context case study on AMD Instinct MI355X."
slug: serving-long-context-workloads-with-llm-d-and-mori
date: 2026-11-06T09:00
authors:
  - shikhapatel
  - ravigupta
  - prateekkumar
  - vincentcave
  - anshuraina
tags: [blog, inference, agentic-inference, long-context, large-models, kv-cache, disaggregation, vllm, mori]
---

# AMD MoRI with llm-d: Long-Context GLM-5.3 on MI355X

Serving a large mixture-of-experts (MoE) model with llm-d moves two kinds of data between GPUs. With
prefill/decode disaggregation (P/D), the KV cache that prefill computes has to reach the decode GPUs.
With expert parallelism, every MoE layer sends tokens to the GPUs that hold their experts and gathers
the results. We wanted AMD users of llm-d to carry both through AMD's own communication library, AMD
MoRI (Modular RDMA Interface), straight from stock llm-d and vLLM.

AMD engineers and the llm-d and vLLM communities wired MoRI into the llm-d routing sidecar and into
vLLM's KV connector and expert-parallel backend, upstream. Then we put it to work on a 744B-parameter
MoE model at 128k–512k context on AMD Instinct MI355X. The first half of this post walks through the
stack. The second half is that case study, including where P/D helped and what it cost.

<!-- truncate -->

## At a glance

**What we built.** A MoRI path through llm-d, with the llm-d and vLLM communities: MoRI-IO KV
transfer by READ or WRITE, serial or parallel, and MoRI-EP within a node or across nodes (wide-EP).

**Why.** One AMD library serves both GPU-to-GPU paths, so an AMD deployment of llm-d needs no second
communication stack.

**What we achieved.**

- The path is upstream in llm-d and vLLM; the case study adds model patches carried in its recipe.
- It runs end to end on GLM-5.3 (744B total, 40B active parameters) at 128k–512k context. Needle
  retrieval scored 51/54 across three deployments, GSM8K 91.28%, and multi-turn retrieval held through
  490k tokens.
- On the four 128k and 256k workloads adding 30k or 70k tokens per turn, P/D kept decode-step p99 under
  130 ms, while colocated serving reached 314–358 ms.
- Across all workloads P/D delivered 0.66–0.92× the colocated tok/s/GPU, and TTFT p90 was 1.4–2.3×
  higher on the warm workloads measured with missing-block READ. Smaller colocated prefill chunks are the first thing to try.
- A guide and a recipe to reproduce the runs are under review ([Try it](#try-it)).

> **Glossary.**
>
> - **P/D, 1P1D, 2P1D:** prefill/decode disaggregation with one or two 8-GPU prefill instances and one
>   8-GPU decode instance. **Colocated:** prefill and decode share the same GPUs.
> - **Wide-EP:** expert parallelism that spans nodes. **DP, EP, TP:** data, expert and tensor
>   parallelism. **Rank:** one data-parallel engine replica inside an instance.
> - **XGMI:** AMD's GPU-to-GPU links within a node (Infinity Fabric). **RDMA:** remote direct memory
>   access, which moves data between machines without a CPU copy. **Rail:** one NIC per GPU, each on
>   its own network.
> - **Missing-block READ:** decode reads only the KV blocks absent from its own prefix cache, a recipe
>   change not yet upstream for this model. **Whole-prompt READ:** decode reads the whole prompt's KV.
> - **Colocated control:** the higher-throughput of two colocated layouts, each with two 4-GPU
>   replicas per node, expert parallel (EP) or tensor parallel (TP).
> - **Warm / cold:** a turn whose history is already in the prefix cache / a prompt with nothing cached.
> - **TTFT:** time to first token, reported at p90. **ITL:** inter-token latency, here the gap between
>   decode steps. With **MTP-3** (multi-token prediction, three draft tokens), a step delivered
>   2.55–2.58 tokens in the missing-block P/D runs, so 150 ms per step is about 58 ms per token.
> - **EPP:** llm-d's Endpoint Picker. **AITER:** AMD's AI kernel library (AI Tensor Engine for ROCm).
>   **MXFP4:** a 4-bit microscaling floating-point format.
> - **SLO-gated throughput:** tok/s/GPU when ITL p99 and TTFT p90 both meet their targets, else zero.

## Enabling MoRI in llm-d

Bringing MoRI in changed three layers, the routing sidecar, vLLM and the guides, and left llm-d's
gateway and Endpoint Picker as they were. Figure 1 shows the result for any number of prefill and
decode instances, and Figure 2 shows the software stack underneath.

### Why MoRI

We chose MoRI because one library covers both paths ([ROCm/mori README](https://github.com/ROCm/mori)).
MoRI-IO copies KV blocks GPU to GPU over RDMA, either by decode reading them or by prefill writing them
([MORI-IO guide](https://rocm.github.io/mori/MORI-IO-GUIDE.html)). MoRI-EP runs the expert all-to-all
over XGMI within a node and over RDMA across nodes. Its kernels post RDMA operations from the GPU
through MORI-SHMEM, using InfiniBand GPUDirect Async (IBGDA) ([MORI-EP guide](https://rocm.github.io/mori/MORI-EP-GUIDE.html)).
Deployment details are in the
[ROCm vLLM and MoRI recipe](https://rocm.docs.amd.com/projects/ai-ecosystem/en/latest/inference/distributed/vllm-mori-recipe.html)
and [Appendix: MoRI details](#appendix-mori-details).

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/llmd-mori-scale.png" alt="Figure 1. llm-d P/D and wide-EP with AMD MoRI. A filled dot marks the side that starts each KV transfer, and the lower panel shows the two EP options." style="width:100%; height:auto" />
</div>

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/llmd-mori-stack-v.png" alt="Figure 2. The software stack under llm-d with MoRI, from request routing at the top to the GPUs at the bottom. MORI-SHMEM serves MoRI-EP; MoRI-IO posts its RDMA work from the host." style="width:100%; height:auto" />
</div>

### Where MoRI plugs into llm-d

llm-d's control plane stays unchanged, and MoRI sits below it. The EPP's P/D decider still picks a
prefill and a decode endpoint when at least 2,048 input tokens are not cached. The routing sidecar
gained opt-in `--moriio-*` flags for WRITE and multi-pod roles, and vLLM gained the `MoRIIOConnector`
and the MoRI-EP all-to-all backend. Figure 3 lays the same pieces out for one node per role and for two
pods per role.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/llmd-mori-deploy.png" alt="Figure 3. (a) 1P1D with expert parallelism inside each node; (b) 2P2D with each role spanning two pods, so MoRI-EP crosses pods over RDMA. The router pieces are the gateway, the EPP and the decode-side sidecar." style="width:100%; height:auto" />
</div>

### A request, step by step (READ)

To see the pieces work together, we follow one READ request through the case study's deployment. The
numbers match Figure 4.

1. **Request.** The client's request reaches Envoy, where the guide's Lua filter adds a rank header.
2. **Pick endpoints.** The EPP's decider returns a prefill endpoint and a decode endpoint.
3. **Prefill leg.** Envoy routes to the decode pod's sidecar (3a), which asks prefill for one token (3b).
4. **Prefill computes.** Prefill computes KV for the tokens it has not cached and holds the blocks.
5. **Transfer details.** Prefill replies with its rank, block IDs and host (`kv_transfer_params`).
6. **Decode leg.** The sidecar forwards those details to decode unchanged.
7. **Handshake and READ.** Decode handshakes on first contact, then starts an RDMA READ of its blocks.
8. **Stream.** Decode streams tokens back through the sidecar and Envoy.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/call-flow.png" alt="Figure 4. A READ request through llm-d and MoRI-IO. Only step 7 moves KV; reading only the missing blocks needs the recipe patch." style="width:100%; height:auto" />
</div>

Because decode reads from whichever rank prefill names, a second prefill instance (2P1D) needs no extra
routing state.

### READ and WRITE handshakes

We support both MoRI-IO modes in the sidecar because they trade transfer size against overlap
differently (Figure 5). In each mode, the side that moves the data opens the MoRI-IO handshake on first
contact and receives the peer's engine descriptor, KV addresses and block layout. READ is the
sidecar's default, while vLLM's connector defaults to WRITE, so the guide sets `read_mode=true`.

| Mode | READ | Serial WRITE | Parallel WRITE |
|---|---|---|---|
| Sidecar flags | `--kv-connector=nixlv2` | adds `--moriio-write-mode` | adds `--moriio-parallel-dispatch` |
| Who moves KV | decode pulls the blocks it needs | prefill pushes into blocks decode allocated | prefill pushes each layer |
| Who knows the destination | decode, from prefill's reply | prefill, from fields the sidecar adds | prefill, from fields the sidecar adds |
| Decode's transfer details come from | prefill's reply, unchanged | prefill's reply, with rank and missing fields filled | the sidecar's configuration |
| Order of the two legs | prefill, then decode | prefill, then decode | both together |
| Transfer overlaps prefill compute | no | no | yes |

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/moriio-handshake.png" alt="Figure 5. MoRI-IO handshakes for (a) READ and (b) WRITE, following vLLM's MoRI-IO connector and the llm-d sidecar. The dotted bracket in (b) marks the two legs that parallel dispatch sends together." style="width:100%; height:auto" />
</div>

Neither WRITE mode was measured in this work.

### Scaling out: ranks and multiple pods

When a role spans pods, both legs of a request must land on the same data-parallel rank, so the
router is responsible for ranks (Figure 3b). In serial WRITE, decode follows the rank prefill reports
back. In parallel WRITE and multi-pod roles (`--moriio-dp-size` > 1), the sidecar pins both legs up front
with a blake2s hash of the request ID. In
READ the sidecar leaves ranks alone; the case study pins sessions with a simple hash of the session ID
in an Envoy Lua filter. For multi-pod roles, `--moriio-dp-size` and `--moriio-dp-size-local` give the
sidecar the global and per-pod sizes.

### MoRI-EP in the engine

MoRI-EP is vLLM's fused-MoE all-to-all backend on both roles, so expert parallelism and KV transfer
share one library. Each MoE layer dispatches tokens to the GPUs that hold their experts, runs the MXFP4
experts in AITER and combines the results. Prefill uses `mori_high_throughput` and decode
`mori_low_latency`; the two differ only across nodes. In the case study each 8-GPU role runs
DP8/EP8/TP1, so MoRI-EP stays within the node. The
[wide-EP guide](https://github.com/llm-d/llm-d/tree/main/guides/wide-ep) and the
[PyTorch Conference North America 2026 poster](https://events.linuxfoundation.org/pytorch-conference-north-america/program/schedule-posters/?id=1295891)
cover the inter-node case.

### What changed, by layer

The routing sidecar gained MoRI-IO READ and WRITE, serial or parallel dispatch, and DP-rank pinning
across pods. vLLM gained the MoRI-IO connector and the MoRI-EP backend, with wide-EP across pods. The
llm-d guides gained P/D and wide-EP deployments with nightly CI on AMD GPUs. Together, these let the
full llm-d and MoRI path run end to end on AMD GPUs from upstream llm-d and vLLM.

## Case study: long-context GLM-5.3 on MI355X

With the path in place, we wanted to learn whether P/D over MoRI-IO helps long agentic sessions on a
large MoE model, and what it costs. Agentic and long-document sessions keep hundreds of thousands of
tokens in context and keep adding to them. When one session sends a new 30k-token turn to a colocated
server, the gaps in every other stream jump from under 50 ms to 300–400 ms while that prefill runs
(Figure 6). P/D processes long new prompts on GPUs that are not streaming tokens.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/f1-prefill-stalls.png" alt="Figure 6. Client-observed delay between streamed chunks during one round of 256k +30k (48 P/D and 24 colocated requests). The colocated band at 300–400 ms is prefill sharing engine steps with decode. Streaming starts at about 37 s, after the first responses; the P/D gaps of 500–640 ms fall at 37–41 s and 74–75 s, when groups of requests joined the decode batch." style="width:100%; height:auto" />
</div>

> **Scope and caveats.** These are untuned first runs of one model on one hardware and software
> configuration. They are not peak performance, not a benchmark, and not a comparison of products or
> platforms. The case study uses MoRI-IO READ and intra-node MoRI-EP. Three P/D results used
> whole-prompt READ: the 128k +10k row of Appendix B and the 2- and 4-session points of the 512k
> sweep. Their decode tails are not comparable with the other warm rows. TTFT targets follow a recipe
> convention, not a measured user requirement, and KV budgets differ by layout (Appendix E).

### The model

[`amd/GLM-5.3-Quark-MXFP4-AttnFP8`](https://huggingface.co/amd/GLM-5.3-Quark-MXFP4-AttnFP8/tree/bcd1ec31dc1fd474b9997dd2476c92687790b83d)
is quantized with AMD Quark from [`zai-org/GLM-5.3`](https://huggingface.co/zai-org/GLM-5.3), an
agentic, multi-turn MoE (`GlmMoeDsaForCausalLM`) that shares the
[GLM-5](https://huggingface.co/zai-org/GLM-5) architecture. Per the GLM-5 card, it has 744B total
parameters with 40B active per token, plus one MTP layer used for speculative decoding. The Hugging
Face size counter shows about 384B because MXFP4 stores two 4-bit weights per byte. Expert and MLP
weights are MXFP4 and attention is FP8. At runtime the KV cache is BF16, plus a small FP8 key cache for
the sparse-attention indexer (Appendix D). At 93,912 bytes per token, a 256k session needs about 24 GB
of KV and a 512k session about 48 GB. With
[288 GB of HBM3E](https://www.amd.com/en/products/accelerators/instinct/mi350/mi355x.html) per MI355X,
one GPU holds a full 512k-session KV alongside its share of the weights.

### Setup and workloads

The runs used five nodes, each with eight MI355X GPUs and eight AMD Pensando RDMA NICs, one per GPU on
its own rail. The NICs form a RoCEv2 (RDMA over Converged Ethernet) fabric, and pre-flight
`ib_read_bw` measured 389.7 Gb/s on every rail. 1P1D used two nodes and 2P1D three; each colocated
control node ran on its own.

Warm workloads are named by retained context and new tokens per turn: "128k +10k" means about 128k
tokens of cached history plus 10k new tokens in each measured turn. Cold workloads send one long prompt
with nothing cached. Every request generates exactly 1,000 output tokens. Each layout ran the same
number of concurrent sessions per GPU, for example 16 on the 16 P/D GPUs and 8 per colocated node. We
picked 256k +30k as the focus before the runs; it is the default workload of the benchmark recipe and
the llm-d guide.

| Workload | Input per request (ISL), average of the two measured turns | Cached (prefix-cache hit) | New (prefilled) | Concurrent sessions: P/D / colocated per 8-GPU node | What it models |
|---|---:|---:|---:|---:|---|
| 128k +10k | 138k avg | 128k avg | 10k | 32 / 16 | Coding agent, small tool outputs |
| 128k +30k | 158k avg | 128k avg | 30k | 32 / 16 | Coding agent reading new files |
| 128k +70k | 198k avg | 128k avg | 70k | 16 / 8 | Copilot adding a large document |
| **256k +30k** (focus) | 286k avg | 256k avg | 30k | 16 / 8 | Long coding-agent session |
| 256k +70k | 326k avg | 256k avg | 70k | 16 / 8 | Document or repository analysis |
| 512k +30k | 542k avg | 512k avg | 30k | 8 / 4 (also 2 / 1, 4 / 2) | Very long agent session |
| Cold 256k | 256,000 | 0 | 256,000 | 12 on 2P1D / 4 | First request on a large repository |
| Cold 512k | 512,000 | 0 | 512,000 | 4 on 1P1D, 6 on 2P1D / 2 | First request on a very large corpus |

The two measured turns had inputs of 132.5k and 143.5k (128k +10k), 142.5k and 173.5k (128k +30k), and
162.5k and 233.5k (128k +70k). At 256k they were 270.5k and 301.5k (+30k) and 290.5k and 361.5k (+70k),
and at 512k +30k 526.5k and 557.5k.

TTFT targets follow the benchmark recipe's rule, max(10 s, retained context ÷ 10k tokens/s), and cold
prompts use the prompt length: 12.8 s at 128k, 25.6 s at 256k and 51.2 s at 512k.

**Run protocol.** A session is one conversation with its own session ID. A warm run has six rounds. In
each round, every concurrent session sends three turns: one warm-up turn, then two measured turns. The
warm-up turn carries the retained context and is identical in every round, so only round 1 prefills it
from scratch. Each measured turn adds the workload's new tokens.

| Phase (256k +30k on 1P1D) | Requests | Counted in |
|---|---|---|
| Before round 1 | 16 short requests, then 8 at the workload's input length | Nothing |
| Round 1 | 16 sessions × 3 turns = 48 | TTFT and throughput (measured turns) |
| Rounds 2–6 | 48 per round | TTFT and throughput (measured turns); engine ITL (whole round, including the cached warm-up turn) |

### Decode-step latency under long prefills

We first measured how far P/D isolates decode from long prefills. In colocated serving, chunked
prefill shares engine steps with decode, and expert parallelism keeps the GPUs in lockstep. A new
30k-token turn therefore slows every session on that four-GPU replica.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/pair-f3-f2.png" alt="Figure 7. 256k +30k: (a) engine inter-token latency percentiles, mean of two deployments per layout; (b) SLO-gated throughput by ITL p99 target. p50 and p90 fall in the ≤50 ms bucket and are drawn at its edge." style="width:100%; height:auto" />
</div>

Engine ITL p99 was 71–73 ms with P/D (Figure 7) versus 316–322 ms for the expert-parallel colocated
control. Stall share, the fraction of gaps slower than 150 ms, was 0.01–0.08% versus 1.3–1.4%. Engine
p99.9 was 145–149 ms versus 392 ms, and client timing agrees (Appendix A). P/D made long stalls rarer;
it did not eliminate them.

Among the recipe's configurations for this workload, only P/D kept ITL p99 within 150 ms, at
31.8 tok/s/GPU against 37.6 for colocated. Its TTFT p90 rose from 6.2 s to 14.0 s, still within the
25.6 s target. One diagnostic colocated run also read ≤50 ms at p99, with p99.9 of 384 ms, TTFT p90
0.6 s higher and 0.6% of gaps stalled. It added a host synchronization to every MoE layer, a diagnostic
setting outside the recipe, so we left it out of the comparison.

Smaller colocated prefill chunks trade prefill speed for decode tail. With 1,024-token chunks,
colocated expert-parallel serving reached ITL p99 of about 190 ms, TTFT p90 of 7.2 s and
37.7 tok/s/GPU, within a 250 ms target but not 150 ms. At 256k +70k the same setting gave 213 ms. We
did not measure chunks below 1,024 tokens, and these one-node runs used a subset of the recipe's vLLM
changes.

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/pair-f4-f5.png" alt="Figure 8. Per-workload results: (a) P/D tok/s/GPU divided by the colocated control's; (b) throughput versus per-user speed, lines joining P/D to its control." style="width:100%; height:auto" />
</div>

Across all workloads (Figure 8, Appendix B), P/D delivered 0.66–0.92× the colocated control's
tok/s/GPU. On the five warm workloads measured with missing-block READ, P/D engine ITL p99 stayed below
130 ms and p99.9 below 290 ms. Two results differ from that pattern. At 512k +30k colocated serving also
met 150 ms, because with 4 sessions per node instead of 8, fewer decode steps overlap another session's
prefill. On 2P1D cold prompts, p99.9 exceeded 1.5 s while p99 stayed at or below 50 ms. Cold requests
land on random ranks, and those p99.9 values rest on fewer than 20 gaps per run (derived). On cold
prompts, neither layout met its TTFT target.

### Time to first token

On the focus workload, P/D's TTFT p90 was 14.0 s versus 6.2 s colocated. We did not record a
per-request TTFT breakdown, so we separate what we measured from what we infer.

We measured two things. With equal sessions per GPU, 1P1D has half its GPUs prefilling, so each
prefill rank serves twice as many sessions as a colocated rank (2 versus 1 on the focus workload). On
P/D runs of the same workloads with whole-prompt READ, vLLM's prefill queue time
(`vllm:request_queue_time_seconds`) averaged under 2 ms at 256k +30k and 512k +30k. It averaged
1.4–1.7 s (p99 9.6–9.7 s) at 128k +30k and on the +70k workloads, where new turns waited behind other
sessions' prefills on the same rank.

From that we infer that at 256k +30k the extra TTFT is mostly prefill compute shared by the sessions on
a rank, not queueing. KV transfer and the first decode step were not timed separately. Cold prompts
carry no session ID, so each lands on a random rank; on the cold 512k runs some ranks received several
requests, and TTFT p90 includes waiting for KV capacity there.

**A new-token TTFT target.** The recipe's target scales with retained context, not with the new tokens
a turn prefills. Re-scoring the measured TTFT p90 against max(10 s, new tokens ÷ 10k tokens/s) makes
every warm target 10 s, and cold targets are unchanged. P/D would then miss on 256k +30k (14.0 s) and
512k +30k (12.3 s), meeting both targets on no workload. Colocated would still meet both on 512k +30k
(8.4–8.5 s).

### Lessons for implementers

Here is what we would tell someone starting the same work.

- **Read p99 together with stall share.** Colocated gaps were either short decode steps or 300–400 ms
  prefill stalls, so p99 moves by about 300 ms as stalls cross about 1% of gaps. The control nodes sat
  at 1.3–1.4%; the diagnostic run and the 512k rows sat below that line (Appendix A).
- **Try smaller prefill chunks first.** P/D is the option when the target is tighter than chunking
  reaches, such as 150 ms here.
- **Budget memory for KV-transfer registration.** On the tested stack, the P/D layout reserves about
  80 GB per GPU for it, so its KV budget is 80 GB against 100 GB for colocated expert parallel
  (Appendix E).
- **Size the prefill pool for TTFT.** 2P1D ran here only on cold prompts; running it on the warm
  workloads is the next step.
- **Mind the prefix cap.** With `maxPrefixTokensToMatch` at 131,072, every request longer than
  133,120 tokens is disaggregated, even when it is fully cached (Appendix E).

We expect P/D to help most when decode-tail targets around 150 ms matter and sessions append large new
turns to long retained context, as coding agents, document copilots and long-history chat do.
Colocated serving fits peak-throughput goals, small appends and looser tail targets. This guidance
follows the observed mechanism; it is not a claim for every model.

**Consider P/D when:**

- large new turns arrive against long retained context;
- an ITL p99 target around 150 ms is the primary SLO;
- prefill and decode need independent scaling;
- per-session KV fits the prefill and decode memory budgets.

**Consider colocated serving when:**

- turns add little new input;
- peak tok/s/GPU is the objective, or an ITL p99 target of 250 ms or looser can be met with smaller
  prefill chunks;
- a single-node footprint is preferred;
- cold-request TTFT dominates.

**Finding a configuration for your own workload.** The guidance above is a starting point. The right
layout for a specific workload and SLO depends on many interacting settings, and ROCm InferaSim
([blog](https://rocm.blogs.amd.com/software-tools-optimization/inferasim/README.html),
[paper](https://arxiv.org/abs/2611.04032)) projects that choice before GPU time is spent. It predicts
throughput and latency across engine, parallelism, precision, scheduler, speculative-decoding, KV-cache
and P/D choices, from a few short anchor measurements or analytically with none. It searches the
candidates on CPUs, so GPUs only confirm a short list. For GLM-5.3 on cold 512k-token prompts,
InferaSim's analytical mode, with no anchor, predicted what these runs measured. Colocated serving
delivers more throughput per GPU, and P/D keeps decode steps steady while colocated decode stalls
behind prefill. It also picked DP8/EP8/TP1 per role, the layout used here, as the top-ranked 16-GPU P/D
layout.

## Try it

The configuration is under review as two draft pull requests. Together they hold the serving command and
environment of every layout, router values, benchmarks, accuracy gates and reference results. The
engine is built from the MAD#304 Dockerfile; there is no published image yet, so the guide's image
entry is a placeholder.

- Recipe: [ROCm/MAD#304, GLM-5.3-Quark-MXFP4-AttnFP8 P/D image and long-context recipe](https://github.com/ROCm/MAD/pull/304) (draft; tested head `75144e26`)
- Guide: [llm-d/llm-d#3034, GLM-5.3 Quark MXFP4 on AMD MI355X with MoRI-IO](https://github.com/llm-d/llm-d/pull/3034) (draft; tested head `9bc99690`)
- [Model checkpoint: `amd/GLM-5.3-Quark-MXFP4-AttnFP8` (tested revision `bcd1ec31`)](https://huggingface.co/amd/GLM-5.3-Quark-MXFP4-AttnFP8/tree/bcd1ec31dc1fd474b9997dd2476c92687790b83d)

## What's next

- **More layouts:** 2P1D and other xPyD shapes on warm workloads, measured WRITE runs, and wide-EP
  across nodes.
- **Other engines:** llm-d's optimized-baseline guide on MI355X also runs SGLang and ATOM, AMD's
  inference engine, each with nightly CI. Both support MoRI-IO and MoRI-EP on their own, and running
  them with MoRI inside llm-d comes next.
- **More models:** other agentic long-context models and quantizations.
- **Agentic sessions:** tool calls and retained context from 128k to 1M.
- **Router policies:** session-aware rank selection in the EPP and alternative cold-request placement.
- **Measurement:** a per-request TTFT breakdown, including KV-transfer time.
- **Tuning and capacity:** kernel, batching and parallelism tuning with concurrency sweeps; larger KV
  budgets, KV tiering and offload, and FP8 KV for more 512k sessions per GPU.

We set out to give AMD users of llm-d a native path for both GPU-to-GPU flows, and that path now runs
from stock llm-d and vLLM with AMD MoRI underneath. On a 744B MoE model at up to 512k tokens, it held
decode-step latency steady under long prefills, at a throughput cost that smaller colocated chunks can
sometimes avoid.
Try the guide and recipe, review [ROCm/MAD#304](https://github.com/ROCm/MAD/pull/304) and
[llm-d/llm-d#3034](https://github.com/llm-d/llm-d/pull/3034), and tell us what you see on other models.

## Further reading

- [ROCm/mori](https://github.com/ROCm/mori), with the [MORI-IO introduction](https://rocm.github.io/mori/MORI-IO-GUIDE.html) and the [MORI-EP user guide](https://rocm.github.io/mori/MORI-EP-GUIDE.html).
- [Distributed inference with vLLM and MoRI](https://rocm.docs.amd.com/projects/ai-ecosystem/en/latest/inference/distributed/vllm-mori-recipe.html), a ROCm recipe for MI355X.
- The llm-d [P/D disaggregation guide](https://github.com/llm-d/llm-d/tree/main/guides/pd-disaggregation) and [wide-EP guide](https://github.com/llm-d/llm-d/tree/main/guides/wide-ep).
- vLLM's [disaggregated prefilling](https://docs.vllm.ai/en/latest/features/disagg_prefill.html) docs and [MoRI-IO connector guide](https://github.com/vllm-project/vllm/blob/main/docs/features/moriio_connector_usage.md).

## Join the llm-d community

If you are working on long-context serving, come build with us:

- [Join the llm-d Slack](https://llm-d.ai/slack)
- [Explore llm-d on GitHub](https://github.com/llm-d)
- [Join the public community call](https://llm-d.ai/community)

**Tags:** Inference · Agentic Inference · Long Context · Large Models · KV Cache · Disaggregation ·
vLLM · MoRI

## Appendix: GLM-5.3-Quark case-study details

### A. Metrics and benchmark methodology

- **ITL** is the gap between streamed outputs of one request, so here it is a decode-step gap.
  **Engine ITL** comes from vLLM's `vllm:inter_token_latency_seconds` histogram (decode role for P/D).
  **Client ITL** is the gap between streamed chunks at the benchmark client. The **p99** and **p99.9** values are
  the slowest 1 in 100 and 1 in 1,000 gaps, and **stall share** is the fraction slower than 150 ms.
- **TTFT** is client-measured and reported at p90. Throughput is output **tok/s/GPU** over the window
  in which all sessions are active.
- **SLO-gated throughput** at an N ms target is tok/s/GPU when engine ITL p99 is at most N ms and TTFT
  p90 meets the workload target, and zero otherwise. An aggregate of several deployments qualifies only
  if every deployment in it does.
- **Layouts:** P/D runs 1P1D on 16 GPUs, plus 2P1D on 24 GPUs for cold prompts. The colocated control
  is expert parallel except on 128k +10k and cold 256k, where tensor parallel had higher throughput;
  cold 512k ran only expert-parallel controls. All use 2,048-token prefill chunks.

Warm sessions use deterministic public text (repeated cyclically for the longest contexts) and
balanced session IDs. Engine ITL comes from histogram snapshots around each whole round, so it covers
rounds 2–6, including each session's fully cached warm-up turn, equally for every layout. Cold prompts
use exact-length random text.

A 16-GPU 1P1D deployment is compared with two independently measured eight-GPU colocated nodes, and
2P1D runs with three. The colocated controls for 128k +30k and cold 256k used one node. Colocated runs
route to per-rank endpoints with prefix-affinity and load scoring.

Engine percentiles are linearly interpolated within the ITL histogram's buckets (edges at 50, 75, 100,
150, 200, 300 and 400 ms in this range), so values such as 71–73 ms are approximate. A percentile in the
bucket ending at 50 ms is reported as ≤50 ms, and one just under the 300 ms edge as ≤300 ms. The 150 ms
verdict needs no interpolation, because 150 ms is a bucket edge; client percentiles are exact. On the
focus workload, about 93k decode-step gaps per P/D run and 47k per colocated node mean p99.9 rests on
roughly 47–93 samples per run.

On the focus workload, colocated p99 depends on how often decode overlaps another session's prefill.
Nearly all colocated gaps are short decode steps or 300–400 ms prefill stalls. As a result, p99 reads
≤50 ms (engine) or about 90 ms (client) when stalls are under 1% of gaps, and 310–360 ms when over 1%.
The control nodes had 1.3–1.4%, and the diagnostic run in the main text had 0.6%. P/D's 0.01–0.08% is
far enough below 1% that its p99 has no such sensitivity.

Client timing on the focus workload covers all rounds. P/D had p99 about 91 ms versus 332–335 ms
colocated, and p99.9 144–150 ms versus 369–370 ms. Gaps above 150 ms were 0.04–0.10% versus 1.3–1.4%,
and the longest gap was 637 ms versus 674–717 ms. At a 500 ms target both expert-parallel layouts
qualify for SLO-gated throughput, P/D at 31.8 and colocated at 37.6–37.7 tok/s/GPU.

### B. Full results

The last column shows whether each layout met both the 150 ms ITL p99 target and the workload's TTFT
p90 target, and if not, which target it missed.

| Workload | tok/s/GPU: P/D / colocated control | Ratio | TTFT p90 (s): P/D / colocated | P/D ITL p99 / p99.9 (ms) | Colocated ITL p99 / p99.9 (ms) | Meets both targets: P/D / colocated |
|---|---:|---:|---:|---:|---:|---|
| 128k +10k (P/D whole-prompt READ) | 70.4 / 92.5 TP | 0.76× | 8.9 / 7.5 | 311 / 599 | 273–274 / ≤300 | No (ITL) / No (ITL) |
| 128k +30k | 55.0 / 60.7 EP, one node | 0.91× | 19.9 / 9.8 | 129 / 180 | 358 / 396 | No (TTFT) / No (ITL) |
| 128k +70k | 23.9 / 29.6 EP | 0.81× | 24.0 / 12.4 | ≤50 / 287 | 345–354 / 395 | No (TTFT) / No (ITL) |
| 256k +30k | 31.8 / 37.6 EP | 0.85× | 14.0–14.1 / 6.2 | 71–73 / 145–149 | 316–322 / 392 | Yes / No (ITL) |
| 256k +70k | 21.1 / 29.0 EP | 0.73× | 27.6 / 14.1–14.2 | 65 / 287 | 314–327 / 392–393 | No (TTFT) / No (ITL) |
| 512k +30k | 16.6 / 18.1 EP | 0.92× | 12.3 / 8.4–8.5 | ≤50 / 185 | ≤50 / 374–467 | Yes / Yes |
| Cold 256k, 2P1D | 5.5 / 6.7 TP, one node | 0.82× | 91.8 / 51.3 | ≤50 / 1,516 | 291 / ≤300 | No (TTFT) / No (TTFT, ITL) |
| Cold 512k, 1P1D | 1.61 / 2.43 EP | 0.66× | 172.4 / 89.0–90.5 | ≤50 / ≤50 | 340–379 / 499–568 | No (TTFT) / No (TTFT, ITL) |
| Cold 512k, 2P1D | 1.65 / 2.44 EP, three nodes | 0.68× | 146.7 / 89.0–90.5 | ≤50 / 1,666 | ≤50–379 / 491–568 | No (TTFT) / No (TTFT, ITL) |

Warm rows are labeled by retained context and new tokens per turn. EP and TP are the colocated
expert- and tensor-parallel controls; the 128k +10k and cold 256k rows use the TP control, the others
EP. Ranges span the deployments or nodes in each aggregate. A 2,048-token run in the same image as the
1,024-token runs measured 318 ms and 37.4 tok/s/GPU, matching the control. At 256k +70k, the
1,024-token run measured TTFT p90 16.0 s and 28.2 tok/s/GPU.

Varying the number of concurrent sessions on 512k +30k keeps the same ordering:

| Concurrent sessions: P/D / colocated per node | P/D READ mode | P/D tok/s/GPU | Colocated tok/s/GPU | Ratio |
|---|---|---:|---:|---:|
| 2 / 1 | Whole prompt | 4.54 | 5.11 | 0.89× |
| 4 / 2 | Whole prompt | 8.07 | 10.10 | 0.80× |
| 8 / 4 | Missing blocks | 16.6 | 18.1 | 0.92× |

At 16 concurrent sessions, each P/D GPU would hold two 512k sessions, about 1.117M tokens, above its
851,856-token KV budget, so no P/D point was run.

### C. Functional checks and accuracy

| Capability | Evidence |
|---|---|
| Disaggregated serving | 1P1D on 2 × 8 MI355X; 2P1D (two 8-GPU prefill instances and one 8-GPU decode instance) on the cold 256k and 512k prompts |
| Long context | Warm and cold workloads through 512k; 560k configured context window |
| MoRI-IO READ | Every rank probed; 93,912 bytes per transferred token on the warm +30k/+70k workloads and the cold 256k prompt |
| Session-sticky routing | Envoy Lua rank pin; equal completion counts on every rank for warm workloads; zero preemptions |
| Speculative decoding | MTP-3 on both roles |

| Check | Result |
|---|---|
| GSM8K grade-school math, 5-shot, strict-match, through the P/D endpoint | 91.28% |
| Needle in a haystack (find one planted fact), 64k/256k/512k × three depths × two | 51/54 across three deployments (18/18, 17/18, 16/18); 18/18 on the reported deployment |
| Multi-turn needle retrieval | 7/8 at 246k (the same miss appears in an independent reference deployment); 8/8 at 490k |

The model card's accuracy table lists GSM8K (flexible-extract) at 91.96 for `zai-org/GLM-5.3` and
91.43 for this model. The 91.28% here used different settings, so the numbers are not directly
comparable. The three needle misses came from deployments of the same software, had no decode-side
prefix hit, and remain under evaluation. Accuracy checks use `always-disagg-pd-decider`, so every
request exercises KV transfer; harness settings are in the MAD recipe.

### D. Memory and capacity

| Resident tokens | KV per GPU (BF16 MLA and FP8 indexer cache, incl. MTP layer) |
|---:|---:|
| 1 | 93,912 bytes |
| 256k | ~24.0 GB |
| 512k | ~48.1 GB |

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/long-context-mori/f6-memory-capacity.png" alt="Figure A1. P/D memory per GPU, with the 83 GB model load split into weights and MoRI-EP heap, and sessions per GPU in an 80 GB KV budget." style="width:100%; height:auto" />
</div>

The 93,912 bytes per token include the multi-token-prediction (MTP) layer. They are 79 layers (78
model layers plus MTP) × 1,152 bytes of BF16 compressed multi-head latent attention (MLA) state. To
that add 22 layers × 132 bytes of FP8 keys with scales for the sparse-attention indexer, which selects
the preceding tokens each query attends to. The checkpoint's `indexer_types` gives a full indexer to 21
of the 78 model layers (the first three, then every fourth). It marks the other 57 `shared`, reusing a
full-indexer layer's token selection, and the MTP layer adds the 22nd. Session counts in Figure A1 are
sized by each workload's peak footprint (last measured turn plus 1,000 output tokens): 174.5k, 302.5k
and 558.5k tokens for 128k +30k, 256k +30k and 512k +30k. At 128k, the +10k and +70k workloads fit 5
and 3 sessions per GPU.

### E. Configuration reference

Every layout serves the checkpoint at [revision `bcd1ec31`](https://huggingface.co/amd/GLM-5.3-Quark-MXFP4-AttnFP8/tree/bcd1ec31dc1fd474b9997dd2476c92687790b83d);
full commands, environment and router values are in the MAD recipe and the llm-d guide.

| Item | P/D | Colocated control |
|---|---|---|
| Layout | 1P1D, DP8/EP8/TP1 per 8-GPU role; 2P1D also on cold prompts | two 4-GPU replicas per node: DP4/EP4/TP1 or TP4 |
| KV format and budget | BF16 MLA latent plus FP8 indexer keys; 80e9 bytes per GPU (2P1D decode: 55e9, 585,648 tokens) | same format; 100e9 bytes per GPU for expert parallel, 149e9 for tensor parallel |
| Memory breakdown | about 83 GB at model load (66 GB weights + 17 GB MoRI-EP heap); about 80 GB (74.5 GiB) reserved for KV-transfer registration, once per peer instance; about 45 GB for activations and runtime | no registration; about 133 GB at load for expert parallel (heap included); tensor parallel also shards attention |
| Batching, speculation | max batched tokens: prefill 16,384 (eager execution, no graph capture), decode 256; MTP-3; 16-token KV blocks; 560k context | 2,048; MTP-3; same blocks and context |
| MoRI | `MoRIIOConnector`, `read_mode=true`; MoRI-EP intra-node; KV registered with the NIC through dma-buf | MoRI-EP intra-node (expert parallel) |
| Router images | upstream llm-d-router `main` (EPP and routing sidecar; sidecar at `e3448f8`) and upstream Envoy `v1.40.2`, unmodified; digests are pinned in the [llm-d guide](https://github.com/llm-d/llm-d/pull/3034) | same EPP and Envoy; no sidecar |
| Router | sidecar `--kv-connector=nixlv2`; EPP config `glm-5-3-config.yaml`: `prefix-based-pd-decider` (`nonCachedTokens: 2048`), prefix index capped at 131,072 tokens (`maxPrefixTokensToMatch`) | per-rank endpoints, prefix-affinity and load scoring |
| Software | vLLM 0.32 development build: public commit `cd1effa2e7` plus the changes pinned in the MAD recipe; ROCm 10.0, AITER v0.1.27, MoRI `a5ac2bc9` | same |

**Prefix cap.** The decider counts uncached tokens as the input length minus the EPP's matched prefix,
and the approximate prefix producer matches at most 131,072 tokens (`maxPrefixTokensToMatch`). A
request longer than 133,120 tokens is therefore disaggregated even when it is fully cached. Only the
128k workloads' warm-up turns stayed on decode; at 256k and 512k no turn did. Results are unaffected,
because every measured turn added at least 10k new tokens and would be disaggregated anyway.

**Why the KV budgets differ.** Each budget is what fits in 288 GB after the rest of a layout's memory
(Memory breakdown row). P/D reserves memory for KV-transfer registration because MoRI-IO READ registers
the KV cache with the NIC so the remote side can read it. The 2P1D decode instance registers once per
prefill instance, so its budget is 55 GB. Colocated replicas need no registration, so expert parallel
fits 100 GB and tensor parallel, which also shards attention, fits 149 GB.

## Appendix: MoRI details

This appendix keeps the MoRI detail behind the short subsections of "Enabling MoRI in llm-d".

**Layers.** The routing sidecar sits on the decode pod and runs each request in two legs, first on
prefill and then on decode. READ works with the handshake the sidecar already had, so it needed no
sidecar changes. WRITE did, because prefill then needs decode's address before it starts. Deployments
that leave the `--moriio-*` flags off behave as before. In vLLM, prefill runs `MoRIIOConnector` as the
KV producer and decode as the KV consumer. The connector registers the KV cache with the NIC and runs
the handshake once for each remote engine
([vLLM MoRI-IO guide](https://github.com/vllm-project/vllm/blob/main/docs/features/moriio_connector_usage.md)).
MoRI-IO's own engine posts its RDMA work requests from the host, in batches.

**Bytes per transfer.** With missing-block READ, decode checks its own prefix cache and fetches only the
blocks it lacks, so the transfer grows with the new tokens in a turn, not with the whole context. A
turn that added 30k tokens moved 2.82 GB whether the session already held 128k, 256k or 512k tokens. At
the 389.7 Gb/s measured per rail, that is about 58 ms on the wire, a derived figure rather than a
measurement.

**Request details.** The prefill copy carries `max_tokens=1` and `do_remote_decode`. The sidecar keeps
the rank header on both legs.

**WRITE details.** In serial WRITE, the sidecar adds decode's host, its handshake and notify ports, a
transfer ID and the target rank to the prefill request. In parallel WRITE, the sidecar builds decode's
transfer details from its own configuration and holds decode's output until prefill succeeds. In both,
decode sends its block IDs with `send_notify_block`, prefill writes each layer once they arrive, and
prefill's `write_done` message tells decode the KV is in place.

**Multi-pod ranks.** The sidecar's rank pin is BLAKE2s-256 of the request ID, reduced modulo the
data-parallel size, and applies only when `--moriio-dp-size` is above 1. In multi-pod roles, the sidecar
records the global rank in the KV metadata and the pod-local rank in the request header. In WRITE mode
it also sends each transfer to the right pod from its list of decode hosts. Session-aware rank selection in the
EPP could replace the case study's Lua filter.

**MoRI-EP.** In colocated serving, `--all2all-backend mori` selects MoRI-EP
([vLLM expert-parallel guide](https://github.com/vllm-project/vllm/blob/main/docs/serving/expert_parallel_deployment.md));
the case study's expert-parallel colocated controls use it inside one node. The `mori_high_throughput`
and `mori_low_latency` variants choose different inter-node kernels and share one intra-node kernel. In
DP8/EP8/TP1, attention is data-parallel and the experts are spread eight ways, without tensor
parallelism.

**MoRI-EP figures from the README.** For reference, the
[ROCm/mori README](https://github.com/ROCm/mori/tree/f24c13b3) (commit `f24c13b3`) reports MoRI-EP
numbers for MI355X with AMD's AI NIC. Its test sends 4,096 tokens with hidden size 7,168, a reference
shape rather than GLM-5.3's 6,144, to the top-8 experts, dispatching in FP8 and combining in BF16.
Inside one node (EP8), it reports 345 GB/s for dispatch and 420 GB/s for combine over XGMI. Across two
nodes (EP16), the RDMA side reaches 54 GB/s for dispatch and 71 GB/s for combine. A 128-token batch
takes 31 µs to dispatch and 36 µs to combine at EP8, and 84 µs and 108 µs at EP16 with the low-latency
kernel. We did not measure these.

## Disclaimer

<div className="disclaimer">

DISCLAIMER: The information contained herein is for informational purposes only and is subject to change without notice. While every precaution has been taken in the preparation of this document, it may contain technical inaccuracies, omissions and typographical errors, and AMD is under no obligation to update or otherwise correct this information. Advanced Micro Devices, Inc. makes no representations or warranties with respect to the accuracy or completeness of the contents of this document, and assumes no liability of any kind, including the implied warranties of noninfringement, merchantability or fitness for particular purposes, with respect to the operation or use of AMD hardware, software or other products described herein. No license, including implied or arising by estoppel, to any intellectual property rights is granted by this document. Terms and limitations applicable to the purchase or use of AMD products are set forth in a signed agreement between the parties or in AMD's Standard Terms and Conditions of Sale. GD-18u.

© 2026 Advanced Micro Devices, Inc. All rights reserved. AMD, the AMD Arrow logo, AMD Instinct, AMD Pensando, Infinity Fabric, ROCm and combinations thereof are trademarks of Advanced Micro Devices, Inc. Other product names used in this publication are for identification purposes only and may be trademarks of their respective owners. Certain AMD technologies may require third-party enablement or activation. Supported features may vary by operating system. Please confirm with the system manufacturer for specific features. No technology or product can be completely secure.

</div>

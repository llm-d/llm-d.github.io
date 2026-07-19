---
# DRAFT — feature not yet merged. Date, authors, and tags are placeholders.
# Remove `draft: true` and this comment block before publishing.
title: "Peer-to-Peer KV Cache Sharing in llm-d"
description: "llm-d's P2P connector lets any vLLM instance pull cached prefix KV blocks directly from a peer's CPU cache instead of recomputing them - turning per-pod prefix caches into a fleet-wide resource without shared storage."
slug: p2p-kv-cache-sharing-llm-d
date: 2026-08-15T09:00
draft: true

authors:
  - niliguy
  - liranschour
  # TODO: third co-author TBD

tags: [blog, kv-cache]
# TODO: consider adding a dedicated p2p tag to tags.yml
---

# Peer-to-Peer KV Cache Sharing in llm-d

In a distributed llm-d deployment, every vLLM instance keeps its own prefix KV cache. Prefix-aware routing steers requests toward the pod most likely to hold their prefix, but affinity has limits: sessions move between pods under load balancing, new replicas come up cold after scale-out, and a popular shared prefix ends up recomputed once per pod that serves it. Each of those recomputations burns prefill compute on KV tensors that already exist somewhere in the cluster.

The P2P connector closes that gap. It makes every vLLM instance a peer that can pull cached prefix KV blocks directly from another peer's CPU cache over the network, instead of recomputing them. The llm-d Endpoint Picker (EPP) already scores each candidate pod's cached prefix blocks for every request; with P2P, that knowledge stops being just a ranking signal and becomes a transfer instruction: route the request to the best pod overall, and tell it where to fetch the prefix it is missing.

<!-- truncate -->

## The Gap: Prefix Caches Are Per-Pod

When the same prefix appears repeatedly - shared system prompts, common documents, agentic loops, multi-turn conversations - reusing the KV cache skips a large portion of prefill work, cutting time to first token (TTFT) and freeing GPU cycles for decode (a deeper dive on KV reuse use cases appears [here](https://llm-d.ai/blog/kvcache-wins-you-can-see)).

llm-d already attacks this problem from two directions:

* **Prefix-aware routing.** The EPP tracks which pods hold which prefix blocks (approximately, from routing history, or precisely, from KV events) and scores candidates accordingly, so requests land where their cache lives.
* **KV cache offloading.** vLLM's Offloading Connector spills KV blocks from GPU HBM to a much larger CPU memory tier, and llm-d's [filesystem backend](https://llm-d.ai/blog/native-kv-cache-offloading-to-any-file-system-with-llm-d) extends that to shared storage for cluster-wide reuse and persistence.

But routing alone cannot make a cold pod warm, and shared storage introduces an infrastructure dependency plus a storage-speed data path. There is a middle option: the blocks the request needs are often sitting in a peer pod's CPU offload tier, one network hop away, at memory speed. P2P KV cache sharing uses that path.

## How P2P Works

The P2P connector generalizes the prefill/decode (P/D) disaggregation connector into a symmetric peer-to-peer mode. It reuses the same building blocks - CPU KV cache in a canonical layout, a NIXL (NVIDIA's inference transfer library) data path for the block movement, a ZMQ message-queue control path for the lookup handshake - but drops the hard prefiller/decoder role split. Every vLLM instance is a peer; for any given request a peer plays one of two roles:

* **Consumer**: pulls KV blocks for the request from a remote peer's CPU cache instead of computing them locally.
* **Producer**: serves KV blocks from its CPU cache when a remote consumer asks for them.

A single peer can be a consumer for one request and a producer for another concurrently; the roles are per-request, not per-pod.

The transfer itself is best-effort. The consumer sends the producer the block hashes it needs; the producer matches them against its local CPU cache and answers with the hits; the consumer allocates CPU slots for the hits and the producer pushes the blocks over NIXL. The pull sits on the request's latency path - prefill proceeds once the blocks land or the lookup misses - but never on its failure path: hits load into the GPU as normal cache hits, and misses are recomputed by the engine, so a partial or failed transfer degrades to today's behavior rather than failing the request.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/architecture.png" alt="Architecture: the EPP picks the destination pod and source peer and sends the consumer a KV-cache-source header; the consumer's routing sidecar injects the P2P transfer params; a ZMQ control exchange carries block hashes and matches between the pods; NIXL moves the matched blocks from the producer's CPU offload tier to the consumer's CPU tier without touching either GPU; hits load into the consumer's GPU KV cache and unmatched blocks fall back to a recompute" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Anatomy of a pull. The EPP decides, the sidecar injects, and the engines work peer to peer: a ZMQ control exchange settles which blocks the peer holds, and NIXL moves them CPU tier to CPU tier - neither GPU spends time on the transfer.</em></p>
</div>

## How llm-d Decides When to Pull

llm-d's scheduler already estimates, for every request, how much of the prompt's prefix each candidate pod has cached - the same signal that powers prefix-aware routing. P2P adds one decision on top: it compares the best-cached pod against the pod that will actually compute the prefix, and when that peer holds enough more of the prefix to be worth a transfer, it marks the request - through a header the routing sidecar reads - to pull the missing blocks from that peer.

This is a small, opt-in scheduling step, off by default. Because it reuses the existing prefix-cache signal, it works with both prefix-aware routing modes and composes with P/D disaggregation: a prefill worker can pull a cached prefix from a peer, compute only the remainder, and still serve its own blocks to the decoder. Without disaggregation, the decode pod pulls the prefix directly. A tie or a self-match never triggers a pull - there is nothing to gain - and deployments that leave the feature off are unaffected.

## What This Enables

* **Session mobility without cache loss.** A multi-turn conversation rebalanced to a different pod pulls its history from the previous pod instead of recomputing it.
* **Fast warmup on scale-out.** A new replica serves cache hits from day zero by pulling hot shared prefixes from established peers.
* **Fleet-wide reuse of shared prefixes.** A long system prompt prefilled on one pod seeds its peers by pull instead of every pod paying its own prefill.
* **No storage dependency.** Transfers go peer to peer at CPU-memory and network speed; no shared filesystem or object store is required. For deployments that want persistence and effectively unlimited capacity, P2P complements rather than replaces the storage tier.

## Benchmarks

We evaluated P2P KV cache sharing with the llm-d benchmarking framework
(inference-perf) across three models, first on aggregated testbeds and
then on P/D-disaggregated topologies:

* **Scale:** `openai/gpt-oss-120b` (MXFP4), one H200 per pod (TP=1) -
  aggregated on 14 pods (~0.48M tokens of GPU KV per pod, an 88 GiB CPU
  offload tier per pod, 4.4x the GPU cache, vLLM block size 64), and on
  the pd-disaggregation guide topology (8 prefill + 8 decode).
* **Small model:** Llama-3.1-8B-Instruct, one H200 each - aggregated on 4
  pods (32 GiB CPU tier; the same mechanics at a size anyone can rerun on
  four GPUs), and on a 4 prefill + 4 decode P/D pair for the multi-turn
  pull measurement.
* **Agentic:** `Qwen/Qwen3-30B-A3B-Thinking-2507` - the agentic-serving
  guide's benchmark model - on 2 prefill + 4 decode (6x H200, TP=1, 128
  GiB CPU tier per pod against 65.3 GiB of measured GPU KV).

KV transfers go over NIXL - the transport abstraction, running on the
testbed's RDMA-capable network here; latencies depend on the underlying
fabric - and routing uses the llm-d inference gateway
with the precise (KV-event-fed) prefix index. The P2P arms add the
`p2p-source-producer` with a 2048-token minimum advantage threshold, so a
pull is only requested when a peer holds at least that many more cached
prefix tokens than the scheduled pod. The exact workload profiles and EPP
configurations for every run ship with the guide, so each result below is
reproducible the same way the other llm-d guides' benchmarks are.
{/* Setup: kermit/CoreWeave, vLLM nightly + P2P connector branch +
robustness fixes; full tables in the p2p-findings RESULTS.md. */}

Two deployment prerequisites apply to every P2P configuration. First,
block hashes must agree across the fleet: vLLM seeds them per process, so
all peers need the same `PYTHONHASHSEED` and an identical `--block-size`.
Without either, hashes never match across pods and P2P silently degrades
to zero matches - the protocol runs, but every lookup misses and every
prefix is recomputed locally. The external prefix cache hit rate metric is
the quickest way to catch this: it stays at zero. Second, the CPU offload
tier peers serve from must be considerably larger than the pod's GPU KV
cache (at least 2x as the working default; the aggregated testbed here
runs 4.4x) - its value is the KV that GPU evicts and CPU retains.
Compute that ratio from the engine's reported KV capacity rather than
per-GPU intuition: weights are paid once per pod while KV memory scales
with the tensor-parallel degree, so a tier that doubles the GPU cache at
TP=1 can be a fraction of it at TP=4.

### Pull versus recompute (single request)

The physics everything else builds on: prefill latency for a fully cached
prefix, recompute versus P2P pull from a peer's CPU tier. gpt-oss-120b,
fresh prefix seeded on one pod, measured on a cold pod, 5-rep medians:

| prefix tokens | recompute | P2P pull | delta |
|---|---|---|---|
| 2,048 | 71 ms | 49 ms | -31% |
| 8,192 | 205 ms | 120 ms | -42% |
| 16,384 | 426 ms | 196 ms | -54% |
| 32,768 | 983 ms | 376 ms | -62% |
| 49,152 | 1,695 ms | 551 ms | -68% |

The pull wins at every measured length and the gap grows with the prefix:
at 48K - a large document - the pull delivers the prefix 3x faster than
gpt-oss's fast MoE prefill (~29K tokens/s) can recompute it. The
measurement is a single source-consumer pod pair, so it is independent of
fleet size. The small-model testbed shows the same scaling: on Llama-8B
the lines cross near 2K tokens (below it recompute wins, +11% at 1K) and
the pull leads -69% at 16K; on gpt-oss the pull already wins at 2K because
its KV is compact (41.5 KB/token) relative to its prefill speed. Where the
lines cross depends on the model's KV-size-to-prefill-speed ratio; the
economics are a property of the mechanism. The router's 2048-token pull
threshold - the minimum extra cached-prefix tokens a peer must hold beyond
the scheduled pod before a pull is requested - is set to the smallest
length at which the pull wins on both models.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/crossover-gptoss.png" alt="Line chart: prefill latency versus prefix length for recompute and P2P pull on gpt-oss-120b; the pull is lower at every length, 551 ms versus 1,695 ms at 48K tokens (-68%)" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Single-request prefill latency, recompute versus P2P pull, gpt-oss-120b. The pull's latency grows far slower than recompute's as the prefix lengthens; the gap reaches -68% at 48K tokens.</em></p>
</div>

### Document Q&A at scale: the headline result

The workload where the pull changes what users feel: 192 distinct
48K-token documents (about 100 pages each), each queried through 6 short
questions with 256-token answers, 128 conversations in flight - the
enterprise document-assistant shape, where time to first token dominates
the experience. The working set oversubscribes the fleet's GPU cache, so
request placement decides whether a document is a cache hit, a recompute,
or a wait in line.

Two arms: the precise prefix-cache routing configuration (prefix-first
placement), and load-aware placement with the P2P pull. Two full runs with
arm order alternated; all four runs completed 1,152/1,152 turns with zero
errors and zero restarts. TTFT p50 / p95 / p99 in seconds, and throughput:

| Configuration | run | TTFT p50 | TTFT p95 | TTFT p99 | Throughput |
|---|---|---|---|---|---|
| Precise prefix routing | 1 | 4.1s | 41.0s | 80.5s | 5.98 turns/s |
| Precise prefix routing | 2 (order reversed) | 4.2s | 17.3s | 37.2s | 7.66 turns/s |
| Load-aware + P2P | 1 | 4.5s | 13.0s | 20.9s | 7.02 turns/s |
| Load-aware + P2P | 2 (order reversed) | 3.9s | 12.5s | 26.7s | 7.76 turns/s |

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/docqa.png" alt="Bar charts: document Q&A TTFT percentiles and throughput across two order-alternated runs; medians equal, load-aware + P2P p99 21-27 s versus 37-81 s for precise routing, throughput up to +17%" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>192 documents x 48K tokens, 6 Q&A turns each, 128 concurrent. Medians are equal; the arms separate on tails and on stability.</em></p>
</div>

Medians are equal - a session answering from its warm cache is fast either
way. The separation is in the tails and the variance: **p99 TTFT of 21-27s
with P2P versus 37-81s with prefix-first routing - a 28-74% reduction -
alongside up to +17% throughput, which varied 10% between P2P runs
versus 28% between prefix-routing runs**. The mechanism: prefix-first placement sends every
question to the pod that owns its document, and under contention the queue
on that pod becomes the p99 - while displaced questions recompute 48K
tokens. Load-aware placement sends the question wherever there is
capacity, and the pull makes the resulting miss cost ~0.6s instead of a
~2s recompute or a multi-second wait. The tier counters agree: the P2P arm
moved 30-32M tokens between pods per run.

The consistency across the two runs matters as much as the speed: the
prefix-first arm's numbers swing with whatever cache state the fleet
happens to inherit (the two runs deliberately alternate arm order, so each
arm serves once from a cold fleet and once from one warmed by the other
arm), while load-aware + P2P placement does not depend on where KV already
lives - so its results moved little between these two runs. A stronger
stability claim would want more repetitions; this is the behavior observed
across the alternated pair.

### Aggregated serving under load: the pull raises the ceiling

Two experiments on the small-model testbed (4x Llama-3.1-8B - the same
mechanics at a scale that reruns on four GPUs) bound the aggregated
regimes. A single hot 16K prefix is routing's problem, not P2P's: cache-affinity
concentrates every request on the prefix owner and saturates it (p50
6.1s at 24 req/s) while load-balanced routing holds 0.53s - 11x lower -
and the pull adds nothing for a prefix that is resident everywhere after
one recompute per pod. P2P's role is to make that load-balanced
placement safe when prefixes do not fit everywhere. On a 64x16K-token
shared-prefix pool (a 128 GiB KV pool, far larger than any pod's cache)
with identical load-balanced routing in both arms, the pull beats
recompute at every measured rate and the gap grows with load: 43% lower
p50 and 42% lower p95 at 8 req/s, and at high rates the difference is
structural - recompute demand saturates the fleet near 10.3 req/s while
the P2P arm holds 12.6 (+22% ceiling, 30% higher peak token throughput,
up to 83% lower p50 in the 12-16 req/s band where the recompute arm has
already collapsed):

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/saturation.png" alt="Line charts: achieved rate and p50 latency versus offered rate for affinity, load-balanced without P2P, and load-balanced with P2P; without the pull throughput saturates at 10.3 req/s, with it 12.6" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Left: achieved versus offered rate. Affinity tracks the offered line (its best-case pool); recompute saturates near 10 req/s; P2P holds ~12.6. Right: median latency on a log scale - the band between the recompute and P2P curves is the pull's value under overload.</em></p>
</div>

Per-rate tables for the hot-prefix and pool experiments are in the
[guide's benchmark report](https://github.com/llm-d/llm-d/tree/main/guides/p2p-kv-cache-sharing/benchmark-results).

### P/D disaggregation: adding the stack is strictly better

Under P/D disaggregation the pull applies to the **prefill leg only**: the
prefill worker computes the prompt's KV and streams it to the decoder, so
that is the leg where recomputing a cached prefix is wasted work. The EPP
sets the KV-cache-source header against the prefill target, and the sidecar
injects `kv_transfer_params.p2p` onto the prefill leg (the decode leg
already receives the full KV over NIXL and has nothing to pull). A prefill
worker placed off the prefix owner therefore pulls the cached prefix from a
peer and computes only the remainder.

The composability check: the
[pd-disaggregation guide](https://github.com/llm-d/llm-d/tree/main/guides/pd-disaggregation)
exactly as shipped, versus the same deployment plus the P2P stack
(offload tier + pull), and nothing else changed - gpt-oss-120b on 16x
H200 (8 prefill + 8 decode, TP=1), the document-Q&A workload at
concurrency 192, both arms completing 1,152 of 1,152 requests. The stack
is strictly better under load: TTFT p50 falls from 11.9s to 1.16s, p99
from 106s to 80s, and throughput rises 40% (5.68 to 7.96 turns/s). At
this operating point the win comes from the stack's CPU offload tier -
turn N+1's history re-prefill is served from cache (52M externally
served tokens in the run) instead of recomputed under 192-deep queues -
while the pull itself stays quiet under the guide's prefix-affine
placement and activates when placement diverges, which the next two
measurements exercise directly.

### The prefiller pulls from the decoder

In a multi-turn conversation the newest KV lives on the decode worker: it
received the prompt over NIXL and generated the answer. When the next turn
arrives, the scheduled prefill worker is missing that history, the
EPP's index (fed by both roles' cache events) sees the decoder holding it,
and the pull fires - per turn, decided by the router, no application
change.

Measured on Llama-3.1-8B chat multi-turn (4 prefill + 4 decode, 48
conversations x 8 turns): 477K tokens of session history moved
decoder-to-prefiller in one run, and per-turn TTFT holds at 0.1-0.2 s
while prompts grow from 5K to 20K tokens. At 2 prefill workers and
concurrency 96 the same run pulls 1.65M tokens. On a model this small the
recompute it replaces is also cheap, so the benefit is prefill capacity
rather than visible latency - the sizing signal for where the pull pays:
the larger the history and the slower the model's prefill, the larger the
win.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/pd-chat-turns.png" alt="Line chart: per-turn TTFT p50 and p95 flat at 0.1-0.2s across 8 turns while prompt length grows from 7K to 24K tokens" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Turn 0 pays the cold prefill; every later turn's history arrives by pull.</em></p>
</div>

### Agentic sessions: where the stack pays most

Agentic serving concentrates everything the pull is for: contexts of
10-100K tokens, sessions of many turns, and tool-call gaps during which a
session's KV is evicted from GPU memory - so re-engagement is exactly the
pull-versus-recompute choice. The
[agentic-serving guide's](https://github.com/llm-d/llm-d/tree/main/guides/agentic-serving)
benchmark shapes (its model, block size, and generation settings; contexts
10-100K tokens, 4-40 turns, tool-call gaps of 1-20 s), served on the P/D
topology: Qwen3-30B-A3B-Thinking on 6x H200 (2 prefill + 4 decode, TP=1),
288 requests at concurrency 16, both arms 288 of 288, fresh fleet per arm:

| | P/D guide | P/D guide + P2P stack |
|---|---|---|
| TTFT p50 | 5.22 s | **1.09 s** |
| TTFT p95 | 18.94 s | **11.77 s** |
| TTFT p99 | 30.29 s | 29.98 s |
| run time | 304 s | **229 s** |

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/agentic-pd.png" alt="Grouped bars: agentic sessions on P/D; TTFT p50 5.22s to 1.09s, p95 -38%, p99 parity, +33% throughput" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>A second arm-B sample reproduced the result (p50 1.06 s, 237 s).</em></p>
</div>

The stack delivers 4.8x median TTFT and +33% throughput; the 1.23M tokens
of session history pulled instead of recomputed in the 229-second run are
the pull's share of the work, though this comparison does not isolate the
tier's contribution from the pull's. The p99 is unchanged
by design: both arms' worst case is the cold first prefill of a
100K-token context, and the pull removes *re*-computation, not the first
computation. Two deviations from the scenario, applied to both arms:
prefix caching is enabled (the scenario disables it; reuse is the subject
here), and the topology is P/D (the scenario deploys two aggregated
pods).

### When pulling pays: calibrating the threshold

The `minCachedTokenDelta` threshold from the scheduling step above is a
crossover: below it, the transfer's fixed cost outweighs the recompute it
saves. The threshold keeps the scheduler from issuing pulls below the
crossover measured for that model and testbed; the crossover itself moves
with fabric contention and producer load, so production deployments
should leave margin for network and load variance. The single-request sweep earlier in this post prices it for
gpt-oss-120b and Llama-8B (both cross near or below 2K tokens, hence the
2048 threshold on those testbeds). For a new model, a two-point check on
a live pod pair takes minutes and gives the same answer: time a warm pull
and a fresh recompute at a small and a large size, and the pull's fixed
overhead and both per-token rates fall out. On Qwen3-30B-A3B that check
gives a ~30 ms pull overhead, an 8K-token pull in 74 ms against roughly
360 ms of steady-state recompute, and a crossover near 760 tokens - so
the agentic testbed runs a 1024 threshold, and the pull's advantage
widens from there with size, on histories that run 10-100K tokens.

Sizing the tier that serves the pulls follows the same measure-first
rule: read the engine's KV capacity from its startup log and provision
the CPU tier at the 2x working default (the value of the tier is the KV
that GPU evicts and CPU retains), with `/dev/shm` above the tier size and
the pod memory limit above both.

Two boundaries define where these numbers apply. Pulling a *generated*
turn requires the next request to reproduce the same token IDs, which
chat-templated APIs do for models whose templates re-render assistant
turns verbatim (the Llama measurement above); models that drop reasoning
segments on re-render (gpt-oss, Qwen3-Thinking) expose only their input
context and re-prefilled history for pulling - still the bulk of agentic
reuse. And TP-mismatched peers are supported only for
non-hybrid-attention models on the V1 model runner (force it with
`VLLM_USE_V2_MODEL_RUNNER=0` where V2 is the default); hybrid models like
gpt-oss require matched TP, and the P/D topologies here run matched TP
throughout. In-review upstream work stores offloaded KV in a canonical,
parallelism-free layout
([vllm#48414](https://github.com/vllm-project/vllm/pull/48414)), removing
the TP coupling from the stored blocks themselves.

### Future scenarios

* **Prefill placement under skew.** The pool above is uniformly popular -
  affinity's best case. Under a skewed prefix distribution affinity
  concentrates prefill on the hot prefix's owner; load-aware placement plus
  the pull should win latency as well as balance. Measures per-worker
  prefill load balance and p99 TTFT.
* **Scale-out warmup.** Add a cold replica under steady shared-prefix load; measure its TTFT and external prefix cache hit rate over time versus baseline.

## Summary and Next Steps

P2P KV cache sharing turns llm-d's per-pod prefix caches into a fleet-wide resource. The EPP's existing per-request prefix knowledge picks the source, a single header carries the decision, and the connector moves the blocks peer to peer - best-effort, and off the request's failure path. It composes with prefix-aware routing (which minimizes how often a pull is needed), with P/D disaggregation (prefill workers pull prefixes too), and with the storage tier (which adds persistence and capacity beyond what peers hold).

The measurements give a simple rule for when to reach for it. When the
working set fits in the fleet's GPU caches, prefix-aware routing alone is
the right tool - a local hit is free and nothing beats it. When long
prefixes oversubscribe the cache - large documents, deep sessions, wide
prefix pools - placement by cache location starts paying in queues and
recomputes, and that is where load-aware placement plus the pull wins.
The crossover measurement prices each miss; the document-Q&A benchmark
above shows what that pricing compounds into at fleet scale, on the tail
latencies users actually feel.

The agentic measurement above uses the guide's synthetic session shapes; the follow-up is real traces. In recorded Claude Code sessions (the [Weka trace corpus](https://huggingface.co/datasets/semianalysisai/cc-traces-weka-with-subagents-051926) published by SemiAnalysis), over half of all model requests arrive through sub-agent bursts - a median of seven per group, 51 at p90 - each inheriting the parent session's context as a verbatim prefix, with no advance signal to the serving layer. A burst that spills across pods today recomputes that repository-scale prefix once per pod; with P2P, the pod that already holds the prefix becomes the source while the others pull the cached blocks instead of recomputing them. A follow-up post will replay these traces against a P2P-enabled deployment to measure that directly - sub-agent fan-out, session handoff, and think-time gaps included. {/* TODO: link the agentic-serving GLM post once published */}

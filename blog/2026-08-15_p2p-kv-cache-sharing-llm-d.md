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
* **KV cache offloading.** vLLM's Offloading Connector copies completed KV blocks to a much larger CPU memory tier as they are produced - not on eviction - so a block the GPU later evicts still has a copy one tier down; llm-d's [filesystem backend](https://llm-d.ai/blog/native-kv-cache-offloading-to-any-file-system-with-llm-d) extends that to shared storage for cluster-wide reuse and persistence.

But routing alone cannot make a cold pod warm, and shared storage introduces an infrastructure dependency plus a storage-speed data path. There is a middle option: the blocks the request needs are often sitting in a peer pod's CPU offload tier, one network hop away, at memory speed. P2P KV cache sharing uses that path.

## How P2P Works

The P2P connector generalizes the prefill/decode (P/D) disaggregation connector into a symmetric peer-to-peer mode. It reuses the same building blocks - CPU KV cache in a canonical layout, a NIXL (NVIDIA's inference transfer library) data path for the block movement, a ZMQ message-queue control path for the lookup handshake - but drops the hard prefiller/decoder role split. Every vLLM instance is a peer; for any given request a peer plays one of two roles:

* **Consumer**: pulls KV blocks for the request from a remote peer's CPU cache instead of computing them locally.
* **Producer**: serves KV blocks from its CPU cache when a remote consumer asks for them.

A single peer can be a consumer for one request and a producer for another concurrently; the roles are per-request, not per-pod.

The transfer itself is best-effort. The consumer sends the producer the block hashes it needs; the producer matches them against its local CPU cache and answers with the hits; the consumer allocates CPU slots for the hits and the producer pushes the blocks over NIXL. The pull sits on the request's latency path - prefill proceeds once the blocks land or the lookup misses - but never on its failure path: hits load into the GPU as normal cache hits, and misses are recomputed by the engine, so a partial or failed transfer degrades to today's behavior rather than failing the request.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/architecture.png" alt="Architecture, aggregated serving shown: the EPP picks the destination pod and source peer and sends the consumer a KV-cache-source header; the consumer's routing sidecar injects the P2P transfer params; a ZMQ control exchange carries block hashes and matches between the pods; NIXL moves the matched blocks from the producer's CPU offload tier to the consumer's CPU tier without touching either GPU; hits load into the consumer's GPU KV cache and unmatched blocks fall back to a recompute" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Anatomy of a pull, shown for aggregated serving, where the pod answering the request is the consumer. The EPP decides, the sidecar injects, and the engines work peer to peer: a ZMQ control exchange settles which blocks the peer holds, and NIXL moves them CPU tier to CPU tier - neither GPU spends time on the transfer. Under P/D disaggregation the consumer is the prefill worker instead, and the decode pod's routing sidecar carries the EPP's source decision onto the prefill leg - detailed in the P/D section below.</em></p>
</div>

## How llm-d Decides When to Pull

llm-d's scheduler already estimates, for every request, how much of the prompt's prefix each candidate pod has cached - the same signal that powers prefix-aware routing. P2P adds one decision on top: it compares the best-cached pod against the pod that will actually compute the prefix, and when that peer holds enough more of the prefix to be worth a transfer, it marks the request - through a header the routing sidecar reads - to pull the missing blocks from that peer.

This is a small, opt-in scheduling step, off by default. Because it reuses the existing prefix-cache signal, it works with both prefix-aware routing modes - the source decision consumes the approximate index (hash-estimated, no KV events required) and the precise index (KV-event-fed) interchangeably, and the wide-EP measurement below shows pulls firing from each - and composes with P/D disaggregation: a prefill worker can pull a cached prefix from a peer, compute only the remainder, and still serve its own blocks to the decoder. Without disaggregation, the decode pod pulls the prefix directly. A tie or a self-match never triggers a pull - there is nothing to gain - and deployments that leave the feature off are unaffected.

## What This Enables

* **Session mobility without cache loss.** A multi-turn conversation rebalanced to a different pod pulls its history from the previous pod instead of recomputing it. Measured below in use cases 1, 4, 5, and 6.
* **Fleet-wide reuse of shared prefixes.** A long system prompt prefilled on one pod seeds its peers by pull instead of every pod paying its own prefill. Measured below in use case 2.
* **Fast warmup on scale-out.** A new replica serves cache hits from day zero by pulling hot shared prefixes from established peers - the same pull the sections below measure, aimed at a cold pod; the dedicated scale-out benchmark is future work (see future scenarios).
* **No storage dependency.** Transfers go peer to peer at CPU-memory and network speed; no shared filesystem or object store is required - every benchmark in this post runs storage-free. For deployments that want persistence and effectively unlimited capacity, P2P complements rather than replaces the storage tier.

## Benchmarks

We evaluated P2P KV cache sharing across four models - an 8B dense to a
753B wide-EP MoE - on aggregated and P/D-disaggregated testbeds, using the
llm-d benchmarking framework (the wide-EP testbed replays recorded agentic
traces). Each use case below opens with its own setup and names its
baseline: the aggregated and wide-EP comparisons swap only the EPP routing
config, while the P/D ones add the P2P stack on top of the shipped guide.
All runs pin the two fleet-wide prerequisites - identical `--block-size`
and `PYTHONHASHSEED` (mismatched hashes silently degrade P2P to zero
matches) - and run a CPU offload tier at least 2x the GPU KV cache, sized
from the engine's reported KV capacity. The exact workload profiles and
EPP configs for every run ship with the guide, so each result below is
reproducible the same way the other llm-d guides' benchmarks are.
{/* Setup: kermit/CoreWeave, vLLM nightly + P2P connector branch +
robustness fixes; full tables in the p2p-findings RESULTS.md. */}

### Pull versus recompute (single request)

| Setup | |
|---|---|
| Measurement | single source->consumer pod pair (fleet-size-independent), fresh prefix, warmed transfer mesh |
| Compared | local recompute vs P2P pull from a peer's CPU tier |

The measurement that sets each model's pull threshold: seed a fresh prefix
on one pod, request it on a cold peer, time recompute versus pull across
lengths. Recompute grows with prefix length; the pull is nearly flat -
where the curves cross is the smallest prefix worth pulling, and
`minCachedTokenDelta` is set just above that crossover: **2,048** for
gpt-oss-120b and Llama-8B (both cross near or below 2K; Qwen3-30B crosses
near 760, so **1,024** there).

gpt-oss-120b, 5-rep medians:

| prefix tokens | recompute | P2P pull | delta |
|---|---|---|---|
| 2,048 | 71 ms | 49 ms | -31% |
| 8,192 | 205 ms | 120 ms | -42% |
| 16,384 | 426 ms | 196 ms | -54% |
| 32,768 | 983 ms | 376 ms | -62% |
| 49,152 | 1,695 ms | 551 ms | -68% |

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/crossover-gptoss.png" alt="Line chart: prefill latency versus prefix length for recompute and P2P pull on gpt-oss-120b; the pull is lower at every length, 551 ms versus 1,695 ms at 48K tokens (-68%)" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Single-request prefill latency, recompute versus P2P pull, gpt-oss-120b. The pull's latency grows far slower than recompute's; the gap reaches -68% at 48K tokens.</em></p>
</div>

The same sweep on the 753B wide-EP testbed (`GLM-5.2-FP8`, ~93 KB of KV
per token) shows the same two curves with the crossover shifted right - a
dead tie at 13,648 tokens, hence a **16,384** threshold there:

| prefix tokens | recompute | P2P pull | delta |
|---|---|---|---|
| 8,070 | 1.00 s | 1.69 s | +69% |
| 13,648 | 1.74 s | 1.76 s | tie |
| 21,617 | 2.76 s | 1.80 s | -35% |
| 98,220 | 13.75 s | 2.29 s | -83% |

The pull holds ~1.7-2.3 s nearly flat while recompute pays ~140 us per
token, so past the tie the gap widens without bound.

### Use case 1: displaced requests at document scale (the headline)

| Setup | |
|---|---|
| Topology | `gpt-oss-120b` (MXFP4), 16x H200 aggregated (TP=1), ~1.22M GPU KV / 88 GiB CPU per pod (1.8x) |
| Baseline | precise prefix routing, no pull (the reference arm): `prefix-cache` 3 / `queue` 2 / `kv-util` 2 / `no-hit-lru` 2, `max-score` - `epp-affinity.yaml` |
| + P2P | load-aware placement + pull: `queue` 3 / `kv-util` 2, `weighted-random`, `minCachedTokenDelta` 2048 - `epp-load-p2p.yaml` |

The workload where the pull changes what users feel: 192 distinct
48K-token documents (about 100 pages each), each queried through 6 short
questions with 256-token answers, 128 conversations in flight - the
enterprise document-assistant shape, where time to first token dominates
the experience. With 192 documents spread across 16 owner pods (~12
documents per pod on average) and 128 sessions concurrently active,
request placement - not cache capacity - decides whether a document is a
cache hit, a recompute, or a wait in line. Two full runs with arm order
alternated; all four runs completed 1,152/1,152 turns with zero errors
and zero restarts.

| Metric | Baseline | + P2P | delta |
|---|---|---|---|
| TTFT p99 (run 1) | 80.5 s | 20.9 s | **-74%** |
| TTFT p99 (run 2, order reversed) | 37.2 s | 26.7 s | **-28%** |
| TTFT p95 (run 1) | 41.0 s | 13.0 s | **-68%** |
| TTFT p50 (runs 1 / 2) | 4.1 / 4.2 s | 4.5 / 3.9 s | parity |
| Throughput (run 1) | 5.98 turns/s | 7.02 turns/s | **+17%** |
| Run-to-run throughput spread | 28% | 10% | **2.8x steadier** |

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/docqa.png" alt="Bar charts: document Q&A TTFT percentiles and throughput across two order-alternated runs; medians equal, Load + P2P p99 21-27 s versus 37-81 s for the Guide baseline, throughput up to +17%" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>192 documents x 48K tokens, 6 Q&A turns each, 128 concurrent. Medians are equal; the arms separate on tails and on stability.</em></p>
</div>

**Why.** Medians are equal - a session answering from its warm cache is
fast either way. The baseline sends every question to the pod that owns
its document; under contention the queue on that pod becomes the p99,
while displaced questions recompute 48K tokens. The pull makes the miss a
~0.6 s transfer instead of a ~2 s recompute or a multi-second wait - and
because placement no longer depends on where KV already lives, the
results barely move between runs (the alternated order gives each arm one
cold fleet and one warmed by the other arm).

**Evidence.** 30-32M prefix tokens moved between pods per run; the
baseline did 23-31M local CPU-tier restores instead.

### Use case 2: working sets bigger than any pod's cache

| Setup | |
|---|---|
| Topology | `Llama-3.1-8B`, 4x H200 aggregated (TP=1), ~0.5M GPU KV / 32 GiB CPU per pod (~2x) |
| Baseline | load-balanced placement, no pull (the recompute control) - `epp-load.yaml` |
| + P2P | identical placement + `p2p-source-producer`, `minCachedTokenDelta` 2048 - `epp-load-p2p.yaml` |

Both arms place identically; the only difference is whether a cross-pod
miss recomputes its 16K prefix or pulls it - the cleanest isolation of the
pull itself. (A single hot prefix is routing's problem, not P2P's: the
prefix-first baseline concentrates every request on the owner and
saturates it at p50 6.1 s while load-balanced placement holds 0.53 s; the
pull's role is making that load-balanced placement safe when prefixes do
not fit everywhere.) The pool: 64 x 16K shared prefixes, a 128 GiB KV
pool far larger than any pod's cache.

| Metric | Baseline | + P2P | delta |
|---|---|---|---|
| Req latency p50 @ 8 req/s | 2.49 s | 1.41 s | **-43%** |
| Req latency p50 @ 12 req/s | 12.2 s | 2.1 s | **-83%** |
| Saturation ceiling | 10.3 req/s | 12.6 req/s | **+22%** |
| Peak token throughput | 2,420 tok/s | 3,184 tok/s | **+32%** |

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/saturation.png" alt="Line charts: achieved rate and p50 latency versus offered rate for Guide baseline, Load, and Load + P2P; without the pull throughput saturates at 10.3 req/s, with it 12.6" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Left: achieved versus offered rate. The Guide baseline tracks the offered line (its best-case pool); Load saturates near 10 req/s; Load + P2P holds ~12.6. Right: median latency on a log scale - the band between the Load and Load + P2P curves is the pull's value under overload.</em></p>
</div>

**Why.** With N pods each caching 1/N of the pool, every cross-pod
request must recompute or pull. The pull beats recompute at every
measured rate and the gap grows with load - at high rates the difference
is structural: the baseline saturates the fleet on recompute work while
the pull arm keeps serving.

**Evidence.** The same regime on the gpt-oss testbed (128 x 48K pool,
~5x one pod's cache) reproduces the shape at scale: +78% sustained rate
over the recompute control on ~139M pulled prefix tokens (~58% of
requests). Per-rate tables for both experiments are in the
[guide's benchmark report](https://github.com/llm-d/llm-d/tree/main/guides/p2p-kv-cache-sharing/benchmark-results).

### Use case 3: P/D disaggregation - the prefill leg

| Setup | |
|---|---|
| Topology | `gpt-oss-120b` (MXFP4), 16x H200 P/D (8 prefill + 8 decode, TP=1), ~1.61M GPU KV / 128 GiB CPU per pod (~2.0x) |
| Baseline | the [pd-disaggregation guide](https://github.com/llm-d/llm-d/tree/main/guides/pd-disaggregation) exactly as shipped, plain `NixlConnector` |
| + P2P stack | the same deployment + CPU offload tier + `p2p-source-producer`, `minCachedTokenDelta` 2048 - nothing else changed |

Under P/D disaggregation the pull applies to the **prefill leg only**: the
prefill worker computes the prompt's KV and streams it to the decoder, so
that is the leg where recomputing a cached prefix is wasted work. The EPP
sets the KV-cache-source header against the prefill target, and the decode
pod's routing sidecar - which issues the prefill-leg request - injects
`kv_transfer_params.remote_kv_source` onto that leg (the decode leg
already receives the full KV over NIXL and has nothing to pull). The
document-Q&A workload at concurrency 192; both arms completed 1,152 of
1,152 requests.

| Metric | Baseline (guide) | + P2P stack | delta |
|---|---|---|---|
| TTFT p50 | 11.94 s | 1.16 s | **10x** |
| TTFT p95 | 71.6 s | 55.2 s | **-23%** |
| TTFT p99 | 106.1 s | 80.0 s | **-25%** |
| Throughput | 5.68 turns/s | 7.96 turns/s | **+40%** |

**Why.** Under 192-deep queues, turn N+1's history re-prefill is served
from the stack's CPU offload tier instead of recomputed - that tier is
what buys the 10x median at this operating point. The cross-pod pull
itself stays quiet under the guide's prefix-affine placement and
activates when placement diverges, which the next two use cases exercise
directly.

**Evidence.** 52M externally served tokens in the run; zero failures on
both arms.

### Use case 4: session history across roles - the prefiller pulls from the decoder

| Setup | |
|---|---|
| Topology | `Llama-3.1-8B`, 8x H200 P/D (4 prefill + 4 decode; 2 prefill + 4 decode at concurrency 96) |
| Baseline | precise placement, no pull - `epp-llama-a.yaml` |
| + P2P | precise placement + `p2p-source-producer`, `minCachedTokenDelta` 1024 - `epp-llama-b.yaml` |

In a multi-turn conversation the newest KV lives on the decode worker: it
received the prompt over NIXL and generated the answer. When the next turn
arrives, the scheduled prefill worker is missing that history, the
EPP's index (fed by both roles' cache events) sees the decoder holding it,
and the pull fires - per turn, decided by the router, no application
change.

| Metric | Baseline | + P2P | delta |
|---|---|---|---|
| Per-turn TTFT (prompts growing to 20K) | 0.1-0.2 s | 0.1-0.2 s | parity at 8B |
| History moved decoder-to-prefiller | 0 | 477K tokens (4P, C=48) / 1.65M (2P, C=96) | the mechanism |
| Prefill work per turn | full history re-prefill | unshared remainder only | capacity freed |

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/pd-chat-turns.png" alt="Line chart: per-turn TTFT p50 and p95 flat at 0.1-0.2s across 8 turns while prompt length grows from 5K to 20K tokens" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Turn 0 pays the cold prefill; every later turn's history arrives by pull.</em></p>
</div>

**Why.** On a model this small the recompute the pull replaces is also
cheap (~60 ms for a 2K-token answer), so the benefit is prefill
**capacity** rather than visible latency - the sizing signal for where the
pull pays: the larger the history and the slower the model's prefill, the
larger the win. The next use case is exactly that regime.

### Use case 5: agentic re-engagement after tool-call gaps

| Setup | |
|---|---|
| Topology | `Qwen3-30B-A3B-Thinking-2507`, 6x H200 P/D (2 prefill + 4 decode, TP=1), 65.3 GiB GPU KV / 128 GiB CPU per pod (1.96x) |
| Baseline | the [agentic-serving guide](https://github.com/llm-d/llm-d/tree/main/guides/agentic-serving) as shipped, plain NIXL |
| + P2P stack | guide + CPU offload tier + `p2p-source-producer`, `minCachedTokenDelta` 1024 |

Agentic serving concentrates everything the pull is for: contexts of
10-100K tokens, sessions of many turns, and tool-call gaps of 1-20 s
during which a session's KV is evicted from GPU memory - so re-engagement
is exactly the pull-versus-recompute choice. The guide's benchmark shapes
served on the P/D topology, 288 requests at concurrency 16, both arms 288
of 288, fresh fleet per arm.

| Metric | Baseline (guide) | + P2P stack | delta |
|---|---|---|---|
| TTFT p50 | 5.22 s | 1.09 s | **4.8x** |
| TTFT p95 | 18.94 s | 11.77 s | **-38%** |
| TTFT p99 | 30.29 s | 29.98 s | parity |
| Run time (288 requests) | 304 s | 229 s | **+33% throughput** |

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/p2p-kv-cache/agentic-pd.png" alt="Grouped bars: agentic sessions on P/D; TTFT p50 5.22s to 1.09s, p95 -38%, p99 parity, +33% throughput" style={{width: '100%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>A second arm-B sample reproduced the result (p50 1.06 s, 237 s).</em></p>
</div>

**Why.** A returning agent whose session KV was evicted during a tool
call pulls its history instead of recomputing a ~50K-token context. The
p99 is unchanged by design: both arms' worst case is the cold *first*
prefill of a 100K-token context, and the pull removes *re*-computation,
not the first computation. Two deviations from the scenario, applied to
both arms: prefix caching is enabled (reuse is the subject here), and the
topology is P/D (the scenario deploys two aggregated pods).

**Evidence.** 1.23M tokens of session history pulled instead of
recomputed in the 229-second run.

**Reproduced on a later stack.** The whole comparison was re-run months
later on a rebuilt fleet with the upstream P2P tier and its robustness
fixes, fresh arms on both sides: baseline 6.83 s TTFT p50 at 0.82 req/s,
P2P arm 1.09 s at 1.24 req/s - **6.3x median and +50% throughput**,
288 of 288 in both arms again. The pull-side figure is the stable one
across all three independent measurements (1.06, 1.09, 1.09 s); the
baseline is what moves (5.22-6.83 s), so read the speedup as *at least*
4.8x rather than a single point. The one number that moved against the
pull on the re-run was p99 (34.7 s versus 28.2 s), consistent with the
same explanation: the extreme tail is the cold first prefill, which the
pull does not touch.

### Use case 6: affinity rescue at wide-EP scale (753B)

| Setup | |
|---|---|
| Topology | `GLM-5.2-FP8` (753B MoE), 1 prefill + 1 decode, wide-EP (16-way data/expert parallel per role) on 32x H200; ~520K GPU KV tokens and a 100 GiB CPU tier per rank |
| Baseline | precise prefix affinity **without the pull**: precise `prefix-cache` 5 / `queue` 3 / `active-request` 1 |
| + P2P | the same placement + `p2p-source-producer`, `minCachedTokenDelta` 16384 - the only change is adding the pull |
| Workload | recorded agentic traces (the SemiAnalysis Weka corpus, agent chains included), replayed at concurrency 32-128 |

Does the mechanism survive the largest deployment shape - a 753B MoE
spread 16 ways per role? On agentic traces, precise affinity concentrates
sessions on the ranks that hold their cache, and the queues on those
ranks become the latency; the pull lets the picker place on a less-loaded
rank and fetch the session's prefix there.

| Metric (concurrency 32) | Baseline | + P2P | delta |
|---|---|---|---|
| TTFT p50 | 2,265 ms | 1,649 ms | **-27%** |
| TTFT p90 | 7,557 ms | 4,136 ms | **-45%** |
| vs the best load-balanced arm | | ties it | |

| Across the ladder, TTFT p90 | Baseline | + P2P | delta |
|---|---|---|---|
| concurrency 64 | 9,823 ms | 7,139 ms | **-27%** |
| concurrency 128 | 11,755 ms | 9,970 ms | **-15%** |

**Why.** The pull erases the concentration penalty at moderate load -
with it, the affinity arm matches load-balanced placement measured on the
same ladder, without changing the routing policy. TTFT p99 is within
single-run noise at every concurrency (the worst case everywhere is the
cold first prefill of a long context).

**Evidence.** 41 / 93 / 163 GB of KV crossed engines at c32/c64/c128,
verified byte-exact, zero request errors in every cell. The source index
is also interchangeable at this scale: the same producer pointed at the
approximate (hash-estimate) index instead of the precise one drove 34 GB
of pulls at higher concurrency, so the pull does not require the KV-event
pipeline to be deployed. Single run per cell; the full four-arm grid
ships with the guide's benchmark report.

### When pulling pays: calibrating the threshold

The `minCachedTokenDelta` threshold from the scheduling step above is a
crossover: below it, the transfer's fixed cost outweighs the recompute it
saves. The threshold keeps the scheduler from issuing pulls below the
crossover measured for that model and testbed; the crossover itself moves
with fabric contention and producer load, so production deployments
should leave margin for network and load variance. The single-request sweeps earlier in this post price it for
gpt-oss-120b and Llama-8B (both cross near or below 2K tokens, hence the
2048 threshold on those testbeds) and for GLM-5.2 (tie measured at 13.6K,
hence 16384 there). For a new model, a two-point check on
a live pod pair takes minutes and gives the same answer: time a warm pull
and a fresh recompute at a small and a large size, and the pull's fixed
overhead and both per-token rates fall out. On Qwen3-30B-A3B that check
gives a ~30 ms pull overhead, an 8K-token pull in 74 ms against ~1.2 s of
recompute - a 16x advantage at that length - and a crossover near 760
tokens, so the agentic testbed runs a 1024 threshold, and the pull's
advantage widens from there with size, on histories that run 10-100K
tokens. One measurement caveat: calibrate on a *warmed* pod pair - the
first pull between two peers pays a one-time session-establishment cost
(~6 s measured on the wide-EP testbed) that steady-state pulls never see,
so a single cold probe reads the transient, not the pull.

Sizing the tier that serves the pulls follows the same measure-first
rule: read the engine's KV capacity from its startup log and provision
the CPU tier at the 2x working default (the value of the tier is the KV
that GPU evicts and CPU retains), with `/dev/shm` above the tier size and
the pod memory limit above both.

Two boundaries define where these numbers apply. Pulling a *generated*
turn requires the next request to reproduce the same token IDs, which
chat-templated APIs do for models whose templates re-render assistant
turns verbatim (the Llama measurement above); models that drop reasoning
segments on re-render (gpt-oss, Qwen3-Thinking, GLM-5.2) expose only their
input context and re-prefilled history for pulling - still the bulk of
agentic reuse. And TP-mismatched peers are supported only for
non-hybrid-attention models on the V1 model runner (force it with
`VLLM_USE_V2_MODEL_RUNNER=0` where V2 is the default); hybrid models like
gpt-oss require matched TP, and the P/D topologies here run matched TP
throughout. In-review upstream work stores offloaded KV in a canonical,
parallelism-free layout
([vllm#48414](https://github.com/vllm-project/vllm/pull/48414)), removing
the TP coupling from the stored blocks themselves.

### Future scenarios

* **Prefill placement under skew.** The pool above is uniformly popular -
  the Guide baseline's best case. Under a skewed prefix distribution it
  concentrates prefill on the hot prefix's owner; Load + P2P should win
  latency as well as balance. Measures per-worker prefill load balance and
  p99 TTFT.
* **Scale-out warmup.** Add a cold replica under steady shared-prefix load; measure its TTFT and external prefix cache hit rate over time versus baseline.

## Summary and Next Steps

P2P KV cache sharing turns llm-d's per-pod prefix caches into a fleet-wide resource. The EPP's existing per-request prefix knowledge picks the source, a single header carries the decision, and the connector moves the blocks peer to peer - best-effort, and off the request's failure path. It composes with prefix-aware routing (which minimizes how often a pull is needed), with P/D disaggregation (prefill workers pull prefixes too), and with the storage tier (which adds persistence and capacity beyond what peers hold).

The measurements give a simple rule for when to reach for it - and a
slightly less simple one for which placement policy to pair it with. When
the working set fits in the fleet's GPU caches and request placement can
track it cleanly, prefix-aware routing alone is the right tool - a local
hit is free and nothing beats it. Two things break that, and they call
for opposite pairings. A working set that does not fit in any single
pod's cache (use case 2 above) still wants prefix-aware placement, with
the pull as its safety net: the same regime measured at scale on the
guide's gpt-oss testbed shows affinity placement plus the pull tracking
offered rate to saturation, while load-aware placement plus the pull
degrades sharply at the top of the offered-rate ladder - scattering a
popular prefix's traffic costs more in transfer contention than it saves
in balance. High-concurrency placement under a fixed per-document
ownership rule (the document-Q&A benchmark above) is the opposite case:
load-aware placement plus the pull wins there, avoiding the owner-pod
queueing that persists even once affinity's own pull has covered the
cache-locality half of the cost. The pull does not create capacity either
way; it decouples placement from cache locality, which is why the two
regimes want opposite placement policies paired with it (full tables for
both regimes are in the
[guide's benchmark report](https://github.com/llm-d/llm-d/tree/main/guides/p2p-kv-cache-sharing/benchmark-results)).
The crossover measurement prices each miss; the document-Q&A benchmark
above shows what that pricing compounds into at fleet scale, on the tail
latencies users actually feel.

The Qwen agentic measurement above uses the guide's synthetic session shapes; the wide-EP measurement replays real ones. In recorded Claude Code sessions (the [Weka trace corpus](https://huggingface.co/datasets/semianalysisai/cc-traces-weka-with-subagents-051926) published by SemiAnalysis - the corpus the 753B testbed replays), over half of all model requests arrive through sub-agent bursts - a median of seven per group, 51 at p90 - each inheriting the parent session's context as a verbatim prefix, with no advance signal to the serving layer. A burst that spills across pods today recomputes that repository-scale prefix once per pod; with P2P, the pod that already holds the prefix becomes the source while the others pull the cached blocks instead of recomputing them. A follow-up post will study that fan-out directly - burst-level source selection, session handoff, and think-time gaps included. {/* TODO: link the agentic-serving GLM post once published */}

---
# DRAFT — feature not yet merged. Date, authors, tags, and all benchmark
# numbers are placeholders. Remove `draft: true` and this comment block
# before publishing.
title: "Peer-to-Peer KV Cache Sharing in llm-d"
description: "llm-d's P2P connector lets any vLLM instance pull cached prefix KV blocks directly from a peer's CPU cache instead of recomputing them - turning per-pod prefix caches into a fleet-wide cache without shared storage."
slug: p2p-kv-cache-sharing-llm-d
date: 2026-08-15T09:00
draft: true

authors:
  - niliguy
  # TODO: confirm co-authors (connector: liranschour; others?)

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

But routing alone cannot make a cold pod warm, and shared storage introduces an infrastructure dependency plus a storage-speed data path. There is a middle option: the blocks the request needs are often sitting in a peer pod's CPU offload tier, one network hop away, at memory speed. P2P KV cache sharing uses exactly that path.

## How P2P Works

The P2P connector generalizes the prefill/decode (P/D) disaggregation connector into a symmetric peer-to-peer mode. It reuses the same building blocks - CPU KV cache in a canonical layout, a NIXL data path, a ZMQ control path - but drops the hard prefiller/decoder role split. Every vLLM instance is a peer; for any given request a peer plays one of two roles:

* **Consumer**: pulls KV blocks for the request from a remote peer's CPU cache instead of computing them locally.
* **Producer**: serves KV blocks from its CPU cache when a remote consumer asks for them.

A single peer can be a consumer for some requests and a producer for others at the same time, over the same session.

The transfer itself is best-effort and asynchronous. The consumer sends the producer the block hashes it needs; the producer matches them against its local CPU cache and answers with the hits; the consumer allocates CPU slots for the hits and the producer pushes the blocks over NIXL. Hits load into the GPU as normal cache hits; misses are simply recomputed by the engine, so a partial or failed transfer degrades to today's behavior rather than failing the request.

{/* TODO: architecture figure - consumer/producer control + data path
   (ZMQ lookup/fetch, NIXL write), alongside the EPP header flow. */}

## How llm-d Decides When to Pull

llm-d's scheduler already estimates, for every request, how much of the prompt's prefix each candidate pod has cached - the same signal that powers prefix-aware routing. P2P adds one decision on top: it compares the best-cached pod against the pod that will actually compute the prefix, and when that peer holds enough more of the prefix to be worth a transfer, it marks the request - through a header the routing sidecar reads - to pull the missing blocks from that peer.

This is a small, opt-in scheduling step, off by default. Because it reuses the existing prefix-cache signal, it works with both prefix-aware routing modes and composes with P/D disaggregation: a prefill worker can pull a cached prefix from a peer, compute only the remainder, and still serve its own blocks to the decoder. Without disaggregation, the decode pod pulls the prefix directly. A tie or a self-match never triggers a pull - there is nothing to gain - and deployments that leave the feature off are unaffected.

## What This Enables

* **Session mobility without cache loss.** A multi-turn conversation rebalanced to a different pod pulls its history from the previous pod instead of recomputing it.
* **Fast warmup on scale-out.** A new replica serves cache hits from day zero by pulling hot shared prefixes from established peers.
* **Fleet-wide reuse of shared prefixes.** A long system prompt is prefilled once in the cluster, not once per pod.
* **No storage dependency.** Transfers go peer to peer at CPU-memory and network speed; no shared filesystem or object store is required. For deployments that want persistence and effectively unlimited capacity, P2P complements rather than replaces the storage tier.

## Benchmarks

{/* TODO: everything in this section is a placeholder - fill in once the
   benchmark runs are done. Proposed plan below; trim to what we run. */}

We evaluate P2P KV cache sharing with the llm-d benchmarking framework (inference-perf), comparing three configurations on identical hardware and workloads:

1. **Baseline**: prefix-aware routing only (no transfer; misses recompute).
2. **P2P**: prefix-aware routing plus the `kv-cache-source-producer` and the P2P connector.
3. **Reference**: single warm pod (upper bound on cache-hit behavior).

The P/D-disaggregated configurations build on the llm-d [P/D disaggregation guide](https://github.com/llm-d/llm-d/tree/main/guides/pd-disaggregation)'s published benchmark - the same model, inference-perf workload template, and serving topology - so P2P is measured as a layer on the established P/D baseline rather than through a fresh harness, and the numbers stay comparable to the guide's.

One deployment prerequisite applies to every P2P configuration: vLLM seeds its KV block hashes per process, so all peers must run with the same `PYTHONHASHSEED`. Without it, block hashes never match across pods and P2P silently degrades to zero matches - the protocol runs, but every lookup misses and every prefix is recomputed locally. The external prefix cache hit rate metric is the quickest way to catch this: it stays at zero.

Proposed scenarios:

* **Session handoff.** Multi-turn conversations with forced pod switches mid-session; measures TTFT for the first turn after a switch, where P2P should convert a full-prefix recompute into a pull.
* **Scale-out warmup.** Add a cold replica under steady shared-prefix load; measure its TTFT and external prefix cache hit rate over time versus baseline.
* **Shared system prompt fan-out.** Many users sharing a long system prompt (2K-8K tokens) spread across N replicas; measures aggregate throughput and mean/p99 TTFT as the prefix is pulled instead of recomputed per pod.
* **Prefill placement under P/D.** With P/D disaggregation and a skewed shared-prefix load, vary only the prefill selection strategy: prefix-affinity routing (prefill lands on the pod that already caches the prefix) versus load-aware routing plus a P2P pull (prefill lands on the least-loaded worker, which pulls the prefix from a peer). Affinity concentrates a hot prefix's prefill work onto one worker; the pull lets load-aware placement spread that work while preserving cache reuse. Measures per-worker prefill load balance, p99 TTFT, and throughput at a fixed SLO, with the external prefix cache hit rate held roughly constant across both strategies.
* **Pull versus recompute crossover.** Single-request TTFT as prefix length grows, P2P pull versus local prefill, to characterize the prompt-length threshold where pulling wins and inform `minCachedBlockDelta` tuning.

Metrics: TTFT (mean/p99), output throughput, external prefix cache hit rate, per-worker prefill load balance, prefill GPU-seconds saved, and transfer time per pulled block.

{/* Setup TODO: match the P/D guide's benchmark - openai/gpt-oss-120b, prefill
   at TP=1 and decode at TP=4 (the guide's base topology is 8 prefill + 2 decode
   = 16 GPUs / 2 H200 nodes; a down-scaled 4 prefill + 1 decode ~8-GPU single-node
   run is enough for the prefill-placement comparison). Record GPUs, node count,
   interconnect (TCP vs RDMA), vLLM version, CPU offload tier size. */}

<div style={{textAlign: 'center', margin: '20px 0'}}>
  {/* TODO: Figure 1 - session handoff TTFT, baseline vs P2P */}
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Figure 1: TODO</em></p>
</div>

## Summary and Next Steps

P2P KV cache sharing turns llm-d's per-pod prefix caches into a fleet-wide resource. The EPP's existing per-request prefix knowledge picks the source, a single header carries the decision, and the connector moves the blocks peer to peer - best-effort, asynchronous, and off the request's failure path. It composes with prefix-aware routing (which minimizes how often a pull is needed), with P/D disaggregation (prefill workers pull prefixes too), and with the storage tier (which adds persistence and capacity beyond what peers hold).

The natural follow-up is agentic workloads. In real Claude Code traces (the [Weka trace corpus](https://www.semianalysis.com/) published by SemiAnalysis), over half of all model requests arrive through sub-agent bursts - a median of seven per group, 51 at p90 - each inheriting the parent session's context as a verbatim prefix, with no advance signal to the serving layer. A burst that spills across pods today recomputes that repository-scale prefix once per pod; with P2P, the pod that already holds it computes nothing and everyone else pulls. A follow-up post will replay these traces (inference-perf's `weka_trace_replay`) against a P2P-enabled deployment to measure exactly that - sub-agent fan-out, session handoff, and think-time gaps included. {/* TODO: fix the corpus link to the exact trace release, and link the agentic-serving GLM post once published */}

The work is tracked in llm-d-router [#1574](https://github.com/llm-d/llm-d-router/issues/1574) (P2P connector design) and [#1923](https://github.com/llm-d/llm-d-router/issues/1923) (EPP source selection). {/* TODO: link the well-lit-path guide and the vLLM offloading-connector pieces once merged; update status wording at publish time. */}

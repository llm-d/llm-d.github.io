---
title: "Multi-Tenant and Multi-Priority Model Serving with llm-d"
description: "A recommended architecture for sharing one GPU pool across many teams and priorities with llm-d: durable per-tenant queues, quota and rate-limit gates, six-lane strict priority scheduling, and a defined degradation policy at saturation, powered by llm-d-async."
slug: multi-tenant-multi-priority-model-serving-llm-d
date: 2026-09-22T10:00
authors:
  - shimib
tags: [blog, scheduling, inference, multi-tenancy]
---

# Multi-Tenant and Multi-Priority Model Serving with llm-d

You have multiple teams consuming multiple models, with use-cases of varying importance — and one pool of expensive GPU hardware to serve them all. You need to impose quotas and priorities so that no team starves another and no batch job exhausts the cluster.

In this write-up we walk through a recommended architecture for this scenario built on the llm-d open-source stack, focusing on the [llm-d-async](https://github.com/llm-d/llm-d-async) component: an asynchronous dispatch processor that provides quota management, rate limiting, and strict priority scheduling in front of your inference gateways.

<!-- truncate -->

## The Hard Reality of Shared GPU Clusters

Large Language Model (LLM) serving on modern accelerators is a massive capital expense. Statically partitioning that hardware — dedicated node pools per team, or fixed slicing like MIG — leads to a predictable and painful result: siloed hardware with asymmetrical utilization. One team's GPUs idle at 5% over the weekend while another team's batch pipeline faces a multi-hour backlog.

To maximize ROI, hardware must be shared. However, dynamic sharing of large models introduces three critical engineering challenges:

1. **The Noisy Neighbor Problem:** A single team launching a massive document-extraction batch (e.g., 100,000 documents) can instantly saturate the inference engine's prefill capacity, causing the interactive chat applications of other teams to experience catastrophic latency spikes or HTTP 429 timeouts.
2. **Priority Starvation:** In a shared FIFO queue, low-priority background jobs (offline evaluations, embeddings backfills) land ahead of critical real-time requests, starving the high-priority SLA lanes.
3. **Control-Plane Coupling:** Synchronous HTTP gateways hold client connections open through long prefill and decode cycles. Under load, slowness cascades backward into client microservices as connection exhaustion and retry storms.

## The Recommended Architecture: Decoupled & Gated Dispatch

The llm-d stack decouples ingestion from execution with a durable queue layer and an intelligent async dispatch processor:

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/multitenant-async/architecture.jpg" alt="Four-tier architecture: Team Alpha chat and Team Beta document extraction write to per-tenant queues in the persistent backlog layer (GCP Pub/Sub or Redis); the llm-d-async dispatch processor polls them under budget through redis-quota gates and the tier-priority merge policy, stamping priorities and objectives; requests are posted to the llm-d-router / EPP infrastructure gateway for saturation and admission control, then served by vLLM replicas in a shared GKE GPU/TPU compute pool" style="max-width:640px; width:100%; height:auto" />
</div>

This four-tier architecture provides complete isolation, high utilization, and predictable SLAs:

### Tier 1: The Persistent Backlog Layer (Queue-per-Tenant)

Instead of teams hitting the inference gateway directly, requests are written to tenant-specific or workload-specific queues using a durable message broker (like GCP Pub/Sub or Redis). If Team Beta submits 100,000 batch requests, they accumulate safely in `beta-batch` with zero impact on the serving pods' memory. Producers disconnect immediately and pick up results later from a result queue.

### Tier 2: llm-d-async (Gated Dispatch)

The processor consumes from all queues concurrently, but not blindly. Each queue passes through dispatch gates (quota, rate limit, capacity) and a merge policy (priority scheduling) before a worker forwards the request to the gateway. This is where isolation is enforced, and the rest of this post is mostly about this tier.

### Tier 3: llm-d-router / EPP (Router-Side Admission Control)

The llm-d Router sits in front of the model servers and arbitrates in-flight traffic using flow control and saturation detection, driven by real-time engine signals such as vLLM's `num_requests_waiting`. Crucially, this telemetry is exported as Prometheus metrics — and llm-d-async's Prometheus-backed gates poll those same metrics to throttle dequeuing, closing an end-to-end backpressure loop: engine → router metrics → dispatch budget → queue.

### Tier 4: The Shared Compute Pool

vLLM model servers on cost-optimized Kubernetes nodes (e.g., GKE), kept densely utilized by the mix of interactive and batch traffic that the upstream tiers admit.

## The Isolation Pillars

To achieve true SLA isolation, your llm-d-async configuration relies on four core mechanisms:

### Pillar 1: Quota and Rate-Limiting Gates (`redis-quota`)

To stop noisy neighbors, llm-d-async supports a Redis-backed distributed quota gate keyed on any request metadata attribute (a team ID, a user ID). Each gate runs in one of two modes: `rate-limit` (requests per time window) or `concurrency` (simultaneous in-flight requests):

```json
{
  "gate_type": "redis-quota",
  "gate_params": {
    "address": "redis.llm-d:6379",
    "attribute": "team_id",
    "mode": "concurrency",
    "limit": "20",
    "gating_mode": "classifying"
  }
}
```

To enforce both axes at once, compose two quota gates with the `composite` gate — quota acquisition across the inner gates is all-or-nothing.

What happens when a team exceeds its quota depends on `gating_mode`:

- **`blocking`** — over-quota messages simply stop being dequeued. They sit safely on the broker, invisible to the serving pods, until quota frees up.
- **`classifying`** — over-quota messages still flow, but are tagged `overflow` instead of `reserved`. This tag is the input to the next pillar, and it's what turns a blunt rate limiter into a work-conserving scheduler: overflow traffic may still run when the cluster has spare capacity, but never at the expense of anyone's reserved share.

### Pillar 2: The `tier-priority` Merge Policy (Six-Lane Scheduling)

Each queue declares an SLA tier via its labels (`interactive`, `async`, or `batch`), so a tenant's traffic is split across queues by urgency. The merge policy combines that per-queue tier with the per-request classification from Pillar 1 into six strict priority lanes:

| Lane | Priority |
| :-- | :-- |
| `reserved-interactive` | Highest |
| `reserved-async` | |
| `reserved-batch` | |
| `overflow-interactive` | |
| `overflow-async` | |
| `overflow-batch` | Lowest |

When a worker frees up, lanes drain in strict order, with round-robin fairness among queues within a lane. An interactive chat request inside its quota always dispatches ahead of a document-extraction batch — and a team that has blown through its quota drops below every other team's reserved traffic, rather than being rejected outright.

Merging happens per worker pool, not globally: queues are grouped by `worker_pool_id`, and each pool gets its own independent merged channel. A saturated Llama pool blocks only its own channel; the Qwen pool next to it keeps dispatching. That per-pool topology is the mechanism behind the isolation claims, not an aspiration.

### Pillar 3: Propagating Priority to the Gateway

Scheduling doesn't stop at dispatch. The merge policy stamps two headers onto the outgoing request so the gateway's flow control continues the policy inside the serving tier:

- **`x-llm-d-inference-objective`** — the lane's `InferenceObjective`, mapped via `lane_objectives` (e.g., `reserved-interactive` → `premium-latency`, `overflow-batch` → `best-effort`). The llm-d router uses this to apply the matching priority and SLO treatment.
- **`x-llm-d-inference-fairness-id`** — the tenant identity, read from the same metadata attribute the quota gate keys on, so the identity the gateway arbitrates on is exactly the one quota was accounted against. (Prefer opaque tenant IDs over emails — this value can end up in gateway access logs.)

### Pillar 4: Behavior at Saturation (`tier-priority-admission`)

The most important moments in a multi-tenant cluster are the moments there's no capacity left. The `tier-priority-admission` gate wraps a saturation signal (e.g., a `prometheus-saturation` inner gate watching the pool's saturation metric) and issues a three-way verdict when the pool is full:

- **Reserved requests park:** the worker waits in memory and dispatches the moment capacity frees, with no broker redelivery churn.
- **Overflow interactive requests are dropped immediately with a 429** — an interactive caller gains nothing from a stale answer, so fail fast and let the client decide.
- **Overflow async/batch requests are returned to the broker** for redelivery with backoff — they'll run when the rush is over.

This is the difference between "we rate limit" and "we have a defined, tiered degradation policy under overload."

## An Example: Two Teams, One Pool

Team Alpha runs a customer-facing chat product; team Beta runs nightly document extraction. Both share one vLLM pool.

Queue configuration (`--transport redis-sortedset`):

```json
{
  "url": "redis://redis.llm-d:6379/0",
  "queues": [
    {
      "queue_name": "alpha-chat",
      "igw_base_url": "http://llm-d-router.llm-d:80",
      "request_path_url": "/v1/chat/completions",
      "worker_pool_id": "shared-pool",
      "labels": { "tier": "interactive" },
      "gate_type": "redis-quota",
      "gate_params": {
        "address": "redis.llm-d:6379",
        "attribute": "team_id",
        "mode": "concurrency",
        "limit": "20",
        "gating_mode": "classifying"
      }
    },
    {
      "queue_name": "beta-batch",
      "igw_base_url": "http://llm-d-router.llm-d:80",
      "worker_pool_id": "shared-pool",
      "labels": { "tier": "batch" },
      "gate_type": "redis-quota",
      "gate_params": {
        "address": "redis.llm-d:6379",
        "attribute": "team_id",
        "mode": "rate-limit",
        "limit": "600",
        "window": "1m",
        "gating_mode": "classifying"
      }
    }
  ]
}
```

Worker pool with a saturation-aware admission gate (`--pool-config-file`):

```json
[
  {
    "id": "shared-pool",
    "workers": 32,
    "gate_type": "tier-priority-admission",
    "gate_params": {
      "saturation_gate": "prometheus-saturation",
      "saturation_gate_params": "{\"pool\":\"shared-pool\",\"threshold\":\"0.8\"}"
    }
  }
]
```

Merge policy (`--request-merge-policy-config-file`):

```json
{
  "type": "tier-priority",
  "parameters": {
    "fairness_attribute": "team_id",
    "lane_objectives": {
      "reserved-interactive": "premium-latency",
      "overflow-batch": "best-effort"
    }
  }
}
```

Now, when Beta's nightly run floods `beta-batch` with 100,000 requests: they queue durably, dequeue at most 600/minute, are classified reserved/overflow against that budget, always yield to Alpha's chat traffic at the merge step, and are shed back to the broker — never onto the GPUs — when the pool saturates. Alpha's users never notice the batch ran.

## Benchmark: Two Teams, One Pool, Three Front Doors

We measured the two-team scenario above on a dedicated GKE cluster to see what each layer actually buys you.

**Setup.** Two NVIDIA A100 40GB nodes, each running one vLLM v0.19.1 replica of Qwen3-8B (`--max-model-len 4000`), behind the llm-d Router (standalone mode). llm-d-async v0.10.0, Redis, and kube-prometheus-stack run on CPU nodes. Prometheus scrapes the router every 10 s. The load generator runs in-cluster.

**Tenants.**

- **Alpha (interactive chat):** open-loop Poisson arrivals at 4 requests/s for 11 minutes, `/v1/chat/completions`, streaming, about 275 input and 128 output tokens per request. Alpha always calls the router directly with `x-llm-d-inference-objective: reserved-interactive` and its fairness ID. We measure time-to-first-token (TTFT).
- **Beta (document extraction):** a batch of 4,000 `/v1/completions` requests, about 780 input and 256 output tokens each, released 2 minutes into the run. Beta's front door is the variable.

**Pool capacity.** Batch-only calibration showed throughput plateauing at 128 concurrent requests across the two replicas (about 14 requests/s, 3,700 output tokens/s), so we call 128 the pool's saturation concurrency. Beta's direct client opens 128, 384, or 1,280 connections ("1x", "3x", "10x" of saturation) and retries 429s with exponential backoff, the way a real batch job does. In the async configuration Beta simply publishes all 4,000 requests to its Redis queue at once.

**Three front doors for Beta.**

1. **Direct to the router, no flow control.** Default scheduling plugins. This is what most people run today.
2. **Direct to the router with flow control.** The six `InferenceObjective` priority bands from the multi-tenant guide, Beta sending `reserved-batch`, saturation detected by the guide's `concurrency-detector` with `maxConcurrency` set at the measured knee (64 per replica).
3. **Queued through llm-d-async.** The exact configuration from this post: `redis-quota` in classifying mode, the `tier-priority` merge policy, and `tier-priority-admission` over `prometheus-saturation` (threshold 0.8) on a 128-worker pool, dispatching into the same flow-control router as door 2.

In every run Alpha's TTFT is identical before Beta starts (p50 61 ms, p99 about 90 ms) and returns to that level within seconds of Beta draining. The table reports the window while Beta's backlog is in flight.

| Beta's front door | Beta offered concurrency | Alpha TTFT p50 (vs idle) | Alpha TTFT p99 | Beta 429s | Beta drain time | Pool output tok/s |
|---|---|---|---|---|---|---|
| 1. Direct, no flow control | 1x (128) | 132 ms (2.2x) | 1,428 ms | 0 | 298 s | 3,742 |
| 1. Direct, no flow control | 3x (384) | 3,748 ms (61.4x) | 13,960 ms | 0 | 296 s | 3,800 |
| 1. Direct, no flow control | 10x (1,280) | 65,946 ms (1081.1x) | 80,773 ms | 0 | 290 s | 3,726 |
| 2. Direct + flow control | 1x (128) | 424 ms (7.1x) | 3,649 ms | 0 | 308 s | 3,625 |
| 2. Direct + flow control | 3x (384) | 427 ms (7.0x) | 3,763 ms | 0 | 308 s | 3,641 |
| 2. Direct + flow control | 10x (1,280) | 468 ms (7.8x) | 3,810 ms | 10,568 | 307 s | 3,660 |
| 3. llm-d-async, 128 workers (mean of 3 runs) | whole backlog at once | 480 ms (7.8x) | 5,532 ms | 0 | 392 s | 3,013 |
| 3. llm-d-async, 96 workers | whole backlog at once | 89 ms (1.5x) | 1,923 ms | 0 | 445 s | 2,740 |
| 3. llm-d-async, 64 workers | whole backlog at once | 90 ms (1.5x) | 637 ms | 0 | 400 s | 2,971 |

**What the numbers say.**

- **Without admission control, the interactive tenant's latency scales with the size of the batch.** At 3x, Alpha's median TTFT is 61 times its idle value. At 10x, vLLM holds a waiting queue of about 1,000 requests and Alpha waits over a minute for its first token. Beta is perfectly happy throughout: the batch drains in under 5 minutes in every baseline run. That asymmetry is the noisy neighbor problem in one row.
- **Flow control bounds the damage, but it does not remove it, and it moves the pain to Beta.** Alpha's TTFT is the same at 1x, 3x, and 10x, which is exactly what priority bands are for. But the bound sits at 7 to 8x idle, because once the pool's in-flight count reaches the detector's cap, even priority-100 requests wait for a slot at the gateway (the router's own `flow_control_request_queue_duration_seconds` metric reports a mean of 376 ms for Alpha across these runs). And at 10x, Beta's 4,000 requests cost 14,568 attempts: 10,568 were rejected with 429 when the batch band filled, and Beta's client absorbed the retry storm.
- **Queuing the batch removes the rejections and the retry storm entirely.** Through llm-d-async, all 4,000 requests complete with zero 429s, zero client retries, and zero failures, and Beta's producer disconnected the moment it published. With the same concurrency-detector router, Alpha sits at the same 7 to 8x floor as door 2, so the async tier inherits the router's gating behavior rather than fixing it. It also drains about 25% slower (392 s versus 307 s): 128 workers overshoot the router's cap before the 10 s Prometheus scrape reports it, so the saturation gate closes late and reopens all at once, and the pool oscillates instead of running flat out.

**Metering the batch below saturation is the lever that isolation actually turns on.** The async tier is the only place in the stack where batch admission can be shaped before it reaches the gateway. Dispatching Beta with 96 workers instead of 128 drops Alpha's median TTFT to 89 ms (1.5x idle); with 64 workers it is 90 ms with a p99 of 637 ms, the best tail in the whole study. The price is drain time: the same 4,000 requests take 400 to 445 s instead of about 300 s, with the pool at roughly 75 to 80% of its peak output. That trade is explicit and tunable per pool, which is the point. (96 workers drained slightly slower than 64 because 96 batch requests plus Alpha's traffic still brushed the router's cap, so the saturation gate kept cycling; 64 never touched it.)

<div style="text-align:center; margin:20px 0">
  <img src="/img/blogs/multitenant-async/ttft-chart.svg" alt="Bar chart of the interactive tenant's TTFT p50 and p99 during the batch burst for every configuration, log scale: no flow control climbs from 132 ms to 66 s as the batch grows; flow control with the concurrency detector holds 424 to 468 ms; llm-d-async with 96 or 64 workers holds 89 to 90 ms; flow control with the utilization detector jumps to 11 to 16 s at 3x and 10x while llm-d-async on the same router stays at 111 to 164 ms" style="width:100%; height:auto" />
</div>

**Detector choice matters more than the front door for the direct path.** We repeated doors 2 and 3 with the router's default `utilization-detector` (vLLM queue depth and KV-cache pressure) instead of the concurrency detector.

| Beta's front door | Beta offered concurrency | Alpha TTFT p50 (vs idle) | Alpha TTFT p99 | Beta 429s | Beta drain time | Pool output tok/s |
|---|---|---|---|---|---|---|
| 2. Direct + flow control | 1x (128) | 167 ms (2.7x) | 2,098 ms | 0 | 297 s | 3,740 |
| 2. Direct + flow control | 3x (384) | 11,469 ms (188.0x) | 26,249 ms | 0 | 433 s | 2,737 |
| 2. Direct + flow control | 10x (1,280) | 15,687 ms (253.0x) | 42,375 ms | 14,453 | 435 s | 2,767 |
| 3. llm-d-async, 128 workers | whole backlog at once | 164 ms (2.7x) | 2,668 ms | 0 | 304 s | 3,684 |
| 3. llm-d-async, 96 workers | whole backlog at once | 111 ms (1.9x) | 1,609 ms | 0 | 331 s | 3,440 |

The reactive detector is generous at 1x, letting Alpha through at 2.7x idle. At 3x and 10x it fails: the burst reaches vLLM before the telemetry shows it, a waiting queue of over 100 forms, and the router then holds everyone, including Alpha, whose median TTFT climbs to 11 to 16 seconds. Routing Beta through llm-d-async on the same router avoids that failure completely: the dispatcher never presents the router with a burst, so Alpha stays at 2.7x idle with the whole backlog draining at full pool throughput. The queue makes the router's admission control work as designed no matter which detector you picked.

**Caveats.** One model, one pool, one hardware configuration, one prompt mix. Alpha calls the router directly in all setups, so its TTFT reflects the gateway and the engine rather than the queue; an interactive tenant that also went through `alpha-chat` would see completion latency instead of streaming TTFT. The absolute floor for Alpha is set by vLLM itself: at 130-plus concurrent sequences the engine's own scheduling adds roughly 2x to first-token latency on this hardware, so "within a few percent of idle" is not reachable while the pool is fully utilized.

## Reliability Is Part of Isolation

Multi-tenancy isn't only about scheduling; it's about what happens when things fail:

- **Deadlines.** Every request carries a mandatory deadline. Failed or shed messages retry with exponential backoff until the deadline, after which the producer gets an explicit `DEADLINE_EXCEEDED` result. A stuck tenant's backlog expires; it doesn't rot on the broker forever.
- **At-least-once processing.** On Pub/Sub, requests ride exactly-once subscriptions with a dead-letter queue; on Redis, the sorted-set transport uses claim-based durable dequeue, so a processor crash mid-flight means redelivery, not loss.
- **Durable result delivery.** Producers can consume results with a lease/acknowledge protocol (receive → checkpoint → ack), so a crashing consumer never drops a result it hadn't durably recorded.
- **Failure decoupling.** A slowdown or outage in the serving tier never propagates to client microservices — producers only ever talk to the broker.

## Observability

Every gate decision and queue is measurable, which is what makes tenant disputes tractable. The processor exports Prometheus metrics including `async_gate_decisions_total` (why requests were refused, per queue), `async_dispatch_budget` (how open each gate currently is), `async_broker_backlog` and `async_queue_depth`, `async_deadline_proximity_millis` (backlog at risk of expiring), `async_inflight_requests`, `async_tokens_total`, and end-to-end latency histograms — with Grafana dashboards for backlog, in-process load, token usage, and deadline proximity available out of the box. "Show me the gate refusing Team Beta at 02:00" is a query, not an investigation.

## Business and Operational Outcomes

By deploying this gated-dispatch architecture, platform engineering teams can expect the following results:

1. **Higher GPU utilization from a single shared pool:** Running one dense, shared GPU/TPU pool rather than dedicated clusters per team removes the idle capacity that static partitioning locks up. How much you save scales with how asymmetric your teams' utilization is; in the benchmark above, a batch tenant filled the capacity an interactive tenant left unused without the interactive tenant paying for it.
2. **Bounded interactive latency under any size of backlog:** In our measurements, a batch backlog offered at 10x the pool's saturation concurrency pushed the interactive tenant's median time-to-first-token (TTFT) past one minute on a plain router. Queued through llm-d-async with the batch metered at 50 to 75% of saturation, the same backlog completed with zero rejections while interactive TTFT stayed within 1.5x of idle at the median and under 2 s at p99, and the bound did not depend on how large the backlog was.
3. **Decoupled System Reliability:** Slowdowns or outages on the model servers do not cascade to client microservices. Client applications simply write requests directly to their respective backlog queues and decouple immediately, remaining completely insulated from downstream inference pressure. In the benchmark, the direct batch client needed 14,568 attempts to land 4,000 requests through a saturated gateway; the queued client published once and disconnected.

## Getting Started

To begin building your own multi-tenant, multi-priority model serving stack, check out our complete, step-by-step [Multi-Tenant Deployment Guide](https://github.com/llm-d/llm-d/tree/main/guides/batch-serving/asynchronous-processing/multitenant), which contains full Helm values, Prometheus scrape configurations, and load-test scripts to validate isolation under high batch loads.

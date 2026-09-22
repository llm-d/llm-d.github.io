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

1. **GPU Infrastructure Cost Reductions of 30% to 50%:** By running a single, highly dense, shared GPU/TPU pool rather than dedicated clusters per team, idle capacity is virtually eliminated.
2. **Guaranteed Interactive SLAs under Extreme Backlog:** Real-world benchmarks show that even when a background batch task scales up to 10x the cluster's aggregate capacity, high-priority interactive requests maintain their time-to-first-token (TTFT) metrics within 3% to 5% of the completely idle baseline.
3. **Decoupled System Reliability:** Slowdowns or outages on the model servers do not cascade to client microservices. Client applications simply write requests directly to their respective backlog queues and decouple immediately, remaining completely insulated from downstream inference pressure.

## Getting Started

To begin building your own multi-tenant, multi-priority model serving stack, check out our complete, step-by-step [Multi-Tenant Deployment Guide](https://github.com/llm-d/llm-d/tree/main/guides/batch-serving/asynchronous-processing/multitenant), which contains full Helm values, Prometheus scrape configurations, and load-test scripts to validate isolation under high batch loads.

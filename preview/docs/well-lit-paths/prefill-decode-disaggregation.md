---
title: Prefill/Decode Disaggregation
description: Separating prefill and decode phases onto specialized worker pools for independent optimization
sidebar_position: 2
---

# Prefill/Decode Disaggregation

In a standard deployment, prefill (compute-bound) and decode (memory-bandwidth-bound) compete for the same GPU resources. A long prefill operation blocks decode iterations, stalling token generation for all concurrent requests. Decode batches delay new prefill operations, increasing time to first token.

P/D Disaggregation eliminates this interference by running each phase on dedicated server pools, connected via NIXL/RDMA for KV-cache transfer. Each pool can be independently optimized, scaled, and configured for its dominant resource profile.

See [llm-d 0.5: Sustaining Performance at Scale](https://llm-d.ai/blog/llm-d-v0.5-sustaining-performance-at-scale) for benchmarks on H200 and B200 hardware.

## When To Use

**Best for:**

- **Large models** (100B+ parameters) where prefill compute is substantial
- **Long input sequences** (10K+ tokens) where prefill dominates request latency
- **Frontier MoE models** (DeepSeek-R1) -- combines with [Wide Expert Parallelism](./wide-expert-parallelism.md)
- **Medium concurrency** (64-128 concurrent requests) where KV transfer overhead is amortized

**Not recommended for:**

- **Short prompts** (under ~1,000 tokens) -- KV transfer overhead exceeds the benefit
- **Small models** (under ~20B parameters) -- prefill latency is already low
- **High decode-side cache hit rates** -- running prefill locally is often faster

## Key Decisions

### Selective P/D Threshold

Not every request should be disaggregated. The selective P/D handler automatically decides per request based on uncached token count:

| Uncached tokens | Routing | Why |
|---|---|---|
| Above `threshold` | P/D path | Prefill cost justifies the KV transfer |
| Below `threshold` | Direct to decode | Prompt is mostly cached, faster locally |

The threshold defaults to 0 (disabled -- all requests go through P/D). Set it based on your workload's prompt length distribution. A value like 512 is a reasonable starting point for workloads with mixed prompt lengths. Lower = more requests go through P/D (aggressive). Higher = more stay monolithic (conservative).

### P:D Ratio

| Workload | Ratio | Why |
|---|---|---|
| Document summarization (high input, low output) | 4P : 1D | Prefill-heavy -- need more prefill capacity |
| Code generation (moderate input, high output) | 2P : 2D | Balanced |
| Chat (short input, moderate output) | 1P : 3D | Decode-heavy |

### Transport

| Transport | Recommendation |
|---|---|
| **InfiniBand** | Production -- highest throughput |
| **RoCE** | Production -- validated on GKE and OCI |
| **TCP** | Testing only -- significantly higher latency |

> [!NOTE]
> P/D disaggregation requires RDMA for production performance. Without RDMA, NIXL falls back to TCP, which should only be used for testing. See the [RDMA Configuration guide](/docs/user-guides/rdma-configuration).

### Progressive Tuning

| Parameter | Default | Start Here | Adjust When |
|---|---|---|---|
| Selective P/D `threshold` | 0 (disabled) | 512 for mixed workloads | Lower if too many requests bypass P/D; raise if short-prompt requests are slower via P/D than monolithic |
| P:D ratio | -- | Match your workload profile | If `vllm:num_requests_waiting` is consistently higher on prefill pods, add prefill capacity (and vice versa) |
| `VLLM_NIXL_ABORT_REQUEST_TIMEOUT` | 480s | Keep default | Reduce if stranded KV blocks are consuming too much memory on prefill pods |

## Hardware Support

| Platform | Transport | Status |
|---|---|---|
| NVIDIA CUDA | NIXL + RDMA (InfiniBand) | Validated |
| NVIDIA CUDA (GKE) | NIXL + RDMA (RoCE) | Validated |
| NVIDIA CUDA (OCI) | NIXL + SR-IOV RDMA | Validated |
| Intel Gaudi (HPU) | NIXL | Validated (min 2 Gaudi2) |

## Observability

| Metric | What It Tells You |
|---|---|
| `llm_d_inference_scheduler_disagg_decision_total{decision_type="prefill-decode"}` | P/D decisions happening -- should be >0 |
| `llm_d_inference_scheduler_disagg_decision_total{decision_type="decode-only"}` | Requests skipping P/D -- selective P/D working |
| `vllm:num_requests_waiting` (prefill pods) | Prefill bottleneck -- if >3-4 sustained, add prefill workers |
| `vllm:time_to_first_token_seconds` | Should decrease vs monolithic baseline |

### Disaggregation Ratio

Monitor what fraction of requests go through P/D:

```
sum(rate(llm_d_inference_scheduler_disagg_decision_total{decision_type="prefill-decode"}[5m]))
/ sum(rate(llm_d_inference_scheduler_disagg_decision_total[5m]))
```

Expected: 30-70% depending on workload and threshold setting.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| All requests decode-only, no P/D | Threshold too high or EPP config wrong | Check `pd-profile-handler` config; lower `threshold` |
| P/D latency worse than monolithic | RDMA not active (TCP fallback) | Set `UCX_PROTO_INFO=y` and check logs for "RDMA" vs "TCP" |
| Decode pod crash during P/D | NIXL sidecar error | Check sidecar logs: `kubectl logs <pod> -c sidecar` |
| KV transfer timeouts | Network connectivity issue | Verify all-to-all RDMA connectivity between P and D pods |
| KV blocks stranded on prefill | Decode pod crash before KV pull | Blocks auto-free after `VLLM_NIXL_ABORT_REQUEST_TIMEOUT` (default 480s) |

## Deployment

See the [P/D Disaggregation guide](https://github.com/llm-d/llm-d/tree/main/guides/pd-disaggregation) for step-by-step deployment.

For architecture details -- request flow, routing sidecar protocols, fault tolerance, rollouts -- see [Disaggregation architecture](/docs/architecture/advanced/disaggregation).

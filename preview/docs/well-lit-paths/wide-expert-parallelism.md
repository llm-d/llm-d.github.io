---
title: Wide Expert Parallelism
description: Multi-node deployment of frontier MoE models using combined Data Parallelism and Expert Parallelism
sidebar_position: 3
---

# Wide Expert Parallelism

Frontier MoE models like DeepSeek-R1 (671B parameters, 256 experts) are too large for a single node. Traditional Tensor Parallelism (TP) shards every layer across GPUs, but communication overhead grows with node count.

Wide Expert Parallelism distributes **experts** across GPUs instead. Since MoE models only activate a subset of experts per token (e.g., top-8 out of 256), the communication is sparse -- far more scalable for multi-node deployments. Combined with Data Parallelism for attention (each GPU maintains its own KV-cache independently), Wide EP achieves high utilization across large GPU clusters.

See [llm-d 0.5: Sustaining Performance at Scale](https://llm-d.ai/blog/llm-d-v0.5-sustaining-performance-at-scale) and [llm-d 0.4: Achieve SOTA Performance Across Accelerators](https://llm-d.ai/blog/llm-d-v0.4-achieve-sota-inference-across-accelerators) for benchmarks.

## When To Use

**Designed for:**

- **Frontier MoE models** -- DeepSeek-R1, DeepSeek-V3, and similar architectures with hundreds of experts
- **Multi-node deployments** -- models that require more than 8 GPUs
- **High-throughput production** -- batch-intensive workloads where latency constraints are relaxed in favor of massive token generation

**Not needed for:**

- **Dense models** (Llama, Qwen) -- use TP or P/D disaggregation instead
- **Small MoE models** that fit on a single node -- standard TP is simpler
- **Development/testing** -- requires 32+ GPUs with RDMA fabric

## Key Decisions

### Communication Backend

DeepEP is the default communication backend for multi-node expert parallelism. It provides the highest performance but requires full-mesh RDMA connectivity -- rail-only topologies will fail.

### Combining With P/D Disaggregation

Wide EP is commonly combined with [P/D Disaggregation](./prefill-decode-disaggregation.md) for frontier models. Separate LeaderWorkerSets for prefill (DP+EP) and decode (DP+EP), with KV-cache transferred via NIXL/RDMA. This is the recommended configuration for production DeepSeek-R1 deployments.

Default topology: 1 DP=16 Prefill LWS + 1 DP=16 Decode LWS = 32 GPUs.

### DP-Aware Scheduling (Experimental)

By default, the EPP routes to LWS groups (nodes), not individual DP ranks. **DP-aware scheduling** exposes individual ranks as separate endpoints, enabling prefix-cache-aware routing even in Wide EP deployments. Requires Istio 1.29.1+.

See the [experimental DP-aware variant](https://github.com/llm-d/llm-d/tree/main/guides/wide-ep-lws/experimental-dp-aware).

### Progressive Tuning

| Parameter | Default | Start Here | Adjust When |
|---|---|---|---|
| DP degree | 16 | 16 per LWS | Adjust based on available GPU count and model size |
| Prefill vs decode LWS count | 1 + 1 | 1 prefill LWS + 1 decode LWS | Add prefill LWS if `vllm:num_requests_waiting` is consistently high on prefill pods |
| Scheduling mode | Node-level | Node-level | Switch to DP-aware scheduling if prefix cache hit rates are low and workload has high prefix sharing |

## Requirements

- **Hardware** -- 32+ NVIDIA H200 or B200 GPUs with InfiniBand or RoCE RDMA
- **LeaderWorkerSet** -- LWS CRD installed (`helm install lws oci://registry.k8s.io/lws/charts/lws --version=0.7.0`)
- **Network** -- full-mesh RDMA connectivity (required by DeepEP)
- **Currently NVIDIA-only** -- AMD, Intel, and TPU support is not yet available

## Observability

| Metric | What It Tells You |
|---|---|
| `vllm:num_requests_running` (per pod) | Should be evenly distributed across LWS pods |
| `vllm:time_to_first_token_seconds` | Expected range varies by model; compare against single-node TP baseline |

### Verify RDMA Is Active

```bash
# Check RDMA device availability
kubectl exec -n ${NAMESPACE} <pod> -- ibv_devinfo | grep "device\|fw_ver"

# Verify RDMA selected (not TCP fallback)
# Set UCX_PROTO_INFO=y in pod env and check logs for "RDMA"
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| NCCL hangs or timeouts | Network partition between nodes | Verify full-mesh RDMA connectivity; rail-only will fail |
| Silent fallback to TCP | Wrong `UCX_IB_GID_INDEX` | Set `UCX_PROTO_INFO=y` and check logs; fix GID index for your cluster |
| Pods distributed across wrong nodes | Topology constraints missing | Check node affinity and LWS topology configuration |
| Uneven request distribution | EPP routing to nodes, not ranks | Expected with default scheduling; use DP-aware scheduling for per-rank routing |

## Why Upstream Matters

Performance has improved rapidly across releases through upstream vLLM kernel optimizations (DeepGEMM, CUTLASS, Block-FP8), speculative decoding, async scheduling, and Dual Batch Overlap. Optimizations for one model generation can become irrelevant when the next generation lands -- staying upstream ensures automatic access to the latest improvements without maintaining forks.

## Deployment

See the [Wide Expert Parallelism guide](https://github.com/llm-d/llm-d/tree/main/guides/wide-ep-lws) for step-by-step deployment, including hardware overlays for GKE (H200, B200) and CoreWeave.

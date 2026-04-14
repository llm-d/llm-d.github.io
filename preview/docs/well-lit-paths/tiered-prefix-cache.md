---
title: Tiered Prefix Cache
description: Extending KV-cache beyond GPU HBM with CPU memory, local disk, and shared filesystem storage
sidebar_position: 4
---

# Tiered Prefix Cache

GPU HBM alone cannot hold enough KV-cache for large working sets. When the cache fills up, vLLM evicts cached prefixes, forcing recomputation on the next request that needs them. As the working set grows beyond GPU capacity, this leads to **performance collapse** -- TTFT spikes and throughput drops.

Tiered Prefix Cache decouples cache capacity from GPU memory by offloading evicted blocks to CPU DRAM and shared filesystem storage, where they can be retrieved faster than recomputation. The shared storage tier also enables cross-replica cache sharing and persistence across pod restarts.

Tiered prefix cache can be combined with any of the other well-lit paths -- it layers onto [Intelligent Inference Scheduling](./intelligent-inference-scheduling/index.md), [P/D Disaggregation](./prefill-decode-disaggregation.md), or [Wide Expert Parallelism](./wide-expert-parallelism.md) to extend effective cache capacity.

See [llm-d 0.5: Sustaining Performance at Scale](https://llm-d.ai/blog/llm-d-v0.5-sustaining-performance-at-scale) for benchmarks across CPU offloading and shared storage configurations.

> [!NOTE]
> While this section focuses on KV-cache for transformer models, the tiered caching architecture also applies to State Space Models (SSMs) such as Mamba.

## When To Use

**Always enable CPU DRAM offloading** -- it has negligible overhead (~1-2%) in low-cache scenarios and significant benefit when the working set exceeds GPU HBM.

**Add shared filesystem storage when:**
- Working set exceeds GPU HBM + CPU DRAM combined
- New pods need immediate cache access (elastic scaling)
- Cache must survive pod restarts or rescheduling
- Multi-tenant workloads with distinct per-tenant prefixes

**Shared storage is less useful when:**
- All active prefixes fit in GPU HBM
- Low prefix sharing (unique prompts per request)

## Key Decisions

### Choosing a Tier and Connector

**Tier 2: CPU DRAM (Start Here)** -- Uses host CPU memory. Zero additional infrastructure. Two connector options:

| Connector | Config | Dependencies |
|---|---|---|
| **vLLM Native OffloadingConnector** | `VLLM_CPU_OFFLOAD_GB=100` | None (built-in) |
| **LMCache Connector** | `LMCACHE_MAX_LOCAL_CPU_SIZE=100g` | LMCache library |

**Tier 3: Local Disk** -- NVMe or SSD storage. Larger capacity than CPU DRAM but higher latency. Best when the host has fast local storage and working set exceeds CPU memory.

**Tier 4: Shared Filesystem Storage** -- Shared storage accessible to all pods:

| Capability | Why It Matters |
|---|---|
| **Cross-replica sharing** | Newly scaled pods get immediate cache access without warming |
| **Persistence** | Cache survives pod rescheduling and node maintenance |
| **Massive capacity** | Limited only by storage system size |

| Connector | Features | Supported Filesystems |
|---|---|---|
| **llm-d FS Connector** | Fully async I/O, POSIX-compatible, GPU DMA transfers | IBM Storage Scale, CephFS, GCP Lustre |
| **LMCache Connector** | Integration to various backends | Various |

### EPP Scoring With Multiple Tiers

When multiple tiers are active, replace the default `prefix-cache-scorer` with per-tier scorers so the EPP prefers endpoints with GPU-cached blocks (fastest) while still valuing CPU-cached blocks:

```yaml
scorers:
  - scorerName: queue-depth-scorer
    weight: 2
  - scorerName: kv-cache-utilization-scorer
    weight: 2
  - scorerName: gpu-prefix-cache-scorer
    weight: 1
  - scorerName: cpu-prefix-cache-scorer
    weight: 1
```

### Combining With Precise Routing

For maximum cache effectiveness, combine tiered caching with [Precise Prefix Cache-Aware Routing](./intelligent-inference-scheduling/precise-prefix-cache-aware-routing.md). Tiered caching expands capacity; precise routing ensures the EPP knows exactly where blocks reside across tiers.

### Progressive Tuning

| Parameter | Default | Start Here | Adjust When |
|---|---|---|---|
| `VLLM_CPU_OFFLOAD_GB` | -- | 100 | Increase if `vllm:kv_cache_usage_perc` is still >90% with offloading enabled |
| `gpu-prefix-cache-scorer` weight | 1 | 1 | Increase if GPU cache hits are undervalued relative to CPU hits |
| `cpu-prefix-cache-scorer` weight | 1 | 1 | Decrease if the EPP is routing to CPU-cached pods when GPU-cached alternatives exist |
| Shared storage PVC size | -- | Match expected working set | Scale up if cache evictions still occur with storage enabled |

## Observability

| Metric | What It Tells You |
|---|---|
| `vllm:kv_cache_usage_perc` | GPU cache pressure -- >90% sustained means evictions are happening. Should decrease after enabling CPU offloading. |
| `vllm:prefix_cache_queries_total` | Total cache lookups -- baseline for computing hit ratio |
| `vllm:prefix_cache_hits_total` | Cache hits across all tiers -- hit ratio should improve with each tier added |
| `inference_pool_average_kv_cache_utilization` | Pool-wide cache pressure -- use for autoscaling decisions |

### Verify Offloading Is Active

```bash
# Check CPU offloading is configured
kubectl exec -n ${NAMESPACE} <pod> -- env | grep VLLM_CPU_OFFLOAD

# For FS connector, check storage mount
kubectl exec -n ${NAMESPACE} <pod> -- df -h /cache
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `kv_cache_usage_perc` still >90% with offloading | `VLLM_CPU_OFFLOAD_GB` too low for working set | Increase offload size; check host memory availability with `kubectl top node` |
| TTFT did not improve after enabling CPU tier | Working set fits in GPU HBM | CPU tier adds value only when GPU cache is full -- verify cache evictions are occurring |
| Shared storage mount errors | PVC not bound or wrong storage class | Check `kubectl get pvc -n ${NAMESPACE}`; verify storage class supports ReadWriteMany |
| New pods not benefiting from shared cache | FS connector not configured on new pods | Confirm new pod deployment includes FS connector env vars and volume mounts |
| High latency on cache reads from storage | Storage backend bandwidth saturated | Monitor storage IOPS; consider faster storage tier or increasing PVC throughput limits |

## Deployment

See the [Tiered Prefix Cache guide](https://github.com/llm-d/llm-d/tree/main/guides/tiered-prefix-cache) for step-by-step deployment, including sub-guides for [CPU offloading](https://github.com/llm-d/llm-d/tree/main/guides/tiered-prefix-cache/cpu) and [shared storage](https://github.com/llm-d/llm-d/tree/main/guides/tiered-prefix-cache/storage).

For architecture details on the offloading pipeline and indexer integration, see [KV-Cache Offloading architecture](/docs/architecture/advanced/kv-offloading).

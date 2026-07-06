---
slug: /well-lit-paths/capabilities
---

# Core Capability Building Blocks

Core Capability Building Blocks represent the individual functional optimization, intelligent routing, and physical inference execution features of llm-d.

These guides teach single architectural capabilities that you can configure independently or compose together into comprehensive production workloads.

### Intelligent Routing

- **[Optimized Baseline](/well-lit-paths/optimized-baseline)**: Strategies for handling the unique challenges of LLM request scheduling, moving beyond traditional round-robin approaches.
- **[Predicted Latency-Based Routing](/well-lit-paths/predicted-latency)**: Using online-trained machine learning models to predict latency and optimize scheduling.

### Advanced KV-Cache Management

- **[Precise Prefix Cache Routing](/well-lit-paths/precise-prefix-cache-routing)**: Near-real-time routing based on exact cache state published by model servers.
- **[Tiered Prefix Cache](/well-lit-paths/tiered-prefix-cache)**: Efficiently managing KV caches by offloading to CPU RAM, NVMe, or network storage to improve prefix-cache re-use.

### Serving Large Models

- **[Prefill/Decode Disaggregation](/well-lit-paths/pd-disaggregation)**: Separating prefill (compute-bound) and decode (memory-bandwidth-bound) phases for optimized performance.
- **[Wide Expert-Parallelism](/well-lit-paths/wide-expert-parallelism)**: Scaling KV cache space for massive MoE models like DeepSeek-R1 using DP/EP deployment patterns.

### Traffic Control & Autoscaling

- **[Flow Control](/well-lit-paths/flow-control)**: Intelligent request queuing for multi-tenant deployments and managing traffic spikes.
- **[Workload Autoscaling](/well-lit-paths/workload-autoscaling)**: From simple Kubernetes autoscaling supplemented by EPP load metrics to advanced, SLO-aware capacity optimization for heterogeneous pools via the Workload Variant Autoscaler.

---
slug: /well-lit-paths/workloads
---

# Workloads

A workload guide provides the recommended, cohesive deployment for serving a production workload on llm-d. Each defines the workload, then composes the relevant [capability building blocks](/docs/well-lit-paths/capabilities) into one stack tuned to serve it.

Where a well-lit path teaches a single feature, a workload guide starts from a use case and delivers the horizontal deployment that serves it best.

- **[Agentic Serving](/docs/well-lit-paths/agentic-serving)**: long, multi-turn, tool-using agentic programs (e.g. coding agents) — prefix-aware routing, KV-cache offloading, and P/D disaggregation composed for the agentic workload.
- **[Multimodal Serving](/docs/well-lit-paths/multimodal-serving)**: image / audio / video workloads — prefix- and load-aware routing that tracks and matches multimodal payloads across aggregated and disaggregated serving.
- **[Batch Serving](/docs/well-lit-paths/asynchronous-processing)**: large-scale offline or asynchronous jobs — OpenAI-compatible batch gateway and lightweight async queue processors.

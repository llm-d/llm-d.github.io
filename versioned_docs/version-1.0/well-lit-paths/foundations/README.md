# Core Capability Building Blocks

Core Capability Building Blocks represent the individual functional optimization, intelligent routing, and physical inference execution features of llm-d.

These guides teach single architectural capabilities that you can configure independently or compose together into comprehensive production workloads.

### Intelligent Routing

- **[Optimized Baseline](./optimized-baseline/index.mdx)**: Strategies for handling the unique challenges of LLM request scheduling, moving beyond traditional round-robin approaches.
- **[Predicted Latency-Based Routing](./predicted-latency/index.mdx)**: Using online-trained machine learning models to predict latency and optimize scheduling.

### Advanced KV-Cache Management

- **[Precise Prefix Cache Routing](./precise-prefix-cache-routing/index.mdx)**: Near-real-time routing based on exact cache state published by model servers.
- **[Tiered Prefix Cache](./tiered-prefix-cache/index.mdx)**: Efficiently managing KV caches by offloading to CPU RAM, NVMe, or network storage to improve prefix-cache re-use.
- **[Enable P2P Prefix Cache Sharing](./enable-p2p-prefix-cache-sharing/index.mdx)**: Pulling cached prefix KV blocks directly from a peer's CPU offload tier instead of recomputing them, turning per-pod prefix caches into a fleet-wide resource.

### Serving Large Models

- **[Prefill/Decode Disaggregation](./pd-disaggregation/index.mdx)**: Separating prefill (compute-bound) and decode (memory-bandwidth-bound) phases for optimized performance.
- **[Wide Expert-Parallelism](./wide-expert-parallelism/index.mdx)**: Scaling KV cache space for massive MoE models like DeepSeek-R1 using DP/EP deployment patterns.

### Multimodal and Omni Models

- **[Serve Multimodal Models](./serve-multimodal-models/index.mdx)**: Routing image, video, and audio requests on prefix-cache affinity that covers the media as well as the text, with aggregated serving or dedicated Encode workers (E/PD, E/P/D).
- **[Serve Omni Models](./serve-omni-models/index.mdx)**: Serving a model that answers in text and audio from one vLLM-Omni pool behind the llm-d Router, or a text-to-image, image-to-image, or text-to-speech model on vLLM-Omni or SGLang.

### Stateful APIs

- **[Serve the Stateful OpenAI Responses API](./serve-responses-api/index.mdx)** (Experimental): Serving `/v1/responses` with conversation state kept in PostgreSQL by vLLM Agentic API in front of the llm-d Router, so agentic clients and coding harnesses continue a conversation by `previous_response_id`, run tool loops, and stream over WebSocket.

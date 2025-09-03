---
title: Intelligent Inference Scheduling with llm-d
description: How llm-d enables smarter, prefix-aware, load- and SLO-aware routing for better latency and throughput
slug: intelligent-inference-scheduling-with-llm-d
date: 2025-09-03T09:00

authors:
  - niliguy
  - vitabortnikov
  - etailevran
  - robshaw
  - smarterclayton

tags: [blog, updates, llm-d]
---

# Intelligent Inference Scheduling with llm-d

The llm-d project lays out clear, “well-lit” paths for anyone to adopt the leading inference optimizations within their existing deployment framework \- Kubernetes. These are tested approaches designed to make complex deployments easier and more efficient. In this post, we explore the first of these paths: **intelligent inference scheduling**. Unlike basic round-robin load balancing, this method takes the unique demands of LLMs into account, leading to better performance across the board: higher throughput, lower latency, and efficient use of resources.

### Why Intelligent Inference Is Needed for LLM Inference

Deploying large language models (LLMs) on Kubernetes has become the norm, but LLM inference workloads behave very differently from standard microservices. Traditional patterns like uniform replicas paired with round-robin load balancing assume each request uses the same amount of resources and finishes in roughly the same time. In contrast, LLM requests can vary wildly in token count and compute needs, making simple load-spread strategies prone to bottlenecks and imbalanced traffic.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/inference-scheduling/image01.png" alt="Intelligent inference scheduling diagram" style={{width: '75%', height: 'auto'}} />
</div>  

<!-- truncate -->

LLM inference pipelines also consist of two distinct phases, compute-bound prefill stage and memory-bound decode stage, that have fundamentally different resource profiles. Without specialization, every replica must handle both phases, leading to wasted GPU cycles or memory bandwidth. At the same time, many LLM use cases involve multi-turn chats or agentic flows where cached prefix computations dramatically speeds up response times if the request is routed back to the same instance.

On top of these challenges, LLM endpoints often serve a spectrum of quality-of-service needs. Interactive tasks like code completion demand millisecond-level latency, chat agents can tolerate a few seconds, and batch jobs might take minutes or more. Satisfying tight latency SLOs for expensive inference calls can be prohibitively costly if every pod is treated identically.  
To address these unique demands, an intelligent inference scheduler that understands both the shape of incoming requests and the real-time state of your cluster can boost throughput, slash tail latencies, and maximize GPU resource utilization.

### Recap: Inference Serving in Kubernetes, the Gateway API and Inference Gateway Extension

Kubernetes Services paired with Deployments and standard load balancing distribute traffic evenly across identical replicas. That model works well for stateless microservices with uniform, short-lived requests. But as we saw earlier, LLM inference calls vary wildly in compute intensity, benefit from stateful routing (e.g., prefix caches), and demand tight tail-latency control \- none of which a vanilla load balancing handles well.

The Gateway API modernizes Kubernetes networking by offering a CRD-based, L7 routing framework that replaces and extends traditional Ingress. It gives you fine-grained route definitions, pluggable data planes, and native compatibility with multi-cluster or cross-team routing policies. Yet on its own, the Gateway API lacks any notion of LLM inference serving based on inference-specific characteristics and metrics.

To bridge that gap, the Gateway API Inference Extension project introduces the Inference Gateway (IGW). IGW reuses Gateway API‘s core primitives but adds new CRDs \- most notably **InferencePool** \- to represent collections of model-serving pods. InferencePools can carry additional metadata such as base model, accelerator type, and runtime capabilities. Gateways then invoke a pluggable **EndpointPicker (EPP)** to perform “smart” load balancing, leveraging Envoy’s External Processing (ext-proc) to steer traffic to the right inference endpoint.

The default EPP in IGW follows a structured scheduling cycle for each incoming request:

* **Endpoint discovery:** Enumerate all InferencePool pods and gather their metadata (waiting queue state, loaded models, cache contents, etc.).  
* **Filtering:** Exclude pods that can’t serve the request due to overload, incompatible resources, or memory pressure.  
* **Scoring:** Assign each remaining pod a score via extensible scorers \- evaluating factors like queue depth, session affinity, prefix cache hits, and custom SLO indicators.  
* **Selection:** Pick appropriate endpoints, with built-in tie-breaking and fallback logic.

Building on IGW’s foundation, **llm-d** **augments the EPP with more advanced scheduling capabilities**. It introduces scorers that optimize for KV cache locality (boosting prefix-cache hit rates) and orchestrates multiple scheduling passes to disaggregate prefill and decode phases onto specialized pod variants. The result is a fully LLM-aware scheduler that drives higher throughput, lower tail latencies, and finer resource efficiency across the board.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/inference-scheduling/image02.png" alt="Diagram" style={{width: '75%', height: 'auto'}} />
</div>

### Intelligent Inference Scheduling with llm-d

A key differentiator of llm-d is the ability to plug in configurable, AI-aware scorers into the inference gateway scheduling pipeline. These scorers go beyond generic load balancing by factoring in LLM-specific workload characteristics such as token count variability, compute/memory phase differences, and KV-cache locality \- when deciding where each request should run.

LLM workloads are not uniform. Some use cases — like multi-turn conversations, RAG pipelines, or agentic flows naturally lead to **high prefix reuse**, where requests repeatedly share large portions of the prompt. Others like diverse batch inference jobs or single-shot completions  exhibit **low prefix sharing**, where cache hits are rare and every request is essentially unique.

Because of this diversity, llm-d’s pluggable, AI-aware scorers allow operators to tailor scheduling strategies to workload profiles. We evaluated two configurations:

* **Prefix-only scorer** – routes to maximize KV-cache hits.  
* **Prefix \+ Load scorer** – adds dynamic load-awareness while still exploiting cache opportunities.

#### **Why AI-Aware Scorers Win**

Following benchmarks show how performance evolves when cache opportunities are minimal, and they illustrate an important point: **the optimal scheduling strategy depends on the workload profile**.

#### **High Prefix Sharing Workload**

When cache locality is abundant, the results are dramatic:

* **Success rate:** The prefix-only scorer frequently overloaded replicas, succeeding in only \~55% of requests, while Prefix \+ Load maintained 100% success across all QPS levels.

* **Time to First Token (TTFT):** Prefix \+ Load kept TTFT consistently near-zero, while Prefix-only degraded rapidly, exceeding 140s at high QPS.

* **Inter-Token Latency (ITL):** Prefix \+ Load achieved ITL of \~30ms, versus \~160ms with Prefix-only — more than 5× improvement in responsiveness.

* **Throughput:** Prefix \+ Load scaled linearly with QPS, reaching \~60k tokens/sec at 20 QPS. Prefix-only flatlined near 2k–3k tokens/sec.  
  
<div style={{margin: '20px 0'}}>
  <div style={{marginBottom: '20px'}}>
    <img src="/img/blogs/inference-scheduling/image03.png" alt="Throughput vs Request Rate" style={{width: '100%', height: 'auto'}} />
    <p style={{textAlign: 'center', fontSize: '0.9em', marginTop: '8px'}}><em>Throughput vs Request Rate</em></p>
  </div>
  
  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', alignItems: 'start'}}>
    <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%'}}>
      <img src="/img/blogs/inference-scheduling/image04.png" alt="Success Rate" style={{width: '100%', height: 'auto'}} />
      <p style={{textAlign: 'center', fontSize: '0.85em', marginTop: '6px'}}><em>Success Rate</em></p>
    </div>
    <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%'}}>
      <img src="/img/blogs/inference-scheduling/image05.png" alt="TTFT and QPS" style={{width: '100%', height: 'auto'}} />
      <p style={{textAlign: 'center', fontSize: '0.85em', marginTop: '6px'}}><em>TTFT and QPS</em></p>
    </div>
    <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%'}}>
      <img src="/img/blogs/inference-scheduling/image06.png" alt="Intertoken Latency" style={{width: '100%', height: 'auto'}} />
      <p style={{textAlign: 'center', fontSize: '0.85em', marginTop: '6px'}}><em>Intertoken Latency</em></p>
    </div>
  </div>
</div>


In workloads with heavy prefix reuse, prefix-aware scheduling combined with load-awareness is essential to avoid bottlenecks and maximize GPU utilization. By combining prefix scoring with load awareness, llm-d achieves **100% request success, lower latencies, and linear throughput scaling** — the essence of intelligent, AI-aware scheduling.

#### **Low Prefix Sharing Workload**

When cache hits are rare, prefix-awareness provides little benefit, and both scorers perform similarly:

**Throughput:**  Both scorers perform **nearly identically**, scaling linearly with QPS. Output throughput reaches \~400 tokens/sec and total throughput \~60k tokens/sec at 20 QPS for both strategies.

**Latency:**

* **Time to First Token (TTFT):** Both remain stable in the **300–380 ms range** as load increases. Small variations exist, but neither scorer shows a clear advantage.

* **Normalized time per token:** Flat around **0.65 ms/token**, with both scorers tightly overlapping across QPS levels.

* **Inter-Token Latency (ITL):** Increases linearly with load, from \~25 ms at 2 QPS to \~50 ms at 20 QPS — again, no significant gap between scorers.

  **Reliability:**  
   Both scorers achieve **100% success rate** across the full load range, confirming that load balancing alone is sufficient when prefix reuse is low.

Under low prefix sharing workloads, the benefits of prefix-aware routing naturally diminish. In this case, adding load-awareness or prefix-awareness makes little difference \- both strategies scale smoothly and meet latency targets.

![Latency vs request rate](/img/blogs/inference-scheduling/image07.png)
![Throughput vs Request rate](/img/blogs/inference-scheduling/image08.png)

### **Takeaway**

These benchmarks illustrate why **configurable scorers matter in llm-d**.

* In **prefix-heavy workloads**, Prefix \+ Load scoring ensures cache hits are exploited without overloading replicas — yielding linear throughput scaling, low latencies, and high success rates.

* In **prefix-light workloads**, simple load balancing suffices, and the system avoids unnecessary complexity.

This adaptability means operators can choose (or combine) scorers based on workload characteristics, achieving the best **token-per-dollar efficiency** while consistently meeting latency and throughput SLOs.

### Looking Ahead: Roadmap and Future Plans 

The IGW and `llm-d` projects are evolving rapidly, with several exciting directions on the horizon:

* **Dynamic Scheduling Goals**: Support for runtime reconfiguration of scheduling strategies based on workload type, latency targets, or user-defined policies.  
* **Multi-Model Awareness**: Enhanced routing logic that accounts for model compatibility, adapter stacking, and ensemble inference. (next blog)  
* **Plugin Ecosystem**: A curated set of reusable plugins for common LLM use cases, contributed by the community. We’re considering supporting out of process plugins, written in any language, to allow researchers to experiment with new scheduling algorithms and ideas \- let us know if you have an idea we can help enable\! 

### Closing Thoughts

The journey of llm-d reflects a broader shift in how we think about LLM inference \- not just as a stateless function call, but as a dynamic, resource-aware orchestration problem. By building on IGW and pushing its boundaries, llm-d offers a flexible, extensible foundation for intelligent scheduling at scale.  
Whether you're running a single model or a fleet of fine-tuned variants, the goal is the same: **maximize performance, minimize latency, and make smarter use of available compute**.

### Get Involved with llm-d

The llm-d project thrives on community contributions, and there are many ways to get involved:

- **Explore the llm-d Community Quickstart Guide** → [Start here](https://llm-d.ai/docs/community) to learn more about getting involved in the llm-d project.
- **Join our Slack** → [Get your invite](https://llm-d.ai/slack) and connect with maintainers and contributors
- **Explore the code** → Browse our [GitHub organization](https://github.com/llm-d) and find issues that interest you
- **Attend meetings** → All meetings are open! Add our [public calendar](https://llm-d.ai/docs/community#public-meeting-calendar) and join discussions`
---
title: "Scalable Batch Inference with Batch Gateway"
description: "Batch Gateway brings first-class batch inference capabilities to llm-d, providing an OpenAI-compatible API for submitting, tracking, and managing large-scale batch jobs, running efficiently alongside interactive inference on shared infrastructure."
slug: scalable-batch-inference-with-batch-gateway
date: 2026-06-12T09:00

authors:
  - lioraronovich
  - raymondzhao
  - jooyeonmok
  - niliguy

tags: [blog, batch-inference, inference, llm-d]
---

# Scalable Batch Inference with Batch Gateway

As organizations deploy AI applications in production, their inference infrastructure must serve two fundamentally different workloads simultaneously: interactive requests requiring immediate replies, and batch inference jobs that process thousands of requests with a time tolerance of hours for receiving results. Use cases for batch inference include autonomous background agents performing multi-step reasoning and deep research, as well as user-initiated workloads like offline evaluations, dataset processing, and embedding generation.

In batch inference, the goal is to maximize throughput across a large volume of requests while meeting defined completion time targets, without interfering with interactive traffic. Non-urgent inference can fill GPU capacity during periods of lower interactive traffic, increasing infrastructure utilization. Users can also take advantage of differential billing between batch and interactive workloads for cost-optimized processing.

[**Batch Gateway**](https://github.com/llm-d/llm-d-batch-gateway) brings first-class batch inference capabilities to llm-d. It provides an OpenAI-compatible API for submitting, tracking, and managing large-scale batch jobs, running efficiently alongside interactive inference workloads on shared infrastructure. With OpenAI API compatibility, users can migrate existing OpenAI batch scripts with minimal changes.

<!-- truncate -->

## The challenge: batch and interactive workloads on shared infrastructure

When batch and interactive inference workloads compete for the same GPU resources without purpose-built tools, the outcomes are typically poor:

- **Letting batch workloads degrade interactive performance** is unacceptable for production services.
- **Batch requests evict KV-cache entries** needed by interactive workloads, forcing costly prefill reconstruction.
- **Dedicating separate GPU pools for batch workloads** is expensive and wasteful.
- **Manually throttling batch workloads** is operationally burdensome.

Batch Gateway is designed to solve this by dynamically adjusting batch flow based on available infrastructure capacity. Batch Gateway also prioritizes jobs based on their Service Level Objective (SLO) targets, and processes requests within each job concurrently. The result is that batch jobs make steady progress toward their completion targets without interfering with interactive traffic.

## How Batch Gateway works

Batch Gateway is a Kubernetes-native system composed of several components:

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blog-images/batch-gateway-arch.webp" alt="Batch Gateway architecture diagram" style={{width: '90%', height: 'auto'}} />
</div>

### API Server

The API server exposes OpenAI-compatible `/v1/batches` and `/v1/files` endpoints, providing the same interface that users and applications already use for batch processing.

### Data layer

Batch Gateway uses pluggable storage backends for different functions. Each function is backed by a single plug-in, chosen at deployment time.

| Function | Available plug-ins |
|----------|-------------------|
| Jobs and files metadata storage | PostgreSQL, Redis |
| Priority queue for jobs | Redis |
| Event channels | Redis |
| Jobs status updates | Redis |
| File storage for input and output files | S3, Filesystem |

Expired batch jobs and their associated files are periodically cleaned up.

### Batch Processor

The batch processor pulls jobs from a priority queue, retrieves the input file, builds execution plans, and dispatches individual inference requests with concurrency control for downstream processing. The processor sorts requests by system-prompt hash to maximize prefix cache hits, reducing redundant prefill computation across requests that share the same system prompt. As inference results come back, the processor writes them to an output file and continuously updates the job's status. The processor also listens for job events such as cancellation, enabling real-time control over in-flight work. In addition, the processor handles recovery from crashes during processing.

## Integration with llm-d inference components

Batch Gateway is part of [llm-d](https://github.com/llm-d/llm-d), a CNCF Sandbox project and open source Kubernetes-native framework for high-performance distributed LLM inference. Batch Gateway integrates with llm-d's components, which means that batch workloads automatically benefit from llm-d's efficient inference capabilities, such as intelligent request routing and KV-cache reuse.

Batch Gateway is designed to work with the [Flow Control](https://gateway-api-inference-extension.sigs.k8s.io/concepts/flow-control/) component in the [Gateway API Inference Extension](https://github.com/kubernetes-sigs/gateway-api-inference-extension) (GIE) to enable dynamic tuning of batch workload flows as well as SLO-based prioritization. This integration allows the system to:

- **Classify batch requests as sheddable:** Batch requests are assigned a negative priority, so the inference layer can shed them under saturation while protecting interactive traffic.
- **Order by SLO urgency:** Batch requests carry a deadline header (`x-slo-ttft-ms`) that GIE uses to prioritize jobs closest to their SLO deadline.
- **Enable per-tenant fairness:** The processor sends a fairness header (`x-gateway-inference-fairness-id`) with the tenant identifier, enabling round-robin fairness within the batch priority band.

In the future, Batch Gateway is planned to support extended integrations with relevant llm-d components, as well as with additional components in the LLM inference ecosystem.

## Observability, security, and operations

Batch Gateway is built for production operations out of the box:

- **Prometheus metrics** enable monitoring of job processing and API handling.
- **OpenTelemetry tracing** enables end-to-end request visibility across components.
- **Health and readiness probes** for Kubernetes-native lifecycle management.
- **Security hardened:**
  - TLS / mTLS support for backend connections.
  - Authentication and authorization integration.
  - Multi-tenancy isolation.
  - Security headers, HTTP server hardening, and input validation.
  - Pod security: non-root execution, read-only filesystem, all capabilities dropped, seccomp, no privilege escalation.

## Getting started

To learn more about Batch Gateway, check out the following resources:

- To run a local demo using a *kind* cluster, see the [demo resources](https://github.com/llm-d/llm-d-batch-gateway/tree/main/scripts/demo) and [prerequisites](https://github.com/llm-d/llm-d-batch-gateway/blob/main/docs/guides/development.md#prerequisites).
- To deploy in a Kubernetes cluster using demo settings, see the [demo deployment resources](https://github.com/llm-d/llm-d-batch-gateway/blob/main/scripts/dev-deploy).
- For detailed deployment and setup instructions, see the [Kubernetes deployment guide](https://github.com/llm-d/llm-d-batch-gateway/blob/main/docs/guides/deploy-k8s.md).
- The project's [documentation](https://github.com/llm-d/llm-d-batch-gateway) includes the main readme, [guides](https://github.com/llm-d/llm-d-batch-gateway/tree/main/docs/guides), and [design documents](https://github.com/llm-d/llm-d-batch-gateway/tree/main/docs/design).

## Get involved with llm-d

Batch Gateway is developed in the open as part of the llm-d ecosystem. If you're running LLM inference at scale and need batch processing capabilities, we'd love to have you involved.

* **Explore the code** -- Browse the [Batch Gateway repo](https://github.com/llm-d/llm-d-batch-gateway) and the wider [llm-d organization](https://github.com/llm-d)
* **Join our Slack** -- [Get your invite](/slack) and connect with maintainers and contributors
* **Attend community calls** -- All meetings are open! Add our [public calendar](https://red.ht/llm-d-public-calendar) (Wednesdays 12:30pm ET) and join the conversation
* **Follow project updates** -- Stay current on [Twitter/X](https://twitter.com/_llm_d_), [Bluesky](https://bsky.app/profile/llm-d.ai), and [LinkedIn](https://www.linkedin.com/company/llm-d)
* **Watch demos and recordings** -- Subscribe to the [llm-d YouTube channel](https://www.youtube.com/@llm-d-project) for community call recordings and feature walkthroughs
* **Read the docs** -- Visit our [community page](/docs/community) to find SIGs, contribution guides, and upcoming events

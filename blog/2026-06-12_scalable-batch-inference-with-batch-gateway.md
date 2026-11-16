---
title: "Efficient Batch and Interactive LLM Inference at Scale with llm-d"
description: "Batch Gateway brings first-class batch inference capabilities to llm-d, providing an OpenAI-compatible API for submitting, tracking, and managing large-scale batch jobs, running efficiently alongside interactive inference on shared infrastructure."
slug: scalable-batch-inference-with-batch-gateway
date: 2026-11-10T09:00

authors:
  - lioraronovich
  - raymondzhao
  - jooyeonmok
  - kahilam
  - niliguy

tags: [blog, batch-inference, inference, llm-d]
---

# Efficient Batch and Interactive LLM Inference at Scale with llm-d

As organizations deploy AI applications in production, their inference infrastructure must serve two fundamentally different workloads simultaneously: interactive requests requiring immediate replies, and batch inference jobs that process thousands of requests with completion windows measured in hours. Use cases for batch inference include autonomous background agents performing multi-step reasoning and deep research, as well as user-initiated workloads like offline evaluations, dataset processing, and embedding generation.

In batch inference, the goal is to maximize throughput across a large volume of requests while meeting defined completion time targets, without interfering with interactive traffic. Non-urgent inference can fill GPU capacity during periods of lower interactive traffic, increasing infrastructure utilization. Users can also take advantage of differential billing between batch and interactive workloads for cost-optimized processing.

[**Batch Gateway**](https://github.com/llm-d/llm-d-batch-gateway) brings first-class batch inference capabilities to llm-d. It provides an OpenAI-compatible API for submitting, tracking, and managing large-scale batch jobs, running efficiently alongside interactive inference workloads on shared infrastructure. With OpenAI API compatibility, users can migrate existing OpenAI batch scripts with minimal changes.

<!-- truncate -->

## The challenge: batch and interactive workloads on shared infrastructure

When batch and interactive inference workloads compete for the same GPU resources without purpose-built tools, the outcomes are typically poor:

- **Letting batch workloads degrade interactive performance** is unacceptable for production services.
- **Batch traffic can evict KV-cache entries** needed by interactive workloads, forcing costly prefill reconstruction.
- **Dedicating separate GPU pools for batch workloads** is expensive and wasteful.
- **Manually throttling batch workloads** is operationally burdensome.

Batch Gateway schedules jobs based on their completion deadlines. It supports several ways to manage how batch requests reach inference. Synchronous dispatch can use adaptive concurrency, together with llm-d Router admission control or priority-based flow control. Asynchronous dispatch can use downstream inference metrics to regulate when queued batch requests are forwarded. When configured for a deployment, these controls help limit competition with interactive requests while batch jobs make steady progress toward their completion targets.

Batch Gateway is production-grade, designed for shared multi-tenant environments where security, reliability, observability, and adherence to service level objectives (SLO) are essential.

Batch Gateway is part of [llm-d](https://github.com/llm-d/llm-d), a CNCF Sandbox project and open-source Kubernetes-native framework for high-performance distributed LLM inference. When deployed integrated with llm-d's components, batch workloads can benefit from llm-d capabilities such as intelligent request routing, flow control, and KV-cache reuse.

## How Batch Gateway works

Batch Gateway is a Kubernetes-native system composed of several components:

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blog-images/batch-gateway-arch.webp" alt="Batch Gateway architecture diagram" style={{width: '100%', height: 'auto'}} />
</div>

### API Server

The API server exposes OpenAI-compatible `/v1/batches` and `/v1/files` endpoints, providing the same interface that users and applications already use for batch processing.

### Data layer

Batch Gateway uses pluggable storage backends for different functions. Each function is backed by a single plug-in, chosen at deployment time.

| Function | Typical backend |
|----------|-------------------|
| Job and file metadata, job queue, events, and status | PostgreSQL |
| Async request and result queues (optional; async mode only) | Redis/Valkey |
| Input and output files | S3 or filesystem storage |

Expired batch jobs and their associated files are periodically cleaned up.

### Batch Processor

The batch processor pulls jobs from a priority queue, retrieves the input files, and builds per-model execution plans. Depending on the deployment, it either sends inference requests directly to the configured gateway or uses an asynchronous dispatcher and collects the returned results. The processor bounds concurrent work; synchronous dispatch can adapt its concurrency to downstream capacity signals. As results arrive, the processor writes them to an output file and updates the job's status.

The processor groups requests by model and orders requests with the same system prompt close together. This can improve prefix-cache reuse. When llm-d Router is configured for prefix-aware routing, matching requests can also benefit from cached prefixes across the serving pool.

The processor listens for job events such as cancellation, enabling real-time control over in-flight work. In addition, the system handles recovery from crashes and failures during processing.

## Benchmark results

The comparison covers four scenarios. S0 is the interactive-only baseline. S1 sends a continuous stream of ordinary inference requests generated from the batch workload's prompt and output-length distributions, produced at 500 requests per second. S2 and S3 use Batch Gateway. S2 uses synchronous batch dispatch with router admission control, while S3 uses synchronous dispatch with router priority flow control. Both Batch Gateway scenarios use adaptive concurrency. The table reports burst-phase p50 time to first token (TTFT) and time per output token (TPOT), plus the elapsed completion time for each tracked Batch API job against its deadline. S0 and S1 do not submit Batch API jobs.

| Scenario | Burst TTFT (p50) | Burst TPOT (p50) | Batch jobs completed |
|---|---:|---:|---|
| S0 — Interactive only | 60 ms | 17 ms | N/A |
| S1 — Uncontrolled batch traffic | 395 ms | 93 ms | N/A — ordinary inference requests |
| S2 — Admission control + adaptive concurrency | 83 ms | 24 ms | A: ✓ 13.4m/30m, B: ✓ 13.4m/2h, C: ✓ 13.4m/24h |
| S3 — Priority flow control + adaptive concurrency | 90 ms | 23 ms | A: ✓ 18.3m/30m, B: ✓ 18.5m/2h, C: ✓ 18.5m/24h |

Uncontrolled batch traffic raised median burst TTFT from 60 ms to 395 ms and TPOT from 17 ms to 93 ms. Compared with uncontrolled batch traffic, Batch Gateway reduced p50 burst TTFT by **77–79%** (395 ms to 83–90 ms) and TPOT by **74–75%** (93 ms to 23–24 ms); all three batch jobs completed within their deadlines. Admission control (S2) measured 83 ms TTFT and 24 ms TPOT, with all jobs finishing in 13.4 minutes. Priority flow control (S3) measured 90 ms TTFT and 23 ms TPOT, with jobs finishing in 18.3–18.5 minutes.

This two-replica comparison used two NVIDIA A100 80 GB GPUs, one per vLLM replica (TP=1), serving `openai/gpt-oss-120b` in MXFP4 with vLLM v0.23.0. Interactive traffic used 512 input and 128 output tokens, with 28 requests per second during 90-second burst phases and 1 request per second during 90-second idle phases. Each run had 10 cycles: two warm-up cycles followed by eight measured cycles. Each tracked batch job contained 1,000 requests with 512 input tokens and a lognormal output-length distribution (mean 500, standard deviation 400, capped at 2,048 tokens); the job deadlines were 30 minutes, 2 hours, and 24 hours.

## Getting started

To learn more about Batch Gateway, check out the following resources:

- To run a local demo of Batch Gateway using a kind cluster, check out the [demo resources](https://github.com/llm-d/llm-d-batch-gateway/tree/main/examples/poc).
- To deploy Batch Gateway in a Kubernetes cluster using demo settings, see the [demo deployment resources](https://github.com/llm-d/llm-d-batch-gateway/tree/main/examples/deploy-demo).
- For detailed deployment and setup instructions, check out the [guide to deploy on Kubernetes](https://github.com/llm-d/llm-d-batch-gateway/blob/main/docs/guides/deploy-k8s.md).
- The project's documentation includes the [main readme file](https://github.com/llm-d/llm-d-batch-gateway/blob/main/README.md), the [guides](https://github.com/llm-d/llm-d-batch-gateway/tree/main/docs/guides), and [design documents](https://github.com/llm-d/llm-d-batch-gateway/tree/main/docs/design).

## Get involved with llm-d

Batch Gateway is developed in the open as part of the llm-d ecosystem. If you're running LLM inference at scale and need batch processing capabilities, we'd love to have you involved.

* **Explore the code** -- Browse the [Batch Gateway repo](https://github.com/llm-d/llm-d-batch-gateway) and the wider [llm-d organization](https://github.com/llm-d)
* **Join our Slack** -- [Get your invite](/slack) and connect with maintainers and contributors
* **Attend community calls** -- All meetings are open! Add our [public calendar](https://red.ht/llm-d-public-calendar) and join the conversation
* **Follow project updates** -- Stay current on [X (Twitter)](https://x.com/_llm_d_), [Bluesky](https://bsky.app/profile/llm-d.ai), and [LinkedIn](https://www.linkedin.com/company/llm-d)
* **Watch demos and recordings** -- Subscribe to the [llm-d YouTube channel](https://www.youtube.com/@llm-d-project) for community call recordings and feature walkthroughs
* **Read the docs** -- Visit our [community page](/community) to find SIGs, contribution guides, and upcoming events

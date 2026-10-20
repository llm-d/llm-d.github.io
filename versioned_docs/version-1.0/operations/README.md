# Operational Excellence

Operational Excellence guidelines focus on overarching Day-2 site reliability engineering, cluster-wide telemetry frameworks, and safe lifecycle rollout strategies for generative AI inference deployments.

While [well-lit path guides](../well-lit-paths/README.md) teach how to configure llm-d's native intelligent routing algorithms and inference optimizations, this top-level section covers how to operate, scale, multiplex, queue, and lifecycle-manage an llm-d fleet in production: capacity and cold starts, multi-tenant traffic and batch, rollouts, observability, integrations such as AI gateways, and post-deployment validation. These capabilities are model-agnostic and layer onto any deployment.

## Monitor and Troubleshoot

### [Cluster Observability](observability/README.md)

End-to-end telemetry setup, OpenTelemetry tracing, standard Prometheus metrics, PromQL dashboards, and monitoring architectures.

## Autoscale Inference Pools

### [Autoscaling](./autoscaling/index.mdx)

Autoscale the inference pool on proactive, SLO-aware signals that reflect the true state of the inference system — queue depth, in-flight requests, token backlog, KV-cache pressure, or predicted latency — using KEDA and EPP metrics.

## Speed Up Model Startup

### [Load and Cache Model Weights](startup/model-loading-and-startup.md)

Model sources, node-local and PVC weight caches, self-hosted registries, and compilation-cache reuse for llm-d deployments.

### [Transfer Weights Peer-to-Peer (ModelExpress)](./startup/modelexpress-p2p/index.mdx)

Load one replica from storage and transfer weights to peer replicas over GPU-to-GPU NIXL/RDMA for faster cold scale-outs.

### [Restore from Pod Snapshots](./startup/pod-snapshot/index.mdx)

Checkpoint and restore single-GPU vLLM and SGLang model servers to eliminate model download and engine initialization on scale-out, currently implemented with GKE Pod Snapshots and GKE Sandbox (gVisor).

### [Reuse Warm Model Servers (FMA)](./startup/fast-model-actuation/index.mdx)

Cut vLLM startup time with resident sleep/wake instances and a pre-warmed launcher that spawns new instances without re-importing modules, so replica scale-up and model swaps avoid the cold-start penalty on a shared GPU pool.

### [Scale from Zero with FMA and KEDA](./startup/fast-model-actuation-keda/index.mdx)

Scale-from-zero autoscaling of Fast Model Actuation on EPP flow-control metrics.

### [Troubleshoot Model Startup](startup/troubleshooting.md)

Measure cold and warm starts, and fix Hugging Face rate limits and timeouts, startup-probe restarts, and cache storage errors.

## Manage Inference Pool Lifecycle

### [Graceful Shutdown & Draining](lifecycle/graceful-shutdown.md)

Draining in-flight requests during scale-down, rolling updates, and node drains for general serving: the Kubernetes termination sequence, vLLM `--shutdown-timeout`, request cancellation on client disconnect, and EPP flow-control drain semantics.

### [Readiness Probes](lifecycle/readiness-probes.md)

Kubernetes HTTP probe configurations using vLLM API endpoints to ensure pods are only marked Ready when models are fully loaded.

## Roll Out Updates Safely

### [Rollouts](./rollouts/index.mdx)

Production rollout strategies including [Blue-Green updates](./rollouts/blue-green-update.mdx) and [live LoRA adapter hot-swapping](./rollouts/adapter-rollout.mdx) without dropping active client traffic.

## Operate Disaggregated Serving

### [Disaggregated Serving Operations](disaggregation/README.md): [vLLM](disaggregation/vllm.md), [SGLang](disaggregation/sglang.md), [DisaggregatedSet](disaggregation/disaggregatedset.md) and [Safe Rollouts](disaggregation/safe-rollouts.md)

Engine-specific operations for disaggregated (prefill/decode) serving: dynamic connections, request cancellation, fault tolerance, and safe rollouts. For the architecture, see [Disaggregated Serving Concepts](../architecture/disaggregation/pd-disaggregation.md).

## Manage Traffic and Tenants

### [Queue and Prioritize Requests (Flow Control)](./traffic/flow-control/index.mdx)

Intelligent request queuing in the EPP: priority bands, per-tenant fairness, and saturation detection for multi-tenant deployments and traffic spikes.

### [Tune Flow Control Concurrency](traffic/flow-control-tuning.md)

Derive `maxConcurrency` for the saturation detector from your hardware, model, and workload with the tuning wizard.

### [Deploy Multiple Inference Pools](./traffic/multi-inference-pool/index.mdx)

Add InferencePools, each with its own EPP and model server Deployment, to an existing deployment so several models or tenants are served side by side.

### [Route to Multiple Models and LoRA Adapters](./traffic/multi-model-routing/index.mdx)

Serve multiple base models and LoRA adapters behind a single endpoint using the Inference Payload Processor (IPP).

## Process Batch and Async Requests

Process offline and latency-insensitive work in front of an existing deployment. [Choosing between the two approaches](./batch-serving/index.mdx) compares them.

### [Run Batch Jobs (Batch Gateway)](./batch-serving/batch-gateway.mdx)

Deploy an OpenAI-compatible batch API (`/v1/batches`, `/v1/files`) with pluggable metadata and file storage and a processor that dispatches requests to the llm-d Router.

### [Queue Async Requests (Async Processor)](./batch-serving/asynchronous-processing.mdx)

Consume requests from a message queue (GCP Pub/Sub or a Redis Sorted Set) and dispatch them with metric-gated back-off based on live model server saturation, including Async Processor sizing and scaling.

### [Enforce Tenant Quotas and Priorities](./batch-serving/async-multitenant.mdx)

Share async queues across teams with reserved quotas, tier-priority dispatch, and saturation back-off across inference pools.

## Integrations

### Serve External APIs: [LiteLLM](integrations/litellm.md) and [Kong AI Gateway](integrations/kong.md)

Deploy LiteLLM Proxy or Kong AI Gateway to route traffic seamlessly between self-hosted llm-d inference stacks and external cloud provider LLM APIs. See [Integrations](integrations/README.md) for the architecture and integration modes.

## Size and Scale llm-d Components

Sizing, high availability, and scaling guidance for running individual llm-d components in production.

### [Router Operations](components/router.md)

Operational best practices, high availability scaling modes, standalone proxy architectures, and container resource sizing for llm-d Router deployments.

### [Async Processor Operations](components/async-processor.md)

Concurrency selection, container resource sizing, and horizontal scaling for the Async Processor dispatch agent.

## Validate

Functional and performance validation of a deployed llm-d stack.

### [Run a Smoke Test](validation/smoke-test/README.md)

Verify a freshly deployed stack end to end: API readiness, model discovery, and completion and chat-completion inference with latency measurements.

### [Benchmark Performance](validation/benchmark.md)

Run performance benchmarks against a deployed stack with the `llmdbenchmark` CLI: workload profiles, harnesses, results layout, and analysis.

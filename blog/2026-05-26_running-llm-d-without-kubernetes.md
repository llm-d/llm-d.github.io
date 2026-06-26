---
title: "No Kubernetes? No Problem: llm-d Now Runs Anywhere"
description: "llm-d's routing intelligence was entangled with Kubernetes. A new endpoint-discovery abstraction separates the two, so KV-cache-aware scheduling, prefix affinity, and P/D run on Slurm, Ray, bare metal, or a laptop."
slug: running-llm-d-without-kubernetes
date: 2026-05-26T09:00

authors:
  - ezrasilvera

tags: [blog, scheduling, inference, llm-d]
---

# No Kubernetes? No Problem: llm-d Now Runs Anywhere

llm-d was born Kubernetes-native. Its workers are `Deployments`, its endpoints live in an `InferencePool`, and its guides assume a cluster is one `kubectl` away. That made sense: Kubernetes is where most production inference runs, and building on it gave llm-d a head start on networking, lifecycle, and scale.

But the thing that makes llm-d *llm-d* - KV-cache-aware scoring, prefix-cache affinity, prefill/decode disaggregation, flow control - was never fundamentally about Kubernetes. It is routing intelligence. It reasons about the state of a fleet of model servers and decides where each request should go. Nothing about that logic needs an API server. The dependency on Kubernetes was incidental, inherited from how endpoints happened to be discovered, not essential to what the router actually does.

This post is about pulling those two things apart. We introduce the `EndpointDiscovery` abstraction in the llm-d router that separates *what endpoints exist* from *how to route across them*, and the first plugin built on it - file discovery - which lets the full routing stack run as a plain process or container with no Kubernetes anywhere in sight: on an HPC cluster, inside a Ray job, on a bare-metal rack, or on your laptop.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/running-llm-d-without-kubernetes/llm-d-platform.drawio.svg" alt="llm-d's EndpointDiscovery module with Kube and File discovery plugins feeding the same router across Kubernetes, Slurm, Ray, and bare metal" style={{width: '85%', height: 'auto', border: '1px solid #888', padding: '4px'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Figure 1: The big picture - one routing stack under every platform. llm-d discovers endpoints through its EndpointDiscovery module (Kube Discovery against an InferencePool, File Discovery against everything else) and serves requests the same way on Kubernetes, Slurm, Ray, or bare metal (inference, HPC, and RL rollout workloads: veRL, SkyRL, prime-rl). The rest of this post explains how.</em></p>
</div>

<!-- truncate -->

## The hard problem: routing intelligence trapped on one platform

It is tempting to file "run llm-d off Kubernetes" under simple engineering - drop the cluster dependency, ship a binary, done. The reason it matters is more fundamental than that, and it shows up most sharply in the places llm-d could not previously reach.

**Reinforcement learning post-training.** Modern RL frameworks for LLMs - veRL, OpenRLHF, SkyRL, NeMo-RL - run on dedicated GPU clusters orchestrated by Ray, Slurm, or bare-metal coordination, where Kubernetes is usually absent and often unwelcome. And in the RL training loop, the rollout phase - running inference to generate the trajectories the policy learns from - is one of the dominant time costs, frequently *the* dominant one. Anything that speeds up that generation directly shortens the loop, which is why inference has become a first-class concern for these frameworks.

It is not a simple problem. Inference is harder than it first looks because RL rollouts are not a single workload: multi-turn agentic trajectories, long reasoning chains, and short single-shot completions have very different compute and memory profiles, and each rewards a different routing and caching strategy. Many frameworks have responded by adding an inference router of their own, but the routing is still naive - typically round-robin or a simple load metric - which leaves most of the achievable speedup on the table.

This is exactly the ground llm-d has spent its life on. Its routing intelligence - KV-cache-aware scoring, prefix-cache affinity, prefill/decode disaggregation, flow control - was built and hardened against precisely these complex workloads, including agentic and reasoning patterns. RL systems need that intelligence during rollout: load-aware routing across many engines, and KV-cache reuse for the repeated, multi-turn prompts that dominate RL trajectories. But getting it previously meant standing up a *second* orchestration system alongside the training stack - one platform for training, Kubernetes for inference - with operational cost at every handoff. Faced with that, most teams do not adopt Kubernetes; they reimplement the same rollout primitives from scratch in every framework - weight synchronization, engine lifecycle, load-aware routing, KV-cache-aware placement - usually with far less inference sophistication than llm-d already provides. llm-d can consolidate all of it into one reusable layer, but only if Kubernetes is not the price of admission.

**Research labs and HPC.** National labs and supercomputing centers - ORNL, NERSC, ALCF - standardize on Slurm, and not by accident. Security policies restrict privileged containers, and the whole stack is tuned around HPC storage like Lustre and GPFS. For these environments Kubernetes is not merely missing; it is actively undesirable. Slurm already handles scheduling, accounting, and fault tolerance. Adding a Kubernetes control plane buys operational overhead and little else, and so llm-d's routing intelligence was simply out of reach for a large research community.

**Clean benchmarking.** Measuring what a router is worth requires isolating its contribution. Run llm-d on Kubernetes and the measurement is contaminated by kube-proxy, the CNI, and control-plane interference; a comparison against native vLLM ends up confounding routing intelligence with orchestration overhead. Benchmark efforts that want a clean, infrastructure-neutral baseline could not get one.

The common thread is that llm-d's value was *coupled to its platform*. The intelligence and the orchestration were welded together, so you could not take one without the other. The real problem is not "launch the binary somewhere else." It is factoring discovery cleanly out of the scheduler - so that the same routing logic, unchanged, runs on whatever platform you already have. That is what the rest of this post describes.

## How llm-d normally discovers endpoints

To see what has to be abstracted, start with how discovery works today. The Endpoint Picker (EPP), the routing engine inside the llm-d router, watches a Kubernetes `InferencePool` object and the pods it selects. As pods come and go, the EPP's internal datastore is updated automatically through the controller-runtime manager.

That machinery requires a live Kubernetes API server, an `InferencePool` CRD, and the RBAC to watch it. On a Slurm allocation or inside a Ray job, none of that exists - and crucially, none of it has anything to do with *how the router scores and picks endpoints*. It is purely about learning which endpoints are out there. That separation is the seam to cut along.

## The EndpointDiscovery abstraction

So we cut there. The llm-d EPP now defines a general `EndpointDiscovery` plugin interface: anything that can enumerate endpoints and stream upsert/delete events satisfies it - a file on disk, Consul, etcd, a cloud provider's service-discovery API, or the Kubernetes watch itself.

The interface is deliberately small ([`pkg/epp/framework/interface/datalayer/discovery.go`](https://github.com/llm-d/llm-d-router/blob/main/pkg/epp/framework/interface/datalayer/discovery.go)):

```go
type EndpointDiscovery interface {
    fwkplugin.Plugin
    // Start begins discovery; blocks until ctx is cancelled or a fatal error occurs.
    Start(ctx context.Context, notifier DiscoveryNotifier) error
    // Ready is used to gate request-serving until the datastore is populated.
    Ready() <-chan struct{}
}

type DiscoveryNotifier interface {
    // Upsert adds or updates an endpoint in the datastore.
    Upsert(endpoint *EndpointMetadata)
    // Delete removes an endpoint from the datastore.
    Delete(id types.NamespacedName)
}
```

A plugin tells the EPP about endpoints by calling `Upsert` and `Delete` on the notifier. `Start` runs the plugin's main loop - typically an initial enumeration followed by a watch that emits further `Upsert`/`Delete` calls as endpoints change. `Ready()` returns a channel that closes once the datastore is populated, so request-serving can be gated on a non-empty pool.

What matters here is the line the interface draws. On one side: *what endpoints exist*, which is inherently platform-specific - a `kubectl` watch on a cluster, a node list on Slurm, a set of actors on Ray. On the other side: *how to route across them*, which is platform-neutral and is the whole of llm-d's value. Everything above the interface - scoring, filtering, picking, flow control - never learns where the endpoints came from.

This is why it is not a non-Kubernetes bolt-on. The existing Kubernetes watch is expected to move behind this same interface, so that `InferencePool` discovery becomes just another plugin alongside file, DNS, and service-registry discovery. The goal is one model for all discovery paths, with the scheduler agnostic to every one of them. Running without Kubernetes falls out of that design; it is not a special case grafted onto it.

## The file-discovery plugin

The first plugin built on the interface is the simplest possible source of truth: a plain YAML or JSON file on disk. The plugin reads the file at startup and optionally watches it (via `fsnotify`), emitting `Upsert`/`Delete` events as entries are added, modified, or removed.

When this plugin is in use, **the EPP has no dependency on any Kubernetes service or object** - no API server, no watchers, no controller manager, no `InferencePool` CRD, no RBAC, no `kubeconfig`. **It runs on a host with no cluster in sight.**

And because the plugin sits below the interface seam, everything above it is unchanged. KV-cache-utilization scoring, prefix-cache affinity, saturation-based admission, FlowControl, and Prometheus metrics all behave exactly as they do on Kubernetes. The router does not know, and does not care, that its endpoints came from a file.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/running-llm-d-without-kubernetes/no-kubernetes-deployment.svg" alt="llm-d file-discovery architecture" style={{width: '75%', height: 'auto', border: '1px solid #888', padding: '4px'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Figure 2: FileDiscovery plugin in llm-d</em></p>
</div>

## A minimal example

The full, deploy-ready path - EPP, Envoy, and vLLM commands, verification, and a Prometheus scrape example - lives in the upstream [No-Kubernetes Deployment guide](https://github.com/llm-d/llm-d/tree/main/guides/no-kubernetes-deployment), with the architecture and design rationale in the companion [no-Kubernetes deployment doc](https://github.com/llm-d/llm-d/blob/main/docs/infrastructure/no-kubernetes-deployment.md). Rather than reproduce it, this section isolates the two pieces that are specific to file discovery, so the guide reads as a concrete instance of an understood pattern.

### 1. The endpoints file

The plugin reads a YAML file listing inference endpoints. Each entry needs a unique `name` and a literal `address:port` (hostnames are not resolved); optional `labels` are surfaced to scheduler plugins, e.g. `llm-d.ai/role: prefill` for P/D. The full field reference is in the [guide](https://github.com/llm-d/llm-d/tree/main/guides/no-kubernetes-deployment).

### 2. The one line that flips discovery

Turning a Kubernetes EPP into a no-Kubernetes EPP comes down to a single line in the `EndpointPickerConfig`: after registering the file-discovery plugin, point discovery at it with `dataLayer.discovery.pluginRef: file-discovery`. That one line switches off the Kubernetes watch path.

Everything else in the config - scoring, picker, metrics - is identical to any other EPP config. The upstream [`router/epp/config.yaml`](https://github.com/llm-d/llm-d/blob/main/guides/no-kubernetes-deployment/router/epp/config.yaml) ships the optimized-baseline plugin mix already wired to file discovery and is the recommended starting point. The plugin's `watchFile: true` parameter is the key property for dynamic environments: the EPP upserts and deletes endpoints as the file changes, with no restart.

From here, the guide covers starting the EPP, wiring Envoy's `ext_proc` to it, and sending a request - none of which differs from llm-d's standalone deployment mode.

## Prefill/decode disaggregation

llm-d's prefill/decode disaggregation (P/D) - where the compute-bound prefill stage and the memory-bandwidth-bound decode stage run on separate workers and the KV cache is transferred between them - works in file-discovery mode with no special handling. The full deployment recipe (sidecar flags, vLLM `kv-transfer-config`, NIXL/RDMA, plugin wiring, scheduling profiles) is documented in the [pd-disaggregation guide](https://github.com/llm-d/llm-d/tree/main/guides/pd-disaggregation) and is identical outside Kubernetes.

The only file-discovery-specific change is marking each endpoint's role in the YAML with the `llm-d.ai/role` label (`prefill` or `decode`); the router's prefill/decode filters select candidates by that label. The full set of role values is listed in [`bylabel/roles.go`](https://github.com/llm-d/llm-d-router/blob/main/pkg/epp/framework/plugins/scheduling/filter/bylabel/roles.go).

## Beyond a static file: dynamic platforms

A hand-edited file is fine when the worker set is fixed. The interesting cases are dynamic, and they all reduce to the same shape: whatever already knows your worker set writes the endpoints file, and the EPP reconciles. There is a spectrum of how that file gets produced:

1. **Static file** - hand-edited or templated once at deployment. Right for bare-metal racks, lab machines, a fixed pool of services. No live reload needed.
2. **Generated once at startup** - a script asks the orchestrator for the current worker set and writes the file before the EPP starts. Works well when the set is fixed for the duration of a job (an HPC allocation, a single training run).
3. **Regenerated on change** - a monitor or job hook rewrites the file via atomic rename whenever workers change: a node fails, a training round completes and rollouts respawn, an autoscaler adds capacity. With `watchFile: true` the EPP reconciles without a restart.
4. **Orchestrator-native discovery plugin** (future work) - for the most dynamic case, a dedicated `SlurmDiscovery` or `RayDiscovery` plugin against the same `EndpointDiscovery` interface, talking to the orchestrator directly with no file in the loop.

The two environments where this matters most today are Ray and Slurm:

- **Ray.** vLLM workers run as remote processes on Ray nodes, and the Ray Python API exposes current cluster membership including node IPs. A short script queries `ray.nodes()`, keeps the GPU nodes, and writes the endpoints file - regenerated between RL training rounds as rollout workers are replaced.
- **Slurm.** A batch job requests a fixed set of nodes; the first is designated the head (running EPP and Envoy) and the rest run vLLM. `scontrol show hostnames $SLURM_JOB_NODELIST` expands the allocation, and a few lines resolve those hostnames to IPs for the file.

Both end-to-end examples - the Ray generator script and a complete Slurm SBATCH job - are in the [No-Kubernetes Deployment guide](https://github.com/llm-d/llm-d/tree/main/guides/no-kubernetes-deployment).

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/running-llm-d-without-kubernetes/ray-endpoint-generator.svg" alt="Endpoint generator script connected to the Ray head node, writing endpoints.yaml" style={{width: '75%', height: 'auto', border: '1px solid #888', padding: '4px'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Figure 3: An endpoint generator queries the Ray head node and writes endpoints.yaml.</em></p>
</div>

These patterns all keep a file in the loop. For the most dynamic pools we are exploring discovery plugins that remove it entirely, all against the same `EndpointDiscovery` interface: orchestrator-native plugins (the `RayDiscovery`/`SlurmDiscovery` of pattern 4) that talk to Ray's Python API or Slurm's controller directly and emit `Upsert`/`Delete` events as workers change; plugins backed by a service registry such as Consul, etcd, or a cloud provider's service-discovery API where one already runs; and, longer term, moving the existing Kubernetes watch behind the same interface so `InferencePool` discovery becomes just another plugin and the scheduler carries no special case for any platform.

## One routing stack, every platform

Because the discovery seam sits below the scheduler, file-discovery mode does not get a *subset* of llm-d - it gets the whole router, unchanged. KV-cache-utilization scoring, prefix-cache affinity, saturation-based admission, FlowControl, and the Prometheus metrics surface all behave exactly as they do on Kubernetes, because none of them ever learn where the endpoints came from. Crucially, this holds for capabilities that do not exist yet: any scoring, filtering, or flow-control logic added above the seam lands once and runs everywhere. There is no "Kubernetes llm-d" and "non-Kubernetes llm-d" to keep in sync - there is one routing stack, and it is platform-invariant by construction. That is the shape Figure 1 sketched at the top: one router underneath, every platform above.

Two things still differ, and both are about *inputs* rather than routing logic. A few features are still configured through Kubernetes CRDs - per-request priority from `InferenceObjective`, and `InferenceModelRewrite`-driven model-name rewriting - so outside Kubernetes they fall back to static configuration or are not yet available; the plan is to move them behind the same plugin pattern as discovery. And *ownership of endpoint lifecycle* changes: on Kubernetes a dying pod leaves the `InferencePool` automatically, while with file discovery detecting a failed worker and rewriting the file is the surrounding orchestrator's job (Ray, Slurm, a custom controller) - in production usually a small health-monitoring agent that drops unavailable workers from the file.

## Research directions we are pursuing

Decoupling routing intelligence from the platform is the enabling step, not the destination. Discovery gets llm-d's existing routing onto RL platforms; the larger opportunity we are pursuing is adapting the routing itself to what rollouts demand. As we work with RL frameworks we are mapping where current rollout pipelines fall short and where llm-d's inference expertise can close the gap:

- **Workload-aware routing for heterogeneous rollouts.** Agentic trajectories, long reasoning chains, and short completions each reward a different routing and caching strategy. We are studying how the scheduler can recognize the workload type and adapt within a single rollout, rather than treating every request the same.
- **Session affinity across multi-turn trajectories.** Routing each step of a trajectory back to the engine that already holds its KV cache, so the repeated-prompt structure of RL turns into real cache hits instead of recomputation.
- **Engine lifecycle around the train/generate cycle.** Rollout engines need to pause, sleep, and wake as weights are updated between rounds. Coordinating that cleanly - and keeping the router's view consistent through it - is a primitive each framework rebuilds today.
- **Weight synchronization.** Propagating updated policy weights to engines efficiently over NCCL/NIXL, keeping that data plane separate from the HTTP control plane that carries inference traffic.
- **Async and partial rollouts.** Supporting interruptible and partial generation for algorithms that do not need every trajectory to run to completion, and routing that stays correct as engines are preempted mid-flight.

The thread running through all of this is the one the post opened with: once routing intelligence is independent of the platform, llm-d can serve as reusable rollout infrastructure, so RL teams spend their effort on algorithms rather than rebuilding engine lifecycle and load-aware routing yet again. The direction we are pushing hardest on is RL itself - integrating no-Kubernetes llm-d with frameworks on Ray and Slurm (veRL, OpenRLHF), including a custom `EndpointDiscovery` plugin that registers and deregisters endpoints in real time as actors come and go between training rounds. A follow-up post will share that work and its early results, including how prefix-cache routing turns the repeated-prompt patterns of RLHF rollouts into a concrete throughput win.

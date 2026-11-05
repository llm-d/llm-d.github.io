---
title: "Serving Moonshot AI's Kimi K3.1 Pro with llm-d across TPUs and GPUs"
description: "Day-0 distributed serving recipes for Moonshot AI's 2.8T-parameter Kimi K3.1 Pro at 1M context using llm-d across Ironwood TPU v7x (SGLang) and NVIDIA GB300/GB200 GPUs (vLLM), on Google Cloud."
slug: deploy-kimi-k3-1-pro-with-llm-d
date: 2026-11-04T09:00
authors:
  - keelinmcdonell
  - ashokchandrasekar
  - anishshah
  - joeywang
  - syedaanjum
  - gopalasurya
  - newtonjain
tags: [blog, inference, agentic-inference, kv-cache, disaggregation, heterogeneous, vllm, sglang]
---

# Serving Moonshot AI's Kimi K3.1 Pro with llm-d across TPUs and GPUs

Running multi-trillion-parameter Mixture-of-Experts (MoE) models in production shifts the primary engineering bottleneck from model weights to distributed systems orchestration. With **Moonshot AI's Kimi K3.1 Pro** (`moonshotai/Kimi-K3.1-Pro`), infrastructure engineers must accommodate a **~2.8-trillion-parameter footprint** (~104B active parameters per token across 896 routed experts), a **1M-token context window**, and a hybrid 93-layer attention stack (69 Kimi Delta Attention layers paired with 24 Gated Multi-head Latent Attention layers).

At this footprint, the model weights alone surpass the High-Bandwidth Memory (HBM) capacity of any single machine, requiring multi-node Tensor and Expert Parallelism across high-bandwidth interconnects. Compounding the hardware footprint, long-horizon agentic sessions expose the limits of stateless Kubernetes load balancing: 1M-token KV caches rapidly exhaust accelerator HBM, uncoordinated routing forces replicas to recompute identical multi-turn prefixes, and compute-heavy prefill bursts stall ongoing token generation.

To eliminate these bottlenecks at launch, we worked with **Inferact** (vLLM) and **RadixArk** (SGLang) to deliver Day-0 distributed serving recipes on **llm-d**. Running **llm-d** as a unified, Kubernetes-native inference control plane, the same stack serves Kimi K3.1 Pro across both **TPUs** (**Ironwood TPU v7x**) and **NVIDIA GPUs** (**GB300 NVL72** and **GB200 NVL72**), here on Google Cloud (**A4X-Max** and **A4X**). Because the control plane is accelerator- and cloud-independent, platform teams gain a portable serving stack that handles state-aware KV routing, hierarchical memory offloading, and prefill/decode disaggregation out of the box.

<!-- truncate -->

:::note
These recipes run here on Google Cloud (GKE), but llm-d's routing, scheduling, and disaggregation layer is accelerator- and cloud-independent. The same configuration pattern applies on other accelerators and clouds; only the device-allocation and KV-transfer connectors change.
:::

## Architectural Blueprint: How `llm-d` Serves Kimi K3.1 Pro

To sustain high concurrency across Kimi K3.1 Pro's ~2.8T total parameters and 1M context length (`max_position_embeddings=1048576`) without restarting servers or reloading weights as traffic fluctuates, our Day-0 recipes combine **vLLM** and **SGLang** base engines with four core capabilities in **llm-d** (`v0.10.0+` agentic-serving):

- **State-Aware KV Routing (`llm-d-router`):** Each multi-node worker replica streams real-time ZMQ KV cache events (`kv-events-config`) to the `llm-d` Endpoint Picker (`epp`). Using a weighted composite of `prefix-cache-affinity-filter` with `token-load-scorer`, the scheduler pins multi-turn agentic trajectories to the exact replicas holding their warm KV blocks while making sure there is no hotspotting by following a sticky until saturated policy for routing.
- **Hierarchical KV Cache Tiering (HBM -> Host DRAM -> Local NVMe SSD / Managed Lustre):** To reserve scarce HBM for model weights and active attention states, evicted KV blocks spill over into host CPU memory (Grace LPDDR5X DRAM on GB300 or host DRAM on Ironwood TPU v7x) using `CPUOffloadingSpec`, vLLM's native KV offloading connector, or SGLang's HiCache. A third storage tier (`TieringOffloadingSpec`) offloads cold blocks to local NVMe SSDs (`/lssd`) and shared Google Cloud Managed Lustre (`/mnt/lustre/kvcache`), allowing prefix caches computed on one replica to be hydrated by another.
- **Prefill/Decode (P/D) Disaggregation:** When long-context prompt bursts threaten to degrade token generation interactivity, `llm-d` supports splitting prefill and decode pools into dedicated topologies (such as `3P1D`) so heavy prefill compute is isolated from decode memory bandwidth, combined with tensor parallelism (TP=16) and expert parallelism (EP=8) to sustain interactivity under long-context bursts across GPUs and TPUs.
- **Speculative Decoding:** Native configuration support for Multi-Token Prediction (MTP) and speculative drafter checkpoints (such as `NEXTN` / `DFlash2`) to accelerate multi-token decoding.

## Deploying Kimi K3.1 Pro with llm-d on GKE

Both the GPU (`vLLM`) and TPU (`SGLang`) configurations live in the unified [`guides/models/kimi-k3-1`](https://github.com/llm-d/llm-d/tree/main/guides/models/kimi-k3-1) model recipe ([Well-Lit Path docs](https://llm-d.ai/docs/dev/well-lit-paths/models/kimi-k3-1)). Rather than maintaining standalone YAML manifests, clone the [`llm-d` repository](https://github.com/llm-d/llm-d), initialize `GUIDE_NAME=kimi-k3-1` with `source guides/env.sh`, and deploy using composable Helm router values and Kustomize overlays.

> **License Note:** Before downloading or deploying `moonshotai/Kimi-K3.1-Pro`, review the [official model license](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/main/LICENSE) on Hugging Face to ensure your usage complies with all applicable conditions.

### 1. Prepare GKE Prerequisites & Stage the 1.56 TB Checkpoint

- **Cluster, Networking & CRDs:** Follow the [`kimi-k3-1` Prerequisites](https://github.com/llm-d/llm-d/blob/main/guides/models/kimi-k3-1/README.md#prerequisites) and [GKE Provider Guide](https://github.com/llm-d/llm-d/blob/main/docs/infrastructure/providers/gke/README.md) to provision either multi-node GPU pools (A4X-Max GB300 NVL72 or A4X GB200 NVL72 with NVIDIA DRA `ComputeDomain` and DRANet RDMA) or two Ironwood TPU v7x (`tpu7x` `2x2x4`, 4 hosts × 4 chips each, ~800 GiB host RAM/node, Workload Identity) node pools. Install the Gateway API Inference Extension (`v1`) CRDs, the [LeaderWorkerSet controller](https://github.com/llm-d/llm-d/blob/main/docs/infrastructure/model-server-orchestration.md) (`v0.11.1+`, passing `--set enableDisaggregatedSet=true` for GPU P/D), and the [`llm-d-hf-token` secret](https://github.com/llm-d/llm-d/blob/main/helpers/hf-token.md).
- **One-Time Checkpoint Staging:** At 1.56 TB (MXFP4 experts), Kimi K3.1 Pro exceeds standard node boot disks. Follow [Stage the Weights](https://github.com/llm-d/llm-d/blob/main/guides/models/kimi-k3-1/README.md#stage-the-weights) to copy the checkpoint once into a regional GCS bucket and hydrate a `ReadOnlyMany` [Hyperdisk ML](https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/hyperdisk-ml) PVC (`kimi-k3-1-models`, mounted at `/models`) via the GKE Volume Populator—or stage weights and shared KV offload tiers onto [Google Cloud Managed Lustre](https://github.com/llm-d/llm-d/blob/main/guides/tiered-prefix-cache/manifests/backends/lustre/README.md).

### 2. Deploy the llm-d Router

- **Helm Installation:** Follow [1. Deploy the llm-d Router](https://github.com/llm-d/llm-d/blob/main/guides/models/kimi-k3-1/README.md#1-deploy-the-llm-d-router) and the shared [Router Recipes](https://github.com/llm-d/llm-d/blob/main/guides/recipes/router/README.md) to install `ROUTER_STANDALONE_CHART` (or `ROUTER_GATEWAY_CHART` with `--set provider.name=gke`), layering `guides/recipes/router/base.values.yaml`, optional [GKE Managed Prometheus monitoring](https://github.com/llm-d/llm-d/blob/main/guides/recipes/router/features/monitoring-gke.values.yaml), and your track's override file from [`guides/models/kimi-k3-1/router/`](https://github.com/llm-d/llm-d/tree/main/guides/models/kimi-k3-1/router).
- **Session- & Load-Aware Scheduling:** Both tracks use `approx-prefix-cache-producer` (with `autoTune: false` and `lruCapacityPerServer` sized across both HBM and host-DRAM offload pools), `prefix-cache-affinity-filter` (gated by `peakPrefillThroughput` from the [router calibration tool](https://github.com/llm-d/llm-d/blob/main/guides/recipes/router/calibration/README.md)), and `token-load-scorer` on a single EPP replica for exact in-flight token accounting.
- **TPU Unified vs. GPU P/D Profiles:** On TPU, [`router/kimi-k3-1.values.yaml`](https://github.com/llm-d/llm-d/blob/main/guides/models/kimi-k3-1/router/kimi-k3-1.values.yaml) sets `modelServers.type: sglang` (`blockSizeTokens: 128`) and routes directly to rank-0 leader pods. On GPU, the P/D router values in the same [`router/`](https://github.com/llm-d/llm-d/tree/main/guides/models/kimi-k3-1/router) directory pair that same HBM+CPU prefix-affinity and token-load profile on `prefill` with `always-disagg-pd-decider` and `active-request-scorer` on `decode`.

### 3. Deploy the GPU (vLLM P/D) or TPU (SGLang) Model Server

Follow [2. Deploy the Model Server](https://github.com/llm-d/llm-d/blob/main/guides/models/kimi-k3-1/README.md#2-deploy-the-model-server) and apply the Kustomize overlay for your accelerator track under [`guides/models/kimi-k3-1/modelserver/`](https://github.com/llm-d/llm-d/tree/main/guides/models/kimi-k3-1/modelserver) (`kubectl apply -n ${NAMESPACE} -k guides/models/kimi-k3-1/modelserver/${ACCELERATOR_TYPE}/${MODEL_SERVER}/`):

- **GPU Track — vLLM 3P1D + Tiered KV Offloading (`gpu/vllm`):** Composes the [Wide-EP](https://github.com/llm-d/llm-d/blob/main/guides/wide-ep/README.md), [P/D Disaggregation](https://github.com/llm-d/llm-d/blob/main/guides/pd-disaggregation/README.md), and [Tiered Prefix Cache](https://github.com/llm-d/llm-d/blob/main/guides/tiered-prefix-cache/README.md) foundations into a `3P1D` `DisaggregatedSet` (3 multi-node prefill `LeaderWorkerSet` groups + 1 decode group over Multi-Node NVLink and GKE DRANet RDMA). `MultiConnector` pairs `NixlConnector` for P/D KV transfer with native HMA-aware `OffloadingConnector` across Grace LPDDR5X DRAM and optional NVMe/Managed Lustre.
- **TPU Track — SGLang 2 × (TP=32, EP=8) on 32 TPU v7x Chips (`tpu/sglang`):** Deploys [`modelserver/tpu/sglang`](https://github.com/llm-d/llm-d/tree/main/guides/models/kimi-k3-1/modelserver/tpu/sglang) as 2 `LeaderWorkerSet` replicas (4 pods each across two `tpu7x` `2x2x4` slices = 32 chips / 64 TensorCores total) running SGLang on Torch TPU at `TP=32 × EP=8` with sparse-MLA (`pallas_tpu_mla_sparse`), FP8 KV cache (480K context), `kimi_k3` reasoning parsing, and **HiCache host-DRAM offloading** (`--hicache-io-backend=raiden --hicache-ratio=2`, 2× HBM capacity) over TPU Sync for both sparse-MLA/DSA pages and KDA recurrent states.

### 4. Verify & Load-Test

Once the `DisaggregatedSet` or `LeaderWorkerSet` reports `Available`, run the smoke check in [Verification](https://github.com/llm-d/llm-d/blob/main/guides/models/kimi-k3-1/README.md#verification) against the `kimi-k3-1-epp` service (or GKE Gateway IP) to confirm end-to-end generation, HBM + host-DRAM prefix-cache hits, and P/D KV transfer. To replay multi-turn long-context sessions, apply the guide's [`inference-perf.yaml`](https://github.com/llm-d/llm-d/blob/main/guides/models/kimi-k3-1/inference-perf.yaml) job preset as documented in [Benchmarking](https://github.com/llm-d/llm-d/blob/main/guides/models/kimi-k3-1/README.md#benchmarking).

## Access the Day-0 recipes

Explore the complete configuration guides and deployment manifests in our open-source repositories:

- **llm-d Agentic Serving & Multi-Tier KV Guides:** [https://github.com/llm-d/llm-d/tree/main/guides/models/kimi-k3-1](https://github.com/llm-d/llm-d/tree/main/guides/models/kimi-k3-1)
- **Google Cloud TPU Recipes (Ironwood TPU v7x):**
  - **vLLM:** [https://github.com/AI-Hypercomputer/tpu-recipes/tree/main/inference/ironwood/vLLM](https://github.com/AI-Hypercomputer/tpu-recipes/tree/main/inference/ironwood/vLLM)
  - **SGLang:** [https://github.com/sgl-project/sglang-torchtpu/tree/main/sglang_tpu](https://github.com/sgl-project/sglang-torchtpu/tree/main/sglang_tpu)
- **Google Cloud GPU Recipes (A4X-Max GB300):** [https://github.com/AI-Hypercomputer/gpu-recipes](https://github.com/AI-Hypercomputer/gpu-recipes)

## What's next

We are expanding the library of model-centric well-lit paths and broadening accelerator and cloud coverage for multi-trillion-parameter MoE serving. Expect more Day-0 recipes, tighter P/D and wide-EP integration, and additional KV-offload backends.

If you are serving frontier models in production, come build with us:

- **Slack:** [llm-d.ai/slack](https://llm-d.ai/slack)
- **GitHub:** [github.com/llm-d](https://github.com/llm-d)
- **Community call:** [every Wednesday at 12:30pm ET](https://red.ht/llm-d-public-calendar)
- **Follow along:** on [X](https://x.com/_llm_d_), [Bluesky](https://bsky.app/profile/llm-d.ai), [LinkedIn](https://www.linkedin.com/company/llm-d), and [YouTube](https://www.youtube.com/@llm-d-project)

Come build with us.

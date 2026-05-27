---
title: "No Kubernetes? No Problem: llm-d Now Runs Anywhere"
description: "llm-d's new file-discovery plugin lets you run the full routing stack on bare metal, Slurm, Ray, or your laptop, with no Kubernetes required."
slug: running-llm-d-without-kubernetes
date: 2026-05-26T09:00

authors:
  - ezrasilvera

tags: [blog, scheduling, inference, llm-d]
---

# No Kubernetes? No Problem: llm-d Now Runs Anywhere

llm-d was designed as a Kubernetes-native inference stack, and its guides assume you have a cluster handy. However, a large class of inference workloads runs on infrastructure that isn't managed by Kubernetes, and until recently llm-d was not a fit for them.

With the **llm-d router**'s new **file-discovery plugin**, that changes. llm-d can now run as a plain process or container in any environment, with no dependency on Kubernetes or any other cluster framework. A YAML file lists your endpoints; the router reads it and reconciles changes live. That's the whole interface.

That opens the door to deployments like:

- **HPC clusters** running Slurm, where GPU nodes are allocated per-job and there is no cluster API
- **Ray-based training loops** (VERL, OpenRLHF) where rollout workers are Ray actors, not pods
- **Bare-metal inference farms** provisioned statically
- **Local development** on a workstation with one or two GPUs

This post introduces the new endpoint-discovery plugin mechanism in the llm-d router. It then shows how to use llm-d without a Kubernetes cluster by enabling the file-discovery plugin, which reads endpoints from a YAML file on disk. We illustrate this with two concrete examples that generate the endpoints file from a Ray cluster and a Slurm job.

<!-- truncate -->

## How llm-d normally discovers endpoints

The Endpoint Picker (EPP), the routing engine inside the llm-d router, normally watches a Kubernetes `InferencePool` object and the pods it selects. As pods come and go, the EPP's internal datastore is updated automatically via the controller-runtime manager.

That machinery requires a live Kubernetes API server, an `InferencePool` CRD, and appropriate RBAC. On an HPC cluster or a Ray job, none of that exists.

## The llm-d Discovery plugin

To support alternative endpoint-discovery mechanisms, we recently introduced a general `EndpointDiscovery` plugin interface in the EPP framework. Anything that can enumerate endpoints and stream upsert/delete events can be plugged in: a file on disk, Consul, etcd, a custom registry, a cloud provider's service-discovery API, etc.

In the future, the existing Kubernetes watch-based discovery is also expected to move behind this interface, so all discovery paths share the same plugin model.

The interface is small ([`pkg/epp/framework/interface/datalayer/discovery.go`](https://github.com/llm-d/llm-d-router/blob/main/pkg/epp/framework/interface/datalayer/discovery.go)):

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

A plugin tells the EPP about endpoints by calling `Upsert` and `Delete` on the notifier. `Start` runs the plugin's main loop, typically an initial enumeration of the source followed by a watch that emits further `Upsert`/`Delete` calls as endpoints come and go. `Ready()` returns a channel that closes once the initial enumeration has populated the EPP datastore, so request-serving can be gated on a non-empty endpoint pool.

## The file-discovery plugin

The file-discovery plugin uses a plain YAML or JSON file on disk as its source of inference endpoints. The plugin reads the file at startup and optionally watches it (via `fsnotify`) for subsequent changes, emitting `Upsert`/`Delete` events as entries are added, modified, or removed.

When this plugin is used, **the EPP has no dependency on any Kubernetes service or object**: no API server, no watchers, no controller manager, no `InferencePool` CRD, no RBAC, no `kubeconfig`. **It can run on a host without a Kubernetes cluster anywhere in sight.**

The core EPP features are unchanged. KV-cache-utilization scoring, prefix-cache affinity, and Prometheus metrics all work identically.

FlowControl (per-flow queueing, fairness, and admission) also works in file-discovery mode. The priority bands, fairness policies, ordering policies, and usage-limit policy are configured statically in `EndpointPickerConfig.flowControl` (the same block the Kubernetes deployment uses). Without `InferenceObjective` CRDs to consult, per-request priority falls back to a default value; static bands still apply, and a per-request `x-flow-fairness-id` header still drives fairness within a band. Model-name rewriting (driven by `InferenceModelRewrite`) is the one CRD-driven feature that is not yet available outside Kubernetes; a subset of these may move behind plugin interfaces in the future.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/running-llm-d-without-kubernetes/llm-d-file-discovery-arch.png" alt="llm-d file-discovery architecture" style={{width: '60%', height: 'auto', border: '1px solid #888', padding: '4px'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Figure 1: FileDiscovery plugin in llm-d</em></p>
</div>

## Setting it up

### 1. The endpoints file

Save as `/etc/epp/endpoints.yaml`:

```yaml
endpoints:
  - name: vllm-0
    address: "10.0.0.1"
    port: "8000"
    labels:
      model: llama-3-8b

  - name: vllm-1
    address: "10.0.0.2"
    port: "8000"
    labels:
      model: llama-3-8b
```

An endpoint is defined using the following fields:

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Identifier of the endpoint; must be unique within the file. Used as the endpoint key in the EPP datastore and in metrics labels. |
| `address` | yes | The IP address of the inference worker (the host running vLLM). Must be a valid IPv4 address. The EPP uses `address:port` both for routing requests and for scraping the worker's `/metrics` endpoint. |
| `port` | yes | TCP port on `address` where vLLM is listening. Integer 1-65535, written as a string. |
| `namespace` | no | Logical grouping name for the endpoint, retained from the Kubernetes-native data model where endpoints live in a namespace. Outside Kubernetes there is no real namespace concept; this is just a string tag used in the endpoint's identity (`namespace/name`) and in metrics labels. Defaults to `"default"` and most non-Kubernetes deployments can leave it unset. |
| `labels` | no | Arbitrary key/value pairs surfaced to scheduler plugins. Used for things like `llm-d.ai/role: prefill` in P/D setups, or `model: llama-3-8b` for model-aware filters. |

> **Note:** `address` must be a literal IPv4 address. Hostnames are not resolved by the plugin. In environments where you only have hostnames (common in Slurm and Ray), resolve them upstream of writing the file. The Slurm and Ray examples later in this post show how.

### 2. EPP config

Save as `/etc/epp/config.yaml`:

```yaml
apiVersion: llm-d.ai/v1alpha1
kind: EndpointPickerConfig

plugins:
  - name: file-discovery
    type: file-discovery
    parameters:
      path: /etc/epp/endpoints.yaml
      watchFile: true        # optional, default is false. When true, reconcile the datastore whenever the file changes

  - name: max-score-picker
    type: max-score-picker

  - name: single-profile-handler
    type: single-profile-handler

  - name: metrics-source
    type: metrics-data-source

  - name: metrics-extractor
    type: core-metrics-extractor

schedulingProfiles:
  - name: default
    plugins:
      - pluginRef: max-score-picker

dataLayer:
  injectDefaults: false
  discovery:
    pluginRef: file-discovery     # this line loads the file-discovery plugin and effectively switches off the Kubernetes path
  sources:
    - pluginRef: metrics-source
      extractors:
        - pluginRef: metrics-extractor
```

This is a minimal config. For a more complete plugin set (saturation detector, prefix-cache affinity, flow control, etc.), see the [`optimized-baseline` router values](https://github.com/llm-d/llm-d/blob/main/guides/optimized-baseline/router/optimized-baseline.values.yaml) or the [router recipes](https://github.com/llm-d/llm-d/tree/main/guides/recipes/router); the file-discovery section drops in alongside the rest.

Controlling whether the EPP takes the file-discovery path comes down to the `dataLayer.discovery.pluginRef` field. When present, the EPP takes the file-discovery path. When it is absent, the EPP behaves as before and requires Kubernetes.

When `watchFile` is `false`, the file is read once at startup and never re-read. When set to `true`, it enables live reload: the EPP upserts new endpoints and deletes removed ones whenever the file changes, without a restart. This is the key property that makes dynamic environments, where workers appear and disappear, work correctly.

### 3. Start the EPP

```bash
epp \
  --pool-name my-pool \
  --config-file /etc/epp/config.yaml \
  --grpc-port 9002 \
  --grpc-health-port 9003 \
  --metrics-port 9090
```

The binary is built from the `cmd/epp` target of the [`llm-d-router`](https://github.com/llm-d/llm-d-router) repo (build from the latest `main` until the release lands), or pulled from the `ghcr.io/llm-d/llm-d-router-endpoint-picker` image, which will include file-discovery starting with the upcoming **llm-d 0.8** release.

`--pool-name` is optional in file-discovery mode and defaults to `epp` if unset. The value is arbitrary; it does not reference any Kubernetes object and is used only as the pool identifier in metrics and logs. The startup command above passes it explicitly so the metrics labels reflect a meaningful name.

Similarly, `--pool-namespace` defaults to `default` outside Kubernetes (where there is no Downward API); pass it explicitly if you want metrics and logs labeled for your environment. The EPP emits a startup warning if it falls back to the default.

On startup the EPP logs `EPP starting (file discovery mode)` along with the discovery plugin name and the resolved pool name and namespace. If `watchFile: true`, the file-discovery plugin also logs `watching endpoints file for changes`, and re-emits `endpoints file changed, reloading` on each subsequent reload.

### 4. Envoy config

The EPP selects an endpoint but does not proxy traffic itself. You still need Envoy (or a compatible proxy) to accept client requests and forward them to the EPP-selected backend.

The EPP communicates its selection by setting the `x-gateway-destination-endpoint` header on the `ext_proc` response. Envoy's `ORIGINAL_DST` cluster type reads that header and forwards the request to the address it contains. The Envoy config is fully static; no Kubernetes service discovery involved.

This is the same shape as llm-d's **standalone deployment mode**, where the EPP runs alongside an Envoy proxy without a Gateway API controller. The reference is the standalone Helm chart values file:

> [`config/charts/llm-d-router-standalone/values.yaml`](https://github.com/llm-d/llm-d-router/blob/main/config/charts/llm-d-router-standalone/values.yaml). See `router.proxy.presets.envoy.configMap.data` for the upstream-blessed Envoy config. The version below is a trimmed equivalent suitable for running directly on a host.

Save as `/etc/envoy/envoy.yaml`:

```yaml
admin:
  address:
    socket_address: { address: 127.0.0.1, port_value: 19000 }

static_resources:
  listeners:
    - name: inference
      address:
        socket_address: { address: 0.0.0.0, port_value: 8080 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: inference
                route_config:
                  virtual_hosts:
                    - name: inference
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route:
                            cluster: original_destination_cluster
                            timeout: 86400s
                            idle_timeout: 86400s
                http_filters:
                  - name: envoy.filters.http.ext_proc
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.ext_proc.v3.ExternalProcessor
                      grpc_service:
                        envoy_grpc:
                          cluster_name: epp
                          authority: localhost:9002
                        timeout: 10s
                      processing_mode:
                        request_header_mode: SEND
                        response_header_mode: SEND
                        request_body_mode: FULL_DUPLEX_STREAMED
                        response_body_mode: FULL_DUPLEX_STREAMED
                        request_trailer_mode: SEND
                        response_trailer_mode: SEND
                      message_timeout: 1000s
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: epp
      type: STATIC
      connect_timeout: 86400s
      lb_policy: LEAST_REQUEST
      typed_extension_protocol_options:
        envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
          "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
          explicit_http_config:
            http2_protocol_options: {}
      load_assignment:
        cluster_name: epp
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: 127.0.0.1, port_value: 9002 }

    - name: original_destination_cluster
      type: ORIGINAL_DST
      connect_timeout: 1000s
      lb_policy: CLUSTER_PROVIDED
      circuit_breakers:
        thresholds:
          - max_connections: 40000
            max_pending_requests: 40000
            max_requests: 40000
      original_dst_lb_config:
        use_http_header: true
        http_header_name: x-gateway-destination-endpoint
```

For production deployments outside Kubernetes, where there is no kubelet to restart a crashed EPP, it is worth adding a gRPC `health_checks` block to the `epp` cluster so Envoy stops routing to a dead EPP. The standalone chart linked above shows the canonical configuration (10s interval, unhealthy threshold of 3, gRPC health-check service `envoy.service.ext_proc.v3.ExternalProcessor`).

The config above assumes Envoy and the EPP are colocated on the same host (the gRPC link uses `127.0.0.1:9002`, plaintext). When Envoy and the EPP run on separate nodes, for example Envoy on a Slurm head node and the EPP on a service node, the gRPC link traverses the network and should be secured with TLS. Configure an `UpstreamTlsContext` on the `epp` cluster's `transport_socket` (the `llm-d-router-standalone` chart's `transport_socket` block is the reference) and serve gRPC over TLS on the EPP side.

### 5. Start Envoy

```bash
envoy -c /etc/envoy/envoy.yaml
```

Requests to `http://localhost:8080/v1/completions` are now routed by the EPP to one of the vLLM instances.

## P/D disaggregated setup

llm-d also supports **prefill/decode disaggregation** (P/D), where the compute-bound prefill stage and the memory-bandwidth-bound decode stage run on separate workers and the KV cache is transferred between them. The deployment is two pools: prefill workers running vLLM directly, and decode workers running vLLM behind a `pd-sidecar` that orchestrates remote prefill and the KV transfer.

The full deployment recipe (sidecar flags, vLLM `kv-transfer-config`, NIXL/RDMA setup, EPP plugin wiring with `disagg-profile-handler` and `prefix-based-pd-decider`, and the scheduling profiles) is documented upstream and is identical for non-Kubernetes deployments. Use those as the reference:

- [`llm-d/guides/pd-disaggregation`](https://github.com/llm-d/llm-d/tree/main/guides/pd-disaggregation): end-to-end deployment guide.
- [`llm-d-router/docs/disaggregation.md`](https://github.com/llm-d/llm-d-router/blob/main/docs/disaggregation.md): request-lifecycle and component reference.
- [`llm-d/guides/pd-disaggregation/router/pd-disaggregation.values.yaml`](https://github.com/llm-d/llm-d/blob/main/guides/pd-disaggregation/router/pd-disaggregation.values.yaml): canonical P/D EPP config (full plugin set with prefill and decode profiles).

**The only thing this post adds is how to swap Kubernetes-driven discovery for the YAML file.** Two changes:

1. Add the file-discovery plugin and `dataLayer.discovery.pluginRef` to the upstream P/D EPP config (same as in the single-pool setup earlier in this post).
2. Mark each endpoint's role in the YAML with the `llm-d.ai/role` label: `prefill` for prefill workers, `decode` for decode workers. For decode endpoints, the `port` is the pd-sidecar's port, not vLLM's. The router's prefill/decode filters select candidates by this label.

```yaml
endpoints:
  - name: prefill-0
    address: "10.0.0.10"
    port: "8000"            # vLLM directly
    labels:
      llm-d.ai/role: prefill

  - name: decode-0
    address: "10.0.0.20"
    port: "8000"            # the pd-sidecar's port
    labels:
      llm-d.ai/role: decode
```

The full set of role label values (including combined roles like `prefill-decode` and `encode-prefill-decode`) is listed in [`bylabel/roles.go`](https://github.com/llm-d/llm-d-router/blob/main/pkg/epp/framework/plugins/scheduling/filter/bylabel/roles.go).

## Integrating with non-Kubernetes orchestrators

Integrating llm-d in file-discovery mode with any non-Kubernetes environment comes down to two things:

1. **Run the EPP and Envoy** on a node that can reach your vLLM workers, using the configs and commands from the [Setting it up](#setting-it-up) section above.
2. **Generate the endpoints file** in the format shown above, using whatever source knows your worker set: Ray's Python API, Slurm's `$SLURM_JOB_NODELIST`, an inventory tool, a static list, and so on. If the endpoint set needs to change at runtime as workers come and go, set `watchFile: true` and the EPP will reconcile continuously.

The two examples below show one way to generate the endpoint list, for Ray and Slurm.

> **Note:** For deployments with very dynamic endpoint inventories, where workers come and go faster than is comfortable to track via a regenerated file, a dedicated `SlurmDiscovery` or `RayDiscovery` plugin can be implemented against the same `EndpointDiscovery` interface. Such a plugin would talk to the orchestrator's API directly (Ray's Python API or Slurm's controller) and emit `Upsert`/`Delete` events as workers change, without any file in the loop. The file-discovery plugin shown here is the simplest path and works well for most cases; the orchestrator-native plugins are an optimization for the most dynamic scenarios.

### Ray

In a Ray deployment, vLLM workers run as remote processes on Ray cluster nodes. The Ray Python API exposes the current cluster membership, including node IP addresses, so generating the endpoints file is straightforward.

```python
#!/usr/bin/env python3
"""
generate_epp_endpoints.py

Usage: python generate_epp_endpoints.py [vllm_port] [output_path]

Run this after Ray workers are started and before launching the EPP.
"""
import ray
import yaml
import socket
import sys

VLLM_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
OUTPUT    = sys.argv[2] if len(sys.argv) > 2 else "/etc/epp/endpoints.yaml"

ray.init(address="auto")

endpoints = []
for i, node in enumerate(ray.nodes()):
    if not node["Alive"]:
        continue
    # Skip nodes with no GPU resources - they are not running vLLM
    if node.get("Resources", {}).get("GPU", 0) == 0:
        continue

    # NodeManagerAddress is the raylet's bind address - typically already an IP,
    # but resolve defensively in case a Ray deployment exposes it as a hostname.
    address = node["NodeManagerAddress"]
    ip = socket.gethostbyname(address)

    endpoints.append({
        "name":    f"vllm-{i}",
        "address": ip,
        "port":    str(VLLM_PORT),
        "labels":  {
            "ray-node-id": node["NodeID"][:12],
        },
    })

with open(OUTPUT, "w") as f:
    yaml.dump({"endpoints": endpoints}, f, default_flow_style=False)

print(f"Wrote {len(endpoints)} endpoints to {OUTPUT}")
```

This fits naturally into a startup sequence:

```bash
# 1. Start Ray workers and vLLM on GPU nodes (your existing orchestration)
python launch_rollout_workers.py

# 2. Generate the endpoints file
python generate_epp_endpoints.py 8000 /etc/epp/endpoints.yaml

# 3. Start EPP and Envoy
epp \
  --pool-name ray-pool \
  --config-file /etc/epp/config.yaml \
  --grpc-port 9002 --grpc-health-port 9003 --metrics-port 9090 &

envoy -c /etc/envoy/envoy.yaml &
```

Because `watchFile: true` is set in the EPP config, the endpoints file can be regenerated whenever the worker pool changes, for example between RL training rounds when rollout workers are restarted with a new model checkpoint. The EPP reconciles the change without a restart:

```python
# Regenerate after workers are replaced for the next training round
generate_endpoints(new_worker_ips, "/etc/epp/endpoints.yaml.tmp")
os.rename("/etc/epp/endpoints.yaml.tmp", "/etc/epp/endpoints.yaml")
# The atomic rename triggers fsnotify; the EPP updates its pool automatically
```

### Slurm

In a Slurm environment, a batch job requests a fixed set of nodes via `#SBATCH --nodes`. The standard approach is to designate the first node as the "head" (running EPP and Envoy) and use the remaining nodes for vLLM.

Slurm provides the allocated node list in `$SLURM_JOB_NODELIST` as a compact range expression like `node[01-05]`. The `scontrol show hostnames` command expands that into individual hostnames, and a short Python snippet resolves them to IPs for the endpoints file.

```bash
#!/bin/bash
#SBATCH --job-name=llm-d-serve
#SBATCH --nodes=5
#SBATCH --gpus-per-node=8
#SBATCH --time=04:00:00

MODEL=meta-llama/Meta-Llama-3-8B
MODEL_PORT=8000
WORK_DIR=/scratch/$USER/$SLURM_JOB_ID

mkdir -p $WORK_DIR/epp

# --- Resolve node list -------------------------------------------------
ALL_NODES=($(scontrol show hostnames $SLURM_JOB_NODELIST))
HEAD_NODE=${ALL_NODES[0]}
WORKER_NODES=("${ALL_NODES[@]:1}")

# --- Generate endpoints.yaml -------------------------------------------
python3 - <<EOF
import socket, yaml

worker_nodes = "${WORKER_NODES[*]}".split()
port         = $MODEL_PORT
endpoints    = []

for i, host in enumerate(worker_nodes):
    # EPP requires IPs; Slurm gives hostnames
    ip = socket.gethostbyname(host)
    endpoints.append({
        "name":    f"vllm-{i}",
        "address": ip,
        "port":    str(port),
        "labels":  {"slurm-host": host, "rank": str(i)},
    })

with open("$WORK_DIR/epp/endpoints.yaml", "w") as f:
    yaml.dump({"endpoints": endpoints}, f, default_flow_style=False)

print(f"Wrote {len(endpoints)} endpoints")
EOF

# --- Copy EPP and Envoy configs to work dir ----------------------------
cp /path/to/epp-config.yaml $WORK_DIR/epp/config.yaml
cp /path/to/envoy.yaml      $WORK_DIR/envoy.yaml

# Patch the config to point at the correct endpoints file path
sed -i "s|/etc/epp/endpoints.yaml|$WORK_DIR/epp/endpoints.yaml|g" \
    $WORK_DIR/epp/config.yaml

# --- Start vLLM on each worker node ------------------------------------
# Each worker uses all 8 GPUs on its node via tensor parallelism. Adjust
# --tensor-parallel-size to match --gpus-per-node, or split into smaller
# replicas (e.g. 2x TP4) if the model fits.
GPUS_PER_NODE=8
for i in "${!WORKER_NODES[@]}"; do
    srun --ntasks=1 --nodes=1 \
         --nodelist="${WORKER_NODES[$i]}" \
         --gpus-per-node=$GPUS_PER_NODE \
         vllm serve $MODEL \
              --port $MODEL_PORT \
              --tensor-parallel-size $GPUS_PER_NODE &
done

# Wait for vLLM to finish loading weights before EPP starts polling.
# Cap the wait so a stuck worker (OOM, weight download failure, etc.) fails
# the job instead of holding the SBATCH allocation idle until --time expires.
MAX_WAIT_SECS=1800   # 30 minutes
echo "Waiting for vLLM workers to be ready..."
for node in "${WORKER_NODES[@]}"; do
    waited=0
    until curl -sf "http://$node:$MODEL_PORT/health" > /dev/null 2>&1; do
        if (( waited >= MAX_WAIT_SECS )); then
            echo "ERROR: $node not ready after ${MAX_WAIT_SECS}s, aborting" >&2
            exit 1
        fi
        sleep 5
        waited=$(( waited + 5 ))
    done
    echo "  $node ready"
done

# --- Start EPP + Envoy on the head node --------------------------------
srun --ntasks=1 --nodes=1 --nodelist="$HEAD_NODE" \
    epp \
        --pool-name slurm-$SLURM_JOB_ID \
        --config-file $WORK_DIR/epp/config.yaml \
        --grpc-port 9002 \
        --grpc-health-port 9003 \
        --metrics-port 9090 &

srun --ntasks=1 --nodes=1 --nodelist="$HEAD_NODE" \
    envoy -c $WORK_DIR/envoy.yaml &

wait
```

For jobs where the serving pool may change during the allocation (a node fails and is replaced, or model weights are swapped), the endpoints file can be atomically replaced and the EPP will reconcile without downtime:

```bash
python3 regenerate_endpoints.py > $WORK_DIR/epp/endpoints.yaml.tmp
mv $WORK_DIR/epp/endpoints.yaml.tmp $WORK_DIR/epp/endpoints.yaml
```

## Troubleshooting

A few failure modes that trip up first-time deployments:

- **`address` is a hostname, not an IP.** The EPP rejects entries where `address` doesn't parse as an IP. Slurm and Ray surface hostnames, so resolve them with `socket.gethostbyname` (or equivalent) before writing the file.
- **EPP can't reach vLLM's metrics port.** The EPP scrapes `/metrics` on each endpoint at `address:port`. If a host firewall or a network policy blocks that port from the EPP node, scoring plugins silently degrade to default values: routing still works, but KV-cache scoring becomes meaningless. Check the EPP's pool-health metrics on `--metrics-port` to confirm endpoints are reporting.
- **Envoy returns 503 with `no_healthy_upstream`.** Almost always means the EPP gRPC connection is down. Check that the EPP is running on `localhost:9002`, that `--grpc-port` matches Envoy's `authority`, and (if you added the `health_checks` block) that the EPP's gRPC health service is enabled.
- **`watchFile: true` doesn't pick up an edit.** The watcher reacts to fsnotify events on rename/replace, which is what `mv tmp final` produces. Editors that truncate-then-write (some `vim` configurations, certain IDEs) may emit a different event sequence and either double-fire or miss. Always update the file via atomic rename, as both examples in this post do.
- **vLLM hasn't finished loading weights when the EPP starts.** If the EPP scrapes a vLLM that isn't yet serving, the endpoint shows up as unhealthy and gets excluded until the next reconcile. The Slurm script avoids this by polling `/health` on each worker before starting the EPP; do the same in any orchestration that doesn't already gate on readiness.

## Parity with the Kubernetes-native llm-d deployment

The file-discovery plugin gives you most of the llm-d routing stack outside of Kubernetes:

- **KV-cache-utilization scoring**: routes requests away from instances with high cache pressure
- **Prefix-cache affinity**: sends requests with shared prompt prefixes to the instance most likely to have them cached
- **Saturation-based admission**: the saturation detector still gates request admission, so a saturated pool sheds load rather than overloading backends.
- **FlowControl (per-flow queueing and fairness)**: works with priority bands, fairness, and ordering policies configured statically in `EndpointPickerConfig.flowControl`. Without `InferenceObjective` CRDs, per-request priority falls back to the configured default; the `x-flow-fairness-id` request header drives fairness within a band.
- **Prometheus metrics**: EPP exports scheduling and pool health metrics on `--metrics-port`

What is no longer handled by llm-d outside Kubernetes is endpoint lifecycle: there is no automatic deregistration when a vLLM process dies. This responsibility shifts to the surrounding framework or orchestrator (Ray, Slurm, a custom controller, etc.) which needs to detect failed workers and rewrite the endpoints file accordingly. For production deployments, this typically means adding a health-monitoring agent that drops unavailable workers from the file.

## What's next

The file-discovery plugin is the simplest non-Kubernetes integration point. It works well when the worker pool is relatively static and changes infrequently; regenerating the file at those transitions is enough. For environments where the worker set churns more frequently, a static file with periodic regeneration still works but requires external orchestration to keep it in sync.

**Additional / future plugins.** The `EndpointDiscovery` interface is intentionally minimal so more plugins can be added as the need arises. A few directions we expect to see:

- **Orchestrator-native plugins**: a `RayDiscovery` or `SlurmDiscovery` plugin that talks to Ray's Python API or Slurm's controller directly, emitting `Upsert`/`Delete` events as workers change without any file in the loop. Useful for highly dynamic worker pools.
- **Service-registry plugins**: Consul, etcd, or a cloud provider's service-discovery API as the source of endpoints.
- **Migrating Kubernetes discovery to a plugin**: the existing watch-based Kubernetes path is currently wired into the EPP directly. Moving it behind the same `EndpointDiscovery` interface would unify all discovery paths under a single model and remove a special case from the EPP.

**RL integration.** We are currently working on integrating the no-Kubernetes llm-d with RL frameworks that run on Ray and Slurm (VERL, OpenRLHF). Our next blog post will cover that integration and initial results. This will include a custom `EndpointDiscovery` plugin that registers and deregisters endpoints in real time as Ray actors come up and are torn down between training rounds. We will also show how llm-d's prefix-cache routing translates into a concrete throughput benefit for the repeated-prompt patterns typical of RLHF rollouts.

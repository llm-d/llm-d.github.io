---
sidebar_position: 2
---

# Trying llm-d via the Quick Start installer

This guide will walk you through the steps to install and deploy the llm-d quickstart demo on a Kubernetes cluster.

**What is llm-d?**

llm-d is an open source project providing distributed inferencing for GenAI runtimes on any Kubernetes cluster. Its highly performant, scalable architecture helps reduce costs through a spectrum of hardware efficiency improvements. The project prioritizes ease of deployment+use as well as SRE needs + day 2 operations associated with running large GPU clusters.

It includes:

- Prefill/decode disaggregation
- KV Cache distribution, offloading and storage hierarchy
- AI-aware router with plug points for customizable scorers
- Operational telemetry for production, prometheus/grafana
- Kubernetes-based, works on OCP, minikube, and other k8s distributions
- NIXL inference transfer library

[For more information check out the Architecture Documentation](/architecture/00_architecture.md)

## Prerequisites

  Check the [prerequisites](./prerequisites.md) for the [compute resources](./prerequisites.md#compute-resources), and [client configuration](./prerequisites.md#software-prerequisites----client-configuration) required to run this demonstration.

<a name="install"></a>

## llm-d Installation

The llm-d-deployer contains all the helm charts necessary to deploy llm-d. To facilitate the installation of the helm charts, the `llmd-installer.sh` script is provided. This script will populate the necessary manifests in the `manifests` directory.
After this, it will apply all the manifests in order to bring up the cluster.

The llmd-installer.sh script aims to simplify the installation of llm-d using the llm-d-deployer as it's main function.  It scripts as many of the steps as possible to make the installation process more streamlined.  This includes:

- Installing the GAIE infrastructure
- Creating the namespace with any special configurations
- Creating the pull secret to download the images
- Creating storage and downloading the model
- Creating the model service CRDs
- Applying the helm charts
- Deploying the sample app (model service)

It also supports uninstalling the llm-d infrastructure and the sample app.

Before proceeding with the installation, ensure you have completed the prerequisites and are able to issue kubectl commands to your cluster by configuring your `~/.kube/config` file or by using the `oc login` command.

### Usage

The installer needs to be run from the `llm-d-deployer/quickstart` directory.

```bash
./llmd-installer.sh [OPTIONS]
```

### Flags

| Flag                       | Description                                                                                             | Example                                                   |
|----------------------------|---------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| `--hf-token TOKEN`         | HuggingFace API token (or set `HF_TOKEN` env var)                                                       | `./llmd-installer.sh --hf-token "abc123"`                        |
| `--auth-file PATH`         | Path to your registry auth file ig not in one of the two listed files in the auth section of the readme | `./llmd-installer.sh --auth-file ~/.config/containers/auth.json` |
| `--storage-size SIZE`      | Size of storage volume (default: 7Gi)                                                                   | `./llmd-installer.sh --storage-size 15Gi`                        |
| `--storage-class CLASS`    | Storage class to use (default: efs-sc)                                                                  | `./llmd-installer.sh --storage-class ocs-storagecluster-cephfs`  |
| `--namespace NAME`         | Kubernetes namespace to use (default: `llm-d`)                                                          | `./llmd-installer.sh --namespace foo`                            |
| `--values NAME`            | Absolute path to a Helm values.yaml file (default: llm-d-deployer/charts/llm-d/values.yaml)             | `./llmd-installer.sh --values /path/to/values.yaml`              |
| `--uninstall`              | Uninstall llm-d and cleanup resources                                                                   | `./llmd-installer.sh --uninstall`                                |
| `-h`, `--help`             | Show help and exit                                                                                      | `./llmd-installer.sh --help`                                     |

## Examples

### Install llm-d on an Existing Kubernetes Cluster

The storage class used for AWS ec2 is `efs-sc`. Modify [model-storage-rwx-pvc.yaml](../helpers/k8s/model-storage-rwx-pvc.yaml)
for a different type.

```bash
export HF_TOKEN="your-token"
./llmd-installer.sh
```

### Install on OpenShift with OF installed

Before running the installer, ensure you have logged into the cluster.  For example:

```bash
oc login --token=sha256~yourtoken --server=https://api.yourcluster.com:6443
```

The installer will create a ReadWriteMany PVC and download the model to it, if you are using OF, you can pass in the `--storage-class ocs-storagecluster-cephfs` flag.

```bash
export HF_TOKEN="your-token"
./llmd-installer.sh --storage-class ocs-storagecluster-cephfs --storage-size 15Gi
```
<a name="explore"></a>

### Validation

#### A simple request

For GPU-enabled clusters, you can quickly verify the setup. Once both the prefill and
decode pods are running and ready, simply send a curl request to the gateway to confirm that chat
completions are working.  You can execute the `test-request.sh` script to test the chat completions, or run the following on your own.
If everything is working as expected, you should receive a response.  You should also see activity in the epp pod.

```bash
NAMESPACE=llm-d
MODEL_ID=Llama-32-3B-Instruct
GATEWAY_ADDRESS=$(kubectl get gateway -n ${NAMESPACE} | tail -n 1 | awk '{print $3}')
kubectl run --rm -i curl-temp --image=curlimages/curl --restart=Never -- \
  curl -X POST \
  "http://${GATEWAY_ADDRESS}/v1/chat/completions" \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "'${MODEL_ID}'",
    "messages": [{"content": "Who are you?", "role": "user"}],
    "stream": false
  }'
```

For additional troubleshooting, you can check to see if the prefill and decode pods responding to requests.

```bash
NAMESPACE=llm-d
MODEL_ID=Llama-3.2-3B-Instruct
POD_IP=$(kubectl get pods -n ${NAMESPACE} -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.podIP}{"\n"}{end}' | grep decode | awk '{print $2}')
kubectl run --rm -i curl-temp --image=curlimages/curl --restart=Never -- \
  curl -X POST \
  "http://${POD_IP}:8000/v1/chat/completions" \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "'${MODEL_ID}'",
    "messages": [{"content": "Who are you?", "role": "user"}],
    "stream": false
  }'
```

After the p/d pods are running, you can view the models being run on the GPUs on the host to verify activity.

```yaml
nvidia-smi --query-gpu=index,name,utilization.gpu,utilization.memory,memory.used,memory.total --format=csv
```

### Troubleshooting

The various images can take some time to download depending on your connectivity. Watching events
and logs of the prefill and decode pods is a good place to start.

### Uninstall

This will remove llm-d resources from the cluster. This is useful, especially for test/dev if you want to
make a change, simply uninstall and then run the installer again with any changes you make.

```bash
./llmd-installer.sh --uninstall
```

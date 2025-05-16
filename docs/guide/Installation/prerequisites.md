---
sidebar_position: 1
---

# Prerequisites for running llm-d

**Note that these are the prerequisites for running the QuickStart Demo.

## Compute Resources

<a name="hardware"></a>

### Hardware Profiles

The QuickStart has been tested on:

- Minikube on AWS
  - single g6e.12xlarge
- Red Hat OpenShift on AWS
  - 6 x m5.4xlarge
  - 2 x g6e.2xlarge
  - OpenShift 4.17.21
  - NVIDIA GPU Operator 24.9.2
  - OpenShift Data Foundation 4.17.6


### Target Platforms

#### Kubernetes

This can be run on a minimum ec2 node type [g6e.12xlarge](https://aws.amazon.com/ec2/instance-types/g6e/) (4xL40S 48GB but only 2 are used by default) to infer the model meta-llama/Llama-3.2-3B-Instruct that will get spun up.

> ⚠️ If your cluster has no available GPUs, the **prefill** and **decode** pods will remain in **Pending** state.

Verify you have properly installed the container toolkit with the runtime of your choice.

```bash
# Podman
podman run --rm --security-opt=label=disable --device=nvidia.com/gpu=all ubuntu nvidia-smi
# Docker
sudo docker run --rm --runtime=nvidia --gpus all ubuntu nvidia-smi
```

#### OpenShift

- OpenShift - This quickstart was tested on OpenShift 4.18. Older versions may work but have not been tested.
- NVIDIA GPU Operator and NFD Operator - The installation instructions can be found [here](https://docs.nvidia.com/datacenter/cloud-native/openshift/latest/steps-overview.html).
- OpenShift Data Foundation - The installation instructions can be found [here](https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/4.17/html/deploying_and_managing_openshift_data_foundation_using_red_hat_openstack_platform/deploying_openshift_data_foundation_on_red_hat_openstack_platform_in_internal_mode).  OF is not required, but a ReadWriteMany storage class is required.
- NO Service Mesh or Istio installation as it will conflict with the gateway

## Software prerequisites -- Client Configuration

### Required tools

Following prerequisite are required for the installer to work.

- [yq – installation & releases](https://github.com/mikefarah/yq#install)
- [jq – download & install guide](https://stedolan.github.io/jq/download/)
- [git – installation guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Helm – quick-start install](https://helm.sh/docs/intro/install/)
- [Kustomize – official install docs](https://kubectl.docs.kubernetes.io/installation/kustomize/)
- [kubectl – install & setup](https://kubernetes.io/docs/tasks/tools/install-kubectl/)

You can use the installer script that installs all the required dependencies.  Currently only Linux is supported.

```bash
# Currently Linux only
./install-deps.sh
```

### Required credentials and configuration

- [llm-d-deployer GitHub repo – clone here](https://github.com/neuralmagic/llm-d-deployer.git)
- [Quay.io Registry – sign-up & credentials](https://quay.io/)
- [Red Hat Registry – terms & access](https://access.redhat.com/registry/)
- [HuggingFace HF_TOKEN](https://huggingface.co/docs/hub/en/security-tokens) with download access for the model you want to use.  By default the sample application will use [meta-llama/Llama-3.2-3B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct).
  > ⚠️ You may need to visit Hugging Face [meta-llama/Llama-3.2-3B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct) and
  > accept the usage terms to pull this with your HF token if you have not already done so.

Registry Authentication: The installer looks for an auth file in:

```bash
~/.config/containers/auth.json
# or
~/.config/containers/config.json
```

If not found, you can create one with the following commands:

Create with Docker:

```bash
docker --config ~/.config/containers/ login quay.io
docker --config ~/.config/containers/ login registry.redhat.io
```

Create with Podman:

```bash
podman login quay.io --authfile ~/.config/containers/auth.json
podman login registry.redhat.io --authfile ~/.config/containers/auth.json
```



---
sidebar_position: 1
sidebar_label: Prerequisites
---

# Prerequisites for running the llm-d QuickStart


## Client Configuration

### Get the code

Clone the llm-d-deployer repository.

```bash
git clone https://github.com/llm-d/llm-d-deployer.git
```

Navigate to the quickstart directory

```bash
cd llm-d-deployer/quickstart
```

### Required tools

Following prerequisite are required for the installer to work.

- [yq (mikefarah) – installation](https://github.com/mikefarah/yq?tab=readme-ov-file#install)
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

- [llm-d-deployer GitHub repo – clone here](https://github.com/llm-d/llm-d-deployer.git)
- [HuggingFace HF_TOKEN](https://huggingface.co/docs/hub/en/security-tokens) with download access for the model you want to use.  By default the sample application will use [meta-llama/Llama-3.2-3B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct).

> ⚠️ Your Hugging Face account must have access to the model you want to use.  You may need to visit Hugging Face [meta-llama/Llama-3.2-3B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct) and
> accept the usage terms if you have not already done so.

### Target Platforms

Since the llm-d-deployer is based on helm cahrts, llm-d can be deployed on a variety of Kubernetes platforms. As more platforms are supported, the installer will be updated to support them.

Documentation for example cluster setups are provided in the [infra](https://github.com/llm-d/llm-d-deployer/tree/main/quickstart/infra) directory of the llm-d-deployer repository.

- [OpenShift on AWS](https://github.com/llm-d/llm-d-deployer/tree/main/quickstart/infra/openshift-aws.md)


#### Minikube

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

- OpenShift - This quickstart was tested on OpenShift 4.17. Older versions may work but have not been tested.
- NVIDIA GPU Operator and NFD Operator - The installation instructions can be found [here](https://docs.nvidia.com/datacenter/cloud-native/openshift/latest/steps-overview.html).
- NO Service Mesh or Istio installation as Istio CRDs will conflict with the gateway
- Cluster administrator privileges are required to install the llm-d cluster scoped resources

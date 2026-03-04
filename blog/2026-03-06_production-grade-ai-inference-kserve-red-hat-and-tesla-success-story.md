---
title: "Production-Grade AI Inference with KServe, llm-d, and vLLM: A Red Hat and Tesla Success Story"
description: "The collaboration story between Red Hat and Tesla to overcome significant scaling and operational challenges in LLM deployment. It explains how migrating from a simple vLLM deployment to a robust MLOps platform utilizing KServe, llm-d's intelligent routing, and vLLM provides deep customization and improved efficiency through prefix-cache aware routing to maximize GPU utilization."
slug: production-grade-ai-inference-kserve-red-hat-and-tesla-success-story
date: 2026-03-06T09:00

authors:
  - terrytangyuan
  - cabrinha
  - robshaw
  - saikrishna

tags: [blog]
---

# Production-Grade AI Inference with KServe, llm-d, and vLLM: A Red Hat and Tesla Success Story

## The Problem with "Simple" LLM Deployments

Everyone is racing to run Large Language Models (LLMs), in the cloud, on-prem, and even on edge devices. The real challenge, however, isn't the first deployment; it's scaling, managing, and maintaining hundreds of LLMs efficiently. We initially approached this challenge with a straightforward vLLM deployment wrapped in a Kubernetes StatefulSet.

<!-- truncate -->
The approach quickly introduced severe operational bottlenecks:

* **Storage Drag:** Models like Llama 3 can easily reach hundreds of gigabytes in size. Relying on sluggish network storage (NFS) for these massive safetensors was a non-starter.  
* **Infrastructure Lock-in:** Switching to local LVM persistent volumes solved the speed problem but created a rigid node-to-pod affinity. A single hardware failure meant a manual intervention to delete the Persistent Volume Claim (PVC) and reschedule the pod, which is an unacceptable burden for day-2 operations.  
* **Naive Load Balancing:** Beyond the looming retirement of NGINX Ingress Controller, a simple round-robin load-balancing strategy is fundamentally inefficient for LLMs. It fails to utilize the critical **KV-cache** on the GPU, a core feature of vLLM that significantly boosts throughput. In a world where GPU costs are paramount, squeezing efficiency out of every core is non-negotiable.

## The Search for a Superior Operator

We recognized that running LLMs at scale demanded a purpose-built solution, a Kubernetes Operator designed for the intricacies of AI/ML. While some existing projects are clean and functional as a Proof-of-Concept, they lacked the necessary extensibility. Customizing the runtime specification beyond the exposed Custom Resources was a requirement we couldn't compromise on. There are also other tools that offered complexity and robustness but were overly opinionated, catering heavily toward a specific prefill/decode setup. In addition, their strict API contracts didn't align with our need for flexible, customized deployment patterns.

## The Winning Combination: KServe \+ llm-d \+ vLLM

![kserve-architecture](https://github.com/kserve/kserve/blob/master/docs/diagrams/kserve_new.png)

Our journey led us back to the most flexible and powerful solution: [**llm-d**](https://github.com/llm-d/llm-d), powered by [**KServe**](https://github.com/kserve/kserve) and its cutting-edge **Inference Gateway Extension**.

This combination solved every scaling and operational challenge we faced by delivering:

1. **Deep Customization:** The **LLMInferenceService** and **LLMInferenceConfig** objects expose the standard Kubernetes API, allowing us to override the spec precisely where needed. This level of granular control is crucial for tailoring vLLM to specialized hardware or quickly implementing flag changes.  
2. **Intelligent Routing and Efficiency:** By leveraging [**Envoy**](https://www.envoyproxy.io/), [**Envoy AI Gateway**](https://aigateway.envoyproxy.io/), and [**Gateway API Inference Extension**](https://github.com/kubernetes-sigs/gateway-api-inference-extension), we moved far beyond round-robin. This technology enables **prefix-cache aware routing**, ensuring requests are intelligently routed to the correct vLLM instance to maximize KV-cache utilization and drive up GPU efficiency.

TODO(saikrishna): charts on the before --> after with prefix-awarness (pending approval) along with some text/descriptions

## Collaboration for Successful Adoption

This migration from a fragile StatefulSet to a robust, scalable MLOps platform was not a solitary effort. It was a direct result of the powerful collaboration between **Red Hat** and **Tesla**. By combining Red Hat’s deep expertise in enterprise-grade Kubernetes and open-source infrastructure with Tesla’s demanding requirements for high-performance, large-scale AI serving, we successfully integrated and validated the KServe and llm-d solution. This partnership demonstrates how open standards and purpose-built operators are the key to unlocking the true potential of LLMs in production environments.

This collaboration helps identify issues and sparks ideas for new features in KServe ([\#4901](https://github.com/kserve/kserve/issues/4901), [\#4900](https://github.com/kserve/kserve/issues/4900), [\#4898](https://github.com/kserve/kserve/issues/4898), [\#4899](https://github.com/kserve/kserve/issues/4899)). In addition, LLMInferenceService’s storageInitializer field has been [changed to optional](https://github.com/kserve/kserve/pull/4970) to enable the use of RunAI Model Streamer.

The combination of **KServe's** industry-leading standard for model serving, **llm-d's** intelligent routing capabilities, and **vLLM's** high-throughput inference engine provides the best foundation for managing the next generation of AI workloads at enterprise scale.

## Acknowledgement

We’d like to thank everyone from the community who has contributed to the successful adoption of KServe, llm-d, and vLLM in Tesla's production environment. In particular, below is the list of people from Red Hat and Tesla teams who have helped through the process (in alphabetical order).

* **Red Hat team**: Andres Llausas, Bartosz Majsak, Greg Pereira, Pierangelo Di Pilato, Vivek Karunai Kiri Ragavan, Robert Shaw, and Yuan Tang  
* **Tesla team**: Scott Cabrinha and Sai Krishna

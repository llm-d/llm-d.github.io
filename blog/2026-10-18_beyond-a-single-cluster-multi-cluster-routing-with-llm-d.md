---
title: "Beyond a Single Cluster: Multi-Cluster Routing with llm-d"
description: "The llm-d Router Hub adds a cluster-selection layer in front of each cluster's llm-d router, so one entry point can serve requests from inference capacity spread across clusters, regions and providers."
slug: beyond-a-single-cluster-multi-cluster-routing-with-llm-d
date: 2026-10-18T09:00

authors:
  - mohammadnassar
  - ronenkat

tags: [blog, multi-cluster, scheduling, inference]
---

# Beyond a Single Cluster: Multi-Cluster Routing with llm-d

## Inference Doesn't Live in One Place

With the acceleration in demand, enterprises scale and distribute inference beyond single clusters as it no longer provides sufficient capacity, geographic reach, hardware diversity, or required operational resilience. This creates a serving challenge: while inference capacity is distributed, each cluster operates as an independent environment, requiring applications or platform teams to understand where models are deployed, manage separate access paths, and decide whether requests should be served locally or remotely. As deployments expand across clusters, geographies, and providers, this complexity limits scalability and makes available capacity harder to use efficiently.

Enterprises need a unified serving layer that can leverage all available inference capacity, regardless of where it is deployed. Requests should use local clusters when they offer the best locality, latency, or data governance, while seamlessly reaching remote clusters when additional capacity, specialized hardware, regional coverage, or failover is required. Applications should not need to understand the underlying infrastructure topology or implement complex cross-cluster routing logic. At the same time, different clusters should retain their operational independence while exposing their combined capacity through a unified routing layer. It aligns with the vision of **AI Grid**: transforming independent inference deployments into a unified, distributed serving fabric.

The new **llm-d Router Hub** extends llm-d routing from a single cluster to distributed inference environments. The Router Hub provides a unified entry point for inference requests and adds the ability to select among multiple inference clusters before endpoint-level routing begins.

<!-- truncate -->

Within each cluster, llm-d continues to evaluate serving endpoints and select the appropriate destination. Across clusters, the Router Hub determines **which cluster is best positioned to serve the request** based on the available serving environments.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/multi-cluster-routing/router-hub-layers.webp" alt="A request enters the llm-d Router Hub, which forwards it to the local router of Cluster A or Cluster B; each local router then picks one of its model servers" style={{width: '85%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Figure 1. The Router Hub picks a cluster, and that cluster's local llm-d router picks a model server.</em></p>
</div>

This layered routing model allows enterprises to combine local and remote inference capacity across clusters, geographies, and infrastructure providers. Applications retain a simple, consistent serving interface, while the platform gains the flexibility to expand capacity, improve availability, and optimize request placement without exposing infrastructure complexity.

## Adding Multi-Cluster Routing

The llm-d router hub faces new challenges when picking clusters. Cluster-level decisions need to consider factors such as network latency, regional placement, and available capacity across deployments, while endpoint selection continues to focus on choosing the best serving instance within a cluster.

In its recent release, llm-d introduces a Router Hub, a new deployment option and cluster-level features. Rather than extending a single router across multiple clusters, llm-d adds a dedicated global routing layer responsible for cluster selection.

The llm-d router hub acts as a global routing layer for distributed inference deployments. It evaluates available serving clusters and determines where a request should go. Once a cluster is selected, the request is forwarded to that cluster's local llm-d router, which performs endpoint selection exactly as it would in a traditional deployment. This allows existing llm-d routing and scheduling mechanisms to remain unchanged within each cluster while extending routing across the broader deployment.

This creates a clear separation between two different scheduling problems. The llm-d router hub determines how to best utilize distributed inference capacity across clusters, while the local router focuses on selecting the most appropriate serving endpoint within the chosen vLLM or SGLang deployment.

The architectural approach supports the clear separation of cluster operations and distinct failure domains, and simplifies multi-cluster management. In addition, with Multi-Cluster Routing, cluster selection becomes part of the scheduling process, allowing llm-d to evaluate clusters before endpoint selection begins. This transforms Multi-Cluster Routing from a connectivity feature into a distributed scheduling framework capable of operating across an entire fleet of inference deployments.

<div style={{textAlign: 'center', margin: '20px 0'}}>
  <img src="/img/blogs/multi-cluster-routing/router-hub-scheduling.webp" alt="A request enters the llm-d Router Hub from above and passes a filter, a scorer that reads metrics from clusters A, B and C, and a picker; the hub then sends it to one of the three clusters" style={{width: '85%', height: 'auto'}} />
  <p style={{fontSize: '0.9em', marginTop: '8px'}}><em>Figure 2. Inside the Router Hub, clusters go through the same filter, score and pick steps that endpoints go through inside a cluster, with each cluster's metrics feeding the scorer.</em></p>
</div>

The Multi-Cluster [Routing guide](https://github.com/llm-d/llm-d/pull/2600/) (available in llm-d github) shows how to deploy two llm-d inference pools across two Kubernetes clusters and route requests between them using the llm-d Router Hub. It includes a complete example showing cluster registration, routing-policy configuration, and traffic verification across serving clusters.

## Examples of Multi-Cluster Scenarios

Multi-Cluster Routing enables several deployment patterns that are becoming increasingly common in production inference environments.

**Multi-Region Deployments:** Inference infrastructure is often distributed geographically to reduce latency, address locality requirements, and improve resilience. Multi-Cluster Routing enables requests to be routed across regional deployments while presenting a single serving interface.

**Capacity Expansion:** Organizations frequently outgrow a single cluster, e.g., lack of hardware availability, limitations on power and cooling. Multi-Cluster Routing allows additional llm-d deployments to be added as independent serving pools while remaining accessible through a unified routing layer.

**Heterogeneous Infrastructure:** Organizations typically operate multiple hardware generations, and different clusters may be built around different generations of GPUs or accelerators, cost profiles, or workload requirements. For example, one cluster may host large frontier models on top of the line GPUs, while another serves smaller workloads on legacy hardware. Multi-Cluster Routing provides a framework for managing these resources as part of a unified serving platform.

**Operational Isolation:** Teams often require independent operational boundaries for ownership, compliance, security, or lifecycle-management reasons. Multi-Cluster Routing allows independent deployments to remain autonomous while still participating in a shared inference fabric.

## Looking Ahead

With Multi-Cluster Routing llm-d extends beyond the boundaries of a single cluster introducing a new scheduling layer spanning multiple deployments. By enabling cluster selection before endpoint selection, it provides a foundation for operating distributed inference infrastructure as a unified serving platform.

Once multiple clusters can serve a request, a natural question emerges: how should the system choose among them? In a follow-up post, we'll explore how latency-aware routing builds on Multi-Cluster Routing to evaluate routing candidates and guide cluster selection decisions.

## Get Involved with llm-d

* Explore the llm-d Community Quickstart Guide → [Start here](https://github.com/llm-d/llm-d/blob/main/README.md)
* Join our Slack → [Get your invite](https://inviter.co/llm-d-slack) and connect with maintainers and contributors
* Explore the code → [Browse our GitHub organization](https://github.com/llm-d)
* Attend meetings → All meetings are open! Add our [public calendar](https://red.ht/llm-d-public-calendar)

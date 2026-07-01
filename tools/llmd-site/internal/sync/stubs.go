package sync

import (
	"fmt"
	"os"
	"path/filepath"
)

type stubDef struct {
	Path, Title, Desc string
}

func (e *engine) generateStubs() error {
	if !e.m.Stubs.Enabled {
		return nil
	}
	stubs := []stubDef{
		{"resources/gateway/index.md", "Gateway", "Gateway deployment and configuration guides"},
		{"resources/gateway/install-crds.md", "Gateway CRD Installation", "Installing Gateway API and Inference Extension CRDs"},
		{"resources/gateway/istio.md", "Istio", "Deploying llm-d with Istio gateway"},
		{"resources/gateway/gke.md", "GKE", "Deploying llm-d with GKE gateway"},
		{"resources/gateway/agentgateway.md", "Agent Gateway", "Deploying llm-d with Agent Gateway"},
		{"architecture/advanced/batch/index.md", "Batch Processing", "Asynchronous batch inference architecture"},
		{"architecture/advanced/batch/batch-gateway.md", "Batch Gateway", "Gateway for batch inference requests"},
		{"architecture/advanced/batch/async-processor.md", "Async Processor", "Asynchronous request processing component"},
		{"architecture/core/router/epp/datalayer.md", "Data Layer", "EPP data layer architecture"},
		{"architecture/advanced/disaggregation/index.md", "Disaggregation", "Prefill/decode disaggregation architecture"},
		{"architecture/advanced/disaggregation/operations-vllm.md", "vLLM Operations", "vLLM-specific operations for disaggregated serving"},
		{"architecture/advanced/kv-management/index.md", "KV Cache Management", "KV cache optimization and management"},
		{"architecture/advanced/kv-management/prefix-cache-aware-routing.md", "Prefix Cache Aware Routing", "Routing requests to maximize KV cache hits"},
		{"architecture/advanced/kv-management/kv-indexer.md", "KV-Cache Indexer", "Globally consistent KV cache block tracking"},
		{"architecture/advanced/kv-management/kv-offloader.md", "KV Offloader", "Tiered KV cache storage hierarchy"},
		{"architecture/advanced/autoscaling/workload-variant-autoscaling.md", "Workload-Variant Autoscaling", "Signal-aware autoscaler that scales inference workloads on real-time inference metrics rather than generic infra signals."},
		{"architecture/advanced/autoscaling/igw-hpa.md", "EndPoint Picker HPA/KEDA Integration", "EndPoint Picker integration with HorizontalPodAutoscaler and KEDA."},
		{"api-reference/index.md", "API Reference", "API specification and reference documentation"},
		{"api-reference/glossary.md", "Glossary", "Terminology and definitions for llm-d"},
		{"resources/observability/index.md", "Observability", "Metrics, dashboards, and distributed tracing for llm-d"},
		{"resources/observability/setup.md", "Observability Setup", "Prometheus, Grafana, and tracing quickstart for llm-d"},
		{"resources/observability/metrics.md", "Metrics", "Prometheus metrics collection and configuration"},
		{"resources/observability/tracing.md", "Distributed Tracing", "Setting up distributed tracing with OpenTelemetry"},
		{"resources/observability/promql.md", "PromQL Query Reference", "Ready-to-use PromQL queries for llm-d deployments"},
		{"resources/rdma/rdma-configuration.md", "RDMA Configuration", "RDMA network configuration"},
		{"resources/infra-providers/index.md", "Infrastructure Providers", "Kubernetes provider setup and configuration"},
		{"resources/infra-providers/aks.md", "Azure Kubernetes Service", "Deploy llm-d on AKS"},
		{"resources/infra-providers/digitalocean.md", "DigitalOcean Kubernetes", "Deploy llm-d on DigitalOcean"},
		{"resources/infra-providers/gke.md", "Google Kubernetes Engine", "Deploy llm-d on GKE"},
		{"resources/infra-providers/minikube.md", "Minikube", "Deploy llm-d on Minikube"},
		{"resources/infra-providers/openshift.md", "OpenShift", "Deploy llm-d on OpenShift"},
		{"resources/infra-providers/openshift-aws.md", "OpenShift on AWS", "Deploy llm-d on OpenShift on AWS"},
		{"guides/multimodal-serving.md", "Multimodal Serving", "Multimodal serving guide"},
	}
	for _, s := range stubs {
		if err := generateStub(filepath.Join(e.docsDir, filepath.FromSlash(s.Path)), s.Title, s.Desc); err != nil {
			return err
		}
	}
	return nil
}

func generateStub(path, title, desc string) error {
	info, err := os.Stat(path)
	if err == nil && info.Size() > 0 {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	body := fmt.Sprintf(`---
title: %q
description: %q
---

# %s

:::caution Work in Progress
This page is under active development. Content coming soon.
:::
`, title, desc, title)
	return os.WriteFile(path, []byte(body), 0o644)
}

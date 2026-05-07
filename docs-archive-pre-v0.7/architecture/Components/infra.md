---
title: Infrastructure
description: "A helm chart for deploying gateway and gateway related infrastructure assets for llm-d."
sidebar_label: Infrastructure
sidebar_position: 5
keywords: [llm-d, infrastructure, helm chart, gateway, kubernetes]
---


# `llm-d-infra`

This repository provides the Kubernetes infrastructure components, Helm charts, and operational tooling for deploying [llm-d](https://github.com/llm-d/llm-d) - a Kubernetes-native high-performance distributed LLM inference framework.

## What This Repository Contains

**Infrastructure Components:**

- Helm charts for deploying llm-d gateway infrastructure
- Kubernetes Gateway API configurations with support for Istio,
  [agentgateway](https://agentgateway.dev/), and GKE
- `kgateway` compatibility mode for inference, deprecated in favor of
  standalone `agentgateway` and scheduled for removal in the next llm-d release
- Service mesh integration and traffic management policies

**Operational Tooling:**

- Interactive benchmarking and testing utilities
- Smoke testing scripts for deployment validation
- Development helpers and automation tools

## Quick Start

### Prerequisites

- Kubernetes 1.28+ cluster
- Helm 3.10+
- Gateway API v1.4.0+ installed
- Gateway controller (Istio, agentgateway, or GKE) deployed in your cluster
- `kgateway` remains supported as a deprecated compatibility mode and install
  path and will be removed in the next llm-d release in favor of standalone
  `agentgateway`

### Install llm-d Infrastructure

```bash
# Add the Helm repository
helm repo add llm-d-infra https://llm-d-incubation.github.io/llm-d-infra/
helm repo update

# Install the infrastructure components
helm install my-llm-d-infra llm-d-infra/llm-d-infra
```

For detailed configuration options, see the [Helm chart documentation](https://github.com/llm-d-incubation/llm-d-infra/blob/main/charts/llm-d-infra/README.md).

## Documentation and Guides

**Note:** All quickstart guides and user documentation have moved to the main llm-d repository:

- [**Deployment Guides:**](https://github.com/llm-d/llm-d/tree/main/guides)

**This repository contains:**

- [Helm Chart Documentation](https://github.com/llm-d-incubation/llm-d-infra/blob/main/charts/llm-d-infra/README.md)
- [Development Guide](https://github.com/llm-d-incubation/llm-d-infra/blob/main/docs/development.md)

## Contributing

1. **Issues and Features:** Report issues or request features in the [main llm-d repository](https://github.com/llm-d/llm-d/issues)
2. **Infrastructure Changes:** Submit pull requests to this repository for:
   - Helm chart improvements
   - Operational tooling enhancements
   - Infrastructure configuration updates
3. **Development Setup:** See [development documentation](https://github.com/llm-d-incubation/llm-d-infra/blob/main/docs/development.md)

### Code Owners

See [CODEOWNERS](https://github.com/llm-d-incubation/llm-d-infra/blob/main/CODEOWNERS) for component-specific maintainers.

## Releases

- **Helm Charts:** Available via the Helm repository: `helm repo add llm-d-infra https://llm-d-incubation.github.io/llm-d-infra/`

- **Release Notes:** [GitHub releases](https://github.com/llm-d-incubation/llm-d-infra/releases)

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](https://github.com/llm-d-incubation/llm-d-infra/blob/main/LICENSE) file for details.

:::info Content Source
This content is automatically synced from [README.md](https://github.com/llm-d-incubation/llm-d-infra/blob/main/README.md) on the `main` branch of the llm-d-incubation/llm-d-infra repository.

📝 To suggest changes, please [edit the source file](https://github.com/llm-d-incubation/llm-d-infra/edit/main/README.md) or [create an issue](https://github.com/llm-d-incubation/llm-d-infra/issues).
:::


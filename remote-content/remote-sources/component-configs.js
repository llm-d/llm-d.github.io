/**
 * Shared Component Configurations
 * 
 * Central location for all llm-d component definitions used across
 * the documentation system. This eliminates duplication and ensures
 * consistency across different generators.
 */

export const COMPONENT_CONFIGS = [
  {
    name: 'llm-d-inference-scheduler',
    org: 'llm-d',
    branch: 'main',
    description: 'vLLM-optimized inference scheduler with smart load balancing',
    category: 'Core Infrastructure',
    sidebarPosition: 1
  },
  {
    name: 'llm-d-modelservice',
    org: 'llm-d-incubation', 
    branch: 'main',
    description: 'Helm chart for declarative LLM deployment management',
    category: 'Infrastructure Tools',
    sidebarPosition: 2
  },
  {
    name: 'llm-d-routing-sidecar',
    org: 'llm-d',
    branch: 'main', 
    description: 'Reverse proxy for prefill and decode worker routing',
    category: 'Core Infrastructure',
    sidebarPosition: 3
  },
  {
    name: 'llm-d-inference-sim',
    org: 'llm-d',
    branch: 'main',
    description: 'Lightweight vLLM simulator for testing and development',
    category: 'Development Tools',
    sidebarPosition: 4
  },
  {
    name: 'llm-d-infra',
    org: 'llm-d-incubation',
    branch: 'main',
    description: 'Examples, Helm charts, and release assets for llm-d infrastructure',
    category: 'Infrastructure Tools', 
    sidebarPosition: 5
  },
  {
    name: 'llm-d-kv-cache-manager',
    org: 'llm-d',
    branch: 'main',
    description: 'Pluggable service for KV-Cache aware routing and cross-node coordination',
    category: 'Core Infrastructure',
    sidebarPosition: 6
  },
  {
    name: 'llm-d-benchmark', 
    org: 'llm-d',
    branch: 'main',
    description: 'Automated workflow for benchmarking LLM inference performance',
    category: 'Development Tools',
    sidebarPosition: 7
  }
]; 
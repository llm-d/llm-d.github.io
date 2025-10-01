/**
 * Shared Component Configurations
 * 
 * Central location for all llm-d component definitions used across
 * the documentation system. This eliminates duplication and ensures
 * consistency across different generators.
 */

/**
 * Common repository configurations for remote content sources
 * These are frequently used repos that don't fit the component pattern
 */
export const COMMON_REPO_CONFIGS = {
  'llm-d-main': {
    name: 'llm-d',
    org: 'llm-d',
    branch: 'main',
    description: 'Main llm-d repository with core architecture and documentation'
  },
  'llm-d-infra': {
    name: 'llm-d-infra', 
    org: 'llm-d-incubation',
    branch: 'main',
    description: 'Examples, Helm charts, and release assets for llm-d infrastructure'
  }
};

/**
 * Find repository configuration by name from either components or common repos
 * @param {string} repoName - Repository name to find
 * @returns {Object|null} Repository configuration object
 */
export function findRepoConfig(repoName) {
  // Check components first
  const componentConfig = COMPONENT_CONFIGS.find(config => config.name === repoName);
  if (componentConfig) return componentConfig;
  
  // Check common repos
  const commonConfig = Object.values(COMMON_REPO_CONFIGS).find(config => config.name === repoName);
  return commonConfig || null;
}

/**
 * Generate repository URLs from configuration
 * @param {Object} repoConfig - Repository configuration
 * @returns {Object} Object with repoUrl and sourceBaseUrl
 */
export function generateRepoUrls(repoConfig) {
  const { org, name, branch } = repoConfig;
  return {
    repoUrl: `https://github.com/${org}/${name}`,
    sourceBaseUrl: `https://raw.githubusercontent.com/${org}/${name}/${branch}/`
  };
}

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
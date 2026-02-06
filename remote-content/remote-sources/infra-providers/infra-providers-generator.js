/**
 * Dynamic Infra Providers Generator
 * 
 * Automatically discovers and generates infrastructure provider pages from the llm-d repository.
 * This syncs provider-specific documentation for deploying llm-d on different infrastructure.
 * 
 * Infra provider docs are synced from the main branch to always show the latest development content.
 */

import { createContentWithSource } from '../utils.js';
import { findRepoConfig, generateRepoUrls } from '../component-configs.js';
import { getRepoTransform } from '../repo-transforms.js';

// Get repository configuration for the main llm-d repo
const repoConfig = findRepoConfig('llm-d');
const { repoUrl, sourceBaseUrl, ref } = generateRepoUrls(repoConfig);

// Create a content transform using main branch
const transform = getRepoTransform(repoConfig.org, repoConfig.name);
const contentTransform = (content, sourcePath) => transform(content, { 
  repoUrl, 
  branch: ref,  // Always 'main'
  org: repoConfig.org, 
  name: repoConfig.name, 
  sourcePath 
});

/**
 * Configuration for infrastructure providers
 * These are the provider-specific README.md files in docs/infra-providers/
 * with their descriptive titles and sidebar positions
 */
const INFRA_PROVIDERS = [
  {
    dirName: 'aks',
    title: 'Azure Kubernetes Service',
    description: 'Deploy llm-d distributed LLM inference on Azure Kubernetes Service with provider-specific configuration and best practices',
    sidebarPosition: 1,
    keywords: ['llm-d', 'Azure', 'AKS', 'kubernetes', 'deployment', 'Azure Kubernetes Service']
  },
  {
    dirName: 'digitalocean',
    title: 'DigitalOcean Kubernetes Service (DOKS)',
    description: 'Deploy llm-d on DigitalOcean Kubernetes Service with optimized configuration for distributed LLM inference workloads',
    sidebarPosition: 2,
    keywords: ['llm-d', 'DigitalOcean', 'DOKS', 'kubernetes', 'deployment']
  },
  {
    dirName: 'gke',
    title: 'Google Kubernetes Engine (GKE)',
    description: 'Deploy llm-d on Google Kubernetes Engine with support for GPUs and TPUs, including GKE-specific networking configuration',
    sidebarPosition: 3,
    keywords: ['llm-d', 'Google Cloud', 'GKE', 'kubernetes', 'deployment', 'Google Kubernetes Engine']
  }
];

/**
 * Create plugin configurations for all infra providers
 */
function createInfraProviderPlugins() {
  const plugins = [];
  
  // Add individual provider pages
  INFRA_PROVIDERS.forEach((provider) => {
    const sourceFile = `docs/infra-providers/${provider.dirName}/README.md`;
    
    plugins.push([
      'docusaurus-plugin-remote-content',
      {
        name: `infra-provider-${provider.dirName}`,
        sourceBaseUrl,
        outDir: 'docs/guide/InfraProviders',
        documents: [sourceFile],
        noRuntimeDownloads: false,
        performCleanup: true,
        
        modifyContent(filename, content) {
          if (filename === sourceFile) {
            return createContentWithSource({
              title: provider.title,
              description: provider.description,
              sidebarLabel: provider.title,
              sidebarPosition: provider.sidebarPosition,
              filename: sourceFile,
              newFilename: `${provider.dirName}.md`,
              repoUrl,
              branch: ref,  // Always 'main'
              content,
              contentTransform,
              keywords: provider.keywords
            });
          }
          return undefined;
        },
      },
    ]);
  });
  
  return plugins;
}

// Export all infra provider plugins
export default createInfraProviderPlugins();


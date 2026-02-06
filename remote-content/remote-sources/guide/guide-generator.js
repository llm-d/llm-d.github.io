/**
 * Dynamic Guide Generator
 * 
 * Automatically discovers and generates guide pages from the llm-d repository's guides directory.
 * This replaces the individual guide files and consolidates all guide content management.
 * 
 * Guides are synced from the main branch to always show the latest development content.
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
 * Configuration for special guide mappings
 */
const SPECIAL_GUIDES = {
  'prerequisites': {
    sourceFile: 'guides/prereq/infrastructure/README.md',
    title: 'Prerequisites',
    description: 'Infrastructure and cluster requirements for llm-d: Kubernetes 1.29+, datacenter accelerators, fast networking, and vLLM configuration',
    sidebarLabel: 'Prerequisites',
    sidebarPosition: 1,
    outputFile: 'prerequisites.md',
    keywords: ['llm-d', 'prerequisites', 'installation', 'setup', 'requirements']
  },
  'quickstart': {
    sourceFile: 'guides/QUICKSTART.md',
    title: 'QuickStart',
    description: 'Step-by-step guide to install and deploy llm-d on Kubernetes with vLLM, configure gateways, and validate your deployment',
    sidebarLabel: 'QuickStart',
    sidebarPosition: 2,
    outputFile: 'quickstart.md',
    keywords: ['llm-d', 'quickstart', 'getting started', 'tutorial', 'installation']
  },
  'guide': {
    sourceFile: 'guides/README.md',
    title: 'Guides',
    description: 'Getting started with llm-d and exploring well-lit paths for different use cases',
    sidebarLabel: 'Guides',
    sidebarPosition: 1,
    outputFile: 'guide.md',
    customTransform: contentTransform,
    keywords: ['llm-d', 'guides', 'documentation', 'tutorials', 'distributed inference']
  }
};

/**
 * Configuration for dynamic guide discovery
 * These are the directories in guides/ that contain README.md files
 * with their descriptive titles and sidebar positions
 */
const DYNAMIC_GUIDES = [
  {
    dirName: 'inference-scheduling',
    title: 'Intelligent Inference Scheduling',
    description: 'Deploy vLLM with intelligent load balancing and prefix-cache aware routing to reduce latency and increase throughput on Kubernetes',
    sidebarPosition: 3,
    keywords: ['llm-d', 'inference scheduling', 'load balancing', 'intelligent scheduling', 'request routing']
  },
  {
    dirName: 'tiered-prefix-cache',
    title: 'Prefix Cache Offloading',
    description: 'Offload KV cache to CPU memory with vLLM to extend GPU capacity and serve longer contexts in distributed LLM inference',
    sidebarPosition: 4,
    targetFilename: 'tiered-prefix-cache/index.md',
    keywords: ['llm-d', 'prefix cache', 'cache offloading', 'tiered cache', 'KV cache']
  },
  {
    dirName: 'tiered-prefix-cache/cpu',
    title: 'Prefix Cache Offloading - CPU',
    description: 'Offload KV cache to CPU memory with vLLM to extend GPU capacity and serve longer contexts in distributed LLM inference',
    sidebarPosition: 5,
    targetFilename: 'tiered-prefix-cache/cpu.md',
    keywords: ['llm-d', 'CPU cache', 'prefix cache', 'cache offloading', 'KV cache']
  },
  {
    dirName: 'pd-disaggregation',
    title: 'Prefill/Decode Disaggregation',
    description: 'Separate prefill and decode operations with vLLM disaggregation to improve latency and throughput for large models like GPT-OSS-120B',
    sidebarPosition: 6,
    keywords: ['llm-d', 'prefill', 'decode', 'disaggregation', 'performance optimization']
  },
  {
    dirName: 'precise-prefix-cache-aware',
    title: 'Precise Prefix Cache Aware Routing',
    description: 'Enable precise prefix cache routing with vLLM KV-Events to increase cache hit rates and eliminate indexing services overhead',
    sidebarPosition: 7,
    keywords: ['llm-d', 'cache-aware routing', 'prefix cache', 'request routing', 'optimization']
  },
  {
    dirName: 'predicted-latency-based-scheduling',
    title: 'Predicted Latency Based Load Balancing',
    description: 'Experimental SLO-aware routing with ML-based latency prediction to meet service level objectives and optimize request placement',
    sidebarPosition: 8,
    keywords: ['llm-d', 'latency prediction', 'SLO', 'load balancing', 'experimental']
  },
  {
    dirName: 'wide-ep-lws',
    title: 'Wide Expert Parallelism with LeaderWorkerSet',
    description: 'Deploy large MoE models like DeepSeek-R1 using wide expert parallelism and LeaderWorkerSet across multi-node GPU clusters',
    sidebarPosition: 9,
    keywords: ['llm-d', 'expert parallelism', 'LeaderWorkerSet', 'wide EP', 'distributed inference']
  },
  {
    dirName: 'simulated-accelerators',
    title: 'Accelerator Simulation',
    description: 'Test llm-d at scale without GPUs using the inference simulator to validate autoscaling, scheduling, and system behavior',
    sidebarPosition: 10,
    keywords: ['llm-d', 'accelerator simulation', 'GPU simulation', 'testing', 'development']
  }
];

/**
 * Create plugin configurations for all guides
 */
function createGuidePlugins() {
  const plugins = [];
  
  // Add special guides (prerequisites and main guide)
  Object.entries(SPECIAL_GUIDES).forEach(([name, config]) => {
    plugins.push([
      'docusaurus-plugin-remote-content',
      {
        name: `guide-${name}`,
        sourceBaseUrl,
        outDir: name === 'guide' ? 'docs/guide' : 'docs/guide/Installation',
        documents: [config.sourceFile],
        noRuntimeDownloads: false,
        performCleanup: true,
        
        modifyContent(filename, content) {
          if (filename === config.sourceFile) {
            return createContentWithSource({
              title: config.title,
              description: config.description,
              sidebarLabel: config.sidebarLabel,
              sidebarPosition: config.sidebarPosition,
              filename: config.sourceFile,
              newFilename: config.outputFile,
              repoUrl,
              branch: ref,  // Always 'main'
              content,
              contentTransform: config.customTransform || contentTransform,
              keywords: config.keywords
            });
          }
          return undefined;
        },
      },
    ]);
  });
  
  // Add dynamic guides
  DYNAMIC_GUIDES.forEach((guide) => {
    const sourceFile = `guides/${guide.dirName}/README.md`;
    const targetFilename = guide.targetFilename || `${guide.dirName}.md`;
    
    plugins.push([
      'docusaurus-plugin-remote-content',
      {
        name: `guide-${guide.dirName}`,
        sourceBaseUrl,
        outDir: 'docs/guide/Installation',
        documents: [sourceFile],
        noRuntimeDownloads: false,
        performCleanup: true,
        
        modifyContent(filename, content) {
          if (filename === sourceFile) {
            return createContentWithSource({
              title: guide.title,
              description: guide.description,
              sidebarLabel: guide.title,
              sidebarPosition: guide.sidebarPosition,
              filename: sourceFile,
              newFilename: targetFilename,
              repoUrl,
              branch: ref,  // Always 'main'
              content,
              contentTransform,
              keywords: guide.keywords
            });
          }
          return undefined;
        },
      },
    ]);
  });
  
  return plugins;
}

// Export all guide plugins
export default createGuidePlugins();

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
    description: 'Prerequisites for running the llm-d QuickStart',
    sidebarLabel: 'Prerequisites',
    sidebarPosition: 1,
    outputFile: 'prerequisites.md',
    keywords: ['llm-d', 'prerequisites', 'installation', 'setup', 'requirements']
  },
  'quickstart': {
    sourceFile: 'guides/QUICKSTART.md',
    title: 'QuickStart',
    description: 'QuickStart guide for llm-d',
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
    description: 'Well-lit path for intelligent inference scheduling with load balancing',
    sidebarPosition: 3,
    keywords: ['llm-d', 'inference scheduling', 'load balancing', 'intelligent scheduling', 'request routing']
  },
  {
    dirName: 'tiered-prefix-cache',
    title: 'Prefix Cache Offloading',
    description: 'Well-lit path for separating prefill and decode operations',
    sidebarPosition: 4,
    targetFilename: 'tiered-prefix-cache/index.md',
    keywords: ['llm-d', 'prefix cache', 'cache offloading', 'tiered cache', 'KV cache']
  },
  {
    dirName: 'tiered-prefix-cache/cpu',
    title: 'Prefix Cache Offloading - CPU',
    description: 'Well-lit path for separating prefill and decode operations',
    sidebarPosition: 5,
    targetFilename: 'tiered-prefix-cache/cpu.md',
    keywords: ['llm-d', 'CPU cache', 'prefix cache', 'cache offloading', 'KV cache']
  },
  {
    dirName: 'pd-disaggregation',
    title: 'Prefill/Decode Disaggregation',
    description: 'Well-lit path for separating prefill and decode operations',
    sidebarPosition: 6,
    keywords: ['llm-d', 'prefill', 'decode', 'disaggregation', 'performance optimization']
  },
  {
    dirName: 'precise-prefix-cache-aware',
    title: 'Precise Prefix Cache Aware Routing',
    description: 'Feature guide for precise prefix cache aware routing',
    sidebarPosition: 7,
    keywords: ['llm-d', 'cache-aware routing', 'prefix cache', 'request routing', 'optimization']
  },
  {
    dirName: 'wide-ep-lws',
    title: 'Wide Expert Parallelism with LeaderWorkerSet',
    description: 'Well-lit path for wide expert parallelism using LeaderWorkerSet',
    sidebarPosition: 8,
    keywords: ['llm-d', 'expert parallelism', 'LeaderWorkerSet', 'wide EP', 'distributed inference']
  },
  {
    dirName: 'simulated-accelerators',
    title: 'Accelerator Simulation',
    description: 'Feature guide for llm-d accelerator simulation',
    sidebarPosition: 9,
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

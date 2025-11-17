/**
 * Dynamic Guide Generator
 * 
 * Automatically discovers and generates guide pages from the llm-d repository's guides directory.
 * This replaces the individual guide files and consolidates all guide content management.
 * 
 * Guides are synced from the specific release version defined in components-data.yaml,
 * not from the main branch. This ensures documentation matches the released version.
 */

import { createContentWithSource } from '../utils.js';
import { findRepoConfig, RELEASE_INFO } from '../component-configs.js';
import { getRepoTransform } from '../repo-transforms.js';

// Get repository configuration for the main llm-d repo
const repoConfig = findRepoConfig('llm-d');

// Use the release version from YAML instead of the branch
// const releaseVersion = RELEASE_INFO.version;
const releaseVersion = "liu-cong-debug"
const repoUrl = `https://github.com/${repoConfig.org}/${repoConfig.name}`;
const sourceBaseUrl = `https://raw.githubusercontent.com/${repoConfig.org}/${repoConfig.name}/${releaseVersion}/`;
// const sourceBaseUrl = repoUrl

// Create a custom transform that uses the release version instead of 'main'
const transform = getRepoTransform(repoConfig.org, repoConfig.name);
const contentTransform = (content, sourcePath) => transform(content, { 
  repoUrl, 
  branch: releaseVersion,  // Use release version, not 'main'
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
    outputFile: 'prerequisites.md'
  },
  'quickstart': {
    sourceFile: 'guides/QUICKSTART.md',
    title: 'QuickStart',
    description: 'QuickStart guide for llm-d',
    sidebarLabel: 'QuickStart',
    sidebarPosition: 2,
    outputFile: 'quickstart.md'
  },
  'guide': {
    sourceFile: 'guides/README.md',
    title: 'Guides',
    description: 'Getting started with llm-d and exploring well-lit paths for different use cases',
    sidebarLabel: 'Guides',
    sidebarPosition: 1,
    outputFile: 'guide.md',
    customTransform: contentTransform
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
    sidebarPosition: 3
  },
  {
    dirName: 'prefix-cache-storage',
    title: 'Prefix Cache Storage',
    description: 'Well-lit path for separating prefill and decode operations',
    sidebarPosition: 4
  },
  {
    dirName: 'prefix-cache-storage/cpu',
    title: 'Prefix Cache Storage - CPU',
    description: 'Well-lit path for separating prefill and decode operations',
    sidebarPosition: 4
  },
  {
    dirName: 'pd-disaggregation', 
    title: 'Prefill/Decode Disaggregation',
    description: 'Well-lit path for separating prefill and decode operations',
    sidebarPosition: 4
  },
  {
    dirName: 'precise-prefix-cache-aware',
    title: 'Precise Prefix Cache Aware Routing',
    description: 'Feature guide for precise prefix cache aware routing',
    sidebarPosition: 5
  },
  {
    dirName: 'simulated-accelerators',
    title: 'Accelerator Simulation',
    description: 'Feature guide for llm-d accelerator simulation',
    sidebarPosition: 6
  },
  {
    dirName: 'wide-ep-lws',
    title: 'Wide Expert Parallelism with LeaderWorkerSet',
    description: 'Well-lit path for wide expert parallelism using LeaderWorkerSet',
    sidebarPosition: 7
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
              branch: releaseVersion,
              content,
              contentTransform: config.customTransform || contentTransform
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
              newFilename: `${guide.dirName}.md`,
              repoUrl,
              branch: releaseVersion,
              content,
              contentTransform
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

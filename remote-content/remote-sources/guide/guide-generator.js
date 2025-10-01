/**
 * Dynamic Guide Generator
 * 
 * Automatically discovers and generates guide pages from the llm-d repository's guides directory.
 * This replaces the individual guide files and consolidates all guide content management.
 * 
 * Future Versioning Support:
 * - When implementing Docusaurus versioning, this generator can be extended to:
 *   1. Accept version/branch parameters in the configuration
 *   2. Generate versioned outDir paths (e.g., 'docs/1.0/guide/Installation')
 *   3. Update sourceBaseUrl to point to specific tags/releases
 *   4. Maintain separate guide configurations per version
 * - The internal link mapping in repo-transforms.js will automatically handle
 *   version-aware routing between guides within the same version
 */

import { createContentWithSource, createStandardTransform } from '../utils.js';
import { findRepoConfig, generateRepoUrls } from '../component-configs.js';

// Get repository configuration for the main llm-d repo
const repoConfig = findRepoConfig('llm-d');
const { repoUrl, sourceBaseUrl } = generateRepoUrls(repoConfig);
const contentTransform = createStandardTransform('llm-d');

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
              branch: repoConfig.branch,
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
              branch: repoConfig.branch,
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

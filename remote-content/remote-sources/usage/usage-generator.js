/**
 * Usage Documentation Generator
 * 
 * Automatically syncs post-deployment operational documentation from the llm-d 
 * repository's docs directory. These guides cover inference operations, gateway 
 * configuration, monitoring, and other day-to-day usage topics.
 * 
 * Usage docs are synced from the specific release version defined in components-data.yaml,
 * not from the main branch. This ensures documentation matches the released version.
 */

import { createContentWithSource } from '../utils.js';
import { findRepoConfig, RELEASE_INFO } from '../component-configs.js';
import { getRepoTransform } from '../repo-transforms.js';

// Get repository configuration for the main llm-d repo
const repoConfig = findRepoConfig('llm-d');

// Use the release version from YAML instead of the branch
const releaseVersion = RELEASE_INFO.version;
const repoUrl = `https://github.com/${repoConfig.org}/${repoConfig.name}`;
const sourceBaseUrl = `https://raw.githubusercontent.com/${repoConfig.org}/${repoConfig.name}/${releaseVersion}/`;

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
 * Configuration for usage documentation
 * These documents cover post-deployment operations and usage
 */
const USAGE_DOCS = [
  {
    sourceFile: 'docs/getting-started-inferencing.md',
    title: 'Getting Started with Inference',
    description: 'How to send inference requests to your deployed llm-d model servers',
    sidebarLabel: 'Getting Started with Inference',
    sidebarPosition: 1,
    outputFile: 'getting-started-inferencing.md'
  },
  {
    sourceFile: 'docs/customizing-your-gateway.md',
    title: 'Customizing Your Gateway',
    description: 'How to configure and customize the inference gateway',
    sidebarLabel: 'Customizing Your Gateway',
    sidebarPosition: 2,
    outputFile: 'customizing-your-gateway.md'
  },
  {
    sourceFile: 'docs/readiness-probes.md',
    title: 'Readiness Probes',
    description: 'Configuring health checks and readiness probes for model servers',
    sidebarLabel: 'Readiness Probes',
    sidebarPosition: 3,
    outputFile: 'readiness-probes.md'
  }
];

/**
 * Create plugin configurations for all usage docs
 */
function createUsagePlugins() {
  const plugins = [];
  
  USAGE_DOCS.forEach((doc) => {
    plugins.push([
      'docusaurus-plugin-remote-content',
      {
        name: `usage-${doc.outputFile.replace('.md', '')}`,
        sourceBaseUrl,
        outDir: 'docs/usage',
        documents: [doc.sourceFile],
        noRuntimeDownloads: false,
        performCleanup: true,
        
        modifyContent(filename, content) {
          if (filename === doc.sourceFile) {
            return createContentWithSource({
              title: doc.title,
              description: doc.description,
              sidebarLabel: doc.sidebarLabel,
              sidebarPosition: doc.sidebarPosition,
              filename: doc.sourceFile,
              newFilename: doc.outputFile,
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

// Export all usage plugins
export default createUsagePlugins();


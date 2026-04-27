/**
 * Usage Documentation Generator
 * 
 * Automatically syncs post-deployment operational documentation from the llm-d 
 * repository's docs directory. These guides cover inference operations, gateway 
 * configuration, monitoring, and other day-to-day usage topics.
 * 
 * Usage docs are synced from the main branch to always show the latest development content.
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
 * Configuration for usage documentation
 * These documents cover post-deployment operations and usage
 */
const USAGE_DOCS = [
  {
    sourceFile: 'docs/readiness-probes.md',
    title: 'Readiness Probes',
    description: 'Configure model-aware Kubernetes readiness probes to ensure vLLM pods only receive traffic when models are fully loaded',
    sidebarLabel: 'Readiness Probes',
    sidebarPosition: 3,
    outputFile: 'readiness-probes.md',
    keywords: ['llm-d', 'readiness probes', 'health checks', 'kubernetes', 'monitoring']
  },
  {
    sourceFile: 'docs/monitoring/README.md',
    title: 'Monitoring and Observability',
    description: 'Enable Prometheus metrics and Grafana dashboards for llm-d deployments to monitor vLLM performance and system health',
    sidebarLabel: 'Monitoring and Observability',
    sidebarPosition: 4,
    outputFile: 'monitoring.md',
    keywords: ['llm-d', 'monitoring', 'observability', 'metrics', 'dashboards', 'prometheus']
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
              branch: ref,  // Always 'main'
              content,
              contentTransform,
              keywords: doc.keywords
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


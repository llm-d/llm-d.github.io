/**
 * Guide Precise Prefix Cache Aware Remote Content
 * 
 * Downloads the precise-prefix-cache-aware README.md file from the llm-d-infra repository
 * and transforms it into docs/guide/Installation/precise-prefix-cache-aware.md
 */

import { createContentWithSource, createStandardTransform } from '../utils.js';
import { findRepoConfig, generateRepoUrls } from '../component-configs.js';

// Get repository configuration from centralized config
const repoConfig = findRepoConfig('llm-d-infra');
const { repoUrl, sourceBaseUrl } = generateRepoUrls(repoConfig);
const contentTransform = createStandardTransform('llm-d-infra');

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration - all URLs generated from centralized config
    name: 'guide-precise-prefix-cache-aware',
    sourceBaseUrl,
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/examples/precise-prefix-cache-aware/README.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'quickstart/examples/precise-prefix-cache-aware/README.md') {
        return createContentWithSource({
          title: 'Precise Prefix Cache Aware Example',
          description: 'Example implementation of precise prefix cache awareness in llm-d',
          sidebarLabel: 'Precise Prefix Cache Aware',
          sidebarPosition: 5,
          filename: 'quickstart/examples/precise-prefix-cache-aware/README.md',
          newFilename: 'precise-prefix-cache-aware.md',
          repoUrl,
          branch: repoConfig.branch,
          content,
          contentTransform
        });
      }
      return undefined;
    },
  },
];
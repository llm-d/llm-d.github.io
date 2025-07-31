/**
 * Main Architecture README Remote Content
 * 
 * Downloads the README.md file from the main llm-d repository
 * and transforms it into docs/architecture/00_architecture.mdx
 */

import { createContentWithSource, createStandardTransform } from '../utils.js';
import { findRepoConfig, generateRepoUrls } from '../component-configs.js';

// Get repository configuration from centralized config
const repoConfig = findRepoConfig('llm-d');
const { repoUrl, sourceBaseUrl } = generateRepoUrls(repoConfig);
const contentTransform = createStandardTransform('llm-d');

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration - all URLs generated from centralized config
    name: 'architecture-main',
    sourceBaseUrl,
    outDir: 'docs/architecture',
    documents: ['README.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'README.md') {
        return createContentWithSource({
          title: 'llm-d Architecture',
          description: 'Overview of llm-d distributed inference architecture and components',
          sidebarLabel: 'llm-d Architecture',
          sidebarPosition: 0,
          filename: 'README.md',
          newFilename: 'architecture.mdx',
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
/**
 * Code of Conduct Remote Content
 * 
 * Downloads the CODE_OF_CONDUCT.md file from the llm-d repository
 * and transforms it into docs/community/code-of-conduct.md
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
    name: 'code-of-conduct',
    sourceBaseUrl,
    outDir: 'docs/community',
    documents: ['CODE_OF_CONDUCT.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'CODE_OF_CONDUCT.md') {
        return createContentWithSource({
          title: 'Code of Conduct',
          description: 'Code of Conduct and Community Guidelines for llm-d',
          sidebarLabel: 'Code of Conduct',
          sidebarPosition: 3,
          filename: 'CODE_OF_CONDUCT.md',
          newFilename: 'code-of-conduct.md',
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
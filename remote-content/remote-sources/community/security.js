/**
 * Security Policy Remote Content
 * 
 * Downloads the SECURITY.md file from the llm-d repository
 * and transforms it into docs/community/security.md
 */

import { createContentWithSource } from '../utils.js';
import { findRepoConfig, generateRepoUrls } from '../component-configs.js';

// Get repository configuration from centralized config
const repoConfig = findRepoConfig('llm-d');
const { repoUrl, sourceBaseUrl } = generateRepoUrls(repoConfig);

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration - all URLs generated from centralized config
    name: 'security-policy',
    sourceBaseUrl,
    outDir: 'docs/community',
    documents: ['SECURITY.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'SECURITY.md') {
        return createContentWithSource({
          title: 'Security Policy',
          description: 'Security vulnerability reporting and disclosure policy for llm-d',
          sidebarLabel: 'Security Policy',
          sidebarPosition: 3,
          filename: 'SECURITY.md',
          newFilename: 'security.md',
          repoUrl,
          branch: repoConfig.branch,
          content,
          // No additional content transformations needed for SECURITY.md
          contentTransform: (content) => content
        });
      }
      return undefined;
    },
  },
]; 
/**
 * Contributing Guide Remote Content
 * 
 * Downloads the CONTRIBUTING.md file from the llm-d repository
 * and transforms it into docs/community/contribute.md
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
    name: 'contribute-guide',
    sourceBaseUrl,
    outDir: 'docs/community',
    documents: ['CONTRIBUTING.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'CONTRIBUTING.md') {
        return createContentWithSource({
          title: 'Contributing to llm-d',
          description: 'Guidelines for contributing to the llm-d project',
          sidebarLabel: 'Contributing',
          sidebarPosition: 1,
          filename: 'CONTRIBUTING.md',
          newFilename: 'contribute.md',
          repoUrl,
          branch: repoConfig.branch,
          content,
          // Fix relative links in the content
          contentTransform: (content) => content
            .replace(/\(CODE_OF_CONDUCT\.md\)/g, '(code-of-conduct)')
            .replace(/\(SIGS\.md\)/g, '(sigs)')
        });
      }
      return undefined;
    },
  },
]; 
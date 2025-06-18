/**
 * Code of Conduct Remote Content
 * 
 * Downloads the CODE_OF_CONDUCT.md file from the llm-d repository
 * and transforms it into docs/community/code-of-conduct.md
 */

import { createContentWithSource } from './utils.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'code-of-conduct',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d/llm-d/dev/',
    outDir: 'docs/community',
    documents: ['CODE_OF_CONDUCT.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'CODE_OF_CONDUCT.md') {
        return createContentWithSource({
          title: 'Code of Conduct',
          description: 'Code of Conduct and Community Guidelines for llm-d',
          sidebarLabel: 'Code of Conduct',
          sidebarPosition: 2,
          filename: 'CODE_OF_CONDUCT.md',
          newFilename: 'code-of-conduct.md',
          repoUrl: 'https://github.com/llm-d/llm-d',
          branch: 'dev',
          content
        });
      }
      return undefined;
    },
  },
]; 
/**
 * Security Policy Remote Content
 * 
 * Downloads the SECURITY.md file from the llm-d repository
 * and transforms it into docs/community/security.md
 */

import { createContentWithSource } from './utils.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'security-policy',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d/llm-d/dev/',
    outDir: 'docs/community',
    documents: ['SECURITY.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build
    
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
          repoUrl: 'https://github.com/llm-d/llm-d',
          branch: 'dev',
          content,
          // No additional content transformations needed for SECURITY.md
          contentTransform: (content) => content
        });
      }
      return undefined;
    },
  },
]; 
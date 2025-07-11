/**
 * Contributing Guide Remote Content
 * 
 * Downloads the CONTRIBUTING.md file from the llm-d repository
 * and transforms it into docs/community/contribute.md
 */

import { createContentWithSource } from './utils.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'contribute-guide',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d/llm-d/dev/',
    outDir: 'docs/community',
    documents: ['CONTRIBUTING.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build
    
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
          repoUrl: 'https://github.com/llm-d/llm-d',
          branch: 'dev',
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
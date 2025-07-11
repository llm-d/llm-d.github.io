/**
 * Special Interest Groups (SIGs) Remote Content
 * 
 * Downloads the SIGS.md file from the llm-d repository
 * and transforms it into docs/community/sigs.md
 */

import { createContentWithSource } from './utils.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'sigs-guide',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d/llm-d/dev/',
    outDir: 'docs/community',
    documents: ['SIGS.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'SIGS.md') {
        return createContentWithSource({
          title: 'Special Interest Groups (SIGs)',
          description: 'Information about Special Interest Groups in the llm-d project',
          sidebarLabel: 'Special Interest Groups (SIGs)',
          sidebarPosition: 2,
          filename: 'SIGS.md',
          newFilename: 'sigs.md',
          repoUrl: 'https://github.com/llm-d/llm-d',
          branch: 'dev',
          content,
          // Fix relative links and HTML tags for MDX compatibility
          contentTransform: (content) => content
            .replace(/<br>/g, '<br/>')
            .replace(/<hr>/g, '<hr/>')
            .replace(/<img([^>]*?)>/g, '<img$1/>')
            .replace(/\(CONTRIBUTING\.md\)/g, '(contribute)')
            .replace(/\(PROJECT\.md\)/g, '(https://github.com/llm-d/llm-d/blob/dev/PROJECT.md)')
        });
      }
      return undefined;
    },
  },
]; 
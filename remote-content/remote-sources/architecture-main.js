/**
 * Main Architecture README Remote Content
 * 
 * Downloads the README.md file from the main llm-d repository
 * and transforms it into docs/architecture/00_architecture.mdx
 */

import { createContentWithSource } from './utils.js';
import { getRepoTransform } from './repo-transforms.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'architecture-main',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d/llm-d/dev/',
    outDir: 'docs/architecture',
    documents: ['README.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build
    
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
          repoUrl: 'https://github.com/llm-d/llm-d',
          branch: 'dev',
          content,
          // Transform content to work in docusaurus context
          contentTransform: (content) => {
            // Get the appropriate repository transform
            const transform = getRepoTransform('llm-d', 'llm-d');
            return transform(content, {
              repoUrl: 'https://github.com/llm-d/llm-d',
              branch: 'dev'
            });
          }
        });
      }
      return undefined;
    },
  },
]; 
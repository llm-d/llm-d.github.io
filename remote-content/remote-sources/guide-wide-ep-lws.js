/**
 * Guide Wide Endpoint LWS Remote Content
 * 
 * Downloads the README.md file from the wide-ep-lws directory in llm-d-infra repository
 * and transforms it into docs/guide/Installation/wide-ep-lws.md
 */

import { createContentWithSource } from './utils.js';
import { getRepoTransform } from './repo-transforms.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'guide-wide-ep-lws',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d-incubation/llm-d-infra/main/',
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/examples/wide-ep-lws/README.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'quickstart/examples/wide-ep-lws/README.md') {
        return createContentWithSource({
          title: 'Wide Endpoint LWS',
          description: 'Well-lit path for wide endpoint Leaderworker Set configuration in llm-d',
          sidebarLabel: 'Wide Endpoint LWS',
          sidebarPosition: 4,
          filename: 'quickstart/examples/wide-ep-lws/README.md',
          newFilename: 'wide-ep-lws.md',
          repoUrl: 'https://github.com/llm-d-incubation/llm-d-infra',
          branch: 'main',
          content,
          // Transform content using repository-specific logic
          contentTransform: (content) => {
            const transform = getRepoTransform('llm-d-incubation', 'llm-d-infra');
            return transform(content, {
              repoUrl: 'https://github.com/llm-d-incubation/llm-d-infra',
              branch: 'main',
              org: 'llm-d-incubation',
              name: 'llm-d-infra'
            });
          }
        });
      }
      return undefined;
    },
  },
]; 
/**
 * Guide Prefill-Decode Disaggregation Remote Content
 * 
 * Downloads the README.md file from the pd-disaggregation directory in llm-d-infra repository
 * and transforms it into docs/guide/Installation/pd-disaggregation.md
 */

import { createContentWithSource } from './utils.js';
import { getRepoTransform } from './repo-transforms.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'guide-pd-disaggregation',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d-incubation/llm-d-infra/main/',
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/examples/pd-disaggregation/README.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'quickstart/examples/pd-disaggregation/README.md') {
        return createContentWithSource({
          title: 'Prefill-Decode Disaggregation',
          description: 'Well-lit path for prefill-decode disaggregation in llm-d',
          sidebarLabel: 'Prefill-Decode Disaggregation',
          sidebarPosition: 3,
          filename: 'quickstart/examples/pd-disaggregation/README.md',
          newFilename: 'pd-disaggregation.md',
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
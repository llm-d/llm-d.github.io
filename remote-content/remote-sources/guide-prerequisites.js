/**
 * Guide Prerequisites Remote Content
 *
 * Downloads the quickstart README.md file from the llm-d-infra repository
 * and transforms it into docs/guide/Installation/prerequisites.md
 */

import { createContentWithSource } from './utils.js';
import { getRepoTransform } from './repo-transforms.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'guide-prerequisites',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d-incubation/llm-d-infra/main/',
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/README.md'],

    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build

    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'quickstart/README.md') {
        return createContentWithSource({
          title: 'Prerequisites',
          description: 'Prerequisites for running the llm-d QuickStart',
          sidebarLabel: 'Prerequisites',
          sidebarPosition: 1,
          filename: 'quickstart/README.md',
          newFilename: 'prerequisites.md',
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

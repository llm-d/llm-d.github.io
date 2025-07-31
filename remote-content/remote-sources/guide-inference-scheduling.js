/**
 * Guide Inference Scheduling Remote Content
 *
 * Downloads the inference scheduling README.md file from the llm-d-infra repository
 * and transforms it into docs/guide/Installation/inference-scheduling.md
 */

import { createContentWithSource } from './utils.js';
import { getRepoTransform } from './repo-transforms.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'guide-inference-scheduling',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d-incubation/llm-d-infra/main/',
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/examples/inference-scheduling/README.md'],

    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build

    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'quickstart/examples/inference-scheduling/README.md') {
        return createContentWithSource({
          title: 'Inference Scheduling',
          description: 'Well-lit path for inference scheduling in llm-d',
          sidebarLabel: 'Inference Scheduling',
          sidebarPosition: 2,
          filename: 'quickstart/examples/inference-scheduling/README.md',
          newFilename: 'inference-scheduling.md',
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

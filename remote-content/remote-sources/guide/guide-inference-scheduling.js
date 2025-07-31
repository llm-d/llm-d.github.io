/**
 * Guide Inference Scheduling Remote Content
 *
 * Downloads the inference scheduling README.md file from the llm-d-infra repository
 * and transforms it into docs/guide/Installation/inference-scheduling.md
 */

import { createContentWithSource, createStandardTransform } from '../utils.js';
import { findRepoConfig, generateRepoUrls } from '../component-configs.js';

// Get repository configuration from centralized config
const repoConfig = findRepoConfig('llm-d-infra');
const { repoUrl, sourceBaseUrl } = generateRepoUrls(repoConfig);
const contentTransform = createStandardTransform('llm-d-infra');

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration - all URLs generated from centralized config
    name: 'guide-inference-scheduling',
    sourceBaseUrl,
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/examples/inference-scheduling/README.md'],

    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
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
          repoUrl,
          branch: repoConfig.branch,
          content,
          contentTransform
        });
      }
      return undefined;
    },
  },
];

/**
 * Guide Prerequisites Remote Content
 *
 * Downloads the quickstart README.md file from the llm-d-infra repository
 * and transforms it into docs/guide/Installation/prerequisites.md
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
    name: 'guide-prerequisites',
    sourceBaseUrl,
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/README.md'],

    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
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

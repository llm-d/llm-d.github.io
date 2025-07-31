/**
 * Guide Wide Endpoint LWS Remote Content
 * 
 * Downloads the README.md file from the wide-ep-lws directory in llm-d-infra repository
 * and transforms it into docs/guide/Installation/wide-ep-lws.md
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
    name: 'guide-wide-ep-lws',
    sourceBaseUrl,
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/examples/wide-ep-lws/README.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
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
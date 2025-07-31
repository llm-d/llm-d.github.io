/**
 * Guide Prefill-Decode Disaggregation Remote Content
 * 
 * Downloads the README.md file from the pd-disaggregation directory in llm-d-infra repository
 * and transforms it into docs/guide/Installation/pd-disaggregation.md
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
    name: 'guide-pd-disaggregation',
    sourceBaseUrl,
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/examples/pd-disaggregation/README.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
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
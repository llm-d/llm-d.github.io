/**
 * Special Interest Groups (SIGs) Remote Content
 * 
 * Downloads the SIGS.md file from the llm-d repository
 * and transforms it into docs/community/sigs.md
 */

import { createContentWithSource, createStandardTransform } from '../utils.js';
import { findRepoConfig, generateRepoUrls } from '../component-configs.js';

// Get repository configuration from centralized config
const repoConfig = findRepoConfig('llm-d');
const { repoUrl, sourceBaseUrl } = generateRepoUrls(repoConfig);
const contentTransform = createStandardTransform('llm-d');

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration - all URLs generated from centralized config
    name: 'sigs-guide',
    sourceBaseUrl,
    outDir: 'docs/community',
    documents: ['SIGS.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'SIGS.md') {
        return createContentWithSource({
          title: 'Special Interest Groups (SIGs)',
          description: 'Information about Special Interest Groups in the llm-d project',
          sidebarLabel: 'Special Interest Groups (SIGs)',
          sidebarPosition: 4,
          filename: 'SIGS.md',
          newFilename: 'sigs.md',
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
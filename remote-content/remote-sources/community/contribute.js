/**
 * Contributing Guide Remote Content
 * 
 * Downloads the CONTRIBUTING.md file from the llm-d repository
 * and transforms it into docs/community/contribute.md
 */

import { createContentWithSource, createStandardTransform } from '../utils.js';
import { findRepoConfig, generateRepoUrls } from '../component-configs.js';

// Get repository configuration from centralized config
const repoConfig = findRepoConfig('llm-d');
const { repoUrl, sourceBaseUrl } = generateRepoUrls(repoConfig);

// Create content transform that applies standard transformations,
// then overrides specific links that should stay local to the docs site
const contentTransform = (content, sourcePath) => {
  const standardTransform = createStandardTransform('llm-d');
  const transformed = standardTransform(content, sourcePath);
  return transformed
    .replace(/\(https:\/\/github\.com\/llm-d\/llm-d\/blob\/main\/CODE_OF_CONDUCT\.md\)/g, '(code-of-conduct)')
    .replace(/\(https:\/\/github\.com\/llm-d\/llm-d\/blob\/main\/SIGS\.md\)/g, '(sigs)');
};

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration - all URLs generated from centralized config
    name: 'contribute-guide',
    sourceBaseUrl,
    outDir: 'docs/community',
    documents: ['CONTRIBUTING.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'CONTRIBUTING.md') {
        return createContentWithSource({
          title: 'Contributing to llm-d',
          description: 'Guidelines for contributing to the llm-d project',
          sidebarLabel: 'Contributing',
          sidebarPosition: 2,
          filename: 'CONTRIBUTING.md',
          newFilename: 'contribute.md',
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
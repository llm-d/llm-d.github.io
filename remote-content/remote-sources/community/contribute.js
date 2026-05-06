/**
 * Contributing Guide Remote Content
 *
 * Downloads the CONTRIBUTING.md file from the llm-d repository
 * and transforms it into community/contribute.md
 */

import { createContentWithSource, createStandardTransform, getLlmdRepoConfig } from '../utils.js';

const { sourceBaseUrl } = getLlmdRepoConfig();

// Create content transform that applies standard transformations,
// then overrides specific links that should stay local to the docs site
const contentTransform = (content, sourcePath) => {
  const standardTransform = createStandardTransform();
  const transformed = standardTransform(content, sourcePath);
  return transformed
    .replace(/\(https:\/\/github\.com\/llm-d\/llm-d\/blob\/main\/CODE_OF_CONDUCT\.md\)/g, '(code-of-conduct)')
    .replace(/\(https:\/\/github\.com\/llm-d\/llm-d\/blob\/main\/SIGS\.md\)/g, '(sigs)');
};

export default [
  'docusaurus-plugin-remote-content',
  {
    name: 'contribute-guide',
    sourceBaseUrl,
    outDir: 'community',
    documents: ['CONTRIBUTING.md'],
    noRuntimeDownloads: false,
    performCleanup: true,

    modifyContent(filename, content) {
      if (filename === 'CONTRIBUTING.md') {
        return createContentWithSource({
          title: 'Contributing to llm-d',
          description: 'Guidelines for contributing to the llm-d project',
          sidebarLabel: 'Contributing',
          sidebarPosition: 2,
          filename: 'CONTRIBUTING.md',
          newFilename: 'contribute.md',
          content,
          contentTransform
        });
      }
      return undefined;
    },
  },
];

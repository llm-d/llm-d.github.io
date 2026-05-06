/**
 * Code of Conduct Remote Content
 *
 * Downloads the CODE_OF_CONDUCT.md file from the llm-d repository
 * and transforms it into community/code-of-conduct.md
 */

import { createContentWithSource, createStandardTransform, getLlmdRepoConfig } from '../utils.js';

const { sourceBaseUrl } = getLlmdRepoConfig();
const contentTransform = createStandardTransform();

export default [
  'docusaurus-plugin-remote-content',
  {
    name: 'code-of-conduct',
    sourceBaseUrl,
    outDir: 'community',
    documents: ['CODE_OF_CONDUCT.md'],
    noRuntimeDownloads: false,
    performCleanup: true,

    modifyContent(filename, content) {
      if (filename === 'CODE_OF_CONDUCT.md') {
        return createContentWithSource({
          title: 'Code of Conduct',
          description: 'Code of Conduct and Community Guidelines for llm-d',
          sidebarLabel: 'Code of Conduct',
          sidebarPosition: 3,
          filename: 'CODE_OF_CONDUCT.md',
          newFilename: 'code-of-conduct.md',
          content,
          contentTransform
        });
      }
      return undefined;
    },
  },
];

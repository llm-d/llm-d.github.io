/**
 * Special Interest Groups (SIGs) Remote Content
 *
 * Downloads the SIGS.md file from the llm-d repository
 * and transforms it into community/sigs.md
 */

import { createContentWithSource, createStandardTransform, getLlmdRepoConfig } from '../utils.js';

const { sourceBaseUrl } = getLlmdRepoConfig();
const contentTransform = createStandardTransform();

export default [
  'docusaurus-plugin-remote-content',
  {
    name: 'sigs-guide',
    sourceBaseUrl,
    outDir: 'community',
    documents: ['SIGS.md'],
    noRuntimeDownloads: false,
    performCleanup: true,

    modifyContent(filename, content) {
      if (filename === 'SIGS.md') {
        return createContentWithSource({
          title: 'Special Interest Groups (SIGs)',
          description: 'Information about Special Interest Groups in the llm-d project',
          sidebarLabel: 'Special Interest Groups (SIGs)',
          sidebarPosition: 4,
          filename: 'SIGS.md',
          newFilename: 'sigs.md',
          content,
          contentTransform
        });
      }
      return undefined;
    },
  },
];

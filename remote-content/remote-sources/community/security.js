/**
 * Security Policy Remote Content
 *
 * Downloads the SECURITY.md file from the llm-d repository
 * and transforms it into community/security.md
 */

import { createContentWithSource, createStandardTransform, getLlmdRepoConfig } from '../utils.js';

const { sourceBaseUrl } = getLlmdRepoConfig();
const contentTransform = createStandardTransform();

export default [
  'docusaurus-plugin-remote-content',
  {
    name: 'security-policy',
    sourceBaseUrl,
    outDir: 'community',
    documents: ['SECURITY.md'],
    noRuntimeDownloads: false,
    performCleanup: true,

    modifyContent(filename, content) {
      if (filename === 'SECURITY.md') {
        return createContentWithSource({
          title: 'Security Policy',
          description: 'Security vulnerability reporting and disclosure policy for llm-d',
          sidebarLabel: 'Security Policy',
          sidebarPosition: 5,
          filename: 'SECURITY.md',
          newFilename: 'security.md',
          content,
          contentTransform
        });
      }
      return undefined;
    },
  },
];

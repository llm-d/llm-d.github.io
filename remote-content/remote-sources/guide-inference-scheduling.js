/**
 * Guide Inference Scheduling Remote Content
 *
 * Downloads the inference scheduling README.md file from the llm-d-infra repository
 * and transforms it into docs/guide/Installation/inference-scheduling.md
 */

import { createContentWithSource } from './utils.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'guide-inference-scheduling',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d-incubation/llm-d-infra/main/',
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/examples/inference-scheduling/README.md'],

    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build

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
          repoUrl: 'https://github.com/llm-d-incubation/llm-d-infra',
          branch: 'main',
          content,
          // Transform content to work in docusaurus context
          contentTransform: (content) => content
            // Fix MDX compilation issues with angle bracket URLs
            .replace(/<(http[s]?:\/\/[^>]+)>/g, '`$1`')
            
            // CRITICAL: Fix istio-workaround.md FIRST before any other URL transformations
            .replace(/\]\([^)]*istio-workaround\.md\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/istio-workaround.md)')
            
            // Fix specific problematic links first (before general patterns)
            .replace(/\[install\-deps\.sh\]\(\.\.\/\.\.\/install\-deps\.sh\)/g, '[install-deps.sh](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/install-deps.sh)')
            .replace(/\[gke\.md\]\(gke\.md\)/g, '[gke.md](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/examples/inference-scheduling/gke.md)')
            .replace(/\[gke\.md\]\(\.\/gke\.md\)/g, '[gke.md](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/examples/inference-scheduling/gke.md)')
            .replace(/\[scheduling configuration\]\(https\:\/\/github\.com\/llm\-d\/llm\-d\-inference\-scheduler\/blob\/main\/docs\/architecture\.md\)/g, '[scheduling configuration](https://github.com/llm-d/llm-d-inference-scheduler/blob/main/docs/architecture.md)')
            
            // Fix broken external references
            .replace(/\]\(\.\.\/\.\.\/precise-prefix-cache-aware\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/tree/main/quickstart/examples/precise-prefix-cache-aware)')
            .replace(/\]\(precise-prefix-cache-aware\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/tree/main/quickstart/examples/precise-prefix-cache-aware)')
            .replace(/\]\(\.\.\/precise-prefix-cache-aware\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/tree/main/quickstart/examples/precise-prefix-cache-aware)')
            
            // Fix relative path resolution for install-deps.sh (catch any remaining patterns)
            .replace(/\]\(\.\.\/\.\.\/\.\.\/([^)]+\.sh)\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/$1)')
            // Fix any remaining ../../../*.md patterns before general md processing
            .replace(/\]\(\.\.\/\.\.\/\.\.\/([^)]+\.md)\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/$1)')
            
            // Fix relative links (but be more careful)
            .replace(/\]\(\.\.\//g, '](../../')
            .replace(/\]\(\.\//g, '](')
            
            // Fix file references to point to repository (only if not already a full URL)
            .replace(/\]\((?!https?:\/\/)([^)]+\.(yaml|sh))\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/examples/inference-scheduling/$1)')
            
            // Convert other relative markdown links to repository links (only if not already a full URL)
            .replace(/\]\((?!https?:\/\/)([^)]+\.md)\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/examples/inference-scheduling/$1)')
        });
      }
      return undefined;
    },
  },
];

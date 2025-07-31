/**
 * Guide Prerequisites Remote Content
 *
 * Downloads the quickstart README.md file from the llm-d-infra repository
 * and transforms it into docs/guide/Installation/prerequisites.md
 */

import { createContentWithSource } from './utils.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'guide-prerequisites',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d-incubation/llm-d-infra/main/',
    outDir: 'docs/guide/Installation',
    documents: ['quickstart/README.md'],

    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build

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
          repoUrl: 'https://github.com/llm-d-incubation/llm-d-infra',
          branch: 'main',
          content,
          // Transform content to work in docusaurus context
          contentTransform: (content) => content
            // Fix MDX compilation issues with angle bracket URLs
            .replace(/<(http[s]?:\/\/[^>]+)>/g, '`$1`')
            // Fix broken anchor reference
            .replace(/#openshift-and-grafana/g, '#install-on-openshift')
            
            // Fix specific problematic links first (before general patterns)
            .replace(/\[Grafana\ setup\ guide\]\(\.\/grafana\-setup\.md\)/g, '[Grafana setup guide](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/docs/monitoring/grafana-setup.md)')
            .replace(/\[llm\-d dashboard\]\(\.\/grafana\/dashboards\/llm\-d\-dashboard\.json\)/g, '[llm-d dashboard](https://raw.githubusercontent.com/llm-d-incubation/llm-d-infra/refs/heads/main/quickstart/docs/monitoring/grafana/dashboards/llm-d-dashboard.json)')
            .replace(/\[inference\-gateway\ dashboard\]\(https\:\/\/github\.com\/kubernetes\-sigs\/gateway\-api\-inference\-extension\/blob\/main\/tools\/dashboards\/inference\_gateway\.json\)/g, '[inference-gateway dashboard](https://raw.githubusercontent.com/kubernetes-sigs/gateway-api-inference-extension/refs/heads/main/tools/dashboards/inference_gateway.json)')
            
            // Fix OpenShift documentation links - use a simple string replacement first
            .replace(/docs\/infra-providers\/openshift\/README-openshift\.md/g, 'https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/docs/infra-providers/openshift/README-openshift.md')
            // More general pattern for remaining docs paths (only if not already a full URL)
            .replace(/\]\((?!https?:\/\/)docs\/([^)]+)\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/docs/$1)')
            
            // Fix relative path references to files
            .replace(/\]\(grafana\/dashboards\/([^)]+)\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/grafana/dashboards/$1)')
            
            // Fix any remaining relative links that might break (but avoid full URLs)
            .replace(/\]\(examples\//g, '](../')
            .replace(/\]\(\.\//g, '](')
            
            // Convert relative markdown links to repository links (only if not already a full URL)
            .replace(/\]\((?!https?:\/\/)([^)]+\.md)\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/$1)')
            // Fix file links to point to repository (only if not already a full URL)
            .replace(/\]\((?!https?:\/\/)([^)]+\.(yaml|json|sh))\)/g, '](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/$1)')

        });
      }
      return undefined;
    },
  },
];

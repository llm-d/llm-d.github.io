/**
 * Guide Examples Remote Content
 * 
 * Downloads the examples README.md file from the llm-d-infra repository
 * and transforms it into docs/guide/guide.md (landing page)
 */

import { createContentWithSource } from './utils.js';
import { getRepoTransform } from './repo-transforms.js';

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration
    name: 'guide-examples',
    sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d-incubation/llm-d-infra/main/',
    outDir: 'docs/guide',
    documents: ['quickstart/examples/README.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,  // Download automatically when building
    performCleanup: true,       // Clean up files after build
    
    // Transform the content for this specific document
    modifyContent(filename, content) {
      if (filename === 'quickstart/examples/README.md') {
        return createContentWithSource({
          title: 'llm-d User Guide',
          description: 'Getting started with llm-d and exploring well-lit paths for different use cases',
          sidebarLabel: 'User Guide',
          sidebarPosition: 1,
          filename: 'quickstart/examples/README.md',
          newFilename: 'guide.md',
          repoUrl: 'https://github.com/llm-d-incubation/llm-d-infra',
          branch: 'main',
          content,
          // Transform content using repository-specific logic
          contentTransform: (content) => {
            // Add what is llm-d section before the main content
            const withIntro = content.replace(/^# /, `**What is llm-d?**

llm-d is an open source project providing distributed inferencing for GenAI runtimes on any Kubernetes cluster. Its highly performant, scalable architecture helps reduce costs through a spectrum of hardware efficiency improvements. The project prioritizes ease of deployment+use as well as SRE needs + day 2 operations associated with running large GPU clusters.

[For more information check out the Architecture Documentation](/docs/architecture)

# `);
            
            // Apply repository-specific transforms (all links go to GitHub)
            const transform = getRepoTransform('llm-d-incubation', 'llm-d-infra');
            return transform(withIntro, {
              repoUrl: 'https://github.com/llm-d-incubation/llm-d-infra',
              branch: 'main',
              org: 'llm-d-incubation',
              name: 'llm-d-infra'
            });
          }
        });
      }
      return undefined;
    },
  },
]; 
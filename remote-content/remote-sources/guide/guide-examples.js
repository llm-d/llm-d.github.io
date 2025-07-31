/**
 * Guide Examples Remote Content
 * 
 * Downloads the examples README.md file from the llm-d-infra repository
 * and transforms it into docs/guide/guide.md (landing page)
 */

import { createContentWithSource, createStandardTransform } from '../utils.js';
import { findRepoConfig, generateRepoUrls } from '../component-configs.js';

// Get repository configuration from centralized config
const repoConfig = findRepoConfig('llm-d-infra');
const { repoUrl, sourceBaseUrl } = generateRepoUrls(repoConfig);
const standardTransform = createStandardTransform('llm-d-infra');

export default [
  'docusaurus-plugin-remote-content',
  {
    // Basic configuration - all URLs generated from centralized config
    name: 'guide-examples',
    sourceBaseUrl,
    outDir: 'docs/guide',
    documents: ['quickstart/examples/README.md'],
    
    // Plugin behavior
    noRuntimeDownloads: false,
    performCleanup: true,
    
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
          repoUrl,
          branch: repoConfig.branch,
          content,
          // Transform content with custom logic plus standard transforms
          contentTransform: (content, sourcePath) => {
            // Apply repository-specific transforms first (converts repo-relative links to GitHub)
            const transformedContent = standardTransform(content, sourcePath);
            
            // Then add what is llm-d section before the main content
            // This way our site-relative links don't get converted to GitHub URLs
            const withIntro = transformedContent.replace(/^# /, `**What is llm-d?**

llm-d is an open source project providing distributed inferencing for GenAI runtimes on any Kubernetes cluster. Its highly performant, scalable architecture helps reduce costs through a spectrum of hardware efficiency improvements. The project prioritizes ease of deployment+use as well as SRE needs + day 2 operations associated with running large GPU clusters.

[For more information check out the Architecture Documentation](/docs/architecture)

# `);
            
            return withIntro;
          }
        });
      }
      return undefined;
    },
  },
]; 
/**
 * Dynamic Components Remote Content Generator
 * 
 * Generates remote content configurations for all components listed in the v0.2.0 release
 * This creates a foundation for automatically syncing component documentation
 */

import { createContentWithSource, createStandardTransform } from '../utils.js';
import { COMPONENT_CONFIGS, generateRepoUrls } from '../component-configs.js';
import fs from 'fs';
import path from 'path';

/**
 * Generate a remote content configuration for a single component
 * @param {Object} config - Component configuration
 * @returns {Array} Remote content plugin configuration
 */
function generateComponentRemoteSource(config) {
  const { name, org, branch, description, sidebarPosition } = config;
  const { repoUrl, sourceBaseUrl } = generateRepoUrls(config);
  
  return [
    'docusaurus-plugin-remote-content',
    {
      // Basic configuration
      name: `component-${name}`,
      sourceBaseUrl,
      outDir: 'docs/architecture/Components',
      documents: ['README.md'],
      
      // Plugin behavior
      noRuntimeDownloads: false,
      performCleanup: true,
      
      // Transform the content for this specific document
      modifyContent(filename, content) {
        if (filename === 'README.md') {
          // Generate clean names without llm-d prefix
          const cleanName = name.replace(/^llm-d-/, '');
          const cleanTitle = cleanName.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          return createContentWithSource({
            title: cleanTitle,
            description,
            sidebarLabel: cleanTitle,
            sidebarPosition,
            filename: 'README.md',
            newFilename: `${cleanName}.md`,
            repoUrl,
            branch,
            content,
            // Transform content to work in docusaurus context
            contentTransform: createStandardTransform(name)
          });
        }
        return undefined;
      },
    },
  ];
}

/**
 * Generate the components overview page content
 * @returns {string} Markdown content for the overview page
 */
function generateComponentsOverviewContent() {
  // Read version information from release-info.json
  let versionInfo;
  try {
    const releaseInfoPath = path.resolve('./release-info.json');
    const releaseInfoContent = fs.readFileSync(releaseInfoPath, 'utf8');
    versionInfo = JSON.parse(releaseInfoContent).current;
  } catch (error) {
    console.warn('Could not read release-info.json, using fallback data');
    versionInfo = {
      version: 'v0.2.0',
      releaseDateFormatted: 'July 29, 2024',
      releaseUrl: 'https://github.com/llm-d/llm-d/releases/tag/v0.2.0',
      releaseName: 'llm-d v0.2.0'
    };
  }

  const currentDate = new Date().toISOString().split('T')[0];
  
  // Group components by category
  const categorizedComponents = COMPONENT_CONFIGS.reduce((acc, component) => {
    if (!acc[component.category]) {
      acc[component.category] = [];
    }
    acc[component.category].push(component);
    return acc;
  }, {});

  let content = `---
title: llm-d Components
description: Overview of all llm-d ecosystem components and their documentation
sidebar_label: Components
sidebar_position: 1
---

# llm-d components

The llm-d ecosystem consists of multiple interconnected components that work together to provide distributed inference capabilities for large language models.

## Latest Release: [${versionInfo.version}](${versionInfo.releaseUrl})

**Released**: ${versionInfo.releaseDateFormatted}

:::info Auto-Generated Content
This page is automatically updated from the latest component repository information and release data. Last updated: ${currentDate}
:::

## Components

| Component | Description | Repository | Documentation |
|-----------|-------------|------------|---------------|`;

  // Generate single table with all components (sorted by sidebarPosition)
  const sortedComponents = COMPONENT_CONFIGS.sort((a, b) => a.sidebarPosition - b.sidebarPosition);
  
  sortedComponents.forEach((component) => {
    const { repoUrl } = generateRepoUrls(component);
    const cleanName = component.name.replace(/^llm-d-/, '');
    const cleanTitle = cleanName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    const docLink = `./${cleanName}.md`;
    
    content += `\n| **[${cleanTitle}](${repoUrl})** | ${component.description} | [${component.org}/${component.name}](${repoUrl}) | [View Docs](${docLink}) |`;
  });

  content += `

## Getting Started

Each component has its own detailed documentation page accessible from the links above. For a comprehensive view of how these components work together, see the main [Architecture Overview](../architecture.mdx).

### Quick Links

- [Main llm-d Repository](https://github.com/llm-d/llm-d) - Core platform and orchestration
- [llm-d-incubation Organization](https://github.com/llm-d-incubation) - Experimental and supporting components
- [Latest Release](${versionInfo.releaseUrl}) - ${versionInfo.releaseName}
- [All Releases](https://github.com/llm-d/llm-d/releases) - Complete release history

## Contributing

To contribute to any of these components, visit their respective repositories and follow their contribution guidelines. Each component maintains its own development workflow and contribution process.

---

*This page is automatically updated from the component configurations and stays up to date with the latest release information.*
`;

  return content;
}

/**
 * Generate the components overview page remote source
 * @returns {Array} Remote content plugin configuration for overview page
 */
function generateComponentsOverviewSource() {
  return [
    'docusaurus-plugin-remote-content',
    {
      // Basic configuration  
      name: 'components-overview',
      sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d/llm-d/dev/', // Dummy URL
      outDir: 'docs/architecture/Components',
      documents: ['LICENSE'], // Fetch a small file to trigger modifyContent
      
      // Plugin behavior
      noRuntimeDownloads: false,
      performCleanup: true,
      
      // Generate the overview content
      modifyContent(filename, content) {
        // Always generate the overview page regardless of the downloaded content
        const overviewContent = generateComponentsOverviewContent();
        
        return {
          filename: 'index.md',
          content: overviewContent
        };
      },
    },
  ];
}

/**
 * Generate all component remote sources including the overview page
 * @returns {Array} Array of remote content plugin configurations
 */
function generateAllComponentSources() {
  return [
    generateComponentsOverviewSource(), // Overview page first
    ...COMPONENT_CONFIGS.map(generateComponentRemoteSource) // Individual components
  ];
}

// Export the generated component sources
export default generateAllComponentSources(); 
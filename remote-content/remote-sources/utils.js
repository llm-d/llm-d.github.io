/**
 * Utilities for Remote Content Sources
 * 
 * Helper functions to maintain consistency across remote content transformations
 */

import { findRepoConfig, generateRepoUrls } from './component-configs.js';
import { getRepoTransform } from './repo-transforms.js';

/**
 * Create a standardized content transform function using centralized repo configs
 * @param {string} repoName - Repository name from COMPONENT_CONFIGS or COMMON_REPO_CONFIGS
 * @returns {Function} Content transform function
 */
export function createStandardTransform(repoName) {
  const repoConfig = findRepoConfig(repoName);
  if (!repoConfig) {
    throw new Error(`Repository configuration not found for: ${repoName}`);
  }
  
  const { org, name } = repoConfig;
  const { repoUrl, ref } = generateRepoUrls(repoConfig);
  const transform = getRepoTransform(org, name);
  
  // Use ref (version or branch) instead of just branch
  return (content, sourcePath) => transform(content, { repoUrl, branch: ref, org, name, sourcePath });
}

/**
 * Generate a source callout for remote content
 * @param {string} filename - The original filename
 * @param {string} repoUrl - The GitHub repository URL (without .git)
 * @param {string} branch - The branch/tag name (e.g., 'main', 'v0.3.0')
 * @param {string} [mainReleaseVersion] - Optional main llm-d release version (e.g., 'v0.3.0')
 * @returns {string} Formatted source callout
 */
export function createSourceCallout(filename, repoUrl, branch = 'main', mainReleaseVersion = null) {
  const fileUrl = `${repoUrl}/blob/${branch}/${filename}`;
  const issuesUrl = `${repoUrl}/issues`;
  const repoName = repoUrl.split('/').slice(-2).join('/');
  
  // Check if this is a version tag (contains 'v' followed by numbers and dots)
  // Matches: v0.3.0, llm-d-modelservice-v0.2.10, etc.
  const isVersionTag = /v\d+\.\d+/.test(branch) && !['main', 'master', 'develop'].includes(branch);
  
  if (isVersionTag) {
    // ============================================================================
    // SCENARIO 1 & 2: Content is from a version tag (e.g., v0.3.0, v0.5.1)
    // Used for: Component docs and guides that reference specific releases
    // ============================================================================
    const releaseUrl = `${repoUrl}/releases/tag/${branch}`;
    const mainFileUrl = `${repoUrl}/blob/main/${filename}`;
    const mainReleaseUrl = mainReleaseVersion 
      ? `https://github.com/llm-d/llm-d/releases/tag/${mainReleaseVersion}`
      : null;
    
    // SCENARIO 1: Component documentation with mainReleaseVersion provided
    // - Used by: Component docs in docs/architecture/Components/
    // - Example: llm-d-inference-sim v0.5.1 as part of llm-d v0.3.0
    // - Shows: Both the component's version AND the main llm-d release version
    if (mainReleaseVersion) {
      return `:::info Documentation Version
This documentation corresponds to **[${repoName} ${branch}](${releaseUrl})** as included in **[llm-d ${mainReleaseVersion}](${mainReleaseUrl})**.
For the most current development changes, see [this file on main](${mainFileUrl}).

📝 To suggest changes or report issues, please [create an issue](${issuesUrl}).

*Source: [${filename}](${fileUrl})*
:::

`;
    } else {
      // SCENARIO 2: Guide documentation using version tag without mainReleaseVersion
      // - Used by: Installation guides and other guide content
      // - Example: Content from llm-d v0.3.0 release (guide-generator.js)
      // - Shows: Only the version tag since it's main llm-d repo content
      return `:::info Documentation Version
This documentation corresponds to **[llm-d ${branch}](${releaseUrl})**, the latest public release. 
For the most current development changes, see [this file on main](${mainFileUrl}).

📝 To suggest changes or report issues, please [create an issue](${issuesUrl}).

*Source: [${filename}](${fileUrl})*
:::

`;
    }
  } else {
    // ============================================================================
    // SCENARIO 3: Content is from a non-version branch (e.g., 'main')
    // Used for: Community docs, architecture overview, and other main branch content
    // ============================================================================
    // - Example: CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md from main branch
    // - Shows: Direct edit link since this is always-current content from main
    const editUrl = `${repoUrl}/edit/${branch}/${filename}`;
    return `:::info Content Source
This content is automatically synced from [${filename}](${fileUrl}) in the ${repoName} repository.

📝 To suggest changes, please [edit the source file](${editUrl}) or [create an issue](${issuesUrl}).
:::

`;
  }
}

/**
 * Create a complete content transformation with frontmatter and source callout
 * @param {Object} options - Configuration options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} options.sidebarLabel - Sidebar label
 * @param {number} options.sidebarPosition - Sidebar position
 * @param {string} options.filename - Original filename
 * @param {string} options.newFilename - New filename
 * @param {string} options.repoUrl - GitHub repository URL
 * @param {string} options.branch - Branch name
 * @param {string} options.content - Original content
 * @param {Function} [options.contentTransform] - Optional content transformation function
 * @param {string} [options.mainReleaseVersion] - Optional main llm-d release version
 * @returns {Object} Transformed content object
 */
export function createContentWithSource({
  title,
  description,
  sidebarLabel,
  sidebarPosition,
  filename,
  newFilename,
  repoUrl,
  branch = 'main',
  content,
  contentTransform,
  mainReleaseVersion = null
}) {
  // Escape description for YAML frontmatter (handle quotes and special chars)
  const escapedDescription = description
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"');   // Escape double quotes
  
  const frontmatter = `---
title: ${title}
description: "${escapedDescription}"
sidebar_label: ${sidebarLabel}
sidebar_position: ${sidebarPosition}
---

`;

  const sourceCallout = createSourceCallout(filename, repoUrl, branch, mainReleaseVersion);
  
  // Apply any additional content transformations
  const transformedContent = contentTransform ? contentTransform(content, filename) : content;
  
  // Ensure content ends with a newline before adding the callout
  const contentWithNewline = transformedContent + '\n';
  
  return {
    filename: newFilename,
    content: frontmatter + contentWithNewline + sourceCallout
  };
} 

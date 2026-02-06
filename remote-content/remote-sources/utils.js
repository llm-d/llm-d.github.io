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
 * All content is synced from main branch to show latest development content
 * @param {string} filename - The original filename
 * @param {string} repoUrl - The GitHub repository URL (without .git)
 * @param {string} branch - The branch name (always 'main')
 * @param {string} [mainReleaseVersion] - Unused, kept for backwards compatibility
 * @returns {string} Formatted source callout
 */
export function createSourceCallout(filename, repoUrl, branch = 'main', mainReleaseVersion = null) {
  const fileUrl = `${repoUrl}/blob/${branch}/${filename}`;
  const issuesUrl = `${repoUrl}/issues`;
  const editUrl = `${repoUrl}/edit/${branch}/${filename}`;
  const repoName = repoUrl.split('/').slice(-2).join('/');
  
  // All content now syncs from main branch
  return `:::info Content Source
This content is automatically synced from [${filename}](${fileUrl}) on the \`${branch}\` branch of the ${repoName} repository.

📝 To suggest changes, please [edit the source file](${editUrl}) or [create an issue](${issuesUrl}).
:::

`;
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
 * @param {string[]} [options.keywords] - Optional SEO keywords array
 * @param {string} [options.image] - Optional social sharing image path
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
  mainReleaseVersion = null,
  keywords = [],
  image = null
}) {
  // Escape description for YAML frontmatter (handle quotes and special chars)
  const escapedDescription = description
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"');   // Escape double quotes

  // Build frontmatter with optional SEO fields
  let frontmatter = `---
title: ${title}
description: "${escapedDescription}"
sidebar_label: ${sidebarLabel}
sidebar_position: ${sidebarPosition}`;

  // Add keywords if provided
  if (keywords && keywords.length > 0) {
    frontmatter += `\nkeywords: [${keywords.join(', ')}]`;
  }

  // Add image if provided
  if (image) {
    frontmatter += `\nimage: ${image}`;
  }

  frontmatter += `\n---\n\n`;

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

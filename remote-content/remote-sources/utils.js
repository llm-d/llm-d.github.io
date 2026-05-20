/**
 * Utilities for Community Documentation Remote Content
 *
 * Helper functions for syncing community documentation from llm-d/llm-d.
 * All other documentation is synced via the preview/scripts/sync-docs.sh system.
 */

import { transformRepo } from './repo-transforms.js';

/**
 * Configuration for the llm-d repository
 */
const LLMD_REPO = {
  org: 'llm-d',
  name: 'llm-d',
  branch: 'main',
  repoUrl: 'https://github.com/llm-d/llm-d',
  sourceBaseUrl: 'https://raw.githubusercontent.com/llm-d/llm-d/main/'
};

/**
 * Get the llm-d repository configuration
 * @returns {Object} Repository configuration
 */
export function getLlmdRepoConfig() {
  return LLMD_REPO;
}

/**
 * Create a content transform function for llm-d repository
 * @returns {Function} Content transform function
 */
export function createStandardTransform() {
  return (content, sourcePath) => transformRepo(content, {
    repoUrl: LLMD_REPO.repoUrl,
    branch: LLMD_REPO.branch,
    sourcePath
  });
}

/**
 * Generate a source callout for remote content
 * @param {string} filename - The original filename
 * @returns {string} Formatted source callout
 */
export function createSourceCallout(filename) {
  const fileUrl = `${LLMD_REPO.repoUrl}/blob/${LLMD_REPO.branch}/${filename}`;
  const issuesUrl = `${LLMD_REPO.repoUrl}/issues`;
  const editUrl = `${LLMD_REPO.repoUrl}/edit/${LLMD_REPO.branch}/${filename}`;

  return `:::info Content Source
This content is automatically synced from [${filename}](${fileUrl}) on the \`${LLMD_REPO.branch}\` branch of the llm-d/llm-d repository.

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
 * @param {string} options.content - Original content
 * @param {Function} [options.contentTransform] - Optional content transformation function
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
  content,
  contentTransform,
  keywords = [],
  image = null
}) {
  // Escape description for YAML frontmatter
  const escapedDescription = description
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

  // Build frontmatter
  let frontmatter = `---
title: ${title}
description: "${escapedDescription}"
sidebar_label: ${sidebarLabel}
sidebar_position: ${sidebarPosition}`;

  if (keywords && keywords.length > 0) {
    frontmatter += `\nkeywords: [${keywords.join(', ')}]`;
  }

  if (image) {
    frontmatter += `\nimage: ${image}`;
  }

  frontmatter += `\n---\n\n`;

  const sourceCallout = createSourceCallout(filename);
  const transformedContent = contentTransform ? contentTransform(content, filename) : content;
  const contentWithNewline = transformedContent + '\n';

  return {
    filename: newFilename,
    content: frontmatter + contentWithNewline + sourceCallout
  };
}

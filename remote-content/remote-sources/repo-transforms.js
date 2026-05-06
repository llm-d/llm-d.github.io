/**
 * Repository Content Transformation System for Community Documentation
 *
 * Simplified transformation system that converts relative markdown links
 * to absolute GitHub URLs for community documentation files.
 *
 * All other documentation is synced via the preview/scripts/sync-docs.sh system,
 * which uses its own transformation logic in preview/scripts/transformations.sh.
 */

/**
 * Resolve a relative path to an absolute GitHub URL
 * @param {string} path - The relative path from the markdown link
 * @param {string} sourceDir - The directory containing the source file
 * @param {string} repoUrl - The GitHub repository URL (e.g., 'https://github.com/llm-d/llm-d')
 * @param {string} branch - The git branch (e.g., 'main')
 * @returns {string} Absolute GitHub URL
 */
function resolvePath(path, sourceDir, repoUrl, branch) {
  const cleanPath = path.replace(/^\.\//, '');

  // Handle root-relative paths (starting with /) - relative to repo root
  if (cleanPath.startsWith('/')) {
    const rootPath = cleanPath.substring(1);
    return `${repoUrl}/blob/${branch}/${rootPath}`;
  }

  // Handle relative paths with ../ navigation
  if (cleanPath.includes('../')) {
    const sourceParts = sourceDir ? sourceDir.split('/') : [];
    const pathParts = cleanPath.split('/');
    const resolvedParts = [...sourceParts];

    for (const part of pathParts) {
      if (part === '..') {
        resolvedParts.pop();
      } else if (part !== '.' && part !== '') {
        resolvedParts.push(part);
      }
    }

    const resolvedPath = resolvedParts.join('/');
    return `${repoUrl}/blob/${branch}/${resolvedPath}`;
  }

  // Handle regular relative paths - relative to the source file's directory
  const fullPath = sourceDir ? `${sourceDir}/${cleanPath}` : cleanPath;
  return `${repoUrl}/blob/${branch}/${fullPath}`;
}

/**
 * Transform function for community documentation
 *
 * Converts all relative markdown links to absolute GitHub URLs.
 * Community files are simple markdown with no special features (no tabs, callouts, images).
 *
 * @param {string} content - The markdown content
 * @param {Object} options - Transformation options
 * @param {string} options.repoUrl - GitHub repository URL
 * @param {string} options.branch - Git branch name
 * @param {string} [options.sourcePath] - Path to source file (for resolving relative links)
 * @returns {string} Transformed content
 */
export function transformRepo(content, { repoUrl, branch, sourcePath = '' }) {
  // Get the directory of the source file to resolve relative paths correctly
  const sourceDir = sourcePath ? sourcePath.split('/').slice(0, -1).join('/') : '';

  return content
    // Convert inline-style relative links to absolute GitHub URLs
    // Matches: [text](relative/path.md) but not [text](http://...) or [text](#anchor)
    .replace(/\]\((?!http|https|#|mailto:)([^)]+)\)/g, (match, path) => {
      const resolvedUrl = resolvePath(path, sourceDir, repoUrl, branch);
      return `](${resolvedUrl})`;
    })
    // Convert reference-style relative links to absolute GitHub URLs
    // Matches: [label]: relative/path.md but not [label]: http://...
    .replace(/^\[([^\]]+)\]:(?!http|https|#|mailto:)([^\s]+)/gm, (match, label, path) => {
      const resolvedUrl = resolvePath(path, sourceDir, repoUrl, branch);
      return `[${label}]:${resolvedUrl}`;
    });
}

/**
 * Get the transform function for any repository
 * @param {string} org - GitHub organization (unused, kept for compatibility)
 * @param {string} name - Repository name (unused, kept for compatibility)
 * @returns {Function} Transform function
 */
export function getRepoTransform(org, name) {
  return transformRepo;
}

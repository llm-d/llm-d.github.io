/**
 * Repository Content Transformation System
 * 
 * Unified transformation that links all relative references back to the source repository.
 * This ensures consistency across all content and prevents broken links.
 */

/**
 * Apply essential MDX compatibility fixes
 */
function applyBasicMdxFixes(content) {
  return content
    .replace(/<br>/g, '<br />')
    .replace(/<br([^/>]*?)>/g, '<br$1 />')
    .replace(/<picture[^>]*>/g, '')
    .replace(/<\/picture>/g, '')
    .replace(/(<(?:img|input|area|base|col|embed|hr|link|meta|param|source|track|wbr)[^>]*?)(?<!\/)>/gi, '$1 />')
    .replace(/(<\w+[^>]*?)(\s+\w+)=([^"'\s>]+)([^>]*?>)/g, '$1$2="$3"$4')
    .replace(/'(\{[^}]*\})'/g, '`$1`')
    .replace(/\{[^}]*\}/g, (match) => {
      if (match.includes('"') || match.includes("'") || match.includes('\\') || match.match(/\{[^}]*\d+[^}]*\}/)) {
        return '`' + match + '`';
      }
      return match;
    })
    .replace(/<(http[s]?:\/\/[^>]+)>/g, '`$1`')
    .replace(/<details[^>]*>/gi, '<details>')
    .replace(/<summary[^>]*>/gi, '<summary>');
}

/**
 * Fix all images to point to GitHub raw URLs
 */
function fixImages(content, repoUrl, branch) {
  return content
    .replace(/!\[([^\]]*)\]\((?!http)([^)]+)\)/g, (match, alt, path) => {
      const cleanPath = path.replace(/^\.\//, '');
      return `![${alt}](${repoUrl}/raw/${branch}/${cleanPath})`;
    })
    .replace(/<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/g, (match, before, path, after) => {
      const cleanPath = path.replace(/^\.\//, '');
      return `<img${before}src="${repoUrl}/raw/${branch}/${cleanPath}"${after}>`;
    });
}

/**
 * Unified transform function for all repositories
 * All relative links point back to the source repository on GitHub
 */
export function transformRepo(content, { repoUrl, branch }) {
  return fixImages(applyBasicMdxFixes(content), repoUrl, branch)
    // All relative links go to source repository (inline format)
    .replace(/\]\((?!http|https|#|mailto:)([^)]+)\)/g, (match, path) => {
      const cleanPath = path.replace(/^\]\(/, '').replace(/^\.\//, '');
      return `](${repoUrl}/blob/${branch}/${cleanPath})`;
    })
    // All relative links go to source repository (reference format)
    .replace(/^\[([^\]]+)\]:(?!http|https|#|mailto:)([^\s]+)/gm, (match, label, path) => {
      const cleanPath = path.replace(/^\.\//, '');
      return `[${label}]:${repoUrl}/blob/${branch}/${cleanPath}`;
    });
}

/**
 * Get the transform function for any repository
 * Now returns the same unified transform for all repositories
 */
export function getRepoTransform(org, name) {
  return transformRepo;
}

// Backward compatibility exports (deprecated - use transformRepo instead)
export const transformMainRepo = transformRepo;
export const transformComponentRepo = transformRepo;
/**
 * Repository-Specific Transformation System
 * 
 * Two repository types:
 * 1. Main llm-d/llm-d repository (keeps docs/ links local)
 * 2. Component repositories (all links point to source repo)
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
 * Transform content from the main llm-d/llm-d repository
 * Keeps docs/ links pointing to our local docs site
 */
export function transformMainRepo(content, { repoUrl, branch }) {
  return fixImages(applyBasicMdxFixes(content), repoUrl, branch)
    // Keep docs/ links local (inline format)
    .replace(/\]\(docs\//g, '](/docs/architecture/')
    .replace(/\]\(\.\/docs\//g, '](/docs/architecture/')
    // Keep docs/ links local (reference format)  
    .replace(/^\[([^\]]+)\]:docs\//gm, `[$1]:/docs/architecture/`)
    .replace(/^\[([^\]]+)\]:\.\/docs\//gm, `[$1]:/docs/architecture/`)
    // All other relative links go to GitHub
    .replace(/\]\((?!http|https|#|\/docs|\/blog|mailto:)([^)]+)\)/g, `](${repoUrl}/blob/${branch}/$1)`)
    .replace(/^\[([^\]]+)\]:(?!http|https|#|mailto:|\/docs|\/blog)([^\s]+)/gm, `[$1]:${repoUrl}/blob/${branch}/$2`);
}

/**
 * Transform content from component repositories
 * All relative links point back to the source repository
 */
export function transformComponentRepo(content, { repoUrl, branch }) {
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
 * Get the appropriate transform function for a repository
 */
export function getRepoTransform(org, name) {
  return (org === 'llm-d' && name === 'llm-d') ? transformMainRepo : transformComponentRepo;
}
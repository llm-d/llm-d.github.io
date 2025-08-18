/**
 * Repository Content Transformation System
 * 
 * Unified transformation that links all relative references back to the source repository.
 * This ensures consistency across all content and prevents broken links.
 */

/**
 * Apply essential MDX compatibility fixes and content transformations
 * Combines all content-only transformations that don't require repository information
 */
function applyBasicMdxFixes(content) {
  return content
    // Convert GitHub-style callouts to Docusaurus admonitions
    .replace(/^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:> .*\n?)*)/gm, (match, type, content) => {
      // Map GitHub callout types to Docusaurus admonition types
      const typeMap = {
        'NOTE': 'note',
        'TIP': 'tip', 
        'IMPORTANT': 'info',
        'WARNING': 'warning',
        'CAUTION': 'danger'
      };
      
      const docusaurusType = typeMap[type] || type.toLowerCase();
      
      // Remove the '> ' prefix from each line of content
      const cleanContent = content.replace(/^> ?/gm, '').trim();
      
      return `:::${docusaurusType}\n${cleanContent}\n:::\n`;
    })
    // Fix HTML comments for MDX compatibility
    .replace(/<!--\s*/g, '{/* ')
    .replace(/\s*-->/g, ' */}')
    // Fix HTML tags for MDX compatibility
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
 * Resolve a path based on whether it's root-relative or regular relative
 */
function resolvePath(path, sourceDir, repoUrl, branch) {
  const cleanPath = path.replace(/^\.\//, '');
  
  // Handle root-relative paths (starting with /) - these are relative to repo root
  if (cleanPath.startsWith('/')) {
    const rootPath = cleanPath.substring(1); // Remove leading slash
    return `${repoUrl}/blob/${branch}/${rootPath}`;
  }
  
  // Handle complex relative paths with ../ navigation
  if (cleanPath.includes('../')) {
    // Split the source directory and the relative path
    const sourceParts = sourceDir ? sourceDir.split('/') : [];
    const pathParts = cleanPath.split('/');
    
    // Process each part of the path
    const resolvedParts = [...sourceParts];
    for (const part of pathParts) {
      if (part === '..') {
        // Go up one directory
        resolvedParts.pop();
      } else if (part !== '.' && part !== '') {
        // Add the directory/file part
        resolvedParts.push(part);
      }
    }
    
    const resolvedPath = resolvedParts.join('/');
    return `${repoUrl}/blob/${branch}/${resolvedPath}`;
  }
  
  // Handle regular relative paths - these are relative to the source file's directory
  const fullPath = sourceDir ? `${sourceDir}/${cleanPath}` : cleanPath;
  return `${repoUrl}/blob/${branch}/${fullPath}`;
}

/**
 * Fix all images to point to GitHub raw URLs
 */
function fixImages(content, repoUrl, branch, sourceDir = '') {
  return content
    .replace(/!\[([^\]]*)\]\((?!http)([^)]+)\)/g, (match, alt, path) => {
      const cleanPath = path.replace(/^\.\//, '');
      // Resolve relative path relative to the source file's directory
      const fullPath = sourceDir ? `${sourceDir}/${cleanPath}` : cleanPath;
      return `![${alt}](${repoUrl}/raw/${branch}/${fullPath})`;
    })
    .replace(/<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/g, (match, before, path, after) => {
      const cleanPath = path.replace(/^\.\//, '');
      // Resolve relative path relative to the source file's directory
      const fullPath = sourceDir ? `${sourceDir}/${cleanPath}` : cleanPath;
      return `<img${before}src="${repoUrl}/raw/${branch}/${fullPath}"${after}>`;
    });
}

/**
 * Unified transform function for all repositories
 * All relative links point back to the source repository on GitHub
 */
export function transformRepo(content, { repoUrl, branch, sourcePath = '' }) {
  // Get the directory of the source file to resolve relative paths correctly
  const sourceDir = sourcePath ? sourcePath.split('/').slice(0, -1).join('/') : '';
  
  return fixImages(applyBasicMdxFixes(content), repoUrl, branch, sourceDir)
    // All relative links go to source repository (inline format)
    .replace(/\]\((?!http|https|#|mailto:)([^)]+)\)/g, (match, path) => {
      const cleanPath = path.replace(/^\]\(/, '');
      const resolvedUrl = resolvePath(cleanPath, sourceDir, repoUrl, branch);
      return `](${resolvedUrl})`;
    })
    // All relative links go to source repository (reference format)
    .replace(/^\[([^\]]+)\]:(?!http|https|#|mailto:)([^\s]+)/gm, (match, label, path) => {
      const resolvedUrl = resolvePath(path, sourceDir, repoUrl, branch);
      return `[${label}]:${resolvedUrl}`;
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
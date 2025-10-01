/**
 * Repository Content Transformation System
 * 
 * Unified transformation that links all relative references back to the source repository.
 * This ensures consistency across all content and prevents broken links.
 * 
 * Special handling for internal guide links to keep them within the documentation site.
 */

/**
 * Mapping of GitHub guide paths to local documentation paths
 * This allows internal links between synced guides to stay within the site
 * 
 * IMPORTANT: Only files listed in this mapping will have their GitHub URLs
 * transformed to local paths. All other files (even in guides/) will remain
 * as GitHub links for safety and precision.
 * 
 * Future versioning support:
 * - When versioning is enabled, paths will be prefixed with version (e.g., /docs/1.0/guide)
 * - The getInternalGuidePath function will handle version detection automatically
 * - Current paths work for both current docs and as base paths for future versions
 */
const INTERNAL_GUIDE_MAPPINGS = {
  // Main guides
  'guides/README.md': '/docs/guide',
  'guides/QUICKSTART.md': '/docs/guide/Installation/quickstart',
  'guides/prereq/infrastructure/README.md': '/docs/guide/Installation/prerequisites',
  
  // Dynamic guides (Installation section)
  'guides/inference-scheduling/README.md': '/docs/guide/Installation/inference-scheduling',
  'guides/pd-disaggregation/README.md': '/docs/guide/Installation/pd-disaggregation',
  'guides/precise-prefix-cache-aware/README.md': '/docs/guide/Installation/precise-prefix-cache-aware',
  'guides/simulated-accelerators/README.md': '/docs/guide/Installation/simulated-accelerators',
  'guides/wide-ep-lws/README.md': '/docs/guide/Installation/wide-ep-lws'
};

/**
 * Generate versioned documentation path based on branch/tag
 * Future-ready for Docusaurus versioning best practices
 */
function getVersionedPath(basePath, branch) {
  // Current behavior: main branch uses current docs paths
  if (branch === 'main') {
    return basePath;
  }
  
  // Future versioning logic (when implemented):
  // - Release tags (e.g., 'v1.0.0', 'v2.1.0') -> /docs/1.0/... or /docs/2.1/...
  // - Development branches -> /docs/next/...
  // - Legacy branches -> /docs/legacy/...
  
  // Version detection patterns for future use:
  const versionMatch = branch.match(/^v?(\d+\.\d+)(?:\.\d+)?$/); // e.g., v1.0.0 -> 1.0
  if (versionMatch) {
    const version = versionMatch[1];
    return basePath.replace('/docs/', `/docs/${version}/`);
  }
  
  // Default: treat as current version for unknown branches
  return basePath;
}

/**
 * Check if a GitHub URL points to a synced guide and return the local path
 * Supports future versioning by detecting branch/tag from URL
 * ONLY transforms links to files that are actually synced (exist in INTERNAL_GUIDE_MAPPINGS)
 */
function getInternalGuidePath(githubUrl) {
  // Match GitHub blob URLs for the llm-d repo with any branch/tag
  // More permissive regex to capture the full path, then check if it's a synced guide
  const match = githubUrl.match(/https:\/\/github\.com\/llm-d\/llm-d\/blob\/(.+?)\/(.+\.md)$/);
  if (match) {
    const branch = match[1];
    const filePath = match[2];
    
    // CRITICAL: Only transform if this exact file path is in our synced mappings
    const basePath = INTERNAL_GUIDE_MAPPINGS[filePath];
    
    if (basePath) {
      return getVersionedPath(basePath, branch);
    }
  }
  return null;
}

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
 * All relative links point back to the source repository on GitHub, except for
 * internal guide links which are redirected to local documentation pages
 */
export function transformRepo(content, { repoUrl, branch, sourcePath = '' }) {
  // Get the directory of the source file to resolve relative paths correctly
  const sourceDir = sourcePath ? sourcePath.split('/').slice(0, -1).join('/') : '';
  
  return fixImages(applyBasicMdxFixes(content), repoUrl, branch, sourceDir)
    // All relative links go to source repository (inline format)
    .replace(/\]\((?!http|https|#|mailto:)([^)]+)\)/g, (match, path) => {
      const cleanPath = path.replace(/^\]\(/, '');
      const resolvedUrl = resolvePath(cleanPath, sourceDir, repoUrl, branch);
      
      // Check if this resolved GitHub URL should be an internal link instead
      const internalPath = getInternalGuidePath(resolvedUrl);
      if (internalPath) {
        return `](${internalPath})`;
      }
      
      return `](${resolvedUrl})`;
    })
    // All relative links go to source repository (reference format)
    .replace(/^\[([^\]]+)\]:(?!http|https|#|mailto:)([^\s]+)/gm, (match, label, path) => {
      const resolvedUrl = resolvePath(path, sourceDir, repoUrl, branch);
      
      // Check if this resolved GitHub URL should be an internal link instead
      const internalPath = getInternalGuidePath(resolvedUrl);
      if (internalPath) {
        return `[${label}]:${internalPath}`;
      }
      
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
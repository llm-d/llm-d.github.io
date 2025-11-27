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
 * Check if a GitHub URL points to a synced guide and return the local path
 * ONLY transforms links to files that are actually synced (exist in INTERNAL_GUIDE_MAPPINGS)
 */
function getInternalGuidePath(githubUrl) {
  // Match GitHub blob URLs for the llm-d repo with any branch/tag
  // More permissive regex to capture the full path, then check if it's a synced guide
  const match = githubUrl.match(/https:\/\/github\.com\/llm-d\/llm-d\/blob\/(.+?)\/(.+\.md)$/);
  if (match) {
    const filePath = match[2];
    
    // CRITICAL: Only transform if this exact file path is in our synced mappings
    const basePath = INTERNAL_GUIDE_MAPPINGS[filePath];
    
    if (basePath) {
      return basePath;
    }
  }
  return null;
}

/**
 * Convert GitHub-friendly tab markers to Docusaurus Tabs components
 */
function convertTabsToDocusaurus(content) {
  // Check if there are any tab blocks
  const hasTabBlocks = /<!-- TABS:START -->/.test(content);
  if (!hasTabBlocks) return content;
  
  // Pattern to match tab blocks
  const tabBlockRegex = /<!-- TABS:START -->\n([\s\S]*?)<!-- TABS:END -->/g;
  
  const transformedContent = content.replace(tabBlockRegex, (match, tabsContent) => {
    // Split content by TAB markers to extract individual tabs
    const tabSections = tabsContent.split(/<!-- TAB:/);
    const tabs = [];
    
    // Skip first element (empty or content before first tab)
    for (let i = 1; i < tabSections.length; i++) {
      const section = tabSections[i];
      
      // Extract label and check for :default marker
      const labelMatch = section.match(/^([^:]+?)(?::default)?\s*-->\n([\s\S]*?)$/);
      if (labelMatch) {
        const label = labelMatch[1].trim();
        const content = labelMatch[2].trim();
        const isDefault = section.includes(':default -->');
        tabs.push({ label, content, isDefault });
      }
    }
    
    if (tabs.length === 0) return match;
    
    // Generate Docusaurus Tabs component (without imports here)
    let result = `<Tabs>\n`;
    
    tabs.forEach(tab => {
      const defaultAttr = tab.isDefault ? ' default' : '';
      result += `<TabItem value="${tab.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}" label="${tab.label}"${defaultAttr}>\n\n`;
      result += `${tab.content}\n\n`;
      result += `</TabItem>\n`;
    });
    
    result += `</Tabs>`;
    
    return result;
  });
  
  // Add imports at the top of the file if tabs were found
  if (transformedContent !== content) {
    return `import Tabs from '@theme/Tabs';\nimport TabItem from '@theme/TabItem';\n\n${transformedContent}`;
  }
  
  return transformedContent;
}

/**
 * Apply essential MDX compatibility fixes and content transformations
 * Combines all content-only transformations that don't require repository information
 */
function applyBasicMdxFixes(content) {
  // First convert tabs to Docusaurus format
  let transformed = convertTabsToDocusaurus(content);
  
  // Then apply other MDX fixes
  return transformed
    // Convert GitHub-style callouts to Docusaurus admonitions
    .replace(/^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|REQUIREMENTS)\]\s*\n((?:> .*\n?)*)/gm, (match, type, content) => {
      // Map GitHub callout types to Docusaurus admonition types
      const typeMap = {
        'NOTE': 'note',
        'TIP': 'tip', 
        'IMPORTANT': 'info',
        'WARNING': 'warning',
        'CAUTION': 'danger',
        'REQUIREMENTS': 'info'  // Map to info admonition
      };
      
      const docusaurusType = typeMap[type] || type.toLowerCase();
      
      // Remove the '> ' prefix from each line of content
      const cleanContent = content.replace(/^> ?/gm, '').trim();
      
      return `:::${docusaurusType}\n${cleanContent}\n:::\n`;
    })
    // Fix HTML comments for MDX compatibility (without breaking Mermaid arrows)
    .replace(/<!--([\s\S]*?)-->/g, (_match, comment) => {
      const normalized = comment
        .replace(/^\s*/, ' ')
        .replace(/\s*$/, ' ');
      return `{/*${normalized}*/}`;
    })
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
  
  // Fix known broken upstream links before other transformations
  // These specific URLs point to a non-existent 'dev' branch, redirect to 'main'
  // TODO: Remove these after the next llm-d release where component repos have fixes
  let fixedContent = content
    .replace(
      /https:\/\/github\.com\/llm-d\/llm-d\/tree\/dev\//g,
      'https://github.com/llm-d/llm-d/tree/main/'
    )
    .replace(
      /https:\/\/github\.com\/llm-d\/llm-d\/blob\/dev\//g,
      'https://github.com/llm-d/llm-d/blob/main/'
    );
  
  return fixImages(applyBasicMdxFixes(fixedContent), repoUrl, branch, sourceDir)
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

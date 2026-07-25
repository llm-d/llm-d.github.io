/**
 * rewrite.mjs — shared markdown link/image rewriting for the sync scripts.
 *
 * The llm-d docs are authored for GitHub. When vendored into Docusaurus a few
 * link classes need fixing up; this module centralises that logic so both
 * sync-docs.mjs and sync-community.mjs behave identically.
 */
import fs from 'node:fs';
import path from 'node:path';

const GH = 'https://github.com/llm-d/llm-d';
const GH_BLOB = `${GH}/blob/main`;
const GH_TREE = `${GH}/tree/main`;

export const IMAGE_EXT = new Set(['.png', '.svg', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.avif']);
export const DOC_EXT = new Set(['.md', '.mdx']);

const LINK_RE = /(!?)\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]+)([^)]*)\)/g;

/**
 * @param {string} repo  Absolute path to the llm-d repo root.
 * @param {object} [opts]
 * @param {Record<string,string>} [opts.pathMap]  Exact repo-relative path -> site URL overrides
 *        (e.g. { 'CONTRIBUTING.md': '/community/contribute' }).
 * @param {boolean} [opts.relativeDocLinks]  Emit version-preserving RELATIVE links between
 *        docs (correct for the docs plugin). When false, emit absolute /docs/… links
 *        (used by the community sync, which is a separate plugin instance).
 */
export function createRewriter(repo, { pathMap = {}, relativeDocLinks = false } = {}) {
  const stats = { toDoc: 0, toGitHub: 0, mapped: 0 };

  const docExists = (repoRel) => {
    const abs = path.join(repo, repoRel);
    if (DOC_EXT.has(path.extname(abs).toLowerCase()) && fs.existsSync(abs)) return true;
    for (const ext of ['.md', '.mdx']) if (fs.existsSync(abs + ext)) return true;
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory())
      return ['README.md', 'README.mdx', 'index.md', 'index.mdx'].some((i) => fs.existsSync(path.join(abs, i)));
    return false;
  };

  const isDir = (repoRel) => {
    const abs = path.join(repo, repoRel);
    return fs.existsSync(abs) && fs.statSync(abs).isDirectory();
  };

  // Map a repo-relative path (docs/… or guides/…) to its location under website/docs.
  // README is renamed to index by the sync, so normalize link targets to match.
  const toWebsite = (repoRel) =>
    (repoRel.startsWith('guides/') ? `docs/${repoRel}` : repoRel).replace(
      /(^|\/)README(\.mdx?)$/i,
      '$1index$2',
    );

  // Map a repo-relative doc path to its absolute site URL (/docs/… or /docs/guides/…).
  const toSiteDocUrl = (repoRel) => {
    let rel = repoRel.startsWith('guides/') ? 'guides/' + repoRel.slice(7) : repoRel.slice(5);
    rel = rel.replace(/\/(README|index)\.mdx?$/i, '').replace(/^(README|index)\.mdx?$/i, '');
    rel = rel.replace(/\.mdx?$/i, '').replace(/\/+$/, '');
    return '/docs' + (rel ? '/' + rel : '');
  };

  // Resolve an in-tree target to the actual website doc file (so a relative link
  // can point straight at it and Docusaurus keeps it within the current version).
  const targetWebsiteFile = (repoRel) => {
    if (DOC_EXT.has(path.extname(repoRel).toLowerCase()) && fs.existsSync(path.join(repo, repoRel)))
      return toWebsite(repoRel);
    for (const e of ['.md', '.mdx']) if (fs.existsSync(path.join(repo, repoRel + e))) return toWebsite(repoRel + e);
    const abs = path.join(repo, repoRel);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory())
      for (const i of ['README.md', 'README.mdx', 'index.md', 'index.mdx'])
        if (fs.existsSync(path.join(abs, i))) return toWebsite(`${repoRel}/${i}`);
    return null;
  };

  const rewriteUrl = (url, fileRepoDir) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || url.startsWith('#') || url.startsWith('/')) return null;
    const m = url.match(/^([^#?]*)([#?].*)?$/);
    const pathPart = m[1];
    const suffix = m[2] || '';
    if (!pathPart) return null;

    const resolved = path.posix.normalize(path.posix.join(fileRepoDir, pathPart));
    const ext = path.posix.extname(resolved).toLowerCase();

    if (pathMap[resolved]) {
      stats.mapped++;
      return pathMap[resolved] + suffix;
    }

    // In-tree images stay relative (copied alongside; Docusaurus bundles them).
    if (IMAGE_EXT.has(ext)) {
      if (resolved.startsWith('docs/') || resolved.startsWith('guides/')) return null;
      stats.toGitHub++;
      return `${GH}/raw/main/${resolved}${suffix}`;
    }

    if ((resolved.startsWith('docs/') || resolved.startsWith('guides/')) && docExists(resolved)) {
      stats.toDoc++;
      if (!relativeDocLinks) return toSiteDocUrl(resolved) + suffix;
      // Version-preserving relative link to the actual target file.
      const targetFile = targetWebsiteFile(resolved);
      const sourceDir = fileRepoDir.startsWith('guides') ? `docs/${fileRepoDir}` : fileRepoDir;
      let rel = path.posix.relative(sourceDir, targetFile);
      if (!rel.startsWith('.')) rel = `./${rel}`;
      return rel + suffix;
    }

    stats.toGitHub++;
    if (resolved.startsWith('..')) return `${GH_TREE}/${resolved.replace(/^(\.\.\/)+/, '')}${suffix}`;
    return `${isDir(resolved) ? GH_TREE : GH_BLOB}/${resolved}${suffix}`;
  };

  // Escape `{` / `}` that sit OUTSIDE inline code spans. CommonMark (.md) files
  // still let Docusaurus evaluate `{expr}` as a JS expression, which blows up on
  // prose like "{key,value}" or LaTeX "$N_{active}$". Braces inside `code` are
  // left untouched so things like `{namespace}` placeholders render correctly.
  const escapeBraces = (line) =>
    line
      .split(/(`+[^`]*`+)/g)
      .map((seg) => (seg.startsWith('`') ? seg : seg.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')))
      .join('');

  /**
   * Rewrite a whole markdown document. `fileRepoDir` is the file's dir relative
   * to the repo root. Pass `{ escapeBraces: true }` for CommonMark (.md) files.
   */
  const transformContent = (content, fileRepoDir, opts = {}) => {
    content = content.replace(/https?:\/\/llm-d\.ai\/img\//g, '/img/');
    // JSX/HTML <Link to>/<a href> that point at a docs section but assume docs
    // live at the site root (the upstream served docs at "/"). We serve them at
    // /docs, so prefix the known top-level sections.
    content = content.replace(
      /((?:to|href)=")\/(getting-started|guides|architecture|well-lit-paths|operations|infrastructure|api-reference)(?=["#/])/g,
      '$1/docs/$2',
    );
    let inFence = false;
    return content
      .split('\n')
      .map((line) => {
        const fence = line.match(/^\s*(```+|~~~+)/);
        if (fence) inFence = !inFence;
        if (inFence || fence) return line;
        let out = line.replace(LINK_RE, (full, bang, text, rawUrl, tail) => {
          const next = rewriteUrl(rawUrl.replace(/^<|>$/g, ''), fileRepoDir);
          return next === null ? full : `${bang}[${text}](${next}${tail})`;
        });
        if (opts.escapeBraces) out = escapeBraces(out);
        return out;
      })
      .join('\n');
  };

  return { transformContent, stats };
}

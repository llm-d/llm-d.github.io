/**
 * preprocess.mjs — build-time Markdown preprocessor (markdown.preprocessor).
 *
 * docs/ is synced from llm-d/llm-d (pristine). Link/image fixups are applied here
 * at build time so the synced source files stay clean:
 *
 *  - in-tree doc -> doc links are left for Docusaurus to resolve;
 *  - links into guides/<name> (the deployment recipes, which are NOT folded into
 *    the site) point to the source recipe in llm-d/llm-d on GitHub;
 *  - HTML <img> srcs under docs/ point at the static copy (/img/docs/…);
 *  - other out-of-tree links go to GitHub.
 */
import fs from 'node:fs';
import path from 'node:path';

const GH = 'https://github.com/llm-d/llm-d';
const GH_BLOB = `${GH}/blob/main`;
const GH_TREE = `${GH}/tree/main`;
const GH_RAW = `${GH}/raw/main`;
const IMAGE_EXT = new Set(['.png', '.svg', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.avif']);
const LINK_RE = /(!?)\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]+)([^)]*)\)/g;
const SECTIONS = ['getting-started', 'guides', 'architecture', 'api-reference', 'accelerators', 'well-lit-paths', 'operations', 'infrastructure'];

const GH_ALERT_TYPES = { NOTE: 'note', TIP: 'tip', IMPORTANT: 'info', WARNING: 'warning', CAUTION: 'danger' };

/**
 * Convert GitHub-style alerts (`> [!NOTE]` blockquotes) into Docusaurus
 * admonitions (`:::note … :::`) so they render as callout cards instead of
 * plain blockquotes. Fence-aware; leaves everything else untouched.
 */
export function convertGithubAdmonitions(content) {
  const lines = content.split('\n');
  const out = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```+|~~~+)/.test(line)) { inFence = !inFence; out.push(line); continue; }
    const m = !inFence && line.match(/^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
    if (m) {
      const type = GH_ALERT_TYPES[m[1].toUpperCase()];
      const body = [];
      let j = i + 1;
      while (j < lines.length && /^\s*>/.test(lines[j])) {
        body.push(lines[j].replace(/^\s*>\s?/, ''));
        j++;
      }
      while (body.length && body[0].trim() === '') body.shift();
      while (body.length && body[body.length - 1].trim() === '') body.pop();
      if (out.length && out[out.length - 1].trim() !== '') out.push('');
      out.push(`:::${type}`, ...body, ':::', '');
      i = j - 1;
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

export function makeDocsPreprocessor({ docsDir }) {
  const isImg = (p) => IMAGE_EXT.has(path.posix.extname(p).toLowerCase());
  const relLink = (fromDir, to) => {
    const r = path.posix.relative(fromDir === '.' ? '' : fromDir, to);
    return r.startsWith('.') ? r : `./${r}`;
  };
  const githubFile = (repoRel) => {
    if (isImg(repoRel)) return `${GH_RAW}/${repoRel}`;
    // No upstream checkout to stat in this standalone repo, so use /tree/, which
    // GitHub resolves for both directories and files (files redirect to /blob/).
    return `${GH_TREE}/${repoRel}`;
  };

  // ctx = { base (repo dir the link resolves against), dir (file's dir under docs/), isGuide }
  const rewriteUrl = (url, ctx) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || url.startsWith('#') || url.startsWith('/')) return null;
    const m = url.match(/^([^#?]*)([#?].*)?$/);
    const p = m[1];
    const suffix = m[2] || '';
    if (!p) return null;
    const repoRel = path.posix.normalize(path.posix.join(ctx.base, p));

    if (repoRel.startsWith('docs/')) {
      const target = repoRel.slice('docs/'.length);
      if (!ctx.isGuide) {
        // doc -> doc: leave the original relative link (Docusaurus resolves it),
        // fixing only README.md -> README.mdx (the intro).
        if (/\.md$/i.test(p) && !fs.existsSync(path.join(docsDir, target)) && fs.existsSync(path.join(docsDir, target) + 'x')) {
          return `${p}x${suffix}`;
        }
        return null;
      }
      // guide -> doc: in-site only if the doc exists here (guide READMEs use the
      // upstream's remapped doc layout, which may differ); otherwise GitHub.
      const stem = target.replace(/\.mdx?$/, '').replace(/\/$/, '');
      const exists =
        ['', '.md', '.mdx'].some((e) => fs.existsSync(path.join(docsDir, stem + e))) ||
        ['README.md', 'README.mdx', 'index.md', 'index.mdx'].some((i) => fs.existsSync(path.join(docsDir, stem, i)));
      return exists ? relLink(ctx.dir, target) + suffix : githubFile(repoRel) + suffix;
    }

    // Guides are NOT folded into the docs — well-lit-path "Deploy" links point to
    // the source recipes in llm-d/llm-d on GitHub (tree view renders the README).
    if (repoRel === 'guides' || repoRel.startsWith('guides/')) {
      if (isImg(repoRel)) return `${GH_RAW}/${repoRel}${suffix}`;
      return `${GH_TREE}/${repoRel.replace(/\/README\.mdx?$/i, '')}${suffix}`;
    }

    if (repoRel.startsWith('..')) return `${GH_TREE}/${repoRel.replace(/^(\.\.\/)+/, '')}${suffix}`;
    return githubFile(repoRel) + suffix;
  };

  const rewriteImg = (src, ctx) => {
    if (/^([a-z]+:)?\/\//i.test(src) || src.startsWith('/') || src.startsWith('#') || src.startsWith('data:')) return null;
    const repoRel = path.posix.normalize(path.posix.join(ctx.base, src));
    if (repoRel.startsWith('docs/')) return `/img/docs/${repoRel.slice('docs/'.length)}`;
    return `${GH_RAW}/${repoRel.replace(/^(\.\.\/)+/, '')}`;
  };

  const escapeBraces = (line) =>
    line
      .split(/(`+[^`]*`+)/g)
      .map((s) => (s.startsWith('`') ? s : s.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')))
      .join('');

  return ({ filePath, fileContent }) => {
    if (!filePath.startsWith(docsDir + path.sep)) return fileContent;
    const isMdx = filePath.endsWith('.mdx');
    const dir = path.relative(docsDir, path.dirname(filePath)).split(path.sep).join('/') || '.';
    const isGuide = dir === 'how-to-guides';
    const guideName = isGuide ? path.basename(filePath).replace(/\.mdx?$/, '') : null;
    const base = isGuide
      ? guideName === 'index' ? 'guides' : `guides/${guideName}`
      : dir === '.' ? 'docs' : `docs/${dir}`;
    const ctx = { base, dir, isGuide };

    let content = fileContent.replace(/https?:\/\/llm-d\.ai\/img\//g, '/img/');
    content = content.replace(
      /((?:to|href)=")\/([a-z-]+)(?=["#/])/g,
      (full, pre, sec) => {
        // The docs renamed the "guides" section to "well-lit-paths"; map the
        // legacy upstream link so it resolves (the content now lives there).
        if (sec === 'guides') return `${pre}/docs/well-lit-paths`;
        return SECTIONS.includes(sec) ? `${pre}/docs/${sec}` : full;
      },
    );
    content = convertGithubAdmonitions(content);

    let inFence = false;
    return content
      .split('\n')
      .map((line) => {
        const fence = line.match(/^\s*(```+|~~~+)/);
        if (fence) inFence = !inFence;
        if (inFence || fence) return line;
        let out = line.replace(LINK_RE, (full, bang, text, raw, tail) => {
          const next = rewriteUrl(raw.replace(/^<|>$/g, ''), ctx);
          return next === null ? full : `${bang}[${text}](${next}${tail})`;
        });
        out = out.replace(/(<img\b[^>]*?\bsrc\s*=\s*")([^"]+)(")/gi, (full, pre, src, post) => {
          const next = rewriteImg(src, ctx);
          return next === null ? full : `${pre}${next}${post}`;
        });
        if (!isMdx) out = escapeBraces(out);
        return out;
      })
      .join('\n');
  };
}

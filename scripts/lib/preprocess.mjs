/**
 * preprocess.mjs — build-time Markdown preprocessor (markdown.preprocessor).
 *
 * docs/ is synced from llm-d/llm-d (pristine). Link/image fixups are applied here
 * at build time so the synced source files stay clean:
 *
 *  - in-tree doc -> doc links are left for Docusaurus to resolve;
 *  - published guides (guides/<name>/README.md listed in the upstream publish
 *    manifest, see docs/.sync-map.json written by `llmd-site sync`) are site
 *    pages: links to them become in-site links, and links *from* them are
 *    resolved against their ORIGINAL repo location;
 *  - links into unpublished guides, manifests, scripts, etc. point to
 *    llm-d/llm-d on GitHub at the synced ref (main for /docs/dev);
 *  - HTML <img> srcs under docs/ point at the static copy (/img/docs/…), and
 *    images under a published guide at /img/docs/guides/<slug>/…;
 *  - published guide pages compiled as MDX get their GitHub-friendly markers
 *    (variants/tabs groups, env block) turned into site components.
 */
import fs from 'node:fs';
import path from 'node:path';

const GH_DEFAULT = 'https://github.com/llm-d/llm-d';
const IMAGE_EXT = new Set(['.png', '.svg', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.avif']);
const LINK_RE = /(!?)\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]+)([^)]*)\)/g;
const SECTIONS = ['getting-started', 'guides', 'architecture', 'api-reference', 'accelerators', 'well-lit-paths', 'operations', 'infrastructure'];
const FENCE_RE = /^\s*(```+|~~~+)/;

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

/**
 * Load docs/.sync-map.json (written by `llmd-site sync`). Tolerates absence.
 * @returns {{ref: string, repo: string, pages: Record<string,string>, guides: Record<string,{docs:string,img:string}>}}
 */
export function loadSyncMap(docsDir) {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(path.join(docsDir, '.sync-map.json'), 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return {
    ref: raw.ref || 'main',
    repo: (raw.repo || GH_DEFAULT).replace(/\/+$/, '').replace(/\.git$/, ''),
    pages: raw.pages || {},
    guides: raw.guides || {},
  };
}

/** Split a leading YAML frontmatter block from the body. */
function splitFrontMatter(content) {
  const m = content.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/);
  return m ? [m[0], content.slice(m[0].length)] : ['', content];
}

export function makeDocsPreprocessor({ docsDir, syncMap: syncMapOverride } = {}) {
  const map = syncMapOverride || loadSyncMap(docsDir);
  const GH_TREE = `${map.repo}/tree/${map.ref}`;
  const GH_RAW = `${map.repo}/raw/${map.ref}`;
  // repo-relative source path -> docs-relative site file
  const reversePages = Object.fromEntries(Object.entries(map.pages).map(([doc, src]) => [src, doc]));
  const guideDirs = Object.keys(map.guides).sort((a, b) => b.length - a.length);

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

  /** Published page (docs-relative file) for a repo path, if any. */
  const publishedPage = (repoRel) => {
    const p = repoRel.replace(/\/+$/, '');
    return reversePages[p] || reversePages[`${p}/README.md`] || null;
  };
  /** Published guide owning repoRel (longest dir prefix). */
  const owningGuide = (repoRel) => {
    for (const d of guideDirs) if (repoRel === d || repoRel.startsWith(`${d}/`)) return d;
    return null;
  };
  const guideImage = (repoRel) => {
    const g = owningGuide(repoRel);
    if (!g) return null;
    return `${map.guides[g].img}/${repoRel.slice(g.length + 1)}`;
  };
  /** Concrete site doc file (docs-relative) for a docs-relative target, if it exists. */
  const siteDocFile = (target) => {
    const t = target.replace(/\/+$/, '');
    if (/\.mdx?$/i.test(t)) {
      if (fs.existsSync(path.join(docsDir, t))) return t;
      if (/\.md$/i.test(t) && fs.existsSync(path.join(docsDir, `${t}x`))) return `${t}x`;
      return null;
    }
    for (const e of ['.md', '.mdx']) if (fs.existsSync(path.join(docsDir, t + e))) return t + e;
    for (const i of ['README.md', 'README.mdx', 'index.md', 'index.mdx']) {
      if (fs.existsSync(path.join(docsDir, t, i))) return t ? `${t}/${i}` : i;
    }
    return null;
  };

  // ctx = { base (repo dir the link resolves against), dir (file's dir under docs/), mapped }
  const rewriteUrl = (url, ctx, isImage) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || url.startsWith('#') || url.startsWith('/')) return null;
    const m = url.match(/^([^#?]*)([#?].*)?$/);
    const p = m[1];
    const suffix = m[2] || '';
    if (!p) return null;
    const repoRel = path.posix.normalize(path.posix.join(ctx.base, p)).replace(/\/+$/, '');

    // A published page (guide README or child page) -> in-site link.
    const page = !isImage && publishedPage(repoRel);
    if (page) return relLink(ctx.dir, page) + suffix;

    if (isImg(repoRel)) {
      const gi = guideImage(repoRel);
      if (gi) return gi + suffix;
      if (repoRel.startsWith('docs/')) {
        return ctx.mapped ? `/img/docs/${repoRel.slice('docs/'.length)}${suffix}` : null;
      }
    }

    if (repoRel === 'docs' || repoRel.startsWith('docs/')) {
      const target = repoRel === 'docs' ? '' : repoRel.slice('docs/'.length);
      if (!ctx.mapped) {
        // doc -> doc: leave the original relative link (Docusaurus resolves it),
        // fixing only README.md -> README.mdx (the intro).
        if (/\.md$/i.test(p) && !fs.existsSync(path.join(docsDir, target)) && fs.existsSync(path.join(docsDir, target) + 'x')) {
          return `${p}x${suffix}`;
        }
        return null;
      }
      // published guide -> doc: in-site only if the doc exists here; otherwise GitHub.
      const file = siteDocFile(target);
      return file ? relLink(ctx.dir, file) + suffix : githubFile(repoRel) + suffix;
    }

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
    const gi = guideImage(repoRel);
    if (gi) return gi;
    if (repoRel.startsWith('docs/')) return `/img/docs/${repoRel.slice('docs/'.length)}`;
    return `${GH_RAW}/${repoRel.replace(/^(\.\.\/)+/, '')}`;
  };

  return ({ filePath, fileContent }) => {
    if (!filePath.startsWith(docsDir + path.sep)) return fileContent;
    const isMdx = filePath.endsWith('.mdx');
    const docsRelFile = path.relative(docsDir, filePath).split(path.sep).join('/');
    const dir = path.posix.dirname(docsRelFile);
    const source = map.pages[docsRelFile];
    const mapped = Boolean(source);
    const base = mapped ? path.posix.dirname(source) : dir === '.' ? 'docs' : `docs/${dir}`;
    const ctx = { base, dir, mapped };

    const [frontMatter, body] = splitFrontMatter(fileContent);
    let content = body.replace(/https?:\/\/llm-d\.ai\/img\//g, '/img/');
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
    content = content
      .split('\n')
      .map((line) => {
        const fence = line.match(FENCE_RE);
        if (fence) inFence = !inFence;
        if (inFence || fence) return line;
        let out = line.replace(LINK_RE, (full, bang, text, raw, tail) => {
          const next = rewriteUrl(raw.replace(/^<|>$/g, ''), ctx, bang === '!');
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

    if (isMdx && mapped) content = guideToMdx(content, { meta: guideMetaFromFrontMatter(frontMatter) });
    return frontMatter + content;
  };
}

const escapeBraces = (line) =>
  line
    .split(/(`+[^`]*`+)/g)
    .map((s) => (s.startsWith('`') ? s : s.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')))
    .join('');

/** Parse the `llmd_guide:` frontmatter value (single-line JSON written by sync). */
function guideMetaFromFrontMatter(fm) {
  const m = fm.match(/^llmd_guide:\s*(\{.*\})\s*$/m);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

// ---------------------------------------------------------------------------
// MDX conversion for published guide pages
// ---------------------------------------------------------------------------

const VOID_TAGS = ['br', 'hr', 'img', 'input', 'source', 'wbr', 'col', 'area', 'meta', 'link'];
const KNOWN_ENGINE_VALUES = { vllm: 'vllm', sglang: 'sglang', 'tensorrt-llm': 'trtllm', trtllm: 'trtllm' };

const jsxAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const commentToMdx = (text) => `{/* ${text.trim().replace(/\*\//g, '* /')} */}`;

/**
 * Make one prose line MDX-safe: escape braces and stray `<` outside inline
 * code, turn autolinks into links, self-close void tags, class -> className,
 * and convert single-line HTML comments.
 */
export function mdxSafeLine(line) {
  return line
    .split(/(`+[^`]*`+)/g)
    .map((seg) => {
      if (seg.startsWith('`')) return seg;
      let s = seg.replace(/<!--([\s\S]*?)-->/g, (_, c) => `\u0000C${Buffer.from(c).toString('base64')}\u0000`);
      s = s.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
      // Autolinks are not supported by MDX.
      s = s.replace(/<((?:https?|mailto):[^\s>]+)>/g, (_, u) => `[${u}](${u})`);
      // Stray `<` that does not start a tag.
      s = s.replace(/<(?!\/?[A-Za-z][\w.:-]*(?:\s|\/?>|$))/g, '&lt;');
      // Void tags must self-close.
      s = s.replace(new RegExp(`<(${VOID_TAGS.join('|')})\\b([^>]*?)\\s*/?>`, 'gi'), (_, t, attrs) => `<${t}${attrs} />`);
      s = s.replace(/(<[A-Za-z][^>]*?\s)class=/g, '$1className=');
      s = s.replace(/\u0000C([A-Za-z0-9+/=]*)\u0000/g, (_, b) => commentToMdx(Buffer.from(b, 'base64').toString()));
      return s;
    })
    .join('');
}

function parseDetailsOpen(line) {
  const m = line.match(/^\s*<details\b([^>]*)>(.*)$/i);
  if (!m) return null;
  const attrs = m[1];
  const when = (attrs.match(/\bdata-when\s*=\s*"([^"]*)"/i) || [])[1] || null;
  return { open: /\bopen\b/i.test(attrs.replace(/data-when\s*=\s*"[^"]*"/i, '')), when, rest: m[2] };
}

/**
 * Convert GitHub-renderable guide conventions into MDX components:
 *  - <!-- variants:start --> <details data-when=…> groups -> <VariantGroup>/<Variant>
 *  - <!-- tabs:start group=engine --> <details> groups -> <Tabs>/<TabItem>
 *  - <!-- guide:env.static start/end --> fences -> <GuideEnv blocks={[…]} />
 *  - other HTML comments -> {/* … *\/}; prose made MDX-safe (code untouched).
 */
export function guideToMdx(content, { meta } = {}) {
  const labelToEngine = {};
  for (const [k, v] of Object.entries(meta?.engine_labels || {})) labelToEngine[String(v).toLowerCase()] = k;
  const engineValue = (label) => {
    const l = label.toLowerCase();
    return labelToEngine[l] || KNOWN_ENGINE_VALUES[l] || l.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };
  // Tab value per group: engine tabs use the MODEL_SERVER value; any other
  // group (e.g. group=mode: "Standalone Mode" / "Gateway Mode") uses the
  // slugged label without a trailing "mode" -> standalone / gateway.
  const tabValue = (g, label) => {
    if (g === 'engine') return engineValue(label);
    const base = label.replace(/\s+mode\s*$/i, '') || label;
    return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const lines = content.split('\n');
  const out = [];
  const push = (...ls) => out.push(...ls);
  const pushBlock = (tag) => {
    if (out.length && out[out.length - 1].trim() !== '') push('');
    push(tag, '');
  };
  // groups stack: {kind: 'variants'|'tabs', group, itemOpen}
  const groups = [];
  let inFence = false;
  let fenceMarker = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const group = groups[groups.length - 1] || null;

    if (inFence) {
      push(line);
      const f = line.match(FENCE_RE);
      if (f && f[1][0] === fenceMarker[0] && f[1].length >= fenceMarker.length && line.trim() === f[1]) inFence = false;
      continue;
    }
    const f = line.match(FENCE_RE);
    if (f) {
      inFence = true;
      fenceMarker = f[1];
      push(line);
      continue;
    }

    // Env block.
    if (/^\s*<!--\s*guide:env\.static\s+start\s*-->\s*$/.test(line)) {
      const blocks = [];
      let cur = null;
      let j = i + 1;
      for (; j < lines.length; j++) {
        const l = lines[j];
        if (cur === null && /^\s*<!--\s*guide:env\.static\s+end\s*-->\s*$/.test(l)) break;
        const ff = l.match(FENCE_RE);
        if (ff) {
          if (cur === null) cur = [];
          else { blocks.push(cur.join('\n')); cur = null; }
          continue;
        }
        if (cur !== null) cur.push(l);
      }
      if (j >= lines.length) { push(mdxSafeLine(line)); continue; } // unterminated: leave as-is
      pushBlock(`<GuideEnv blocks={${JSON.stringify(blocks)}} />`);
      i = j;
      continue;
    }

    // Group start/end.
    const vs = line.match(/^\s*<!--\s*variants:start\b.*-->\s*$/);
    const ts = line.match(/^\s*<!--\s*tabs:start\b(.*?)-->\s*$/);
    if (vs || ts) {
      if (vs) {
        groups.push({ kind: 'variants', itemOpen: false });
        pushBlock('<VariantGroup>');
      } else {
        const g = (ts[1].match(/\bgroup=([\w-]+)/) || [])[1] || 'engine';
        groups.push({ kind: 'tabs', group: g, itemOpen: false });
        pushBlock(`<Tabs groupId="${g}" queryString="${g}">`);
      }
      continue;
    }
    if (group && /^\s*<!--\s*(variants|tabs):end\s*-->\s*$/.test(line)) {
      if (group.itemOpen) pushBlock(group.kind === 'variants' ? '</Variant>' : '</TabItem>');
      pushBlock(group.kind === 'variants' ? '</VariantGroup>' : '</Tabs>');
      groups.pop();
      continue;
    }
    if (group) {
      const d = parseDetailsOpen(line);
      if (d && !group.itemOpen) {
        let summaryText = null;
        let rest = d.rest;
        const sameLine = rest.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>(.*)$/i);
        if (sameLine) {
          summaryText = stripTags(sameLine[1]);
          rest = sameLine[2];
        } else {
          let k = i + 1;
          while (k < lines.length && lines[k].trim() === '') k++;
          const sm = k < lines.length && lines[k].match(/^\s*<summary\b[^>]*>([\s\S]*?)<\/summary>(.*)$/i);
          if (sm) { summaryText = stripTags(sm[1]); rest = sm[2]; i = k; }
        }
        const label = summaryText || (d.when || 'Option');
        if (group.kind === 'variants') {
          pushBlock(`<Variant when="${jsxAttr(d.when || '')}" label="${jsxAttr(label)}">`);
        } else {
          pushBlock(`<TabItem value="${jsxAttr(tabValue(group.group, label))}" label="${jsxAttr(label)}"${d.open ? ' default' : ''}>`);
        }
        group.itemOpen = true;
        if (rest.trim()) push(mdxSafeLine(rest));
        continue;
      }
      if (/^\s*<\/details>\s*$/.test(line) && group.itemOpen) {
        pushBlock(group.kind === 'variants' ? '</Variant>' : '</TabItem>');
        group.itemOpen = false;
        continue;
      }
    }

    // Multi-line HTML comment.
    const mc = line.match(/^(.*?)<!--((?:(?!-->).)*)$/);
    if (mc && !line.includes('-->', line.indexOf('<!--'))) {
      const parts = [mc[2]];
      let j = i + 1;
      while (j < lines.length && !lines[j].includes('-->')) parts.push(lines[j++]);
      if (j < lines.length) {
        const endLine = lines[j];
        const idx = endLine.indexOf('-->');
        parts.push(endLine.slice(0, idx));
        push(mdxSafeLine(mc[1]) + commentToMdx(parts.join('\n')) + mdxSafeLine(endLine.slice(idx + 3)));
        i = j;
        continue;
      }
    }

    push(mdxSafeLine(line));
  }
  while (groups.length) {
    const group = groups.pop();
    if (group.itemOpen) pushBlock(group.kind === 'variants' ? '</Variant>' : '</TabItem>');
    pushBlock(group.kind === 'variants' ? '</VariantGroup>' : '</Tabs>');
  }
  return out.join('\n');
}

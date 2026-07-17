#!/usr/bin/env node
/**
 * sync-community.mjs — Generate the "live" community pages from repo-root files.
 *
 * community/index.md and community/events.md are authored, committed website
 * content. The contributing / code-of-conduct / security / SIGs pages instead
 * mirror the canonical source files at the llm-d repo root, so they never go
 * stale. This wraps each with frontmatter + a "source" admonition and rewrites
 * its links (the shared rewriter sends docs/guides links into the site and
 * everything else to GitHub; the four files cross-link to each other under
 * /community via pathMap).
 *
 * Output pages are generated and git-ignored.
 *
 * LEGACY: no longer part of the build. The Go tool (tools/llmd-site, see
 * internal/sync/community.go) generates these pages now via
 * `./bin/llmd-site sync`. Kept here for reference only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRewriter } from './lib/rewrite.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE = path.resolve(__dirname, '../..');
const REPO = process.env.LLMD_REPO
  ? path.resolve(process.env.LLMD_REPO)
  : path.resolve(WEBSITE, '..', 'llm-d');
const OUT = path.join(WEBSITE, 'community');

const PAGES = [
  // Contributing lives inside the Contributing (community) section sidebar.
  { src: 'CONTRIBUTING.md', out: 'contribute.md', title: 'Contributing to llm-d', label: 'Contributing', position: 3 },
  { src: 'CODE_OF_CONDUCT.md', out: 'code-of-conduct.md', title: 'Code of Conduct', label: 'Code of Conduct', position: 4 },
  { src: 'SECURITY.md', out: 'security.md', title: 'Security Policy', label: 'Security', position: 5 },
  { src: 'SIGS.md', out: 'sigs.md', title: 'Special Interest Groups (SIGs)', label: 'SIGs', position: 6 },
];

const pathMap = {
  'CONTRIBUTING.md': '/community/contribute',
  'CODE_OF_CONDUCT.md': '/community/code-of-conduct',
  'SECURITY.md': '/community/security',
  'SIGS.md': '/community/sigs',
};

const { transformContent } = createRewriter(REPO, { pathMap });

fs.mkdirSync(OUT, { recursive: true });
let count = 0;

for (const page of PAGES) {
  const src = path.join(REPO, page.src);
  if (!fs.existsSync(src)) {
    console.warn(`! source not found, skipping: ${page.src}`);
    continue;
  }
  // Drop the source's leading H1 so the frontmatter title is the single page title.
  let body = fs.readFileSync(src, 'utf8').replace(/^\s*#\s+.*\n/, '');
  body = transformContent(body, '.', { escapeBraces: true }); // generated pages are .md (CommonMark)

  const fm = [
    '---',
    `title: ${JSON.stringify(page.title)}`,
    `sidebar_label: ${JSON.stringify(page.label)}`,
    `sidebar_position: ${page.position}`,
    `description: ${JSON.stringify(`${page.title} — llm-d community`)}`,
    'custom_edit_url: ' + `https://github.com/llm-d/llm-d/edit/main/${page.src}`,
  ];
  if (page.hideSidebar) {
    fm.push('# Standalone page reached from the "Contributing" navbar item — no left sidebar.');
    fm.push('displayed_sidebar: null');
  }
  fm.push('---');
  const frontmatter = fm.join('\n');

  const note = `:::info\nThis page mirrors [\`${page.src}\`](https://github.com/llm-d/llm-d/blob/main/${page.src}) from the llm-d repository. Edit it there.\n:::`;

  fs.writeFileSync(path.join(OUT, page.out), `${frontmatter}\n\n${note}\n\n${body.trim()}\n`);
  count++;
}

console.log(`✓ synced community -> website/community (${count} pages from repo root)`);

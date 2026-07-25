#!/usr/bin/env node
/**
 * bake-docs.mjs — apply the build-time Markdown preprocessor to docs/ IN PLACE.
 *
 * LEGACY: manual release prep only. Dev docs/ are fixed up at render time by
 * scripts/lib/preprocess.mjs (wired as markdown.preprocessor). Versioned
 * snapshots under versioned_docs/ are NOT run through that preprocessor, so
 * before cutting a version we "bake" the same fixups into the source files.
 *
 *   node legacy/scripts/bake-docs.mjs [docsDir] [--img-base <base>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeDocsPreprocessor } from '../../scripts/lib/preprocess.mjs';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
let imgBase = '/img/docs/';
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--img-base') imgBase = args[++i];
  else if (args[i].startsWith('--img-base=')) imgBase = args[i].slice('--img-base='.length);
  else positional.push(args[i]);
}
if (!imgBase.endsWith('/')) imgBase += '/';
const docsDir = path.resolve(positional[0] || path.join(siteDir, 'docs'));
const preprocess = makeDocsPreprocessor({ docsDir });

let baked = 0;
/** @param {string} dir */
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.mdx?$/i.test(entry.name)) {
      const before = fs.readFileSync(full, 'utf8');
      let after = preprocess({ filePath: full, fileContent: before });
      if (imgBase !== '/img/docs/') after = after.split('/img/docs/').join(imgBase);
      if (after !== before) {
        fs.writeFileSync(full, after);
        baked++;
      }
    }
  }
}

if (!fs.existsSync(docsDir)) {
  console.error(`bake-docs: docs dir not found: ${docsDir}`);
  process.exit(1);
}
walk(docsDir);
console.log(`✓ baked ${baked} file(s) under ${path.relative(siteDir, docsDir) || docsDir}`);

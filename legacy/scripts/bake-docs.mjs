#!/usr/bin/env node
/**
 * bake-docs.mjs — apply the build-time Markdown preprocessor to docs/ IN PLACE.
 *
 * LEGACY: manual release prep only. Dev docs/ are fixed up at render time by
 * scripts/lib/preprocess.mjs (wired as markdown.preprocessor). Versioned
 * snapshots under versioned_docs/ are NOT run through that preprocessor, so
 * before cutting a version we "bake" the same fixups into the source files.
 *
 *   node legacy/scripts/bake-docs.mjs [docsDir] [--img-base <base>] [--ref <ref>]
 *
 * --ref pins every llm-d/llm-d GitHub link (tree/blob/raw) and the guide
 * banner's checkout ref to <ref> (e.g. the release tag v0.10), so a frozen
 * version keeps pointing at the sources it was cut from instead of main.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSyncMap, makeDocsPreprocessor } from '../../scripts/lib/preprocess.mjs';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
let imgBase = '/img/docs/';
let ref = null;
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--img-base') imgBase = args[++i];
  else if (args[i].startsWith('--img-base=')) imgBase = args[i].slice('--img-base='.length);
  else if (args[i] === '--ref') ref = args[++i];
  else if (args[i].startsWith('--ref=')) ref = args[i].slice('--ref='.length);
  else positional.push(args[i]);
}
if (!imgBase.endsWith('/')) imgBase += '/';
const docsDir = path.resolve(positional[0] || path.join(siteDir, 'docs'));
const syncMap = loadSyncMap(docsDir);
if (ref) syncMap.ref = ref;
const preprocess = makeDocsPreprocessor({ docsDir, syncMap });

/** Pin llm-d/llm-d GitHub links on main (baked or hand-written) to ref. */
const pinRef = (text) =>
  text
    .replace(/(github\.com\/llm-d\/llm-d\/(?:tree|blob|raw))\/main(?=[/"#)\s?]|$)/gm, `$1/${ref}`)
    .replace(/("ref":\s*)"main"/g, `$1${JSON.stringify(ref)}`);

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
      if (ref) after = pinRef(after);
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

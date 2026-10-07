#!/usr/bin/env node
/**
 * bake-docs.mjs — apply the build-time Markdown preprocessor to docs/ IN PLACE.
 *
 * Release prep, run by `llmd-site version cut`. Dev docs/ are fixed up at render
 * time by scripts/lib/preprocess.mjs (wired as markdown.preprocessor). Versioned
 * snapshots under versioned_docs/ are NOT run through that preprocessor, so
 * before cutting a version we "bake" the same fixups into the source files.
 *
 *   node scripts/bake-docs.mjs [docsDir] \
 *     [--img-base <base>] [--ref-map <json>] [--ref <ref>]
 *
 * --ref-map pins llm-d GitHub links (tree/blob/raw) per repo, so a frozen
 * version keeps pointing at the sources it was cut from instead of main. A
 * listed repo's links are set to its ref whatever they point at now, so a
 * mutable tag like v0.10 or a branch is pinned too, not just main:
 *
 *   --ref-map '{"llm-d/llm-d":"v0.10.0","llm-d/llm-d-router":"v0.11.0"}'
 *
 * The refs come from source-refs.yaml via `llmd-site version cut`, which also
 * refuses to cut when docs/ links to an llm-d repo the map does not list.
 * Baking fails here too if any such link survives, so the two cannot diverge.
 *
 * --ref is the single-repo shorthand for llm-d/llm-d, kept for manual runs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSyncMap, makeDocsPreprocessor } from './lib/preprocess.mjs';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let imgBase = '/img/docs/';
let ref = null;
let refMapJSON = null;
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--img-base') imgBase = args[++i];
  else if (args[i].startsWith('--img-base=')) imgBase = args[i].slice('--img-base='.length);
  else if (args[i] === '--ref-map') refMapJSON = args[++i];
  else if (args[i].startsWith('--ref-map=')) refMapJSON = args[i].slice('--ref-map='.length);
  else if (args[i] === '--ref') ref = args[++i];
  else if (args[i].startsWith('--ref=')) ref = args[i].slice('--ref='.length);
  else positional.push(args[i]);
}

/** @type {Record<string, string>} */
let refMap = {};
if (refMapJSON) {
  try {
    refMap = JSON.parse(refMapJSON);
  } catch (err) {
    console.error(`bake-docs: --ref-map is not valid JSON: ${err.message}`);
    process.exit(1);
  }
}
// --ref is shorthand for the llm-d/llm-d entry and never overrides --ref-map.
if (ref && !refMap['llm-d/llm-d']) refMap['llm-d/llm-d'] = ref;
// The guide banner's checkout ref follows llm-d/llm-d.
const llmdRef = refMap['llm-d/llm-d'] ?? null;
const pinning = Object.keys(refMap).length > 0;
if (!imgBase.endsWith('/')) imgBase += '/';
const docsDir = path.resolve(positional[0] || path.join(siteDir, 'docs'));
const syncMap = loadSyncMap(docsDir);
if (llmdRef) syncMap.ref = llmdRef;
const preprocess = makeDocsPreprocessor({ docsDir, syncMap });

/**
 * Any llm-d GitHub source link, capturing the repo, the kind and the ref.
 *
 * The ref class is positive, not an exclusion list: a git ref may only hold
 * letters, digits, ".", "_", "-" and "+" (a "/" would be ambiguous with the
 * path that follows). Structural characters therefore stay out of the ref, so
 * "**<url>/tree/main**" yields "main", not "main**".
 *
 * This is the same class as linkRE in
 * tools/llmd-site/internal/srcrefs/srcrefs.go. The two must agree: anything
 * this pattern misses is a link the cut leaves on a moving ref while the Go
 * checker reports it. TestBakeAgreesWithScanner runs both over one fixture
 * list so a change to either boundary fails the build.
 */
const LLMD_LINK = /github\.com\/(llm-d\/[A-Za-z0-9._-]+)\/(tree|blob|raw)\/([A-Za-z0-9._+-]+)/g;

/** Mirrors Immutable() in tools/llmd-site/internal/srcrefs/srcrefs.go. */
const isImmutable = (ref) =>
  /^v?\d+\.\d+\.\d+(\.\d+)*(-[0-9A-Za-z.-]+)?$/.test(ref) || /^[0-9a-f]{40}$/.test(ref);

/**
 * Mirrors trimRefPunct() in srcrefs.go: a bare URL ending a clause lets the ref
 * absorb the full stop or comma, which must survive the rewrite.
 */
const trimRefPunct = (ref) => ref.replace(/[.,]+$/, '');

/**
 * Pin a listed repo's links to its ref, whatever they name now — main, a
 * mutable minor tag, or a ref from another release. Repos the release does not
 * list are left alone; their links must already be immutable, which the cut
 * guard and `llmd-site check refs` both enforce.
 */
const pinRef = (text) => {
  let out = text.replace(LLMD_LINK, (whole, repo, kind, rawRef) => {
    const pin = refMap[repo];
    if (!pin) return whole;
    const ref = trimRefPunct(rawRef);
    const tail = rawRef.slice(ref.length);
    if (ref === pin) return whole;
    return `github.com/${repo}/${kind}/${pin}${tail}`;
  });
  if (llmdRef) out = out.replace(/("ref":\s*)"main"/g, `$1${JSON.stringify(llmdRef)}`);
  return out;
};

/**
 * Links that would still fail `llmd-site check refs` after baking: a listed
 * repo the rewrite did not reach, or an unlisted repo on a moving ref. Uses the
 * same pattern as pinRef, so the two cannot disagree about what a link is.
 */
const problems = new Map();
const note = (msg, file) => {
  if (!problems.has(msg)) problems.set(msg, new Set());
  problems.get(msg).add(file);
};
const collectProblems = (text, file) => {
  for (const m of text.matchAll(LLMD_LINK)) {
    const [, repo, , rawRef] = m;
    const ref = trimRefPunct(rawRef);
    const pin = refMap[repo];
    if (pin) {
      if (ref !== pin) note(`${repo} is at ${ref} but this release pins ${pin}`, file);
    } else if (!isImmutable(ref)) {
      note(`${repo} tracks ${ref} and this release lists no ref for it`, file);
    }
  }
};

/** Path for messages: repo-relative when inside the site, else absolute. */
const displayPath = (full) => {
  const r = path.relative(siteDir, full);
  return r.startsWith('..') ? full : r;
};

/**
 * Transformed files, collected before anything is written. An unpinned repo
 * aborts the run, and a half-baked docs/ would be worse than none, so the
 * writes happen only once every file has passed.
 *
 * @type {Array<[string, string]>}
 */
const pending = [];

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
      if (pinning) {
        after = pinRef(after);
        collectProblems(after, displayPath(full));
      }
      if (after !== before) pending.push([full, after]);
    }
  }
}

if (!fs.existsSync(docsDir)) {
  console.error(`bake-docs: docs dir not found: ${docsDir}`);
  process.exit(1);
}
walk(docsDir);

if (problems.size > 0) {
  console.error('bake-docs: links that would still fail `llmd-site check refs`:');
  for (const msg of [...problems.keys()].sort()) {
    const files = [...problems.get(msg)].sort();
    console.error(`  ${msg}`);
    console.error(`    ${files.slice(0, 3).join(', ')}${files.length > 3 ? `, … (${files.length} files)` : ''}`);
  }
  console.error('Add a ref for each repo to source-refs.yaml under this release, then re-run.');
  process.exit(1);
}

for (const [full, after] of pending) fs.writeFileSync(full, after);

console.log(`✓ baked ${pending.length} file(s) under ${displayPath(docsDir)}`);
if (pinning) {
  const pairs = Object.entries(refMap).sort(([a], [b]) => a.localeCompare(b));
  console.log(`  pinned source links: ${pairs.map(([r, v]) => `${r}@${v}`).join(', ')}`);
}

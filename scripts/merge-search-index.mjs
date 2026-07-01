#!/usr/bin/env node
/**
 * merge-search-index.mjs
 *
 * After llmd-site build copies the /docs subsite into build/docs/, merge the
 * root-site and docs-site search outputs into a single lunr index at build/.
 *
 * This intentionally consumes generated JSON artifacts only:
 *   - build/search-doc.json (main site)
 *   - build/docs/search-doc.json (docs subsite)
 *
 * Avoid importing internal source files from docusaurus-lunr-search so this
 * script remains stable across plugin upgrades.
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import lunr from 'lunr';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(PROJECT_DIR, 'build');
const SEARCH_DOC = path.join(BUILD_DIR, 'search-doc.json');
const LUNR_INDEX = path.join(BUILD_DIR, 'lunr-index.json');
const DOCS_SEARCH_DOC = path.join(BUILD_DIR, 'docs', 'search-doc.json');

function readSearchDoc(searchDocPath, label) {
  if (!fs.existsSync(searchDocPath)) {
    throw new Error(`missing ${label}: ${searchDocPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(searchDocPath, 'utf8'));
  return {
    searchDocs: payload.searchDocs ?? [],
    options: payload.options ?? {},
  };
}

function buildLunrIndex(searchDocs, options = {}) {
  const fields = {
    title: {boost: 200, ...options.fields?.title},
    content: {boost: 2, ...options.fields?.content},
    keywords: {boost: 100, ...options.fields?.keywords},
  };

  const lunrBuilder = lunr(function configure() {
    this.ref('id');
    Object.entries(fields).forEach(([key, value]) => this.field(key, value));
    this.metadataWhitelist = ['position'];

    const {build} = this;
    this.build = () => {
      this.build = build;
      return this;
    };
  });

  searchDocs.forEach((doc, id) => {
    lunrBuilder.add({
      id,
      title: doc.title,
      content: doc.content,
      keywords: doc.keywords ?? '',
    });
  });

  return lunrBuilder.build();
}

function updateHashedCopies(searchDocContents, lunrIndexContents) {
  for (const entry of fs.readdirSync(BUILD_DIR)) {
    if (/^search-doc-\d+\.json$/.test(entry)) {
      fs.writeFileSync(path.join(BUILD_DIR, entry), searchDocContents);
    }
    if (/^lunr-index-\d+\.json$/.test(entry)) {
      fs.writeFileSync(path.join(BUILD_DIR, entry), lunrIndexContents);
    }
  }
}

async function main() {
  const main = readSearchDoc(SEARCH_DOC, 'main site search doc');
  const docs = readSearchDoc(DOCS_SEARCH_DOC, 'docs site search doc');
  const options = Object.keys(main.options).length > 0 ? main.options : docs.options;
  const mergedDocs = [...main.searchDocs, ...docs.searchDocs];

  const lunrIndex = buildLunrIndex(mergedDocs, options);
  const searchDocContents = JSON.stringify({searchDocs: mergedDocs, options});
  const lunrIndexContents = JSON.stringify(lunrIndex);

  fs.writeFileSync(SEARCH_DOC, searchDocContents);
  fs.writeFileSync(LUNR_INDEX, lunrIndexContents);
  updateHashedCopies(searchDocContents, lunrIndexContents);

  const docsUrlCount = mergedDocs.filter((doc) => doc.url?.startsWith('/docs')).length;
  console.log(
    `merge-search-index: ${mergedDocs.length} total entries (${main.searchDocs.length} main + ${docs.searchDocs.length} docs, ${docsUrlCount} /docs URLs)`,
  );
}

main().catch((error) => {
  console.error('merge-search-index failed:', error);
  process.exit(1);
});

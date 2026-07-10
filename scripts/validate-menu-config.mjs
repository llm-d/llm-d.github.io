#!/usr/bin/env node
/**
 * validate-menu-config.mjs — check docs/menu-config.json against docs/ tree.
 *
 * LEGACY: manual validation only (not run in CI). Build-time sidebar wiring
 * lives in scripts/lib/sidebar.mjs via docusaurus.config.js.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMenuConfig, validateMenuConfig } from './lib/sidebar.mjs';

const websiteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = loadMenuConfig(path.join(websiteDir, 'docs', 'menu-config.json'));
const docsDir = path.join(websiteDir, 'docs');

/** @type {string[]} */
const warnings = [];
validateMenuConfig(config, docsDir, {
  warn: (msg) => warnings.push(msg),
});

if (warnings.length > 0) {
  console.error('menu-config.json validation failed:\n');
  for (const w of warnings) console.error(`  - ${w}`);
  process.exit(1);
}

console.log('menu-config.json OK');

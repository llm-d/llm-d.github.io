#!/usr/bin/env node
/**
 * cut-version.mjs — freeze the current dev docs as a released version.
 *
 *   npm run version:cut -- 0.8.0
 *
 * Runs `docusaurus docs:version <v>`, which snapshots the current docs/ (with its
 * _category_.json and how-to-guides) into versioned_docs/version-<v>/, freezes the
 * sidebar into versioned_sidebars/, and appends to versions.json. The config picks
 * the new version up automatically (highest version at /docs, dev at /docs/dev).
 *
 * Commit versioned_docs/, versioned_sidebars/, and versions.json afterwards.
 */
import { execFileSync } from 'node:child_process';

const version = process.argv[2];
if (!version || !/^\d+\.\d+(\.\d+)?$/.test(version)) {
  console.error('Usage: npm run version:cut -- <x.y[.z]>   (e.g. 0.8.0)');
  process.exit(1);
}

execFileSync('npx', ['docusaurus', 'docs:version', version], { stdio: 'inherit' });
console.log(`\n✓ cut docs version ${version}. Review & commit versioned_docs/version-${version}/.`);

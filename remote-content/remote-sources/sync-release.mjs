#!/usr/bin/env node
/**
 * Release Sync Script
 *
 * Fetches the latest release information from GitHub and updates components-data.yaml
 * This is a one-time sync script to be run manually when updating to a new release.
 *
 * Usage:
 *   node sync-release.mjs              # Apply changes
 *   node sync-release.mjs --dry-run    # Preview changes without writing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_API_URL = 'https://api.github.com/repos/llm-d/llm-d/releases/latest';
const YAML_PATH = path.join(__dirname, 'components-data.yaml');

/**
 * Fetch the latest release from GitHub
 */
async function fetchLatestRelease() {
  console.log('Fetching latest release from GitHub...');

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'llm-d-website-sync',
  };

  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
    console.log('Using authenticated GitHub API request');
  }

  const response = await fetch(GITHUB_API_URL, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Parse release date into formatted string
 */
function formatReleaseDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Parse the "LLM-D Component Summary" markdown table from release body.
 *
 * Expected table format:
 *   ## LLM-D Component Summary
 *   | Component | Version | Previous Version | Type |
 *   | --- | --- | --- | --- |
 *   | org/name          | `vX.Y.Z` | `vA.B.C` | Image            |
 *   | org/name (variant)| `vX.Y.Z` | NA       | Image (New)      |
 *   | org/name          | `vX.Y.Z` | Deprecated in vA | Image (Re-enabled) |
 *
 * Returns an array of parsed entries.
 */
function parseComponentTable(releaseBody) {
  const entries = [];

  // Isolate the LLM-D Component Summary section (stop at next ## section or ---)
  const sectionMatch = releaseBody.match(
    /##\s+LLM-D Component Summary\s*\n([\s\S]*?)(?=\n##\s|\n---\s*\n|$)/i
  );
  if (!sectionMatch) {
    return entries;
  }

  for (const line of sectionMatch[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;

    const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;

    const [component, versionRaw, , typeRaw] = cells;

    // Skip header and separator rows
    if (component === 'Component' || component.startsWith('---')) continue;

    const version = versionRaw.replace(/`/g, '').trim();
    const type = typeRaw.trim();

    // Parse "org/repo-name" or "org/repo-name (Variant)"
    const match = component.match(/^([\w-]+)\/([\w-]+)(?:\s+\(([^)]+)\))?/);
    if (!match) continue;

    const org = match[1].trim();
    const repoName = match[2].trim();
    const variant = match[3] ? match[3].trim() : null;

    entries.push({
      org,
      repoName,
      variant,
      version,
      type,
      isNew: /\bNew\b/i.test(type),
      isReenabled: /Re-enabled/i.test(type),
      isImage: /Image/i.test(type),
      isHelmChart: /Helm Chart/i.test(type),
      isLibrary: /Library/i.test(type),
    });
  }

  return entries;
}

/**
 * Return candidate YAML names for a release table entry, in priority order.
 *
 * Handles:
 *   - Variant suffix:  (repoName="llm-d-cuda", variant="debug") → "llm-d-cuda-debug"
 *   - Direct match:    repoName="llm-d-inference-scheduler"     → "llm-d-inference-scheduler"
 *   - Stripped prefix: repoName="llm-d-workload-variant-autoscaler" → "workload-variant-autoscaler"
 */
function getCandidateNames(repoName, variant) {
  const candidates = [];

  if (variant) {
    candidates.push(`${repoName}-${variant.toLowerCase()}`);
  }

  candidates.push(repoName);

  if (repoName.startsWith('llm-d-')) {
    candidates.push(repoName.slice('llm-d-'.length));
  }

  return candidates;
}

/**
 * Transform version tag for repos that use non-standard tag formats.
 * llm-d-modelservice uses tags like "llm-d-modelservice-v0.4.7" instead of plain "v0.4.7".
 */
function transformVersionTag(yamlName, version) {
  if (!version) return version;
  if (yamlName === 'llm-d-modelservice') {
    return `${yamlName}-${version}`;
  }
  return version;
}

/**
 * Determine the sourceRepo for a new or re-enabled container image.
 *
 * Priority:
 *   1. If it has a variant, inherit sourceRepo from the base image (e.g., llm-d-cuda → llm-d/llm-d)
 *   2. Find an existing containerImage whose name shares a prefix with this image
 *   3. If a standalone component repo exists for this name, use that
 *   4. Default to "llm-d/llm-d" for images in the llm-d org
 */
function determineSourceRepo(org, repoName, variant, yamlData) {
  const images = yamlData.containerImages || [];
  const components = yamlData.components || [];

  if (variant) {
    const base = images.find(img => img.name === repoName);
    if (base?.sourceRepo) return base.sourceRepo;
  }

  const prefixMatch = images.find(img =>
    repoName.startsWith(img.name) || img.name.startsWith(repoName)
  );
  if (prefixMatch?.sourceRepo) return prefixMatch.sourceRepo;

  const componentMatch = components.find(c =>
    c.name === repoName || `llm-d-${c.name}` === repoName
  );
  if (componentMatch) return `${org}/${repoName}`;

  if (org === 'llm-d') return 'llm-d/llm-d';

  return `${org}/${repoName}`;
}

/**
 * Generate a basic description for a new or re-enabled container image.
 */
function generateImageDescription(name, releaseVersion, isReenabled) {
  const label = name.replace(/^llm-d-/, '').replace(/-/g, ' ');
  const title = label.charAt(0).toUpperCase() + label.slice(1);
  const note = isReenabled ? `Re-enabled in ${releaseVersion}` : `New in ${releaseVersion}`;
  return `${title} inference image (${note})`;
}

/**
 * Update YAML components[] versions from the parsed release table.
 * Returns { updated: Component[], updateCount: number }
 */
function updateComponents(yamlComponents, tableEntries) {
  const updated = [...yamlComponents];
  let updateCount = 0;

  for (const entry of tableEntries) {
    if (!entry.version) continue;

    const candidates = getCandidateNames(entry.repoName, null);
    const idx = updated.findIndex(c => candidates.includes(c.name));
    if (idx < 0) continue;

    const comp = updated[idx];
    const newVersion = transformVersionTag(comp.name, entry.version);

    if (comp.version !== newVersion) {
      console.log(`  ✓ ${comp.name}: ${comp.version} → ${newVersion}`);
      updated[idx] = { ...comp, version: newVersion };
      updateCount++;
    } else {
      console.log(`  - ${comp.name}: ${newVersion} (unchanged)`);
    }
  }

  return { updated, updateCount };
}

/**
 * Update containerImages[] and deprecatedImages[] from the parsed release table.
 *
 * - Existing images: version updated in place
 * - isNew images: appended to containerImages
 * - isReenabled images: moved from deprecatedImages → containerImages, version updated
 *
 * Returns { images, deprecated, updateCount, addCount }
 */
function updateContainerImages(yamlData, tableEntries, releaseVersion) {
  const images = [...(yamlData.containerImages || [])];
  const deprecated = [...(yamlData.deprecatedImages || [])];
  let updateCount = 0;
  let addCount = 0;

  for (const entry of tableEntries) {
    if (!entry.isImage) continue;

    const candidates = getCandidateNames(entry.repoName, entry.variant);
    // Try candidates in priority order (most specific first) to avoid false matches
    // e.g., "llm-d-cuda-debug" must not fall back and match "llm-d-cuda"
    let idx = -1;
    for (const candidate of candidates) {
      idx = images.findIndex(img => img.name === candidate);
      if (idx >= 0) break;
    }

    if (idx >= 0) {
      // Update existing image version
      const img = images[idx];
      if (img.version !== entry.version) {
        console.log(`  ✓ ${img.name}: ${img.version} → ${entry.version}`);
        images[idx] = { ...img, version: entry.version };
        updateCount++;
      } else {
        console.log(`  - ${img.name}: ${entry.version} (unchanged)`);
      }
    } else if (entry.isReenabled) {
      // Move from deprecatedImages → containerImages
      const depIdx = deprecated.findIndex(d => candidates.includes(d.name));
      const imageName = depIdx >= 0 ? deprecated[depIdx].name : candidates[0];
      const sourceRepo = determineSourceRepo(entry.org, entry.repoName, entry.variant, yamlData);
      const description = generateImageDescription(imageName, releaseVersion, true);

      console.log(`  + ${imageName}: re-enabled at ${entry.version} (sourceRepo: ${sourceRepo})`);
      images.push({ name: imageName, description, version: entry.version, sourceRepo });

      if (depIdx >= 0) {
        deprecated.splice(depIdx, 1);
      }
      addCount++;
    } else if (entry.isNew) {
      // Add brand-new image
      const imageName = candidates[0];
      const sourceRepo = determineSourceRepo(entry.org, entry.repoName, entry.variant, yamlData);
      const description = generateImageDescription(imageName, releaseVersion, false);

      console.log(`  + ${imageName}: added at ${entry.version} (sourceRepo: ${sourceRepo})`);
      images.push({ name: imageName, description, version: entry.version, sourceRepo });
      addCount++;
    }
  }

  return { images, deprecated, updateCount, addCount };
}

/**
 * Main sync function
 */
async function syncRelease(dryRun = false) {
  try {
    const release = await fetchLatestRelease();

    console.log('\n✓ Latest release fetched successfully');
    console.log(`  Version:   ${release.tag_name}`);
    console.log(`  Name:      ${release.name}`);
    console.log(`  Published: ${release.published_at}`);
    console.log(`  URL:       ${release.html_url}`);

    const releaseDate = new Date(release.published_at);
    const releaseInfo = {
      version: release.tag_name,
      releaseDate: releaseDate.toISOString().split('T')[0],
      releaseDateFormatted: formatReleaseDate(release.published_at),
      releaseUrl: release.html_url,
      releaseName: release.name || `llm-d ${release.tag_name}`,
    };

    console.log('\n✓ Release information parsed');

    // Parse the component summary table
    console.log('\nParsing component table from release notes...');
    const tableEntries = parseComponentTable(release.body);

    if (tableEntries.length === 0) {
      console.warn('  ⚠ No entries found in release table.');
      console.warn('  Check that the release body contains a "## LLM-D Component Summary" section.');
    } else {
      console.log(`✓ Found ${tableEntries.length} entries in release table:`);
      for (const e of tableEntries) {
        const flags = [e.isNew && 'new', e.isReenabled && 're-enabled'].filter(Boolean).join(', ');
        const varStr = e.variant ? ` (${e.variant})` : '';
        console.log(`  - ${e.org}/${e.repoName}${varStr} ${e.version}${flags ? ` [${flags}]` : ''}`);
      }
    }

    // Load existing YAML
    console.log('\nLoading existing components-data.yaml...');
    const yamlContent = fs.readFileSync(YAML_PATH, 'utf8');
    const data = yaml.load(yamlContent);

    // Apply updates
    data.release = releaseInfo;

    console.log('\nUpdating components...');
    const { updated: updatedComponents, updateCount: compUpdates } =
      updateComponents(data.components, tableEntries);
    data.components = updatedComponents;

    console.log('\nUpdating container images...');
    const { images, deprecated, updateCount: imgUpdates, addCount } =
      updateContainerImages(data, tableEntries, release.tag_name);
    data.containerImages = images;
    // Only keep deprecatedImages key if there are any remaining
    if (deprecated.length > 0) {
      data.deprecatedImages = deprecated;
    } else {
      delete data.deprecatedImages;
    }

    // Serialize
    const yamlHeader = `# llm-d Components and Release Information
# This file contains static data for generating the Components documentation page
# Update this file when there are new releases or component changes
#
# Last synced from: ${release.html_url}
# Sync date: ${new Date().toISOString()}

`;

    const updatedYaml = yamlHeader + yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    if (dryRun) {
      console.log('\n' + '='.repeat(80));
      console.log('DRY RUN - Would write the following to components-data.yaml:');
      console.log('='.repeat(80));
      console.log(updatedYaml);
      console.log('='.repeat(80));
      console.log('\nNo changes written (dry run mode)');
    } else {
      fs.writeFileSync(YAML_PATH, updatedYaml, 'utf8');
      console.log('\n✓ Updated components-data.yaml successfully!');
    }

    console.log('\n' + '='.repeat(80));
    console.log('Summary:');
    console.log('='.repeat(80));
    console.log(`Release Version:          ${releaseInfo.version}`);
    console.log(`Release Date:             ${releaseInfo.releaseDateFormatted}`);
    console.log(`Table entries parsed:     ${tableEntries.length}`);
    console.log(`Components updated:       ${compUpdates}`);
    console.log(`Container images updated: ${imgUpdates}`);
    console.log(`New/re-enabled images:    ${addCount}`);
    console.log(`YAML File:                ${YAML_PATH}`);
    console.log('='.repeat(80));

    if (!dryRun) {
      console.log('\nNext steps:');
      console.log('1. Review the changes: git diff remote-content/remote-sources/components-data.yaml');
      console.log('2. Rebuild the site: npm run build');
      console.log(`3. Commit: git add remote-content/remote-sources/components-data.yaml && git commit -m "Update to release ${releaseInfo.version}"`);
    }

  } catch (error) {
    console.error('\n❌ Error syncing release:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-n');

if (dryRun) {
  console.log('Running in DRY RUN mode - no changes will be written\n');
}

syncRelease(dryRun);

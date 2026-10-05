/**
 * redirects.mjs — turn docs/redirects.json into client-side redirects.
 *
 * docs/redirects.json is authored in llm-d/llm-d and synced into docs/ alongside the
 * docs it describes, the same way menu-config.json is. Page URLs come from the folder
 * tree, so moving a page changes its URL; an entry in that file keeps the old URL
 * working. Adding one needs no change in this repo.
 */
import fs from 'node:fs';

/**
 * @param {string} configPath path to the synced docs/redirects.json
 * @returns {Record<string, string>} old docs path -> new docs path
 */
export function loadRedirects(configPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return parsed.moves ?? {};
  } catch (err) {
    // Missing file (e.g. before the first docs sync) -> no redirects.
    // Malformed JSON still fails loudly, as with menu-config.json.
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

/**
 * True once the newest RELEASED version uses the restructured tree. Until then the
 * unversioned /docs/* routes still serve the previous layout.
 *
 * @param {string | undefined} latestVersion newest entry in versions.json
 */
export function latestHasNewTree(latestVersion) {
  const [major, minor] = String(latestVersion ?? '0').split('.').map(Number);
  return Number.isFinite(major) && (major > 0 || (major === 0 && minor >= 10));
}

/**
 * The unreleased docs move as soon as the upstream change merges, so /docs/dev/* always
 * needs these. The unversioned /docs/* paths are the newest RELEASE, which keeps the
 * previous layout until `llmd-site version cut` promotes the new one — redirecting them
 * before that points at routes which do not exist, and the build rejects it. So the
 * unversioned set switches itself on when the latest release carries the new tree.
 *
 * @param {Record<string, string>} moves from loadRedirects
 * @param {string | undefined} latestVersion newest entry in versions.json
 * @returns {Array<{from: string, to: string}>}
 */
export function docsRedirects(moves, latestVersion) {
  const entries = Object.entries(moves);
  const dev = entries.map(([from, to]) => ({
    from: `/docs/dev/${from}`,
    to: `/docs/dev/${to}`,
  }));
  if (!latestHasNewTree(latestVersion)) return dev;
  return [
    ...dev,
    ...entries.map(([from, to]) => ({ from: `/docs/${from}`, to: `/docs/${to}` })),
  ];
}

// Build-time plugin: fetches release tags from llm-d/llm-d
// and writes them to a JSON file that the navbar component reads.

const fs = require('fs');
const path = require('path');

const REPO = 'llm-d/llm-d';
const OUTPUT = path.join(__dirname, '..', 'static', 'releases.json');

module.exports = function versionsPlugin() {
  return {
    name: 'llmd-versions-plugin',
    async loadContent() {
      try {
        // Fetch tags from GitHub API
        const resp = await fetch(
          `https://api.github.com/repos/${REPO}/tags?per_page=100`,
          {
            headers: process.env.GITHUB_TOKEN
              ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
              : {},
          }
        );
        if (!resp.ok) throw new Error(`GitHub API: ${resp.status}`);
        const tags = await resp.json();

        // Filter to stable releases (vX.Y or vX.Y.Z, no -rc etc.)
        // Then deduplicate to latest patch per minor
        const stable = tags
          .map((t) => t.name)
          .filter((n) => /^v\d+\.\d+(\.\d+)?$/.test(n));

        // Group by minor version, keep highest patch
        const byMinor = {};
        for (const tag of stable) {
          const m = tag.match(/^v(\d+\.\d+)/);
          if (!m) continue;
          const minor = m[1];
          if (!byMinor[minor] || tag > byMinor[minor]) {
            byMinor[minor] = tag;
          }
        }

        const versions = Object.values(byMinor).sort().reverse();
        fs.writeFileSync(OUTPUT, JSON.stringify(versions, null, 2));
        return versions;
      } catch (e) {
        console.warn(`[versions-plugin] Could not fetch releases: ${e.message}`);
        // Fallback: use existing file or empty
        if (fs.existsSync(OUTPUT)) {
          return JSON.parse(fs.readFileSync(OUTPUT, 'utf-8'));
        }
        return [];
      }
    },
    async contentLoaded({ content, actions }) {
      actions.setGlobalData({ releases: content });
    },
  };
};

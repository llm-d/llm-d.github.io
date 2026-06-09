// Build-time plugin: fetches release tags from llm-d/llm-d
// and writes them to a JSON file that the navbar component reads.

const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'static', 'releases.json');

const REPO = 'llm-d/llm-d';

module.exports = function versionsPlugin() {
  return {
    name: 'llmd-versions-plugin',
    async loadContent() {
      // If a local releases.json already exists, use it as-is.
      // This covers local dev and test builds where we don't want network calls.
      if (fs.existsSync(OUTPUT)) {
        try {
          const versions = JSON.parse(fs.readFileSync(OUTPUT, 'utf-8'));
          console.log(`[versions-plugin] Loaded ${versions.length} versions from local releases.json`);
          return versions;
        } catch (e) {
          console.warn(`[versions-plugin] Failed to parse local releases.json: ${e.message}, fetching from GitHub...`);
          // Fall through to GitHub fetch below
        }
      }

      // No local file (e.g. CI fresh checkout) — fetch from GitHub API and write the file.
      console.log('[versions-plugin] No local releases.json found, fetching from GitHub...');
      try {
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

        const stable = tags
          .map((t) => t.name)
          .filter((n) => /^v\d+\.\d+(\.\d+)?$/.test(n));

        // Use numeric semver comparison to pick highest patch per minor —
        // lexicographic ">" would wrongly rank v0.7.9 above v0.7.10.
        const semverGT = (a, b) => {
          const pa = a.replace(/^v/, '').split('.').map(Number);
          const pb = b.replace(/^v/, '').split('.').map(Number);
          for (let i = 0; i < 3; i++) {
            if ((pa[i] || 0) > (pb[i] || 0)) return true;
            if ((pa[i] || 0) < (pb[i] || 0)) return false;
          }
          return false;
        };

        const byMinor = {};
        for (const tag of stable) {
          const m = tag.match(/^v(\d+\.\d+)/);
          if (!m) continue;
          const minor = m[1];
          if (!byMinor[minor] || semverGT(tag, byMinor[minor])) byMinor[minor] = tag;
        }

        const versions = Object.values(byMinor).sort().reverse();
        fs.writeFileSync(OUTPUT, JSON.stringify(versions, null, 2));
        console.log(`[versions-plugin] Fetched and cached ${versions.length} versions from GitHub`);
        return versions;
      } catch (e) {
        console.warn(`[versions-plugin] GitHub fetch failed: ${e.message}`);
        return [];
      }
    },
    async contentLoaded({ content, actions }) {
      actions.setGlobalData({ releases: content });
    },
  };
};

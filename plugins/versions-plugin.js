// Build-time plugin: loads release tags and exposes them to the navbar component.

const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'static', 'releases.json');
const PREVIEW_OUTPUT = path.join(__dirname, '..', 'preview', 'static', 'releases.json');

const REPO = 'llm-d/llm-d';

module.exports = function versionsPlugin() {
  return {
    name: 'llmd-versions-plugin',
    async loadContent() {
      for (const file of [OUTPUT, PREVIEW_OUTPUT]) {
        if (fs.existsSync(file)) {
          try {
            const versions = JSON.parse(fs.readFileSync(file, 'utf-8'));
            console.log(`[versions-plugin] Loaded ${versions.length} versions from ${file}`);
            return versions;
          } catch (e) {
            console.warn(`[versions-plugin] Failed to parse ${file}: ${e.message}`);
          }
        }
      }

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

        const versions = Object.values(byMinor).sort((a, b) => {
          if (semverGT(a, b)) return -1;
          if (semverGT(b, a)) return 1;
          return 0;
        });
        fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
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

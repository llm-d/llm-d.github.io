# Contributing to llm-d Website

Thank you for your interest in contributing to the llm-d website! This repository manages the documentation website and follows both general project guidelines and website-specific processes.

## 📋 General Guidelines

This project follows the main llm-d [Contributing Guidelines](https://github.com/llm-d/llm-d/blob/main/CONTRIBUTING.md):

- **GitHub Issues**: All PRs should reference the associated issue. Include `Fixes #123` in the PR description when applicable so GitHub can auto-close the issue.
  If there isn't an issue for what you're doing, please create one first to outline or discuss the change before submitting a PR - this helps maintainers review and track changes effectively.
- **Branch Naming**: Use descriptive branch names (e.g., `feat/docs/update-autoscaling-guide`)
- **Commit Message Format**: Use Conventional Commits (e.g., `feat: add new guide for workload autoscaling`)
- **DCO Sign-off Required**: Use `git commit -s`
- **All changes via PR**: No direct pushes to main
- **Review required**: Maintainer approval needed
- **Preview deployments**: Available for all PRs

### DCO Instructions

We are requiring all contributors to sign off their commits with the Developer Certificate of Origin (DCO). This is a simple statement that you have the right to submit the code and that you agree to the project's license.

This is the DCO text that you agree to when you sign off (from https://developercertificate.org/):

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.

Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

#### How to Sign Off Commits

When you make a commit, add the `-s` flag to include the DCO sign-off:

```bash
git commit -s -m "feat: add new guide for workload autoscaling"
```

#### DCO via the command line

The most popular way to do DCO is to sign off your username and email address in the git command line.

First, configure your local git install.

```bash
git config --global user.name "Your Name"
git config --global user.email github-email@example.com
```

Always sign your commits with the -s flag.

```bash
git commit -s -m "This is my commit message"
```

That's it. Git adds your sign-off message in the commit message, and your contribution (commit) is now DCO compliant.

If you are having trouble with the DCO process, please see some [troubleshooting](https://www.secondstate.io/articles/dco/) documentation or reach out in the #website-and-docs channel on the llm-d Slack for assistance.

## 🎯 Quick Guide

### 📝 Documentation Changes

**Before making changes, check whether the content is synced from `llm-d/llm-d`:**

1. **Docs pages** (`/docs/...`): use **Edit this page** (points at the live source under `llm-d/llm-d` for the current/`dev` docs)
2. **Mirrored community pages** (`/community/contribute`, code of conduct, security, SIGs): look for the info callout that says the page mirrors a file from `llm-d` — edit that upstream file
3. **Local-only pages** (blog, landing, `community/index.mdx`, `community/events.mdx`, site config): edit in this repository

### 🔄 Types of Content

| Content Type | Location | How to Edit |
|--------------|----------|-------------|
| **Main Documentation** | Architecture, well-lit paths, API reference, operations, … | Edit in `llm-d/llm-d` under `docs/` (mirrored by `./bin/llmd-site sync`) |
| **Community Documentation** | Contributing, Code of Conduct, Security, SIGs | Edit the repo-root files in `llm-d/llm-d` (mapped in [`docs-sync.yaml`](docs-sync.yaml)) |
| **Local Content** | Blog posts, landing page, website config, community index/events | Edit in this repository |

## 📝 Editing Documentation

### Editing Main Documentation

Main documentation is mirrored from `llm-d/llm-d` `docs/**` into this repo’s `docs/` by `./bin/llmd-site sync`. Sidebar labels and order come from `docs/menu-config.json` (also synced from upstream).

**To update main documentation:**
1. Open the page on the site and use **Edit this page**, or edit the matching file under `docs/` in `llm-d/llm-d`
2. Submit a PR to `llm-d/llm-d`
3. Once merged, the website picks it up on the next deploy (or the nightly / `docs-updated` sync)

You normally do **not** need a PR in this repository for new or changed files under the mirrored `docs/` tree.

### Editing Community Documentation

These community pages are generated on sync from repo-root files in `llm-d/llm-d` (see the `community:` list in [`docs-sync.yaml`](docs-sync.yaml)):

| Upstream file | Site page |
|---------------|-----------|
| `CONTRIBUTING.md` | `/community/contribute` |
| `CODE_OF_CONDUCT.md` | `/community/code-of-conduct` |
| `SECURITY.md` | `/community/security` |
| `SIGS.md` | `/community/sigs` |

**To update mirrored community documentation:**
1. Edit the upstream file in `llm-d/llm-d`
2. Submit a PR to `llm-d/llm-d`
3. Once merged, the next website sync regenerates the matching `community/*.md` page

Authored (non-mirrored) community pages such as `community/index.mdx` and `community/events.mdx` are edited in this repository.

### Editing Local Content

For blog posts, landing pages, and website configuration:

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/llm-d.github.io.git
   cd llm-d.github.io
   npm ci
   npm run llmd-site
   ```

2. **Create Branch**
   ```bash
   git checkout -b docs/your-change-description
   ```

3. **Make Changes**
   - Blog posts: `blog/`
   - Landing page: `src/landing/` (then `npm run landing:css` if styles change)
   - Community index/events: `community/index.mdx`, `community/events.mdx`
   - Website config: `docusaurus.config.js`

4. **Sync docs (if needed) & preview**
   ```bash
   npm run sync          # optional: refresh docs/ + community mirrors from llm-d/llm-d
   npm start
   ```

5. **Commit & Push**
   ```bash
   git add .
   git commit -s -m "docs: your change description"
   git push origin docs/your-change-description
   ```

6. **Open Pull Request** with preview link for reviewers

## 🔧 Adding New Documentation

### Adding Main Documentation

To add new architecture, well-lit-path, API, or other docs content:

1. **Add the file under `docs/` in `llm-d/llm-d`** (for example `docs/architecture/...`, `docs/well-lit-paths/...`, `docs/operations/...`)
2. **Update `docs/menu-config.json` in `llm-d/llm-d`** if the page needs a sidebar label or position
3. **Submit a PR to `llm-d/llm-d`**

`./bin/llmd-site sync` mirrors upstream `docs/**` wholesale, so new files under that tree do not need a `docs-sync.yaml` entry in this repo.

To preview from a local `llm-d` checkout:

```bash
make llmd-site
./bin/llmd-site sync --local main   # or set LLMD_REPO=/path/to/llm-d
npm start
```

### Adding Community Documentation

To mirror a new repo-root file from `llm-d/llm-d` into the community section (for example `GOVERNANCE.md`):

1. **Add the source file to `llm-d/llm-d`** at the repository root (e.g. `GOVERNANCE.md`) and merge it there
2. **Add a `community:` entry in [`docs-sync.yaml`](docs-sync.yaml)** in this repository:

```yaml
community:
  # ...existing entries...
  - from: GOVERNANCE.md
    to: community/governance.md
    title: Project Governance
    sidebar_label: Governance
    sidebar_position: 7
```

2. **Import in remote-content.js**:

```javascript
// remote-content/remote-content.js
import governanceSource from './remote-sources/community/governance.js';

const remoteContentPlugins = [
  contributeSource,
  codeOfConductSource,
  securitySource,
  sigsSource,
  governanceSource,  // Add here
];
```

4. **Submit a PR to this repository** with the `docs-sync.yaml` change

The community sidebar is autogenerated from `community/` (`sidebarsCommunity.js`), so a correct `sidebar_position` / `sidebar_label` in the sync entry is enough.

## 🧪 Testing Changes

### Local Development Server

```bash
npm run sync    # when you need fresh upstream docs/community mirrors
npm start
```

Opens a browser with live reload. Most local changes reflect immediately.

### Full Build (matches deploy CI)

```bash
npm ci
npm run llmd-site
npm run build:all    # sync + landing CSS + Docusaurus build
# or: npm run ci     # sync + build + link check
```

This produces static output in `build/`. Prefer `npm run build:all` / `make build` over bare `npm run build` (the latter skips landing CSS and only auto-syncs if `docs/` is missing).

### Preview Deployments

Every PR automatically gets a Netlify preview deployment. Check the PR for the preview link.

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Build / sync errors** | Run `./bin/llmd-site validate` and confirm `docs-sync.yaml` / upstream paths are correct |
| **Content not syncing** | Verify the file exists on `llm-d/llm-d` `main`; for community pages, confirm a matching `community:` entry in `docs-sync.yaml` |
| **Preview not updating** | Netlify builds can take 5–10 minutes; check build logs |
| **Links broken** | Use in-tree relative doc links or full GitHub URLs; run `npm run check-links` after a build |
| **Images not showing** | Doc images are mirrored to `static/img/docs/` on sync; confirm the image exists under upstream `docs/` |

## 📚 Additional Resources

- [README.md](README.md) — Website layout, sync, and build overview
- [tools/llmd-site/README.md](tools/llmd-site/README.md) — `llmd-site` CLI reference
- [docs-sync.yaml](docs-sync.yaml) — Sync sources and community mirror pages
- [Docusaurus Documentation](https://docusaurus.io/)
- [llm-d Main Repository](https://github.com/llm-d/llm-d)
- [llm-d Contributing Guidelines](https://github.com/llm-d/llm-d/blob/main/CONTRIBUTING.md)

## 💬 Getting Help

- **Slack**: Join [#website-and-docs](https://llm-d.ai/slack) channel
- **Issues**: Open an issue in this repository for website-specific questions
- **Community**: See [Community Guidelines](https://llm-d.ai/community/code-of-conduct)

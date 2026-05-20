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

**Before making changes, check if the content is synced:**

1. **Look for "Content Source" banners** at the bottom of pages
2. **If banner exists**: Click "edit the source file" to edit in the source repository (llm-d/llm-d)
3. **If no banner**: The content is local to this repository - proceed with PR below

### 🔄 Types of Content

| Content Type | Location | How to Edit |
|--------------|----------|-------------|
| **Main Documentation** | Architecture, guides, API reference | Edit in llm-d/llm-d (synced via `preview/scripts/sync-docs.sh`) |
| **Community Documentation** | Contributing, Code of Conduct, Security, SIGs | Edit in llm-d/llm-d (synced via `remote-content/`) |
| **Local Content** | Blog posts, landing pages, website config | Edit in this repository |

## 📝 Editing Documentation

### Editing Main Documentation

Main documentation (architecture, guides, API reference, resources) is synced from the `llm-d/llm-d` repository.

**To update main documentation:**
1. Find the source file using the "Content Source" banner at the bottom of the page
2. Click "edit the source file" to open the file in the llm-d/llm-d repository
3. Submit a PR to llm-d/llm-d
4. Once merged, changes will appear on the website after the next deployment

**Files synced via `preview/scripts/sync-docs.sh`:**
- Architecture documentation
- User guides
- API reference
- Resources (monitoring, gateway, RDMA)
- Getting Started pages

### Editing Community Documentation

Community documentation files are synced from the root of the `llm-d/llm-d` repository:
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- SECURITY.md
- SIGS.md

**To update community documentation:**
1. Edit the file in the llm-d/llm-d repository
2. Submit a PR to llm-d/llm-d
3. Once merged, changes sync automatically during website build

### Editing Local Content

For content **without** "Content Source" banners (blog posts, landing pages, website configuration):

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/llm-d.github.io.git
   cd llm-d.github.io
   npm install
   ```

2. **Create Branch**
   ```bash
   git checkout -b docs/your-change-description
   ```

3. **Make Changes**
   - Edit files directly in this repository
   - Blog posts: `blog/`
   - Landing pages: `src/pages/`
   - Website config: `docusaurus.config.js`

4. **Test Locally**
   ```bash
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

To add new architecture, guide, or API documentation:

1. **Add the file to llm-d/llm-d repository** in the appropriate location:
   - Architecture: `docs/architecture/`
   - Guides: `docs/guides/`
   - API reference: `docs/api-reference/`
   - Resources: `docs/resources/`

2. **Update sync-docs.sh** to copy the new file:
   ```bash
   # Edit preview/scripts/sync-docs.sh
   # Add a new cp_doc line in the appropriate section
   cp_doc "$WIP/path/to/newfile.md" "$DOCS_DIR/destination/newfile.md"
   ```

3. **Test the sync locally:**
   ```bash
   cd preview
   ./scripts/sync-docs.sh
   npm run build
   ```

4. **Submit PR to this repository** with the sync-docs.sh changes

### Adding Community Documentation

To add a new community file (e.g., `GOVERNANCE.md`):

1. **Create the remote source config** at `remote-content/remote-sources/community/governance.js`:

```javascript
import { createContentWithSource, createStandardTransform, getLlmdRepoConfig } from '../utils.js';

const { sourceBaseUrl } = getLlmdRepoConfig();
const contentTransform = createStandardTransform();

export default [
  'docusaurus-plugin-remote-content',
  {
    name: 'governance',
    sourceBaseUrl,
    outDir: 'community',
    documents: ['GOVERNANCE.md'],
    noRuntimeDownloads: false,
    performCleanup: true,

    modifyContent(filename, content) {
      if (filename === 'GOVERNANCE.md') {
        return createContentWithSource({
          title: 'Project Governance',
          description: 'Governance structure for the llm-d project',
          sidebarLabel: 'Governance',
          sidebarPosition: 6,
          filename: 'GOVERNANCE.md',
          newFilename: 'governance.md',
          content,
          contentTransform
        });
      }
      return undefined;
    },
  },
];
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

3. **Add the source file to llm-d/llm-d** (e.g., `GOVERNANCE.md` in repo root)

4. **Test locally:**
   ```bash
   npm run build
   ```

## 🧪 Testing Changes

### Local Development Server

```bash
npm start
```

Opens a browser with live reload. Most changes reflect immediately.

### Full Build

```bash
npm run build
```

Generates static content into the `build` directory. Tests the complete build including:
1. Main site build (includes remote-content community files)
2. Preview docs sync from llm-d/llm-d
3. Preview docs build
4. Merge of preview build into main site at `/docs`

### Preview Deployments

Every PR automatically gets a Netlify preview deployment. Check the PR for the preview link.

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Build errors** | Check that all remote sources are accessible from llm-d/llm-d |
| **Content not syncing** | Verify file exists in llm-d/llm-d main branch |
| **Preview not updating** | Netlify builds can take 5-10 minutes; check build logs |
| **Links broken** | Ensure links use proper Docusaurus paths or full GitHub URLs |
| **Images not showing** | Verify image paths in `preview/scripts/sync-docs.sh` |

## 📚 Additional Resources

- [README.md](README.md) - Full documentation of the website structure
- [Docusaurus Documentation](https://docusaurus.io/)
- [llm-d Main Repository](https://github.com/llm-d/llm-d)
- [llm-d Contributing Guidelines](https://github.com/llm-d/llm-d/blob/main/CONTRIBUTING.md)

## 💬 Getting Help

- **Slack**: Join [#website-and-docs](https://llm-d.ai/slack) channel
- **Issues**: Open an issue in this repository for website-specific questions
- **Community**: See [Community Guidelines](https://llm-d.ai/docs/community/code-of-conduct)

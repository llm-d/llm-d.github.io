# llm-d Website Repository

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

Site previews are powered by Netlify and can be viewed in the specific PR.

If you spot any errors or omissions in the site, please open an issue at [github.com/llm-d/llm-d.github.io](https://github.com/llm-d/llm-d.github.io/issues).

## 📋 Documentation Types

This repository contains two types of documentation:

1. **Local Documentation** - Written directly in this repository (blog posts, landing pages, etc.)
2. **Remote Synced Content** - Automatically synced from llm-d/llm-d repository during build

### Remote Synced Content

Documentation is automatically synced from the `llm-d/llm-d` repository during the build process:

- **Main Documentation** (`/docs/`) - Architecture, guides, API reference, resources
  - Synced via `preview/scripts/sync-docs.sh`
  - Pulls specific files from `llm-d/llm-d@main`
  - Applies transformations for Docusaurus compatibility

- **Community Documentation** (`/docs/community/`) - Contributing, Code of Conduct, Security, SIGs
  - Synced via remote-content plugins in `remote-content/`
  - Simple markdown files from root of `llm-d/llm-d@main`

Files with remote content show a "Content Source" banner at the bottom with links to edit the original source.

## 🔄 Documentation Syncing Systems

### Main Documentation (preview/sync-docs.sh)

The primary documentation sync system in `preview/scripts/sync-docs.sh`:

**What it syncs:**
- Architecture documentation (`/docs/architecture/`)
- User guides (`/docs/guides/`)
- API reference (`/docs/api-reference/`)
- Resources (`/docs/resources/`)
- Getting Started (`/docs/getting-started/`)

**How it works:**
1. Performs sparse checkout of `llm-d/llm-d` repository
2. Copies specific files to `preview/docs/` with explicit path mapping
3. Applies transformations (tabs, callouts, images, MDX fixes)
4. Builds preview site and merges into main site at `/docs`

**Transformations applied:**
- Converts GitHub tab markers to Docusaurus `<Tabs>` components
- Converts GitHub callouts (`> [!NOTE]`) to Docusaurus admonitions
- Fixes image paths to point to `/img/docs/`
- Fixes HTML tags for MDX compatibility
- Converts HTML comments to JSX comments

See `preview/scripts/transformations.sh` for transformation details.

### Community Documentation (remote-content/)

A minimal remote-content plugin system for community files:

**What it syncs:**
- CONTRIBUTING.md → `/docs/community/contribute.md`
- CODE_OF_CONDUCT.md → `/docs/community/code-of-conduct.md`
- SECURITY.md → `/docs/community/security.md`
- SIGS.md → `/docs/community/sigs.md`

**How it works:**
1. Uses `docusaurus-plugin-remote-content` to download files
2. Applies minimal transformations (converts relative links to GitHub URLs)
3. Adds frontmatter and source attribution callout

**File structure:**
```
remote-content/
├── remote-content.js                    # Plugin exports
└── remote-sources/
    ├── repo-transforms.js              # Link transformation logic
    ├── utils.js                        # Frontmatter and callout generation
    └── community/                      # Individual file configs
        ├── contribute.js
        ├── code-of-conduct.js
        ├── security.js
        └── sigs.js
```

## 🛠️ Development

### Installation

```bash
npm install
```

### Local Development

Choose the development mode based on what content you need:

#### Fast Development (Local Content Only)

```bash
npm start
```

Starts a live development server with hot reload for fast iteration on:
- Landing pages and blog posts
- Website configuration
- Community docs (synced via remote-content plugin)

**Note:** Does NOT include main documentation from llm-d/llm-d (architecture, guides, API reference).

#### Full Site Preview (All Content)

```bash
# Build everything once (includes all synced docs)
npm run build:all

# Serve the built site
npm run serve
```

This is the recommended workflow for previewing the complete site locally, including all documentation synced from llm-d/llm-d. Re-run `npm run build:all` when you need to refresh synced content.

**What gets built:**
1. Main site (landing page, blog, community docs via remote-content)
2. Synced documentation from llm-d/llm-d via `preview/scripts/sync-docs.sh`
3. Preview docs site
4. Merged build at `build/docs/`

This matches exactly what Netlify and GitHub Actions deploy.

### Building for Production

```bash
npm run build:all
```

Generates the complete static site into the `build/` directory. This is the same command used by:
- **Netlify** (configured in [netlify.toml](netlify.toml))
- **GitHub Actions** ([.github/workflows/deploy.yml](.github/workflows/deploy.yml))
- **Local testing** (when you want to verify the full build)

## 📝 Making Changes

### Editing Local Content

Content written directly in this repository:
- Blog posts (`blog/`)
- Landing pages (`src/pages/`)
- Website configuration (`docusaurus.config.js`)

Edit these files directly in this repository and submit a PR.

### Editing Remote Content

Remote content is synced from `llm-d/llm-d` repository.

**To update remote content:**
1. Find the source file using the "Content Source" banner at the bottom of the page
2. Click "edit the source file" to make changes in the llm-d/llm-d repository
3. Submit PR to llm-d/llm-d
4. Once merged, changes will appear on the website after the next deployment

### Adding New Community Documentation

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

2. **Import and add to remote-content.js**:

```javascript
import governanceSource from './remote-sources/community/governance.js';

const remoteContentPlugins = [
  contributeSource,
  codeOfConductSource,
  securitySource,
  sigsSource,
  governanceSource,  // Add here
];
```

3. **Test locally**:
```bash
npm run build
```

### Adding Main Documentation

Main documentation (architecture, guides, API reference) is synced via `preview/scripts/sync-docs.sh`.

**To add new main documentation:**
1. Add the file to `llm-d/llm-d` repository in the appropriate location
2. Update `preview/scripts/sync-docs.sh` to copy the new file
3. Test the sync:
   ```bash
   cd preview
   ./scripts/sync-docs.sh
   npm run build
   ```

## 🚀 Deployment

The website is automatically deployed when:
- PRs are merged to `main` branch
- Scheduled rebuild runs (syncs latest content from llm-d/llm-d)

Preview builds are available for all PRs via Netlify.

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| Build errors | Check that all remote sources are accessible from llm-d/llm-d |
| Content not updating | Verify file exists in llm-d/llm-d main branch |
| Links broken | Ensure links use proper Docusaurus paths or GitHub URLs |
| Images not showing | Check image paths in `preview/scripts/sync-docs.sh` |

## 📚 Additional Resources

- [Docusaurus Documentation](https://docusaurus.io/)
- [llm-d Main Repository](https://github.com/llm-d/llm-d)
- [Contributing Guidelines](https://llm-d.ai/docs/community/contribute)

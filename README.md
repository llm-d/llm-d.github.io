# llm-d Website Repository

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

Site previews are powered by Netlify and can be viewed in the specific PR.

If you spot any errors or omissions in the site, please open an issue at [github.com/llm-d/llm-d.github.io](https://github.com/llm-d/llm-d.github.io/issues).

## 📋 Documentation Types

This repository contains two types of documentation:

1. **Local Documentation** - Written directly in this repository (blog posts, landing pages, etc.)
2. **Remote Synced Content** - Automatically synced from other llm-d repositories during build

Most technical documentation is automatically synced from source repositories to ensure accuracy and consistency:
- **Architecture docs** (`/docs/architecture/`) - Synced from component repositories
- **User guides** (`/docs/guide/`) - Synced from the main llm-d repository
- **Component docs** (`/docs/architecture/Components/`) - Auto-generated from individual component repos
- **Community docs** (`/docs/community/`) - Synced from the main repository

Files with remote content show a "Content Source" banner at the bottom with links to edit the original source.

## 🔄 Remote Content System

### How It Works

The remote content system automatically downloads and syncs content from GitHub repositories during the build process:

1. **Static Configuration** - `remote-content/remote-sources/components-data.yaml` contains:
   - Release version information (which tag to sync from)
   - List of all components with their descriptions and versions
   - Repository locations and metadata

2. **Content Sources** - Individual files in `remote-content/remote-sources/` define:
   - Which repositories to sync from
   - Where to place the content in the docs
   - How to transform the content (fix links, add frontmatter, etc.)

3. **Build Process** - During `npm run build`:
   - Downloads content from the configured GitHub repositories
   - Applies transformations (fixes relative links, images, adds source attribution)
   - Generates final documentation with proper navigation and styling

**Key Feature:** The build process only reads from the committed YAML file - it never makes write operations or modifies your configuration.

### File Structure

```
remote-content/
├── remote-content.js                    # Main entry point
└── remote-sources/
    ├── components-data.yaml            # 🎯 Release and component data (edit this!)
    ├── sync-release.mjs                # Script to update YAML from GitHub
    ├── component-configs.js            # Utilities to load YAML data
    ├── utils.js                        # Content transformation helpers
    ├── repo-transforms.js              # Link/image fixing logic
    ├── example-readme.js.template     # Template for adding new content
    ├── architecture/                   # → docs/architecture/
    │   ├── architecture-main.js
    │   └── components-generator.js    # Auto-generates component pages
    ├── guide/                          # → docs/guide/
    │   └── guide-generator.js         # Auto-generates guide pages
    └── community/                      # → docs/community/
        ├── code-of-conduct.js
        ├── contribute.js
        ├── security.js
        └── sigs.js
```

### Cutting a New Release

When a new llm-d release is published, update the documentation site:

**Step 1: Update the YAML file**
```bash
cd remote-content/remote-sources
node sync-release.mjs              # Fetches latest release from GitHub API
git diff components-data.yaml      # Review the changes
```

This script:
- Queries the [GitHub Releases API](https://github.com/llm-d/llm-d/releases/latest)
- Updates release version, date, and URL in the YAML
- Extracts component descriptions from release notes
- Updates component versions in the YAML

**Step 2: Commit and deploy**
```bash
git add components-data.yaml
git commit -m "Update to llm-d vX.Y.Z"
git push                           # Triggers automatic deployment
```

**What gets updated:**
- Release version, date, and URLs shown on the Components page
- Component descriptions and version tags
- **Components** sync from their individual release tags
- **Guides** sync from the llm-d/llm-d release tag
- **Architecture docs** sync from the llm-d/llm-d release tag
- **Community docs** always sync from `main` branch (latest)

### Understanding Versioned vs. Always-Current Content

The remote content system supports two sync strategies:

**Versioned Content** (syncs from release tags):
- **Guides** (`docs/guide/`) - Uses `RELEASE_INFO.version` from `components-data.yaml`
- **Architecture** (`docs/architecture/`) - Uses `RELEASE_INFO.version` from `components-data.yaml`
- **Components** (`docs/architecture/Components/`) - Each component uses its own `version` field from `components-data.yaml`
- **Infrastructure Providers** (`docs/guide/InfraProviders/`) - Uses `RELEASE_INFO.version` from `components-data.yaml`

These docs are pinned to specific release tags (e.g., `v0.3.1`) to ensure documentation matches the released code. When you update `release.version` in `components-data.yaml`, all versioned content automatically syncs from the new tag.

**Always-Current Content** (syncs from `main` branch):
- **Community docs** (`docs/community/`) - Contributing guidelines, Code of Conduct, Security Policy, SIGs
- These are configured via `COMMON_REPO_CONFIGS['llm-d-main'].branch = 'main'` in `component-configs.js`

Community documentation stays current with the latest policies and processes, independent of releases. The `branch` field in `COMMON_REPO_CONFIGS` controls this behavior.

**How it works:**
- `generateRepoUrls()` in `component-configs.js` prefers `version` over `branch` when both exist
- Versioned content sources call `findRepoConfig('llm-d')` and use `RELEASE_INFO.version`
- Community sources call `findRepoConfig('llm-d')` and use `repoConfig.branch` (which is `'main'`)
- This separation lets you cut releases without worrying about stale community policies

### Testing content from a feature branch

To preview remote docs from a work-in-progress branch (for example `liu-cong-debug`), temporarily set `release.version` in `remote-content/remote-sources/components-data.yaml` to that branch name. Run `npm start` or `npm run build` to pull the branch content into the site. When testing is done, change `release.version` back to the released tag so production remains on the official docs.

### Supporting remote guides from nested directories

Dynamic guides are configured in `remote-content/remote-sources/guide/guide-generator.js`. Each entry in `DYNAMIC_GUIDES` points at a `README.md` inside `guides/<dirName>/` in the main repo. By default, the generator mirrors the directory structure when it creates docs: `dirName: 'some-folder/sub-guide'` produces `some-folder/sub-guide.md` under `docs/guide/Installation`, and the sidebar groups pages under a folder.

If you want to surface a nested source as a top-level page, add an optional `targetFilename` to the guide definition. Example:

```javascript
{
  dirName: 'prefix-cache-storage/cpu',
  title: 'Prefix Cache Storage - CPU',
  description: '…',
  sidebarPosition: 5,
  targetFilename: 'prefix-cache-storage-cpu.md'
}
```

With `targetFilename`, the generator still reads `guides/prefix-cache-storage/cpu/README.md`, but it writes the output to `docs/guide/Installation/prefix-cache-storage-cpu.md`, letting the page appear alongside other top-level guides. Leave `targetFilename` out to keep the default nested behavior.

**Manual updates:** You can also manually edit `components-data.yaml` if needed.

### Adding New Components

To add a new component to the documentation:

**Edit `remote-content/remote-sources/components-data.yaml`:**
```yaml
components:
  # ... existing components
  - name: llm-d-your-component
    org: llm-d
    branch: main
    description: Description of your component
    category: Core Infrastructure
    sidebarPosition: 8
```

The component will automatically appear under `/docs/architecture/Components/` on the next build.

### Adding New Content Sources

To add other remote content (non-component):

1. **Copy the template:**
   ```bash
   cp remote-content/remote-sources/example-readme.js.template \
      remote-content/remote-sources/DIRECTORY/your-content.js
   ```
   Choose directory: `architecture/`, `guide/`, or `community/`

2. **Edit the configuration** - Update placeholders:
   - Repository name
   - Output directory
   - Page title and description
   - Sidebar position

3. **Import in `remote-content/remote-content.js`:**
   ```javascript
   import yourContent from './remote-sources/DIRECTORY/your-content.js';
   
   const remoteContentPlugins = [
     // ... existing sources
     yourContent,
   ];
   ```

4. **Test:**
   ```bash
   npm start
   ```

### Making Changes to Synced Content

**For synced content (files with "Content Source" banners):**
- Click the "edit the source file" link in the Content Source banner
- Make changes in the source repository
- Changes will automatically sync to this website during the next build

**For local website content:**
- Follow the standard pull request process below

### Creating Tabs in Remote Content

When writing documentation in source repositories (like llm-d/llm-d) that will be synced to this Docusaurus site, you can create tabbed content using HTML comment markers. These are invisible in GitHub but will be transformed into Docusaurus tabs during the build.

**In your GitHub README:**
```markdown
### Deploy Model Servers

<!-- TABS:START -->
<!-- TAB:GKE (H200):default -->
kubectl apply -k ./manifests/modelserver/gke -n ${NAMESPACE}

<!-- TAB:GKE (B200) -->
kubectl apply -k ./manifests/modelserver/gke-a4 -n ${NAMESPACE}

<!-- TAB:CoreWeave -->
kubectl apply -k ./manifests/modelserver/coreweave -n ${NAMESPACE}

<!-- TABS:END -->
```

**Key points:**
- Use `<!-- TABS:START -->` and `<!-- TABS:END -->` to wrap the entire tabbed section
- Use `<!-- TAB:Label -->` before each tab's content
- Add `:default` after the label to make it the default selected tab (e.g., `<!-- TAB:GKE:default -->`)
- **No imports needed** - the transformation automatically adds them
- On GitHub, the HTML comments are invisible, showing clean markdown
- On Docusaurus, these are transformed into proper `<Tabs>` components

**Result on Docusaurus:**
The content will automatically be transformed with the proper Tabs imports and components, creating an interactive tabbed interface.

### GitHub Callouts Support

The transformation system also automatically converts GitHub-style callouts to Docusaurus admonitions:

```markdown
> [!NOTE]
> This is a note

> [!TIP]
> This is a tip

> [!IMPORTANT]
> This is important

> [!WARNING]
> This is a warning

> [!CAUTION]
> This is dangerous

> [!REQUIREMENTS]
> These are requirements
```

These will be automatically converted to the appropriate Docusaurus `:::note`, `:::tip`, `:::info`, `:::warning`, and `:::danger` admonitions during the build.

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Page not appearing | Check that source URL is publicly accessible |
| Build errors | Verify all template placeholders are replaced |
| Links broken | Make sure you're using `createStandardTransform()` |
| Component not showing | Check `components-data.yaml` and repository accessibility |
| Wrong sidebar order | Adjust `sidebarPosition` numbers in configuration |
| Tabs not rendering | Check that you have both `TABS:START` and `TABS:END` markers |

## BEFORE DOING A PULL REQUEST

1. **Check if content is synced** - Look for "Content Source" banners at the bottom of pages
2. **For synced content** - Edit the source repository, not this one
3. **For local content** - Follow the process below
4. Make sure you are familiar with how docusaurus builds menus and links to images
5. Fork the website repo and deploy a preview version of your proposed change for reviewers to check
    

### Installation

```
$ npm install
```

### Local Development

```
$ npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Making Changes

1. **Fork the Repository**
   - Click the "Fork" button on the [llm-d.github.io](https://github.com/llm-d/llm-d.github.io) repository
   - Clone your fork locally: `git clone https://github.com/YOUR-USERNAME/llm-d.github.io.git`

2. **Create a Branch**
   - Create a new branch for your changes: `git checkout -b feature/your-feature-name`
   - Make your changes locally

3. **Commit Your Changes**
   - Stage your changes: `git add .`
   - Commit with sign-off: `git commit -s -m "Your commit message"`
   - Push to your fork: `git push origin feature/your-feature-name`

4. **Open a Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select the main branch of llm-d/llm-d.github.io as the base
   - Fill out the pull request template with details about your changes

### Pull Request Preview

When you open a pull request, a preview of your changes will be automatically generated and deployed. This allows reviewers to see your changes in a live environment before they are merged into the main website.

- The preview URL will be posted as a comment on your pull request
- The preview site will be automatically updated as you push new commits
- The preview will be removed when the pull request is closed

### Code Review Requirements

- **All code changes** must be submitted as pull requests (no direct pushes)
- **All changes** must be reviewed and approved by a maintainer
- **All changes** must pass automated checks and tests
- **Commit messages** should have:
  - Short, descriptive titles
  - Description of why the change was needed
  - Enough detail for someone reviewing git history to understand the scope
- **DCO Sign-off**: All commits must include a valid DCO sign-off line (`Signed-off-by: Name <email@domain.com>`)
  - Add automatically with `git commit -s`
  - See [PR_SIGNOFF.md](https://github.com/llm-d/llm-d/blob/main/PR_SIGNOFF.md) for configuration details
  - Required for all contributions per [Developer Certificate of Origin](https://developercertificate.org/)

## Questions?

- For immediate help: Join [llm-d.slack.com](https://llm-d.slack.com) -> <a href="/slack" target="_self">Invite Link</a>
- For issues: Create an issue in [llm-d/llm-d.github.io](https://github.com/llm-d/llm-d.github.io)

# llm-d Website Repository

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

Site previews are powered by Netlify and can be viewed in the specific PR.

If you spot any errors or omissions in the site, please open an issue at [github.com/llm-d/llm-d.github.io](https://github.com/llm-d/llm-d.github.io/issues).

## 📋 Documentation Types

This repository contains two types of documentation:

1. **Local Documentation** - Written directly in this repository (blog posts, landing pages, etc.)
2. **Remote Synced Content** - Automatically synced from other llm-d repositories during build

Most technical documentation is automatically synced from the `main` branch of source repositories to ensure accuracy and consistency:
- **Architecture docs** (`/docs/architecture/`) - Synced from llm-d/llm-d repository
- **User guides** (`/docs/guide/`) - Synced from the main llm-d repository
- **Component docs** (`/docs/architecture/Components/`) - Synced from individual component repos
- **Community docs** (`/docs/community/`) - Synced from the main repository
- **Latest Release page** (`/docs/architecture/latest-release.md`) - Generated from `components-data.yaml`

Files with remote content show a "Content Source" banner at the bottom with links to edit the original source.

## 🔄 Remote Content System

### Quick Reference: Adding New Content

There are **three different approaches** based on content type:

| Content Type | Configuration File | Documentation |
|--------------|-------------------|---------------|
| **Components** | Edit `components-data.yaml` | Auto-generated from component repos |
| **Guides** | Edit `guide-generator.js` | Configured in `DYNAMIC_GUIDES` array |
| **Other Content** | Copy template + edit `remote-content.js` | Manual configuration |

See the sections below and [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions.

### How It Works

The remote content system automatically downloads and syncs content from GitHub repositories during the build process:

1. **Static Configuration** - `remote-content/remote-sources/components-data.yaml` contains:
   - Release version information (displayed on the Latest Release page)
   - List of all components with their descriptions and version tags
   - Repository locations and metadata
   - **Note:** All content syncs from `main` branch; version tags are only used for display on the Latest Release page

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
├── remote-content.js                    # 📦 Main entry point (imports all sources)
└── remote-sources/
    ├── components-data.yaml            # 🎯 EDIT THIS: Component/release data
    ├── sync-release.mjs                # Script to update YAML from GitHub
    ├── component-configs.js            # Utilities to load YAML data
    ├── utils.js                        # Content transformation helpers
    ├── repo-transforms.js              # Link/image fixing logic
    ├── example-readme.js.template     # Template for "Other Content"
    │
    ├── architecture/                   # → docs/architecture/
    │   ├── architecture-main.js       # Main architecture doc
    │   └── components-generator.js    # 🤖 AUTO: Generates from YAML
    │
    ├── guide/                          # → docs/guide/
    │   └── guide-generator.js         # 🎯 EDIT THIS: Guide configs
    │
    ├── community/                      # → docs/community/
    │   ├── code-of-conduct.js         # 📄 Template-based
    │   ├── contribute.js              # 📄 Template-based
    │   ├── security.js                # 📄 Template-based
    │   └── sigs.js                    # 📄 Template-based
    │
    ├── usage/                          # → docs/usage/
    │   └── usage-generator.js         # 🤖 AUTO: Generates from YAML
    │
    └── infra-providers/                # → docs/guide/InfraProviders/
        └── infra-providers-generator.js  # 🤖 AUTO: Generates from repos
```

**Legend:**
- 🎯 **EDIT THIS**: Files you typically edit to add new content
- 🤖 **AUTO**: Generators that read from YAML or repo configs
- 📄 **Template-based**: Individual files created from template

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
- Release version, date, and URLs shown on the **Latest Release** page
- Component descriptions and version tags displayed in the component table
- **Note:** All documentation content (architecture, guides, components, community) syncs from the `main` branch
- The version tags in YAML are only used to render the Latest Release page showing what versions are in the release

### Content Syncing Strategy

#### All Content Syncs from `main` Branch

**Important:** All documentation syncs from the **`main` branch** of source repositories, not from release tags. This ensures documentation always reflects the latest development state.

**Content synced from `main`:**
- **Architecture** (`docs/architecture/architecture.mdx`) - Main llm-d README
- **Component docs** (`docs/architecture/Components/*.md`) - Individual component READMEs
- **Guides** (`docs/guide/`) - Installation and usage guides
- **Community docs** (`docs/community/`) - Contributing guidelines, Code of Conduct, Security Policy, SIGs
- **Infrastructure Providers** (`docs/guide/InfraProviders/`)
- **Usage docs** (`docs/usage/`)

**Generated from YAML (not synced):**
- **Latest Release page** (`docs/architecture/latest-release.md`) - Generated from `components-data.yaml`
  - Shows release version, date, and link to GitHub release
  - Displays component version table with links to specific release tags
  - **This is the ONLY place version tags from YAML are used**

#### Why This Matters

**Version tags in YAML** (`v0.6.0`, `v0.7.1`, etc.) are **for display only** on the Latest Release page:
- They show users which versions are in a release
- They create links to specific release tags on GitHub
- They do NOT affect which content gets synced

**Content syncing** is controlled by `generateRepoUrls()` in `component-configs.js`:
- Always returns `main` as the branch reference
- The `sync-release.mjs` script updates version numbers in YAML but doesn't change sync behavior
- To sync from a different branch, you must temporarily edit `component-configs.js` (see below)

**Example:**
```yaml
# components-data.yaml
components:
  - name: llm-d-kv-cache
    version: v0.6.0           # ← Displayed on Latest Release page ONLY
                              #   Content syncs from main branch
```

### Testing content from a feature branch

Since all content syncs from `main`, testing changes from a feature branch requires temporarily modifying the sync configuration.

**⚠️ Warning:** This approach modifies code and is easy to accidentally commit. Only use when necessary.

**Option 1: Temporarily Change Branch Reference (Quick Testing)**

Modify `generateRepoUrls()` in `remote-content/remote-sources/component-configs.js`:

```javascript
export function generateRepoUrls(repoConfig) {
  const { org, name } = repoConfig;
  // Change this line temporarily:
  const ref = 'main';
  // To your feature branch:
  // const ref = 'your-feature-branch';

  return {
    repoUrl: `https://github.com/${org}/${name}`,
    sourceBaseUrl: `https://raw.githubusercontent.com/${org}/${name}/${ref}/`,
    ref
  };
}
```

Then run:
```bash
npm start  # or npm run build
```

**⚠️ CRITICAL:** Remember to change it back to `'main'` before committing! Consider adding a reminder:
```bash
# Add a reminder to git status
git commit --allow-empty -m "WIP: Testing feature branch - REVERT component-configs.js before merging"
```

**Option 2: Fork and Point to Your Fork (For Longer Testing)**

If you need to test changes over multiple sessions:

1. Fork the source repository
2. Create your feature branch in your fork
3. Temporarily modify the repo config to point to your fork:
   ```javascript
   // In components-data.yaml or generator file
   org: 'your-github-username'  // Instead of 'llm-d'
   // Keep branch as 'main' or your feature branch name
   ```
4. Test your changes
5. Revert the config changes before committing

**Option 3: Local Testing (Recommended for Major Changes)**

For substantial changes, consider:
1. Make changes directly to the `docs/` folder locally (treated as generated content)
2. Test the rendered output with `npm start`
3. Once satisfied, implement the changes in the actual source repository
4. The next build will sync the changes from the source repo

**Note:** The `docs/` folder is generated content and changes to it are not committed to this repo.

### Adding and Configuring Guides

**Important:** Guides are NOT added via templates. They are configured in the generator file.

#### How Guides Work

Guides are dynamically configured in `remote-content/remote-sources/guide/guide-generator.js`. The generator reads from the `llm-d/llm-d` repository's `guides/` directory (always from `main` branch) and creates documentation pages.

#### Default Behavior (Nested Structure)

By default, `dirName` mirrors the source directory structure:

```javascript
{
  dirName: 'workload-autoscaling',           // Source: guides/workload-autoscaling/README.md
  title: 'Workload Autoscaling',
  description: 'Guide description',
  sidebarPosition: 11
  // Output: docs/guide/Installation/workload-autoscaling.md
}
```

For nested directories, the structure is preserved:

```javascript
{
  dirName: 'tiered-prefix-cache/cpu',        // Source: guides/tiered-prefix-cache/cpu/README.md
  title: 'CPU Cache Guide',
  description: 'Guide description',
  sidebarPosition: 5
  // Output: docs/guide/Installation/tiered-prefix-cache/cpu.md (nested in sidebar)
}
```

#### Flattening Nested Guides (targetFilename)

To surface a nested source as a **top-level page**, use `targetFilename`:

```javascript
{
  dirName: 'workload-autoscaling/wva',
  sourceFile: 'guides/workload-autoscaling/README.wva.md',  // Explicit source file
  title: 'Workload Variant Autoscaler (WVA)',
  description: 'WVA-specific autoscaling guide',
  sidebarPosition: 12,
  targetFilename: 'wva.md'                    // Flatten to top-level
  // Output: docs/guide/Installation/wva.md (appears alongside other top-level guides)
}
```

**Key Points:**
- **`dirName`**: Source directory path in the upstream repo (`guides/workload-autoscaling/wva/`)
- **`sourceFile`**: (Optional) Explicit source file, defaults to `guides/<dirName>/README.md`
- **`targetFilename`**: (Optional) Output filename to flatten nested content to top-level
- **Without `targetFilename`**: Output preserves directory structure (`workload-autoscaling/wva.md`)
- **With `targetFilename`**: Output is flattened (`wva.md`)

#### Real-World Example

The current configuration shows this pattern:

```javascript
const DYNAMIC_GUIDES = [
  // Top-level guide (default behavior)
  {
    dirName: 'quickstart',                    // guides/quickstart/README.md
    title: 'QuickStart',
    sidebarPosition: 2
    // Output: docs/guide/Installation/quickstart.md
  },

  // Nested guide with index
  {
    dirName: 'workload-autoscaling',
    title: 'Workload Autoscaling',
    sidebarPosition: 11,
    targetFilename: 'workload-autoscaling/index.md'
    // Output: docs/guide/Installation/workload-autoscaling/index.md
  },

  // Nested guide flattened to top-level
  {
    dirName: 'workload-autoscaling/wva',
    sourceFile: 'guides/workload-autoscaling/README.wva.md',
    title: 'Workload Variant Autoscaler (WVA)',
    sidebarPosition: 12,
    targetFilename: 'wva.md'                  // Flattened
    // Output: docs/guide/Installation/wva.md (top-level)
  }
];
```

This allows you to:
1. Organize guides hierarchically in the source repo
2. Present them in any structure on the website
3. Keep related content together in source while separating it in docs

**Manual updates:** You can also manually edit `components-data.yaml` if needed.

### Adding New Components (Auto-generated)

Components are the easiest to add - just edit the YAML file:

**1. Edit `remote-content/remote-sources/components-data.yaml`:**
```yaml
components:
  # ... existing components
  - name: llm-d-your-component
    org: llm-d
    sidebarLabel: Your Component    # Display name in sidebar
    description: Description of your component
    sidebarPosition: 8
    version: v1.0.0                 # Version tag shown on Latest Release page
    keywords:                       # SEO keywords
      - llm-d
      - your component
      - keywords
```

**2. Test:**
```bash
npm start
```

**What happens:**
- The component's README.md is automatically synced from the `main` branch
- Appears at `/docs/architecture/Components/your-component.md`
- Added to the component navigation
- Version tag is displayed on the Latest Release page (content always syncs from `main`)

**No additional configuration needed!** The `components-generator.js` automatically creates the plugin configuration from the YAML data.

### Adding New Guides (Generator-based)

**Important:** Guides use a generator, NOT the template approach.

**1. Edit `remote-content/remote-sources/guide/guide-generator.js`:**

Add an entry to the `DYNAMIC_GUIDES` array:

```javascript
const DYNAMIC_GUIDES = [
  // ... existing guides
  {
    dirName: 'your-guide-folder',           // Source: guides/your-guide-folder/README.md
    title: 'Your Guide Title',
    description: 'Brief description for SEO and preview',
    sidebarPosition: 15,
    keywords: ['llm-d', 'your', 'guide', 'keywords']
    // Output: docs/guide/Installation/your-guide-folder.md
  }
];
```

**2. For nested guides with custom paths:**

```javascript
{
  dirName: 'parent/nested-guide',
  sourceFile: 'guides/parent/nested-guide/README.md',  // Explicit source
  title: 'Nested Guide',
  description: 'Guide description',
  sidebarPosition: 16,
  targetFilename: 'nested-guide.md',        // Flatten to top-level
  keywords: ['llm-d', 'nested']
  // Output: docs/guide/Installation/nested-guide.md (top-level, not nested)
}
```

**3. Test:**
```bash
npm start
```

See "Adding and Configuring Guides" section above for detailed examples of `targetFilename` usage.

### Adding Other Content (Template-based)

For content that doesn't fit the component or guide pattern (e.g., community docs, standalone architecture pages):

1. **Copy the template:**
   ```bash
   cp remote-content/remote-sources/example-readme.js.template \
      remote-content/remote-sources/DIRECTORY/your-content.js
   ```
   Choose directory: `architecture/` or `community/`

2. **Edit the configuration** - Update placeholders:
   - Repository name (or use manual config)
   - Output directory and filename
   - Page title, description, sidebar label/position
   - Keywords for SEO
   - Note: Use `../` imports since you're in a subdirectory

3. **Import in `remote-content/remote-content.js`:**
   ```javascript
   import yourContent from './remote-sources/DIRECTORY/your-content.js';

   const remoteContentPlugins = [
     // ... existing sources (community, architecture, etc.)
     yourContent,  // Add your new source
   ];
   ```

4. **Test:**
   ```bash
   npm start
   ```

**Example:** See `remote-content/remote-sources/community/contribute.js` for a working example of this pattern.

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

### Content Transformation Pipeline

The build system automatically transforms GitHub-flavored markdown to work with Docusaurus (MDX). This happens during the build process and **does not modify your source files**.

**Transformations applied:**

1. **GitHub Callouts → Docusaurus Admonitions**
   ```markdown
   > [!NOTE]           →    :::note
   > This is a note         This is a note
                            :::

   > [!TIP]            →    :::tip
   > [!IMPORTANT]      →    :::info
   > [!WARNING]        →    :::warning
   > [!CAUTION]        →    :::danger
   ```

2. **HTML Tab Markers → Docusaurus Tabs**
   ```markdown
   <!-- TABS:START -->              →    <Tabs>
   <!-- TAB:GKE (H200):default -->        <TabItem value="gke-h200" label="GKE (H200)" default>
   Content for GKE H200                    Content for GKE H200
   <!-- TAB:CoreWeave -->                  </TabItem>
   Content for CoreWeave                   <TabItem value="coreweave" label="CoreWeave">
   <!-- TABS:END -->                       Content for CoreWeave
                                           </TabItem>
                                         </Tabs>
   ```

3. **Relative Links → GitHub URLs**
   - Prevents broken links when content is moved to website
   - Exception: Internal guide links mapped to website paths
   ```markdown
   [Guide](./guides/example.md)  →  [Guide](https://github.com/llm-d/llm-d/blob/main/guides/example.md)
   ```

4. **Relative Images → GitHub Raw URLs**
   ```markdown
   ![Diagram](./images/arch.png)  →  ![Diagram](https://github.com/llm-d/llm-d/raw/main/images/arch.png)
   ```

5. **HTML/MDX Compatibility**
   - Self-closing tags: `<br>` → `<br />`
   - HTML comments → JSX comments (where needed)
   - Escape curly braces in code blocks

6. **Source Attribution Banner**
   - Adds "Content Source" callout at bottom of page
   - Links to original source file
   - Provides edit and issue links

**Technical Details:**
- Implementation: `remote-content/remote-sources/repo-transforms.js`
- Uses regex-based transformations (order-dependent)
- Special handling for different link types and edge cases
- For more details, see [GitHub Issue #220](https://github.com/llm-d/llm-d.github.io/issues/220)

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

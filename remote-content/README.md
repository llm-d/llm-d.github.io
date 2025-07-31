# Remote Content System

Automatically download and sync content from remote repositories (like GitHub) into your Docusaurus site. Each remote file gets its own configuration with automatic source attribution and edit links.

## 🎯 Features

- **Automatic Content Syncing** - Downloads content from remote repositories during build
- **Source Attribution** - Adds "Content Source" banners with edit links (now at bottom of pages)
- **Component Auto-Generation** - Automatically creates documentation for all components
- **Link Transformation** - Fixes relative links to work in the documentation site
- **Repository Transforms** - Handles different repository structures and conventions

## 🚀 Quick Start

### 1. Choose Directory & Copy Template

Files are organized by their destination in the docs:

| Directory | Purpose | Final Location |
|-----------|---------|----------------|
| `architecture/` | Architecture docs | `docs/architecture/` |
| `guide/` | User guides & installation | `docs/guide/` |
| `community/` | Community resources | `docs/community/` |

```bash
# Choose the appropriate directory for your content
cp remote-content/remote-sources/example-readme.js.template remote-content/remote-sources/DIRECTORY/my-content.js

# Examples:
cp remote-content/remote-sources/example-readme.js.template remote-content/remote-sources/guide/my-guide.js
cp remote-content/remote-sources/example-readme.js.template remote-content/remote-sources/architecture/my-component.js
```

### 2. Edit Configuration

Update the copied file and replace these placeholders:

| Placeholder | Example | Description |
|-------------|---------|-------------|
| `YOUR-REPO-NAME` | `llm-d-infra` | Repo name from component-configs.js |
| `your-content-name` | `user-guide` | Unique name for CLI commands |
| `docs/YOUR-SECTION` | `docs/guide` | Where to put the file |
| `your-file.md` | `guide.md` | Output filename |

### 3. Add to System
```javascript
// remote-content/remote-content.js
import myContent from './remote-sources/DIRECTORY/my-content.js';

const remoteContentPlugins = [
  contributeSource,
  codeOfConductSource,
  myContent,  // Add here
];
```

### 4. Test
```bash
npm start
```

## 🏗️ Architecture

### Component Auto-Generation

The system automatically generates documentation for all components listed in `component-configs.js`. This includes:
- Fetching README files from component repositories
- Adding consistent frontmatter and navigation
- Applying repository-specific transformations
- Creating source attribution banners

### Repository Transforms

Different repositories may have different link structures or conventions. The `repo-transforms.js` file handles:
- Fixing relative links to point to the correct repositories
- Adjusting image paths
- Handling repository-specific markdown formats

## 📁 File Structure

```
remote-content/
├── remote-content.js                    # Main system (imports all sources)
├── remote-sources/
│   ├── architecture/                   # → docs/architecture/
│   │   ├── architecture-main.js        # Main architecture documentation
│   │   └── components-generator.js     # Auto-generates component documentation
│   ├── guide/                          # → docs/guide/ & docs/guide/Installation/
│   │   ├── guide-examples.js           # User guide landing page
│   │   ├── guide-inference-scheduling.js # Installation guide sections
│   │   ├── guide-pd-disaggregation.js  # Installation guide sections
│   │   ├── guide-prerequisites.js      # Installation guide sections
│   │   └── guide-wide-ep-lws.js        # Installation guide sections
│   ├── community/                      # → docs/community/
│   │   ├── code-of-conduct.js         # Code of conduct
│   │   ├── contribute.js              # Contributing guide
│   │   ├── security.js                # Security policy
│   │   └── sigs.js                    # Special Interest Groups
│   ├── utils.js                        # Shared utilities (used by all)
│   ├── repo-transforms.js              # Repository-specific transformations
│   ├── component-configs.js            # Component repository configurations
│   └── example-readme.js.template     # Template for new sources
└── README.md                          # This file
```

### Directory Organization

The remote-sources directory is organized to mirror the final documentation structure:

- **`architecture/`** - Files that generate content for `docs/architecture/`
- **`guide/`** - Files that generate content for `docs/guide/` and `docs/guide/Installation/`
- **`community/`** - Files that generate content for `docs/community/`
- **Root level** - Shared utilities and configurations used across all directories

## 🔧 Adding New Content

### Adding Components

Components are automatically generated from `component-configs.js`. To add a new component:

1. **Add to component-configs.js**:
   ```javascript
   export const COMPONENT_CONFIGS = [
     // ... existing components
     {
       name: 'your-component-name',
       org: 'llm-d',  // or other org
       branch: 'main', // or 'dev'
       description: 'Description of your component',
       sidebarPosition: 10 // adjust as needed
     }
   ];
   ```

2. **Component will auto-appear** in the next build under `/docs/architecture/Components/`

### Adding Other Content

For non-component content:

1. **Choose the right directory**:
   - `architecture/` for architecture documentation
   - `guide/` for user guides and installation docs
   - `community/` for community resources

2. **Copy and customize template**:
   ```bash
   cp remote-content/remote-sources/example-readme.js.template remote-content/remote-sources/DIRECTORY/your-content.js
   ```

3. **Update imports in remote-content.js** to include your new file

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| Page not appearing | Check source URL is publicly accessible |
| Build errors | Verify all `YOUR-...` placeholders are replaced |
| Wrong sidebar order | Check `sidebarPosition` numbers |
| Links broken | Use `contentTransform` to fix relative links or add to `repo-transforms.js` |
| Import errors | Ensure file is imported in `remote-content/remote-content.js` with correct path |
| Component not showing | Check `component-configs.js` and ensure repository is public |
| Source banner missing | Verify you're using `createContentWithSource()` from utils.js |
| Banner at wrong location | Source banners now appear at bottom of pages automatically |
| Import path errors | Use `../` to reference utils from subdirectories (e.g., `../utils.js`) |
| File in wrong directory | Move to appropriate subdirectory: `architecture/`, `guide/`, or `community/` |
| Template not working | Ensure you're using the updated template with correct import paths |

## 📝 Content Source Banners

All synced content automatically includes a "Content Source" banner at the **bottom** of the page with:
- Link to the original source file
- Edit link for contributors
- Link to file issues

This helps users understand where content comes from and how to contribute changes. 
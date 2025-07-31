# Remote Content System

Automatically download and sync content from remote repositories (like GitHub) into your Docusaurus site. Each remote file gets its own configuration with automatic source attribution and edit links.

## 🎯 Features

- **Automatic Content Syncing** - Downloads content from remote repositories during build
- **Source Attribution** - Adds "Content Source" banners with edit links (now at bottom of pages)
- **Component Auto-Generation** - Automatically creates documentation for all components
- **Link Transformation** - Fixes relative links to work in the documentation site
- **Repository Transforms** - Handles different repository structures and conventions

## 🚀 Quick Start

### 1. Copy & Edit Template
```bash
cp remote-content/remote-sources/example-readme.js.template remote-content/remote-sources/my-content.js
```
Edit the file and replace these placeholders:

| Placeholder | Example | Description |
|-------------|---------|-------------|
| `YOUR-CONTENT-NAME` | `user-guide` | Unique name for CLI commands |
| `YOUR-ORG/YOUR-REPO` | `microsoft/vscode` | GitHub repo path |
| `YOUR-SECTION` | `docs/guides` | Where to put the file |
| `YOUR-FILE.md` | `README.md` | Source filename |

### 2. Add to System
```javascript
// remote-content/remote-content.js
import myContent from './remote-sources/my-content.js';

const remoteContentPlugins = [
  contributeSource,
  codeOfConductSource,
  myContent,  // Add here
];
```

### 3. Test
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
│   ├── utils.js                        # Shared utilities
│   ├── repo-transforms.js              # Repository-specific transformations
│   ├── component-configs.js            # Component repository configurations
│   ├── components-generator.js         # Auto-generates component documentation
│   ├── architecture-main.js            # Main architecture documentation
│   ├── contribute.js                   # Contributing guide
│   ├── code-of-conduct.js             # Code of conduct
│   ├── security.js                     # Security policy
│   ├── sigs.js                         # Special Interest Groups
│   ├── guide-*.js                      # User guide sections
│   └── example-readme.js.template     # Template for new sources
└── README.md                          # This file
```

## 🔧 Adding Components

To add a new component to the auto-generation system:

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

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| Page not appearing | Check source URL is publicly accessible |
| Build errors | Verify all `YOUR-...` placeholders are replaced |
| Wrong sidebar order | Check `sidebarPosition` numbers |
| Links broken | Use `contentTransform` to fix relative links or add to `repo-transforms.js` |
| Import errors | Ensure file is imported in `remote-content/remote-content.js` |
| Component not showing | Check `component-configs.js` and ensure repository is public |
| Source banner missing | Verify you're using `createContentWithSource()` from utils.js |
| Banner at wrong location | Source banners now appear at bottom of pages automatically |

## 📝 Content Source Banners

All synced content automatically includes a "Content Source" banner at the **bottom** of the page with:
- Link to the original source file
- Edit link for contributors
- Link to file issues

This helps users understand where content comes from and how to contribute changes. 
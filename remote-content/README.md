# Remote Content System

Automatically download and sync content from remote repositories (like GitHub) into your Docusaurus site. Each remote file gets its own configuration with automatic source attribution and edit links.

## 🚀 Quick Start

### 1. Copy & Edit Template
```bash
cp config/remote-sources/example-readme.js.template config/remote-sources/my-content.js
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
// config/remote-content.js
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

## 📁 File Structure

```
config/
├── remote-content.js                    # Main system (imports all sources)
├── remote-sources/
│   ├── utils.js                        # Shared utilities
│   ├── contribute.js                   # Contributing guide
│   ├── code-of-conduct.js             # Code of conduct
│   └── example-readme.js.template     # Copy this for new sources
└── README.md                          # This file
```

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| Page not appearing | Check source URL is publicly accessible |
| Build errors | Verify all `YOUR-...` placeholders are replaced |
| Wrong sidebar order | Check `sidebarPosition` numbers |
| Links broken | Use `contentTransform` to fix relative links |
| Import errors | Ensure file is imported in `config/remote-content.js` | 
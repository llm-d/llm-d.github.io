# Contributing to llm-d Website

Thank you for your interest in contributing to the llm-d website! This repository manages the documentation website and follows both general project guidelines and website-specific processes.

## 🎯 Quick Guide

### 📝 Documentation Changes

**Before making changes, check if the content is synced:**

1. **Look for "Content Source" banners** at the bottom of pages
2. **If banner exists**: Click "edit the source file" to edit in the source repository
3. **If no banner**: The content is local to this repository - proceed with PR below

### 🔄 Types of Content

| Content Type | Location | How to Edit |
|--------------|----------|-------------|
| **Synced Content** | Architecture docs, guides, component docs | Edit in source repo (follow banner link) |
| **Local Content** | Blog posts, community pages, website config | Edit in this repository |
| **Component Documentation** | Auto-generated from component repos | Add to `component-configs.js` |

### 🚀 Making Local Changes

For content **without** "Content Source" banners:

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

3. **Test Locally**
   ```bash
   npm start
   ```

4. **Commit & Push**
   ```bash
   git add .
   git commit -s -m "docs: your change description"
   git push origin docs/your-change-description
   ```

5. **Open Pull Request** with preview link for reviewers

### 🔧 Adding Remote Content

To sync new content from repositories:

1. **Copy the template:**
   ```bash
   cp remote-content/remote-sources/example-readme.js.template remote-content/remote-sources/my-content.js
   ```

2. **Edit configuration** in the new file

3. **Add to system** in `remote-content/remote-content.js`

4. **Test** with `npm start`

See [remote-content/README.md](remote-content/README.md) for detailed instructions.

### ⚙️ Adding New Components

Components are auto-generated! Just add to `remote-content/remote-sources/component-configs.js`:

```javascript
{
  name: 'your-component-name',
  org: 'llm-d',
  branch: 'main',
  description: 'Component description',
  sidebarPosition: 10
}
```

## 📋 General Guidelines

This project follows the main llm-d [Contributing Guidelines](https://github.com/llm-d/llm-d/blob/dev/CONTRIBUTING.md):

- **DCO Sign-off Required**: Use `git commit -s`
- **All changes via PR**: No direct pushes to main
- **Review required**: Maintainer approval needed
- **Preview deployments**: Available for all PRs

## 🆘 Need Help?

- **General questions**: [llm-d Slack](https://inviter.co/llm-d-slack)
- **Website issues**: [Create an issue](https://github.com/llm-d/llm-d.github.io/issues)
- **Content questions**: Check if content is synced, then edit in appropriate repository 
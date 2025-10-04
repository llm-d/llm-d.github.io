# llm-d Website Repository

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

The site may be previewed at [llm-d.github.io](https://llm-d.github.io/) before it goes live

If you spot any errors or omissions in the site, please open an issue at [github.com/llm-d/llm-d.github.io](https://github.com/llm-d/llm-d.github.io/issues)

## 📋 Documentation Types

This repository contains two types of documentation:

1. **Local Documentation** - Written directly in this repository (blog posts, etc.)
2. **Remote Synced Content** - Automatically synced from other llm-d repositories (architecture docs, guides, component documentation, community docs.)

Most technical documentation is automatically synced from the main [llm-d/llm-d](https://github.com/llm-d/llm-d) repository to ensure accuracy and consistency.

## 🔄 Remote Content System

Many docs pages are automatically synced from source repositories using our remote content system:

- **Architecture Documentation** - Synced from component repositories
- **User Guides** - Synced from the main llm-d repository  
- **Component Documentation** - Automatically generated from individual component repos
- **Contributing Guidelines** - Synced from the main repository

Files with remote content show a "Content Source" banner at the bottom with links to edit the original source.

### Making Changes to Synced Content

**For synced content (files with "Content Source" banners):**
- Click the "edit the source file" link in the Content Source banner
- Make changes in the source repository
- Changes will automatically sync to this website during the next build

**For local website content:**
- Follow the standard pull request process below

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

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

```bashgit
commit -s -m "feat: add new guide for workload autoscaling"
```

#### DCO via the command line
The most popular way to do DCO is to sign off your username and email address in the git command line.

First, configure your local git install.

```bashgit
$ git config --global user.name "Your Name"
$ git config --global user.email github-email@example.com
```

Always sign your commits with the -s flag.

```bashgit
$ git commit -s -m "This is my commit message"
```

That’s it. Git adds your sign-off message in the commit message, and your contribution (commit) is now DCO compliant.

If you are having trouble with the DCO process, please see some [troubleshooting](https://www.secondstate.io/articles/dco/) documentation or reach out in the #website-and-docs channel on the llm-d Slack for assistance.

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
| **Component Documentation** | Auto-generated from component repos | Add to `components-data.yaml` |

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

There are **three different approaches** for adding remote content, depending on the content type:

| Content Type | How to Add | Configuration File |
|--------------|-----------|-------------------|
| **Components** | Edit YAML file | `components-data.yaml` |
| **Guides** | Edit generator file | `guide-generator.js` |
| **Other Content** | Copy template + import | `example-readme.js.template` → `remote-content.js` |

**Quick Decision Tree:**
- Adding a component README? → Edit `components-data.yaml`
- Adding a guide from the main repo? → Edit `guide-generator.js`
- Adding other documentation? → Copy template, edit, and import

#### Option 1: Adding Component Documentation (Easiest - Auto-generated)

Components are automatically generated from `components-data.yaml`:

1. **Edit the YAML file:**
   ```bash
   # Edit remote-content/remote-sources/components-data.yaml
   ```

2. **Add your component entry:**
   ```yaml
   components:
     # ... existing components
     - name: llm-d-your-component
       org: llm-d                       # GitHub organization
       sidebarLabel: Your Component     # Display name in sidebar
       description: Description of your component
       sidebarPosition: 8
       version: v1.0.0                  # Version tag for Latest Release page
       keywords:
         - llm-d
         - keywords
   ```

3. **Test:** `npm start`

**What happens:**
- Component README.md from `main` branch → `/docs/architecture/Components/your-component.md`
- Appears in sidebar under "Components"
- Listed on Latest Release page

**For external projects** (outside llm-d org):
```yaml
components:
  - name: gateway-api-inference-extension
    org: kubernetes-sigs               # External organization
    skipSync: true                     # Don't sync README, link to GitHub instead
    sidebarLabel: Gateway API Extension
    description: Description
    sidebarPosition: 8
    version: v0.1.0
```

**For other architecture documentation** (design docs, patterns, ADRs):
- Use Option 3 (template-based) and place in `remote-content/remote-sources/architecture/`
- See README.md ["Adding Other Architecture Documentation"](README.md#adding-other-architecture-documentation-template-based) section

#### Option 2: Adding New Guides (Generator-based)

Guides are configured in the `guide-generator.js` file, **not via templates**:

1. **Edit the generator file:**
   ```bash
   # Edit remote-content/remote-sources/guide/guide-generator.js
   ```

2. **Add your guide to the `DYNAMIC_GUIDES` array:**
   ```javascript
   const DYNAMIC_GUIDES = [
     // ... existing guides
     {
       dirName: 'your-guide-folder',           // Directory in llm-d/llm-d/guides/
       title: 'Your Guide Title',
       description: 'Brief description for SEO',
       sidebarPosition: 15,
       keywords: ['llm-d', 'your', 'keywords']
     }
   ];
   ```

   This will sync `guides/your-guide-folder/README.md` → `docs/guide/Installation/your-guide-folder.md`

3. **For nested guides with custom paths**, use `sourceFile` and `targetFilename`:
   ```javascript
   {
     dirName: 'parent-folder/nested-guide',      // Source directory path
     sourceFile: 'guides/parent-folder/nested-guide/README.md',  // Explicit source
     title: 'Nested Guide Title',
     description: 'Guide description',
     sidebarPosition: 16,
     targetFilename: 'parent-folder/nested-guide.md',  // Custom output path
     keywords: ['llm-d', 'nested', 'guide']
   }
   ```

   **Example:** `guides/workload-autoscaling/README.wva.md` → `docs/guide/Installation/workload-autoscaling/wva.md`

4. **Test:** `npm start`

**Note:** Guides always sync from the `main` branch of the `llm-d/llm-d` repository.

#### Option 3: Other Content (Template-based)

For content that doesn't fit the component or guide pattern (e.g., community docs, architecture overviews):

1. **Choose the right directory** based on content type:
   - `architecture/` → `docs/architecture/`
   - `community/` → `docs/community/`

2. **Copy the template:**
   ```bash
   # Choose appropriate directory
   cp remote-content/remote-sources/example-readme.js.template \
      remote-content/remote-sources/DIRECTORY/my-content.js

   # Example:
   cp remote-content/remote-sources/example-readme.js.template \
      remote-content/remote-sources/community/my-doc.js
   ```

3. **Edit configuration** in the new file:
   - Update repository name
   - Set output directory and filename
   - Configure title, description, sidebar position
   - Note the `../` imports for utils (since you're in a subdirectory)

4. **Import in `remote-content/remote-content.js`:**
   ```javascript
   import myContentSource from './remote-sources/DIRECTORY/my-content.js';

   const remoteContentPlugins = [
     // ... existing sources
     myContentSource,  // Add your source
   ];
   ```

5. **Test:** `npm start`

See the "Remote Content System" section in the main [README.md](README.md) for detailed technical information.

### ⚙️ Adding New Components

Components are auto-generated! Just add to `remote-content/remote-sources/components-data.yaml`:

```yaml
components:
  # ... existing components
  - name: llm-d-your-component
    org: llm-d
    sidebarLabel: Your Component
    description: Component description
    sidebarPosition: 10
    version: v1.0.0                    # For Latest Release page display
    keywords:
      - llm-d
      - your keywords
```

**Important Notes:**
- The `version` field is for **display only** on the Latest Release page
- Component README content is **always synced from the `main` branch**
- Version tags do NOT affect which content gets synced

For details on how component versioning works and how to update for new releases, see the [Component Version Management](README.md#component-version-management) section in README.md.

### 📝 Creating Blog Posts

Blog posts are local content managed directly in this repository. Follow this step-by-step process to create a new blog post:

#### 1. **Create the Blog Post File**

Blog posts are stored in the `/blog/` directory with a specific naming convention:

```bash
# Format: YYYY-MM-DD_slug-title.md
# Example: 2025-10-15_my-new-blog-post.md
touch blog/2025-10-15_my-new-blog-post.md
```

#### 2. **Add Frontmatter**

Every blog post must start with YAML frontmatter. Here's the required structure:

```yaml
---
title: "Your Blog Post Title"
description: "A brief description of your blog post for SEO and previews"
slug: your-blog-post-slug
date: 2025-10-15T09:00

authors:
  - authorkey1
  - authorkey2

tags: [blog, updates, llm-d, your-tags]
---
```

**Frontmatter Fields:**
- `title`: The display title of your blog post
- `description`: Brief description for SEO and social media previews
- `slug`: URL-friendly version (used in `/blog/your-slug` URL)
- `date`: Publication date in ISO format with time
- `authors`: Array of author keys from [`blog/authors.yml`](blog/authors.yml)
- `tags`: Array of tags for categorization (see [`blog/tags.yml`](blog/tags.yml) for existing tags)

#### 3. **Add Authors**

Authors are managed in [`blog/authors.yml`](blog/authors.yml). To add a new author:

```yaml
# In blog/authors.yml
yourauthorkey:
  name: Your Full Name
  title: Your Job Title, Company
  url: https://github.com/yourusername
  image_url: https://avatars.githubusercontent.com/u/12345?v=4
  email: your.email@company.com  # optional
```

Then reference the author in your blog post frontmatter:
```yaml
authors:
  - yourauthorkey
```

**Author Image Options:**

**Option 1: GitHub Avatar (Recommended)**
```yaml
image_url: https://avatars.githubusercontent.com/u/12345?v=4
```

**Option 2: Local Image File**
1. Add your image to the `static/img/blogs/` directory:
   ```bash
   # Place your image file here
   cp your-photo.jpg static/img/blogs/yourname.jpg
   ```

2. Reference it in `authors.yml`:
   ```yaml
   yourauthorkey:
     name: Your Full Name
     image_url: /img/blogs/yourname.jpg
   ```

**Option 3: External URL**
```yaml
image_url: https://your-website.com/path/to/your-photo.jpg
```

**Examples from existing authors:**
- GitHub avatar: [`robshaw`](blog/authors.yml#L10-L11) uses `https://avatars.githubusercontent.com/u/114415538?v=4`
- Local image: [`cnuland`](blog/authors.yml#L39) uses `/img/blogs/cnuland.webp`

#### 4. **Write Your Content**

After the frontmatter, write your blog post in Markdown:

```markdown
---
# frontmatter here
---

# Your Blog Post Title

Your opening paragraph should provide a compelling introduction to your topic.

<!-- truncate -->

The `<!-- truncate -->` tag splits your post on the main blog listing page. Content above this tag appears in the preview, content below is only shown on the full post page.

## Your Content Sections

Continue with your blog post content...
```

#### 5. **Add Images**

**Image Organization:**
Create a dedicated folder for your blog post images:

```bash
# Create folder for your blog post
mkdir -p static/img/blogs/your-blog-slug/

# Add your images
cp your-image.png static/img/blogs/your-blog-slug/
```

**Reference Images in Markdown:**
```markdown
![Alt text description](/img/blogs/your-blog-slug/your-image.png)

<small>*__FIGURE 1__: Caption describing your image or diagram.*</small>
```

**Examples from existing posts:**
- See [`blog/2025-09-24_kvcache-wins-you-can-see.md`](blog/2025-09-24_kvcache-wins-you-can-see.md) for image usage examples
- Images are stored in [`static/img/blogs/kv-cache-wins/`](static/img/blogs/kv-cache-wins/)

#### 6. **Use Docusaurus Callouts**

Enhance your blog post with visual callouts:

```markdown
:::tip Key Takeaway
Important points or tips for readers
:::

:::note Additional Context
Supplementary information or context
:::
```

**Examples:**
- See callout usage in [`blog/2025-09-24_kvcache-wins-you-can-see.md`](blog/2025-09-24_kvcache-wins-you-can-see.md#L25-L32)
- See tip examples in [`blog/2025-06-25_community_update.md`](blog/2025-06-25_community_update.md#L21-L24)

#### 7. **Test Your Blog Post**

Before submitting, test your blog post locally:

```bash
npm start
# Navigate to http://localhost:3000/blog to see your post
```

#### 8. **Submit Your Blog Post**

Follow the standard contribution process:

```bash
git checkout -b blog/your-blog-post-slug
git add blog/your-blog-post.md static/img/blogs/your-blog-slug/
git commit -s -m "blog: add your blog post title"
git push origin blog/your-blog-post-slug
```

Then open a pull request. The PR will automatically generate a preview deployment for review.

#### **Blog Post Checklist**

- [ ] File named with correct format: `YYYY-MM-DD_slug.md`
- [ ] Complete frontmatter with all required fields
- [ ] Author(s) added to [`blog/authors.yml`](blog/authors.yml) if new
- [ ] `<!-- truncate -->` tag placed after introduction
- [ ] Images stored in `/static/img/blogs/your-slug/` folder
- [ ] Images referenced with proper paths and captions
- [ ] Tags added (check [`blog/tags.yml`](blog/tags.yml) for existing ones)
- [ ] Content tested locally with `npm start`
- [ ] Pull request includes preview link for reviewers

#### **Converting from Google Docs**

If you're converting content from Google Docs:

1. **Export as Markdown** from Google Docs
   *Note*: Images are embedded in the markdown so remove those at the bottom of the markdown before step 2.
2. **Save images separately** by exporting as HTML/ZIP to get image files
3. **Place images** in `/static/img/blogs/your-blog-slug/` folder
4. **Update image references** to use `/img/blogs/your-blog-slug/filename.png` format
5. **Add frontmatter** and `<!-- truncate -->` tag as described above
6. **Review and test** locally before submitting

## ❓ Frequently Asked Questions

### Why are there different approaches for adding content?

The website uses an optimized system based on content type:
- **Components**: Auto-generated from YAML for consistency
- **Guides**: Generator-based for flexible directory mapping
- **Other content**: Template-based for maximum customization

### Do keywords in the YAML actually do anything?

**Yes!** Keywords are rendered as HTML meta keywords tags for SEO:
```html
<meta name="keywords" content="llm-d,inference scheduler,request routing">
```

This helps search engines understand page content and improve discoverability. While modern search engines don't rely heavily on keywords meta tags, they're still used by some search engines and can help with content categorization.

### Can I add components from organizations outside llm-d?

**Yes!** The YAML supports any GitHub organization via the `org` field:
```yaml
components:
  - name: llm-d-modelservice
    org: llm-d-incubation          # Different org
```

The system automatically constructs the URL:
`https://raw.githubusercontent.com/llm-d-incubation/llm-d-modelservice/main/README.md`

Currently synced orgs:
- `llm-d` (main org)
- `llm-d-incubation` (experimental components)
- `kubernetes-sigs` (external, with `skipSync: true`)

### What happens to my markdown when it's synced?

The build system automatically transforms GitHub markdown to work with Docusaurus:
- GitHub callouts (e.g., `> [!NOTE]`) → Docusaurus admonitions (`:::note`)
- HTML tab markers (`<!-- TABS:START -->`) → Docusaurus Tabs components
- Relative links → Absolute GitHub links (to prevent broken links)
- Relative images → GitHub raw URLs
- HTML tags → MDX-compatible format

**Your source files remain unchanged** - transformations only apply to the synced copy.

### Why does all content sync from `main` branch?

This ensures the documentation always reflects the latest development state. Version tags in `components-data.yaml` are for display on the Latest Release page only and don't affect which content gets synced.

### Can I preview my changes before they go live?

Yes! When you open a pull request, Netlify automatically creates a preview deployment. The preview URL is posted as a comment on your PR.

For synced content from other repositories, you'll need to test changes locally (see README.md "Testing content from a feature branch" section).

### How do I update the website for a new release?

When a new llm-d release is published:

1. Run the sync script: `node remote-content/remote-sources/sync-release.mjs`
2. Review changes: `git diff remote-content/remote-sources/components-data.yaml`
3. Commit and push: `git add remote-content/remote-sources/components-data.yaml && git commit -m "Update to llm-d vX.Y.Z"`

The script automatically updates:
- Release version and date
- Component version tags (for Latest Release page display)
- Container image versions

**Note:** This only updates version numbers for display. Component READMEs always sync from the `main` branch during the build process.

For detailed information, see [Component Version Management](README.md#component-version-management) in README.md.

### What's the difference between version tags and synced content?

**Version tags** (in `components-data.yaml`):
- Displayed on the Latest Release page
- Show which versions were included in a release
- Updated by the `sync-release.mjs` script

**Synced content** (READMEs, guides, docs):
- Always pulled from the `main` branch
- Updated during each build
- Independent of version tags

**Example:** A component with `version: v0.6.0` in YAML will show "v0.6.0" on the Latest Release page, but its README content comes from the `main` branch, not from the `v0.6.0` release tag.

## 🆘 Need Help?

- **General questions**: <a href="/slack" target="_self">Join the llm-d Slack</a>
- **Website issues**: [Create an issue](https://github.com/llm-d/llm-d.github.io/issues)
- **Content questions**: Check if content is synced, then edit in appropriate repository
- **Technical details**: See [README.md](README.md) for architecture and transformation details

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

1. **Choose the right directory** based on content type:
   - `architecture/` → `docs/architecture/`
   - `guide/` → `docs/guide/`
   - `community/` → `docs/community/`

2. **Copy the template:**
   ```bash
   # Choose appropriate directory
   cp remote-content/remote-sources/example-readme.js.template remote-content/remote-sources/DIRECTORY/my-content.js
   
   # Examples:
   cp remote-content/remote-sources/example-readme.js.template remote-content/remote-sources/guide/my-guide.js
   cp remote-content/remote-sources/example-readme.js.template remote-content/remote-sources/architecture/my-arch-doc.js
   ```

3. **Edit configuration** in the new file (note the `../` imports for utils)

4. **Add to system** in `remote-content/remote-content.js`

5. **Test** with `npm start`

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

This project follows the main llm-d [Contributing Guidelines](https://github.com/llm-d/llm-d/blob/main/CONTRIBUTING.md):

- **DCO Sign-off Required**: Use `git commit -s`
- **All changes via PR**: No direct pushes to main
- **Review required**: Maintainer approval needed
- **Preview deployments**: Available for all PRs

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
- Local image: [`cnuland`](blog/authors.yml#L39) uses `/img/blogs/cnuland.jpeg`

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

## 🆘 Need Help?

- **General questions**: <a href="/slack" target="_self">Join the llm-d Slack</a>
- **Website issues**: [Create an issue](https://github.com/llm-d/llm-d.github.io/issues)
- **Content questions**: Check if content is synced, then edit in appropriate repository 

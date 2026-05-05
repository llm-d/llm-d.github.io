# Build Scripts

## Unified Build Script

The `build-all.sh` script provides a **single source of truth** for building the complete llm-d.ai website (main site + docs) across all environments:

- **Local development**
- **Netlify preview deployments**
- **GitHub Actions production deployments**

### What it does

1. Builds the main site (landing page, blog, community)
2. Syncs preview docs from upstream `llm-d/llm-d` repository
3. Builds the preview docs site
4. Merges the preview build into the main build at `/docs`

### Usage

#### Standard build (syncs from main branch):
```bash
npm run build:all
```

#### Build with specific branch:
```bash
bash scripts/build-all.sh release-0.7
```

#### Use local llm-d clone instead of fetching:
```bash
LLMD_REPO=/path/to/local/llm-d npm run build:all
```

### Local Testing Workflow

To test the complete site locally (exactly as it will appear in production):

```bash
# Build everything and serve it
npm run serve:production

# Then open in browser:
# - Main site: http://localhost:3000
# - Docs site: http://localhost:3000/docs
```

This is the **recommended way** to verify changes before pushing to GitHub or deploying to Netlify.

### Environment Alignment

All three deployment environments use the same build process:

| Environment | Command |
|-------------|---------|
| **Local** | `npm run build:all` |
| **Netlify** | `npm run build:all` (configured in `netlify.toml`) |
| **GitHub Actions** | `npm run build:all` (configured in `.github/workflows/deploy.yml`) |

This ensures that if it works locally, it will work in Netlify and GitHub Actions.

### Output Structure

After running `build:all`, the `build/` directory contains:

```
build/
├── index.html          # Main site landing page
├── blog/               # Blog posts
├── community/          # Community content
├── docs/              # Preview docs site (merged from preview/build)
│   ├── index.html
│   ├── getting-started/
│   ├── architecture/
│   └── ...
└── ...
```

### Troubleshooting

**Issue**: Docs not showing at `/docs`
- **Solution**: Make sure you ran `npm run build:all` (not just `npm run build`)

**Issue**: Stale docs content
- **Solution**: The script syncs from upstream each time. Delete `preview/docs/` and re-run if needed.

**Issue**: Build fails in preview step
- **Solution**: Check that `preview/scripts/sync-docs.sh` is working correctly. You can run it manually: `cd preview && bash scripts/sync-docs.sh main`

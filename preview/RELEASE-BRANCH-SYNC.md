# Release Branch Documentation Sync

This document describes the release branch synchronization infrastructure for llm-d documentation.

## Overview

Starting with release 0.7.0, documentation for each release is maintained on dedicated release branches that sync nightly from the corresponding release branch in the main llm-d/llm-d repository.

## Architecture

### Branch Structure

- **Main branch**: Always shows latest development docs (from llm-d/llm-d@main)
- **Release branches**: Named `release-X.Y.Z` (e.g., `release-0.7.0`)
  - Syncs nightly from `llm-d/llm-d@release-X.Y` 
  - Deployed to `/docs/X.Y.Z/` on the website

### Workflows

#### 1. `create-release-branch.yml`

**Purpose**: Create a new release branch for documentation

**Trigger**: Manual (workflow_dispatch)

**Inputs**:
- `version`: Full version number (e.g., `0.7.0`)
- `source_branch`: Source branch in llm-d/llm-d (e.g., `release-0.7`)

**What it does**:
1. Creates a new branch `release-{version}` from main
2. Performs initial docs sync from llm-d/llm-d@{source_branch}
3. Commits and pushes the new branch

**Usage**:
```bash
gh workflow run create-release-branch.yml \
  --repo llm-d/llm-d.github.io \
  --field version=0.7.0 \
  --field source_branch=release-0.7
```

#### 2. `sync-release-docs.yml`

**Purpose**: Nightly sync of all release branches

**Trigger**: Scheduled (1:00 AM UTC daily) + Manual

**What it does**:
1. Discovers all `release-*` branches
2. For each branch:
   - Extracts version (e.g., `release-0.7.0` → version `0.7.0`)
   - Derives source branch (e.g., `0.7.0` → `release-0.7` in llm-d/llm-d)
   - Syncs docs via `scripts/sync-docs.sh`
   - Commits and pushes changes if any

#### 3. `deploy.yml` (updated)

**Purpose**: Build and deploy website + all release docs

**What it does**:
1. Builds main website
2. Builds preview docs (dev/main)
3. Discovers and builds all release branches
4. Merges everything into a single artifact:
   - `/` → Main website
   - `/docs/` → Preview docs (dev)
   - `/docs/0.7.0/` → Release 0.7.0 docs
   - `/docs/0.8.0/` → Release 0.8.0 docs
   - etc.

### Version Picker

The version dropdown component (`preview/src/components/VersionDropdown.tsx`) intelligently routes users:

- **Version >= 0.7.0**: Links to `/docs/{version}/` on the website
- **Version < 0.7.0**: Links to GitHub tree view (legacy releases)
- **Page path preservation**: Maintains current page when switching versions
  - Example: On `/docs/architecture` → Click v0.7.0 → Go to `/docs/0.7.0/architecture`

## Creating a New Release

Follow these steps when creating a new release:

### 1. Create release branch in llm-d/llm-d

```bash
cd llm-d/llm-d
git checkout -b release-0.7
git push upstream release-0.7
```

### 2. Create documentation release branch

Trigger the workflow to create the docs branch:

```bash
gh workflow run create-release-branch.yml \
  --repo llm-d/llm-d.github.io \
  --field version=0.7.0 \
  --field source_branch=release-0.7
```

This step is integrated into the release process template at `.github/ISSUE_TEMPLATE/new-release.md`.

### 3. Verify sync

The branch will be created and synced immediately. Nightly syncs will keep it updated automatically.

To manually trigger a sync:

```bash
gh workflow run sync-release-docs.yml --repo llm-d/llm-d.github.io
```

### 4. Deploy

Deployment happens automatically on the next push to main or via the nightly build. Release docs are built and deployed alongside the main site.

## URL Structure

After creating release 0.7.0:

- `https://llm-d.ai/` → Main website
- `https://llm-d.ai/docs/` → Dev docs (main branch)
- `https://llm-d.ai/docs/0.7.0/` → Release 0.7.0 docs
- `https://llm-d.ai/docs/0.7.0/getting-started/` → Specific page in 0.7.0

## Version Mapping

| Release Branch (llm-d.github.io) | Source Branch (llm-d/llm-d) | Website Path |
|----------------------------------|----------------------------|--------------|
| `release-0.7.0` | `release-0.7` | `/docs/0.7.0/` |
| `release-0.8.0` | `release-0.8` | `/docs/0.8.0/` |
| `main` | `main` | `/docs/` (dev) |

## Maintenance

### Updating release docs

Changes to release documentation should be made in the llm-d/llm-d release branch. They will sync automatically overnight. To sync immediately:

```bash
gh workflow run sync-release-docs.yml --repo llm-d/llm-d.github.io
```

### Patching release docs

If you need to patch documentation for a specific release:

1. Make changes in llm-d/llm-d on the release branch (e.g., `release-0.7`)
2. Wait for nightly sync, or trigger manually
3. Changes will appear on the website within minutes

### Removing a release branch

If a release branch needs to be removed:

```bash
git push origin --delete release-X.Y.Z
```

The next deployment will automatically skip the deleted branch.

## Troubleshooting

### Sync failures

Check the workflow run logs:
```bash
gh run list --workflow=sync-release-docs.yml --repo llm-d/llm-d.github.io
```

Common issues:
- Source branch doesn't exist in llm-d/llm-d
- Merge conflicts (rare, but possible if files are manually edited)

### Build failures

Check the deploy workflow logs:
```bash
gh run list --workflow=deploy.yml --repo llm-d/llm-d.github.io
```

### Version not appearing in dropdown

1. Verify the release tag exists in llm-d/llm-d
2. Check that `preview/plugins/versions-plugin.js` is fetching tags correctly
3. Rebuild the site to regenerate `static/releases.json`

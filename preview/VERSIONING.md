# Documentation Versioning Instructions

## Current State (Pre-0.7 Release)
- **Label:** "dev" (changed from "latest")
- **URL:** `/docs/` shows dev (main branch)
- **No version snapshots created yet**

## When Ready to Release 0.7

### Step 1: Create release-0.7 branch in llm-d/llm-d
In the llm-d/llm-d repository:
```bash
git checkout main
git pull
git checkout -b release-0.7
git push upstream release-0.7
```

### Step 2: Create version snapshot
In this repository (llm-d.github.io):
```bash
cd preview
./scripts/create-version.sh 0.7
```

This will:
- Sync docs from `release-0.7` branch
- Create `versioned_docs/version-0.7/`
- Create `versioned_sidebars/version-0.7-sidebars.json`
- Update `versions.json` to include "0.7"

### Step 3: Update docusaurus.config.ts
After creating the version, update `preview/docusaurus.config.ts`:

```typescript
lastVersion: '0.7',  // Change from 'current'
versions: {
  current: {
    label: 'dev',
    path: 'next',    // Change from '' to 'next'
    badge: true,
    banner: 'unreleased',
  },
  '0.7': {
    label: '0.7',
    path: '',        // Latest stable at /docs/
    banner: 'none',
  },
},
```

### Step 4: Commit and deploy
```bash
git add versioned_docs/ versioned_sidebars/ versions.json preview/docusaurus.config.ts
git commit -m "Add v0.7 documentation version"
git push
```

## URL Structure After 0.7 Release
- `/docs/` → 0.7 (latest stable)
- `/docs/next/` → dev (main branch)
- `/docs/0.6/` → 0.6 (when created)

## Creating Additional Versions
To add 0.6, 0.5, etc.:
```bash
# Requires release-0.6, release-0.5 branches in llm-d/llm-d
./scripts/create-version.sh 0.6
./scripts/create-version.sh 0.5
```

## Version Dropdown Display
- **dev** (unreleased docs from main)
- **0.7** (latest stable) ← default
- **0.6** (previous release)
- **0.5** (previous release)

# Transformation Tests

This directory contains tests that validate markdown transformations applied during the documentation sync process.

## What Gets Tested

All transformations in `sync-docs.sh` are validated:

- **GitHub Callouts** → Docusaurus admonitions (`> [!NOTE]` → `:::note`)
- **Custom Tabs** → Docusaurus Tabs (`<!-- TABS:START -->` → `<Tabs>`)
- **Image Paths** → Absolute paths (`../assets/` → `/img/docs/`)
- **MDX Escaping** → Special characters (`<->` → `\<->`)

## Running Tests

```bash
# From root directory
npm run test:transformations

# Or from preview directory
cd preview && npm run test:transformations

# Run all tests (Jest + transformations)
npm test
```

**Tests run automatically:**
- ✅ On every PR (via `.github/workflows/test.yml`)
- ✅ Before every build (via `npm run build`)
- ✅ On push to main (via `.github/workflows/deploy.yml`)

## Test Files

- **`transformation-test.md`** - Input with all transformation patterns
- **`transformation-test.expected.md`** - Expected output after transformations
- **`test-transformations.sh`** - Script that runs transformations and compares output

## How It Works

```
transformation-test.md
         ↓
  [Apply transformations via scripts/transformations.sh]
         ↓
transformation-test.output.md
         ↓
  [Compare with expected]
         ↓
    Pass or Fail
```

If output doesn't match expected, the test fails with a diff showing what changed.

**Key Architecture Detail:**
- Both `test-transformations.sh` and `sync-docs.sh` source the same `transformations.sh` file
- This ensures tests validate the ACTUAL production transformation code
- No code duplication = tests can't drift out of sync with production

## Updating Tests

**When modifying transformations:**

1. Update transformation code in `sync-docs.sh`
2. Update `test-transformations.sh` to match
3. Run tests: `npm run test:transformations`
4. Review the diff in `diff.txt`
5. If changes are correct:
   ```bash
   cp transformation-test.output.md transformation-test.expected.md
   ```
6. Commit both the code changes and updated expected output

**Adding new transformation patterns:**

1. Add example to `transformation-test.md`
2. Run tests (will fail)
3. Review `transformation-test.output.md`
4. If correct: `cp transformation-test.output.md transformation-test.expected.md`
5. Commit both files

## CI/CD Integration

**Pull Requests:**
- Run transformation tests
- Build docs (validates Docusaurus compatibility)
- **Does NOT deploy**

**Main Branch:**
- Run transformation tests
- Build docs
- **Deploys to GitHub Pages**

If tests fail, the build stops and deployment is prevented.

## For More Info

- **Custom tab syntax:** See `CONTRIBUTING.md` (root directory)

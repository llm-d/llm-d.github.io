# Transformation test fixtures

Golden-file tests for shared MDX/markdown transforms applied during doc sync.

**Implementation:** `tools/llmd-site/internal/transform/` (`ApplySharedContent`)

**Test:** `TestApplySharedFixture` in `tools/llmd-site/internal/transform/shared_test.go`

## Running tests

```bash
# From repo root (all llmd-site tests)
make test-llmd-site

# Transform fixture only
cd tools/llmd-site && go test ./internal/transform/ -run TestApplyShared -v

# From preview/ (convenience)
cd preview && npm test
```

## Files

- **`transformation-test.md`** — input with all transformation patterns
- **`transformation-test.expected.md`** — expected output after transforms

## Updating expected output

1. Edit transform logic in `tools/llmd-site/internal/transform/shared.go`
2. Run `go test ./internal/transform/ -run TestApplySharedFixture -v` (fails with diff)
3. If changes are correct, update `transformation-test.expected.md`
4. Commit both code and fixture changes

Doc-specific post-copy rules (in `docs-sync.yaml` `transform_rules` and `internal/sync/postprocess.go`) are tested separately via golden sync tests.

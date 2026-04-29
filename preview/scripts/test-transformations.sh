#!/usr/bin/env bash
# test-transformations.sh - Validate markdown transformations
#
# This script tests that all markdown transformations work correctly by:
# 1. Running transformations on a test file
# 2. Comparing output with expected results
# 3. Failing if they don't match

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$SCRIPT_DIR/test-fixtures"
TEST_FILE="$TEST_DIR/transformation-test.md"
EXPECTED_FILE="$TEST_DIR/transformation-test.expected.md"
OUTPUT_FILE="$TEST_DIR/transformation-test.output.md"

# Source shared transformations
source "$SCRIPT_DIR/transformations.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "======================================"
echo "Testing Markdown Transformations"
echo "======================================"
echo ""

# Check that test files exist
if [[ ! -f "$TEST_FILE" ]]; then
    echo -e "${RED}ERROR: Test file not found: $TEST_FILE${NC}"
    exit 1
fi

if [[ ! -f "$EXPECTED_FILE" ]]; then
    echo -e "${RED}ERROR: Expected output file not found: $EXPECTED_FILE${NC}"
    exit 1
fi

# Copy test file to output file for transformation
cp "$TEST_FILE" "$OUTPUT_FILE"

echo "Step 1-4: Applying all transformations..."
# Use the shared transformation function
apply_transformations "$OUTPUT_FILE"

echo "Step 5: Comparing output with expected results..."
echo ""

# Compare the files
if diff -u "$EXPECTED_FILE" "$OUTPUT_FILE" > "$TEST_DIR/diff.txt"; then
    echo -e "${GREEN}✓ All transformations passed!${NC}"
    echo ""
    rm -f "$TEST_DIR/diff.txt"
    rm -f "$OUTPUT_FILE"
    exit 0
else
    echo -e "${RED}✗ Transformation test failed!${NC}"
    echo ""
    echo -e "${YELLOW}Differences found:${NC}"
    cat "$TEST_DIR/diff.txt"
    echo ""
    echo -e "${YELLOW}Expected output:${NC} $EXPECTED_FILE"
    echo -e "${YELLOW}Actual output:${NC} $OUTPUT_FILE"
    echo -e "${YELLOW}Diff file:${NC} $TEST_DIR/diff.txt"
    echo ""
    echo "To update expected output if changes are intentional:"
    echo "  cp $OUTPUT_FILE $EXPECTED_FILE"
    echo ""
    exit 1
fi

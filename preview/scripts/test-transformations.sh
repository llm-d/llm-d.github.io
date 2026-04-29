#!/usr/bin/env bash
# test-transformations.sh - Validate markdown transformations
#
# This script tests that all markdown transformations work correctly by:
# 1. Running transformations on a test file
# 2. Comparing output with expected results
# 3. Reporting any differences

set -euo pipefail

if [[ "$(uname)" == "Darwin" ]]; then
    sed_inplace() { sed -i '' "$@"; }
else
    sed_inplace() { sed -i "$@"; }
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEST_DIR="$SCRIPT_DIR/test-fixtures"
TEST_FILE="$TEST_DIR/transformation-test.md"
EXPECTED_FILE="$TEST_DIR/transformation-test.expected.md"
OUTPUT_FILE="$TEST_DIR/transformation-test.output.md"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

echo "Step 1: Testing image path transformations..."
sed_inplace \
    -e 's|\(\.\./\)*assets/\([^)]*\)|/img/docs/\2|g' \
    "$OUTPUT_FILE"

echo "Step 2: Testing MDX escaping..."
sed_inplace 's|<->|\\<->|g' "$OUTPUT_FILE"

echo "Step 3: Testing GitHub callout transformations..."
awk '
/^> \[!NOTE\]/ { in_callout=1; type="note"; next }
/^> \[!TIP\]/ { in_callout=1; type="tip"; next }
/^> \[!IMPORTANT\]/ { in_callout=1; type="important"; next }
/^> \[!WARNING\]/ { in_callout=1; type="warning"; next }
/^> \[!CAUTION\]/ { in_callout=1; type="caution"; next }

in_callout && /^> / {
    if (!printed_start) {
        print ":::" type
        printed_start=1
    }
    sub(/^> /, "")
    print
    next
}

in_callout && !/^> / {
    print ":::"
    print ""
    in_callout=0
    printed_start=0
    type=""
}

{ print }

END {
    if (in_callout) print ":::"
}
' "$OUTPUT_FILE" > "$OUTPUT_FILE.tmp" && mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"

echo "Step 4: Testing custom tab syntax transformations..."
awk '
/^<!-- TABS:START -->/ {
    in_tabs=1
    print ""
    print "import Tabs from '\''@theme/Tabs'\'';"
    print "import TabItem from '\''@theme/TabItem'\'';"
    print ""
    print "<Tabs>"
    next
}

/^<!-- TAB:/ && in_tabs {
    # Close previous TabItem if exists
    if (current_tab) {
        print "</TabItem>"
    }

    # Extract tab label and check for :default
    line = $0
    sub(/^<!-- TAB:/, "", line)
    sub(/ -->.*$/, "", line)

    is_default = ""
    if (line ~ /:default$/) {
        is_default = " default"
        sub(/:default$/, "", line)
    }
    label = line

    # Generate value from label (lowercase, replace spaces/parens with dash)
    value = tolower(label)
    gsub(/[^a-z0-9]+/, "-", value)
    gsub(/^-|-$/, "", value)  # trim leading/trailing dashes

    print "<TabItem value=\"" value "\" label=\"" label "\"" is_default ">"
    current_tab = 1
    next
}

/^<!-- TABS:END -->/ && in_tabs {
    # Close last TabItem
    if (current_tab) {
        print "</TabItem>"
    }
    print "</Tabs>"
    print ""
    in_tabs = 0
    current_tab = 0
    next
}

# Print all other lines as-is
{ print }
' "$OUTPUT_FILE" > "$OUTPUT_FILE.tmp" && mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"

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

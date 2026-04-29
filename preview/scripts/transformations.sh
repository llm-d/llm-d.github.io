#!/usr/bin/env bash
# transformations.sh - Shared transformation functions used by both sync-docs.sh and test-transformations.sh
#
# This ensures transformations are identical in production and tests

# Platform-specific sed
if [[ "$(uname)" == "Darwin" ]]; then
    sed_inplace() { sed -i '' "$@"; }
else
    sed_inplace() { sed -i "$@"; }
fi

# Apply all generic markdown transformations to a file
# Usage: apply_transformations <file>
#
# NOTE: sync-docs.sh may apply additional doc-specific transformations
# (specific image paths, cross-references) before calling this function.
apply_transformations() {
    local file="$1"

    # Image paths - convert relative to absolute
    sed_inplace \
        -e 's|\(\.\./\)*assets/\([^)]*\)|/img/docs/\2|g' \
        "$file"

    # MDX escaping - escape special characters
    sed_inplace 's|<->|\\<->|g' "$file"

    # GitHub callouts
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
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"

    # Custom tabs
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
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
}

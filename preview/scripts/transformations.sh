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
    # Different handling for markdown vs HTML:
    # - Markdown images: Use /img/docs/ (Docusaurus auto-prepends baseUrl)
    # - HTML img/source tags: Use /docs/img/docs/ (raw HTML needs full path with baseUrl)

    # Transform markdown image syntax: ![alt](../assets/...) -> ![alt](/img/docs/...)
    sed_inplace \
        -e 's|!\[\([^]]*\)\](\(\.\./\)*assets/\([^)]*\))|![\1](/img/docs/\3)|g' \
        "$file"

    # Transform HTML img tag src: src="../assets/..." -> src="/docs/img/docs/..."
    sed_inplace \
        -e 's|src="\(\.\./\)*assets/\([^"]*\)"|src="/docs/img/docs/\2"|g' \
        "$file"

    # Transform HTML source tag srcset: srcset="../assets/..." -> srcset="/docs/img/docs/..."
    sed_inplace \
        -e 's|srcset="\(\.\./\)*assets/\([^"]*\)"|srcset="/docs/img/docs/\2"|g' \
        "$file"

    # MDX escaping - escape special characters
    sed_inplace 's|<->|\\<->|g' "$file"

    # Escape HTML comments for MDX (MDX doesn't support <!-- --> syntax)
    # Replace HTML comments with MDX comments: <!-- text --> becomes {/* text */}
    # Handle both single-line and multi-line comments
    # Use perl for multi-line regex support
    perl -i -pe 'BEGIN{undef $/;} s/<!--(.*?)-->/{\/\*$1\*\/}/gs' "$file"

    # Escape angle brackets that look like HTML tags but aren't (e.g., <your_gateway_choice>)
    # These appear in template/placeholder text and confuse MDX parser
    # Only escape patterns with underscores or specific placeholder patterns
    # Don't escape real HTML tags (picture, source, img, div, p, etc.)
    sed_inplace 's|<\([a-z][a-z0-9]*_[a-z0-9_]*\)>|\\<\1\\>|g' "$file"

    # Escape comparison operators in text (<=, >=) that MDX interprets as JSX
    # Replace with HTML entities
    sed_inplace 's|<=|\\&le;|g' "$file"
    sed_inplace 's|>=|\\&ge;|g' "$file"

    # Fix escaped curly braces in tables (MDX interprets \{var\} as JS expression)
    # Convert \{key,value\} -> (key,value) for MDX compatibility
    sed_inplace 's|\\{|(|g' "$file"
    sed_inplace 's|\\}|)|g' "$file"

    # Also fix unescaped curly braces in table cells
    # Convert {key,value} -> (key,value) in table cells (lines with |)
    sed_inplace '/^|.*|$/ s|{|(|g' "$file"
    sed_inplace '/^|.*|$/ s|}|)|g' "$file"

    # Fix well-lit-paths links (convert to /docs/guides for Docusaurus)
    # Source files use ../well-lit-paths/*.md for GitHub compatibility
    # Convert to /docs/guides/* for Docusaurus
    sed_inplace \
        -E 's|\(\.\./well-lit-paths/([^)]+)\.md\)|(/docs/guides/\1)|g' \
        "$file"

    # Also handle paths with multiple ../ and any path to well-lit-paths
    sed_inplace \
        -e 's|\](.*\/well-lit-paths/\([^)]*\)\.md)|\](/docs/guides/\1)|g' \
        "$file"

    # Fix README.md links to index pages
    # Convert paths like ../architecture/core/router/epp/README.md to /docs/architecture/core/router/epp
    sed_inplace \
        -e 's|\](.*\/accelerators/README\.md)|\](/docs/accelerators)|g' \
        -e 's|\](.*\/architecture/core/router/epp/README\.md)|\](/docs/architecture/core/router/epp)|g' \
        -e 's|\](.*\/architecture/advanced/kv-management/README\.md)|\](/docs/architecture/advanced/kv-management)|g' \
        "$file"

    # Fix /docs/guides/README (without .md extension)
    sed_inplace \
        -e 's|\](/docs/guides/README)|\](/docs/guides)|g' \
        "$file"

    # Fix relative README.md links in guides
    sed_inplace \
        -e 's|\](./gcp-pubsub/README\.md)|\](./gcp-pubsub/index.md)|g' \
        -e 's|\](./redis/README\.md)|\](./redis/index.md)|g' \
        -e 's|\](./gcp-pubsub/README\.md#testing)|\](./gcp-pubsub/index.md#testing)|g' \
        -e 's|\](./redis/README\.md#testing)|\](./redis/index.md#testing)|g' \
        -e 's|\](./cpu/README\.md)|\](./cpu/index.md)|g' \
        -e 's|\](./storage/README\.md)|\](./storage/index.md)|g' \
        "$file"

    # Fix guide name variations and relative paths
    sed_inplace \
        -e 's|\](/docs/guides/predicted-latency)|\](/docs/guides/predicted-latency-based-scheduling)|g' \
        -e 's|\](/docs/guides/wide-expert-parallelism)|\](/docs/guides/wide-ep-lws)|g' \
        -e 's|\](../../prereq/gateway-provider/common-configurations/*)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateway-provider#common-configurations)|g' \
        -e 's|\](../gateway/*)|\](/docs/guides/recipes/gateway)|g' \
        "$file"

    # Fix deployment guide links to GitHub URLs
    # These guides live in llm-d/guides/ and should link to GitHub
    sed_inplace \
        -e 's|\](.*\/guides/prereq/gateways/README\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateways/README.md)|g' \
        -e 's|\](.*\/guides/prereq/gateways/istio\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateways/istio.md)|g' \
        -e 's|\](.*\/guides/prereq/gateways/gke\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateways/gke.md)|g' \
        -e 's|\](.*\/guides/prereq/gateways/agentgateway\.md)|\](https://github.com/llm-d/llm-d/tree/main/guides/prereq/gateways/agentgateway.md)|g' \
        "$file"

    # Fix unclosed HTML tags for MDX (must be self-closing)
    sed_inplace 's|<img \([^>]*[^/]\)>|<img \1 />|g' "$file"
    sed_inplace 's|<source \([^>]*[^/]\)>|<source \1 />|g' "$file"

    # Fix unquoted attribute values in img tags (e.g., width=95% -> width="95%")
    sed_inplace -E 's/(<img [^>]*)(width|height|alt|src)=([^"'\'' ][^ >]*)/\1\2="\3"/g' "$file"

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

    # Custom tabs - Check if file needs tab imports, add at top if so, then transform
    if grep -q '^<!-- TABS:START -->' "$file"; then
        # File has tabs - add imports at top if not already present
        if ! grep -q "import Tabs from '@theme/Tabs'" "$file"; then
            {
                echo "import Tabs from '@theme/Tabs';"
                echo "import TabItem from '@theme/TabItem';"
                echo ""
                cat "$file"
            } > "$file.tmp" && mv "$file.tmp" "$file"
        fi
    fi

    # Transform tab blocks
    awk '
    /^<!-- TABS:START -->/ {
        in_tabs=1
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

    # Convert any remaining HTML comments to MDX comments
    # (Tab-related comments have already been processed and removed)
    sed_inplace -E 's/<!--(.*)-->/\{\/\*\1\*\/\}/g' "$file"
}

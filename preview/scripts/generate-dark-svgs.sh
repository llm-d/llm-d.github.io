#!/usr/bin/env bash
# generate-dark-svgs.sh - Generate dark mode variants of SVG files
#
# Inverts colors from light to dark theme:
# - Black/dark colors → White/light colors
# - White/light colors → Black/dark colors
# - Preserves accent colors (blues, purples, greens)

# Don't exit on error - we handle errors ourselves
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STATIC_DIR="$PROJECT_DIR/static/img/docs"

# Platform-specific sed
if [[ "$(uname)" == "Darwin" ]]; then
    sed_inplace() { sed -i '' "$@"; }
else
    sed_inplace() { sed -i "$@"; }
fi

# Generate dark variant of a single SVG file
generate_dark_variant() {
    local light_svg="$1"
    local dark_svg="${light_svg%.svg}-dark.svg"

    # Skip if already a dark variant
    if [[ "$light_svg" =~ -dark\.svg$ ]]; then
        return 0
    fi

    # Skip if dark variant already exists and is newer than light version
    if [[ -f "$dark_svg" ]] && [[ "$dark_svg" -nt "$light_svg" ]]; then
        return 0
    fi

    echo "      Generating $(basename "$dark_svg")"

    # Copy light version to dark version
    cp "$light_svg" "$dark_svg" || {
        echo "Error: Failed to copy $light_svg to $dark_svg" >&2
        return 1
    }

    # Apply color transformations using two-pass approach to avoid conflicts
    # Pass 1: Replace light theme colors with placeholders
    # Pass 2: Replace placeholders with dark theme colors

    # Pass 1: Light → Temp placeholders
    sed_inplace \
        -e 's/fill="#000000"/fill="TEMP_BLACK_TO_WHITE"/g' \
        -e 's/fill="#000"/fill="TEMP_BLACK_TO_WHITE"/g' \
        -e 's/fill="black"/fill="TEMP_BLACK_TO_WHITE"/g' \
        -e 's/stroke="#000000"/stroke="TEMP_BLACK_TO_WHITE"/g' \
        -e 's/stroke="#000"/stroke="TEMP_BLACK_TO_WHITE"/g' \
        -e 's/stroke="black"/stroke="TEMP_BLACK_TO_WHITE"/g' \
        \
        -e 's/fill="#ffffff"/fill="TEMP_WHITE_TO_BLACK"/g' \
        -e 's/fill="#fff"/fill="TEMP_WHITE_TO_BLACK"/g' \
        -e 's/fill="white"/fill="TEMP_WHITE_TO_BLACK"/g' \
        -e 's/stroke="#ffffff"/stroke="TEMP_WHITE_TO_BLACK"/g' \
        -e 's/stroke="#fff"/stroke="TEMP_WHITE_TO_BLACK"/g' \
        -e 's/stroke="white"/stroke="TEMP_WHITE_TO_BLACK"/g' \
        \
        -e 's/fill="#f5f5f5"/fill="TEMP_LIGHTGRAY_TO_DARKGRAY"/g' \
        -e 's/fill="#f3f3f3"/fill="TEMP_LIGHTGRAY_TO_DARKGRAY"/g' \
        -e 's/fill="#fafafa"/fill="TEMP_LIGHTGRAY_TO_DARKGRAY"/g' \
        -e 's/fill="#f0f0f0"/fill="TEMP_LIGHTGRAY_TO_DARKGRAY"/g' \
        -e 's/stroke="#f5f5f5"/stroke="TEMP_LIGHTGRAY_TO_DARKGRAY"/g' \
        -e 's/stroke="#f3f3f3"/stroke="TEMP_LIGHTGRAY_TO_DARKGRAY"/g' \
        -e 's/stroke="#fafafa"/stroke="TEMP_LIGHTGRAY_TO_DARKGRAY"/g' \
        -e 's/stroke="#f0f0f0"/stroke="TEMP_LIGHTGRAY_TO_DARKGRAY"/g' \
        \
        -e 's/fill="#e5e5e5"/fill="TEMP_MEDGRAY_TO_DARKERGRAY"/g' \
        -e 's/fill="#eeeeee"/fill="TEMP_MEDGRAY_TO_DARKERGRAY"/g' \
        -e 's/fill="#ddd"/fill="TEMP_MEDGRAY_TO_DARKERGRAY"/g' \
        -e 's/stroke="#e5e5e5"/stroke="TEMP_MEDGRAY_TO_DARKERGRAY"/g' \
        -e 's/stroke="#eeeeee"/stroke="TEMP_MEDGRAY_TO_DARKERGRAY"/g' \
        -e 's/stroke="#ddd"/stroke="TEMP_MEDGRAY_TO_DARKERGRAY"/g' \
        \
        -e 's/fill="#333333"/fill="TEMP_DARKGRAY_TO_LIGHTGRAY"/g' \
        -e 's/fill="#333"/fill="TEMP_DARKGRAY_TO_LIGHTGRAY"/g' \
        -e 's/fill="#222222"/fill="TEMP_DARKGRAY_TO_LIGHTGRAY"/g' \
        -e 's/fill="#222"/fill="TEMP_DARKGRAY_TO_LIGHTGRAY"/g' \
        -e 's/fill="#1a1a1a"/fill="TEMP_DARKGRAY_TO_LIGHTGRAY"/g' \
        -e 's/stroke="#333333"/stroke="TEMP_DARKGRAY_TO_LIGHTGRAY"/g' \
        -e 's/stroke="#333"/stroke="TEMP_DARKGRAY_TO_LIGHTGRAY"/g' \
        -e 's/stroke="#222222"/stroke="TEMP_DARKGRAY_TO_LIGHTGRAY"/g' \
        -e 's/stroke="#222"/stroke="TEMP_DARKGRAY_TO_LIGHTGRAY"/g' \
        -e 's/stroke="#1a1a1a"/stroke="TEMP_DARKGRAY_TO_LIGHTGRAY"/g' \
        \
        -e 's/fill:#000000/fill:TEMP_BLACK_TO_WHITE/g' \
        -e 's/fill:#000/fill:TEMP_BLACK_TO_WHITE/g' \
        -e 's/fill:black/fill:TEMP_BLACK_TO_WHITE/g' \
        -e 's/stroke:#000000/stroke:TEMP_BLACK_TO_WHITE/g' \
        -e 's/stroke:#000/stroke:TEMP_BLACK_TO_WHITE/g' \
        -e 's/stroke:black/stroke:TEMP_BLACK_TO_WHITE/g' \
        \
        -e 's/fill:#ffffff/fill:TEMP_WHITE_TO_BLACK/g' \
        -e 's/fill:#fff/fill:TEMP_WHITE_TO_BLACK/g' \
        -e 's/fill:white/fill:TEMP_WHITE_TO_BLACK/g' \
        -e 's/stroke:#ffffff/stroke:TEMP_WHITE_TO_BLACK/g' \
        -e 's/stroke:#fff/stroke:TEMP_WHITE_TO_BLACK/g' \
        -e 's/stroke:white/stroke:TEMP_WHITE_TO_BLACK/g' \
        \
        -e 's/fill:#f5f5f5/fill:TEMP_LIGHTGRAY_TO_DARKGRAY/g' \
        -e 's/fill:#f3f3f3/fill:TEMP_LIGHTGRAY_TO_DARKGRAY/g' \
        -e 's/fill:#fafafa/fill:TEMP_LIGHTGRAY_TO_DARKGRAY/g' \
        -e 's/fill:#f0f0f0/fill:TEMP_LIGHTGRAY_TO_DARKGRAY/g' \
        -e 's/stroke:#f5f5f5/stroke:TEMP_LIGHTGRAY_TO_DARKGRAY/g' \
        -e 's/stroke:#f3f3f3/stroke:TEMP_LIGHTGRAY_TO_DARKGRAY/g' \
        -e 's/stroke:#fafafa/stroke:TEMP_LIGHTGRAY_TO_DARKGRAY/g' \
        -e 's/stroke:#f0f0f0/stroke:TEMP_LIGHTGRAY_TO_DARKGRAY/g' \
        \
        -e 's/fill:#e5e5e5/fill:TEMP_MEDGRAY_TO_DARKERGRAY/g' \
        -e 's/fill:#eeeeee/fill:TEMP_MEDGRAY_TO_DARKERGRAY/g' \
        -e 's/fill:#ddd/fill:TEMP_MEDGRAY_TO_DARKERGRAY/g' \
        -e 's/stroke:#e5e5e5/stroke:TEMP_MEDGRAY_TO_DARKERGRAY/g' \
        -e 's/stroke:#eeeeee/stroke:TEMP_MEDGRAY_TO_DARKERGRAY/g' \
        -e 's/stroke:#ddd/stroke:TEMP_MEDGRAY_TO_DARKERGRAY/g' \
        \
        -e 's/fill:#333333/fill:TEMP_DARKGRAY_TO_LIGHTGRAY/g' \
        -e 's/fill:#333/fill:TEMP_DARKGRAY_TO_LIGHTGRAY/g' \
        -e 's/fill:#222222/fill:TEMP_DARKGRAY_TO_LIGHTGRAY/g' \
        -e 's/fill:#222/fill:TEMP_DARKGRAY_TO_LIGHTGRAY/g' \
        -e 's/fill:#1a1a1a/fill:TEMP_DARKGRAY_TO_LIGHTGRAY/g' \
        -e 's/stroke:#333333/stroke:TEMP_DARKGRAY_TO_LIGHTGRAY/g' \
        -e 's/stroke:#333/stroke:TEMP_DARKGRAY_TO_LIGHTGRAY/g' \
        -e 's/stroke:#222222/stroke:TEMP_DARKGRAY_TO_LIGHTGRAY/g' \
        -e 's/stroke:#222/stroke:TEMP_DARKGRAY_TO_LIGHTGRAY/g' \
        -e 's/stroke:#1a1a1a/stroke:TEMP_DARKGRAY_TO_LIGHTGRAY/g' \
        "$dark_svg" || {
            echo "Error: sed pass 1 failed for $(basename "$dark_svg")" >&2
            return 1
        }

    # Pass 2: Replace temp placeholders with dark theme colors
    sed_inplace \
        -e 's/TEMP_BLACK_TO_WHITE/#ffffff/g' \
        -e 's/TEMP_WHITE_TO_BLACK/#1a1a1a/g' \
        -e 's/TEMP_LIGHTGRAY_TO_DARKGRAY/#2a2a2a/g' \
        -e 's/TEMP_MEDGRAY_TO_DARKERGRAY/#3a3a3a/g' \
        -e 's/TEMP_DARKGRAY_TO_LIGHTGRAY/#e5e5e5/g' \
        "$dark_svg" || {
            echo "Error: sed pass 2 failed for $(basename "$dark_svg")" >&2
            return 1
        }
}

# Main execution
if [[ ! -d "$STATIC_DIR" ]]; then
    echo "Warning: Static directory not found: $STATIC_DIR" >&2
    echo "    Skipping dark mode SVG generation"
    exit 0
fi

echo "    Generating dark mode SVG variants..."

# Check if there are any SVG files
shopt -s nullglob
svg_files=("$STATIC_DIR"/*.svg)
shopt -u nullglob

if [[ ${#svg_files[@]} -eq 0 ]]; then
    echo "    No SVG files found in $STATIC_DIR"
    echo "    Skipping dark mode SVG generation"
    exit 0
fi

count=0
failed=0
for svg_file in "${svg_files[@]}"; do
    if [[ ! "$svg_file" =~ -dark\.svg$ ]]; then
        if generate_dark_variant "$svg_file"; then
            ((count++))
        else
            ((failed++))
            echo "    Warning: Failed to generate dark variant for $(basename "$svg_file")" >&2
        fi
    fi
done

if [[ $failed -gt 0 ]]; then
    echo "    Generated $count dark mode variants ($failed failed)" >&2
else
    echo "    Generated $count dark mode variants"
fi

# Exit with success even if some failed - don't break the build
exit 0

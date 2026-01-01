#!/usr/bin/env bash

# gen_release_notes.sh - Aggregate diff reports into release notes
# Usage: ./gen_release_notes.sh [version]

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DIFF_DIR="docs/diffs"
OUTPUT_FILE="docs/RELEASE_NOTES.md"
DATE=$(date +%Y-%m-%d)

# Get version from argument or use "Unreleased"
VERSION=${1:-"Unreleased"}

echo -e "${BLUE}Generating release notes...${NC}"
echo -e "Version: ${GREEN}$VERSION${NC}"
echo ""

# Check if diff directory exists and has files
if [ ! -d "$DIFF_DIR" ] || [ -z "$(ls -A $DIFF_DIR 2>/dev/null)" ]; then
    echo -e "${YELLOW}No diff reports found in $DIFF_DIR${NC}"
    echo -e "${YELLOW}Generate some diff reports first: make diff${NC}"
    exit 0
fi

# Count diff reports
DIFF_COUNT=$(find "$DIFF_DIR" -name "*.md" | wc -l | tr -d ' ')
echo -e "Found ${GREEN}$DIFF_COUNT${NC} diff reports"
echo ""

# Backup existing release notes if they exist
if [ -f "$OUTPUT_FILE" ]; then
    cp "$OUTPUT_FILE" "${OUTPUT_FILE}.bak"
    echo -e "${YELLOW}Backed up existing release notes to ${OUTPUT_FILE}.bak${NC}"
fi

# Start generating release notes
cat > "$OUTPUT_FILE" << EOF
# Release Notes

**Project:** HexForge Portable Lab Assistant (PLA)  
**Last Updated:** $DATE

This document aggregates changes from individual diff reports and provides a high-level view of project evolution.

## Version History

EOF

# Add current version section
cat >> "$OUTPUT_FILE" << EOF
### $VERSION ($DATE)

**Status:** In Development

#### Overview

This release includes $DIFF_COUNT documented changes. See individual diff reports below for detailed information.

#### Diff Reports

EOF

# List all diff reports sorted by date (newest first)
find "$DIFF_DIR" -name "*.md" -type f | sort -r | while read diff_file; do
    FILENAME=$(basename "$diff_file")
    # Extract date and title from filename
    DIFF_DATE=$(echo "$FILENAME" | cut -d'_' -f1)
    TITLE=$(echo "$FILENAME" | sed 's/^[0-9-]*__//' | sed 's/.md$//' | sed 's/-/ /g')
    
    # Try to extract summary from the diff file
    SUMMARY=$(grep -A 5 "^## Summary" "$diff_file" | tail -n +2 | head -n 3 | grep -v "^#" | grep -v "^$" | head -n 1 || echo "Changes documented in diff report")
    
    # Count files changed in this diff
    FILES_CHANGED=$(grep -c "^- \`.*\`" "$diff_file" || echo "multiple")
    
    cat >> "$OUTPUT_FILE" << EOF
- **[$TITLE]($diff_file)** ($DIFF_DATE)
  - $SUMMARY
  - Files changed: $FILES_CHANGED

EOF
done

# Add sections for categorized changes
cat >> "$OUTPUT_FILE" << EOF

#### Features Added

EOF

# Extract feature-related changes
find "$DIFF_DIR" -name "*.md" -type f | while read diff_file; do
    FILENAME=$(basename "$diff_file")
    if echo "$FILENAME" | grep -qi "feature"; then
        TITLE=$(echo "$FILENAME" | sed 's/^[0-9-]*__//' | sed 's/.md$//' | sed 's/-/ /g')
        echo "- $TITLE ([diff]($diff_file))" >> "$OUTPUT_FILE"
    fi
done

# Check if any features were added
if ! grep -q "^- " "$OUTPUT_FILE"; then
    echo "- No new features in this release" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << EOF

#### Bugs Fixed

EOF

# Extract fix-related changes
find "$DIFF_DIR" -name "*.md" -type f | while read diff_file; do
    FILENAME=$(basename "$diff_file")
    if echo "$FILENAME" | grep -qi "fix"; then
        TITLE=$(echo "$FILENAME" | sed 's/^[0-9-]*__//' | sed 's/.md$//' | sed 's/-/ /g')
        echo "- $TITLE ([diff]($diff_file))" >> "$OUTPUT_FILE"
    fi
done

cat >> "$OUTPUT_FILE" << EOF

#### Documentation Updates

EOF

# Extract docs-related changes
find "$DIFF_DIR" -name "*.md" -type f | while read diff_file; do
    FILENAME=$(basename "$diff_file")
    if echo "$FILENAME" | grep -qi "doc"; then
        TITLE=$(echo "$FILENAME" | sed 's/^[0-9-]*__//' | sed 's/.md$//' | sed 's/-/ /g')
        echo "- $TITLE ([diff]($diff_file))" >> "$OUTPUT_FILE"
    fi
done

cat >> "$OUTPUT_FILE" << EOF

#### Refactoring & Improvements

EOF

# Extract refactor-related changes
find "$DIFF_DIR" -name "*.md" -type f | while read diff_file; do
    FILENAME=$(basename "$diff_file")
    if echo "$FILENAME" | grep -qi "refactor"; then
        TITLE=$(echo "$FILENAME" | sed 's/^[0-9-]*__//' | sed 's/.md$//' | sed 's/-/ /g')
        echo "- $TITLE ([diff]($diff_file))" >> "$OUTPUT_FILE"
    fi
done

# Add statistics section
cat >> "$OUTPUT_FILE" << EOF

#### Statistics

- **Total Diff Reports:** $DIFF_COUNT
- **Release Date:** $DATE

---

EOF

# Add instructions for using release notes
cat >> "$OUTPUT_FILE" << EOF
## How to Use This Document

### For Developers
- Review diff reports before making new changes
- Understand recent changes to avoid conflicts
- Link to relevant diffs in PRs

### For Reviewers
- Use as context for code reviews
- Verify changes align with project goals
- Check for duplicate or conflicting changes

### For Project Managers
- Track project progress
- Plan upcoming releases
- Communicate changes to stakeholders

## Generating Release Notes

Release notes are automatically generated from diff reports:

\`\`\`bash
# Generate release notes
make release-notes

# Or manually
./scripts/gen_release_notes.sh [version]

# Example with version
./scripts/gen_release_notes.sh v1.0.0
\`\`\`

## Previous Releases

<!-- Add links to previous release notes or tags here -->

---

**Generated:** $DATE  
**Script Version:** 1.0  
**Maintained By:** HexForge Labs Team
EOF

echo -e "${GREEN}✓ Release notes generated successfully!${NC}"
echo -e "File: ${BLUE}$OUTPUT_FILE${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the generated release notes: cat $OUTPUT_FILE"
echo "2. Edit manually to add context or organize changes"
echo "3. Commit the release notes: git add $OUTPUT_FILE && git commit -m 'docs: update release notes'"
echo ""
echo -e "${GREEN}Example commit:${NC}"
echo "  git add $OUTPUT_FILE"
echo "  git commit -m \"docs: update release notes for $VERSION\""
echo ""

# Show summary
echo -e "${BLUE}Summary:${NC}"
echo "  Diff reports processed: $DIFF_COUNT"
echo "  Output file: $OUTPUT_FILE"
if [ -f "${OUTPUT_FILE}.bak" ]; then
    echo "  Backup: ${OUTPUT_FILE}.bak"
fi
echo ""

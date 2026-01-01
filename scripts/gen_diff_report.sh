#!/usr/bin/env bash

# gen_diff_report.sh - Generate a human-readable diff report for code changes
# Usage: ./gen_diff_report.sh [start_commit] [end_commit]
# If no commits specified, compares current changes against main

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCS_DIR="docs/diffs"
DATE=$(date +%Y-%m-%d)
AUTHOR=$(git config user.name || echo "Unknown")
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Ensure docs/diffs directory exists
mkdir -p "$DOCS_DIR"

# Determine base commit and comparison range
if [ $# -eq 2 ]; then
    START_COMMIT=$1
    END_COMMIT=$2
    BASE_BRANCH="$START_COMMIT"
    COMMIT_RANGE="$START_COMMIT..$END_COMMIT"
elif [ $# -eq 1 ]; then
    START_COMMIT=$1
    END_COMMIT="HEAD"
    BASE_BRANCH="$START_COMMIT"
    COMMIT_RANGE="$START_COMMIT..HEAD"
else
    # Default: compare against main branch
    BASE_BRANCH="main"
    START_COMMIT="main"
    END_COMMIT="HEAD"
    COMMIT_RANGE="main...HEAD"
fi

echo -e "${BLUE}Generating diff report...${NC}"
echo -e "Base: ${GREEN}$BASE_BRANCH${NC}"
echo -e "Branch: ${GREEN}$CURRENT_BRANCH${NC}"
echo ""

# Check if there are any changes
if ! git diff --quiet "$START_COMMIT" "$END_COMMIT" 2>/dev/null; then
    HAS_CHANGES=true
else
    HAS_CHANGES=false
fi

if [ "$HAS_CHANGES" = false ]; then
    echo -e "${YELLOW}No changes detected between $START_COMMIT and $END_COMMIT${NC}"
    echo -e "${YELLOW}Tip: Make some changes or specify different commits${NC}"
    exit 0
fi

# Generate short title from branch name or commits
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    # Use branch name as title
    SHORT_TITLE=$(echo "$CURRENT_BRANCH" | sed 's/feature\///' | sed 's/fix\///' | sed 's/\//-/g')
else
    # Use commit message as title
    SHORT_TITLE=$(git log -1 --pretty=format:%s "$END_COMMIT" | sed 's/[^a-zA-Z0-9]/-/g' | cut -c1-50)
fi

# Generate filename
FILENAME="${DATE}__${SHORT_TITLE}.md"
FILEPATH="$DOCS_DIR/$FILENAME"

# Count changes
FILES_CHANGED=$(git diff --numstat "$START_COMMIT" "$END_COMMIT" | wc -l | tr -d ' ')
INSERTIONS=$(git diff --shortstat "$START_COMMIT" "$END_COMMIT" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DELETIONS=$(git diff --shortstat "$START_COMMIT" "$END_COMMIT" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")

# Get changed files list
CHANGED_FILES=$(git diff --name-status "$START_COMMIT" "$END_COMMIT" | while read status file; do
    STATS=$(git diff --numstat "$START_COMMIT" "$END_COMMIT" -- "$file" | awk '{print $1, $2}')
    ADD=$(echo "$STATS" | awk '{print $1}')
    DEL=$(echo "$STATS" | awk '{print $2}')
    echo "- \`$file\` ($status: +$ADD, -$DEL)"
done)

# Get commit messages in range
COMMIT_MESSAGES=$(git log --pretty=format:"- %s (%h)" "$COMMIT_RANGE" 2>/dev/null || echo "- No commit messages available")

# Start generating the report
cat > "$FILEPATH" << EOF
# Diff Report: $SHORT_TITLE

**Date:** $DATE  
**Author:** $AUTHOR  
**Branch:** $CURRENT_BRANCH  
**Base:** $BASE_BRANCH  
**Commit Range:** $COMMIT_RANGE

## Summary

This diff report documents changes made in the \`$CURRENT_BRANCH\` branch compared to \`$BASE_BRANCH\`.

**Total Changes:**
- **Files Changed:** $FILES_CHANGED
- **Insertions:** $INSERTIONS
- **Deletions:** $DELETIONS

## Commits in This Change

$COMMIT_MESSAGES

## Changed Files

$CHANGED_FILES

## Detailed Changes by File

EOF

# Add detailed diff sections for each file
# Only show diffs for code files (not binaries or very large files)
git diff --name-only "$START_COMMIT" "$END_COMMIT" | while read file; do
    # Skip binary files
    if git diff "$START_COMMIT" "$END_COMMIT" -- "$file" | grep -q "Binary files"; then
        continue
    fi
    
    # Get file stats
    STATS=$(git diff --numstat "$START_COMMIT" "$END_COMMIT" -- "$file" | awk '{print $1, $2}')
    ADD=$(echo "$STATS" | awk '{print $1}')
    DEL=$(echo "$STATS" | awk '{print $2}')
    
    cat >> "$FILEPATH" << EOF

### \`$file\`

**Changes:** +$ADD, -$DEL

EOF
    
    # Add key hunks (limited to avoid huge diffs)
    # Show first 50 lines of diff for each file
    echo "\`\`\`diff" >> "$FILEPATH"
    git diff "$START_COMMIT" "$END_COMMIT" -- "$file" | head -n 50 >> "$FILEPATH"
    
    # Check if there are more lines
    DIFF_LINES=$(git diff "$START_COMMIT" "$END_COMMIT" -- "$file" | wc -l)
    if [ "$DIFF_LINES" -gt 50 ]; then
        echo "" >> "$FILEPATH"
        echo "... (diff truncated, $((DIFF_LINES - 50)) more lines)" >> "$FILEPATH"
    fi
    
    echo "\`\`\`" >> "$FILEPATH"
    echo "" >> "$FILEPATH"
done

# Add review checklist
cat >> "$FILEPATH" << EOF

## Review Checklist

Use this checklist to ensure the changes meet quality standards:

### Code Quality
- [ ] Code follows project style guidelines (.editorconfig, linting rules)
- [ ] No unnecessary code or debug statements (console.log, print, etc.)
- [ ] Functions and variables have meaningful names
- [ ] Complex logic is commented appropriately
- [ ] Code is DRY (Don't Repeat Yourself)

### Testing
- [ ] Unit tests added/updated for new functionality
- [ ] Integration tests updated if needed
- [ ] All existing tests still pass
- [ ] Edge cases are covered
- [ ] Test coverage is maintained or improved

### Documentation
- [ ] Public APIs are documented (JSDoc, docstrings)
- [ ] README files updated if needed
- [ ] Architecture docs updated for significant changes
- [ ] CHANGELOG updated (if applicable)

### Security
- [ ] No hardcoded secrets or credentials
- [ ] User inputs are validated and sanitized
- [ ] Authentication/authorization properly implemented
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Dependencies are up-to-date and secure

### Performance
- [ ] No obvious performance bottlenecks introduced
- [ ] Database queries are optimized (indexes, limits)
- [ ] Large datasets are paginated
- [ ] Caching is used where appropriate

### Breaking Changes
- [ ] No breaking changes, or they are well-documented
- [ ] Migration path provided for breaking changes
- [ ] Backward compatibility maintained where possible

### Other
- [ ] Commit messages follow conventional commit format
- [ ] PR description is clear and complete
- [ ] Related issues are linked
- [ ] No merge conflicts

## Notes for Reviewers

<!-- Add any additional context, decisions, or notes for reviewers here -->

## Related Links

- **Pull Request:** [Link to PR]
- **Related Issues:** [Links to related issues]
- **Documentation:** [Links to relevant docs]

---

**Generated:** $DATE  
**Script Version:** 1.0
EOF

echo -e "${GREEN}✓ Diff report generated successfully!${NC}"
echo -e "File: ${BLUE}$FILEPATH${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the diff report: cat $FILEPATH"
echo "2. Add any reviewer notes to the 'Notes for Reviewers' section"
echo "3. Commit the diff report: git add $FILEPATH && git commit -m 'docs: add diff report'"
echo "4. Include the diff report link in your PR description"
echo ""
echo -e "${GREEN}Example commit:${NC}"
echo "  git add $FILEPATH"
echo "  git commit -m \"docs: add diff report for $SHORT_TITLE\""
echo ""

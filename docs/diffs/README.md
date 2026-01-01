# Diff Reports

This directory contains detailed diff reports for significant code changes in the project.

## Purpose

Diff reports provide:
- Human-readable summaries of code changes
- Context for reviewers
- Historical record of modifications
- Review checklists for quality assurance

## Generating Diff Reports

```bash
# Generate a diff report
make diff

# Or manually
./scripts/gen_diff_report.sh

# For specific commit range
./scripts/gen_diff_report.sh <start-commit> <end-commit>
```

## Report Format

Each report includes:
- **Summary** - Overview of changes
- **Changed Files** - List of modified files with stats
- **Detailed Changes** - Key code differences
- **Review Checklist** - Quality assurance items

## Naming Convention

Files are named: `YYYY-MM-DD__<short-description>.md`

Example: `2026-01-01__add-user-authentication.md`

## When to Generate

Generate a diff report for:
- ✅ Code changes (src/, backend/, frontend/, assistant/)
- ✅ Configuration changes affecting behavior
- ✅ Significant test modifications
- ❌ Documentation-only changes
- ❌ Minor typo fixes

## Usage in PRs

1. Generate diff report before creating PR
2. Commit the report with your changes
3. Link to the report in your PR description

See [Diff Report Requirements](../../CONTRIBUTING.md#diff-report-requirements) for details.

---

**Last Updated:** 2026-01-01

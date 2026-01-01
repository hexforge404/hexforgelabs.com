# HexForge Portable Lab Assistant (PLA) - Documentation

Welcome to the HexForge PLA documentation hub. This directory contains all technical documentation, architecture decisions, runbooks, and development guides for the project.

## 📚 Documentation Structure

### Setup & Getting Started
- **[Local Development Setup](./setup/LOCAL_DEV.md)** - How to set up your local development environment
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to this project

### Architecture & Design
- **[Architecture Overview](./architecture/OVERVIEW.md)** - System architecture, components, and design principles
- **[Architectural Decision Records](./decisions/)** - Important technical decisions and their context
  - [0001: Repository Conventions](./decisions/0001-repo-conventions.md)

### Operations & Maintenance
- **[Common Tasks Runbook](./runbooks/COMMON_TASKS.md)** - Everyday development and operations tasks
- **[Security Policy](../SECURITY.md)** - Security practices and vulnerability disclosure

### Change Tracking
- **[Diff Reports](./diffs/)** - Detailed change reports for each significant code modification
- **[Release Notes](./RELEASE_NOTES.md)** - Aggregated changes and release history

## 🔍 Quick Navigation

### For New Developers
1. Start with [Local Development Setup](./setup/LOCAL_DEV.md)
2. Read [Contributing Guidelines](../CONTRIBUTING.md)
3. Review [Architecture Overview](./architecture/OVERVIEW.md)
4. Check [Common Tasks](./runbooks/COMMON_TASKS.md) for daily workflows

### For Contributors
1. Read [Contributing Guide](../CONTRIBUTING.md) for commit conventions
2. Use `make diff` to generate diff reports before submitting PRs
3. Review [Repository Conventions ADR](./decisions/0001-repo-conventions.md)

### For Maintainers
1. Review [Diff Reports](./diffs/) for code changes
2. Use `make release-notes` to aggregate changes
3. Follow [Common Tasks](./runbooks/COMMON_TASKS.md) for operations

## 🛠️ Quick Commands

```bash
# Setup development environment
make setup

# Generate a diff report
make diff

# Run tests
make test

# Generate release notes
make release-notes

# Run linters
make lint
```

## 📝 Documentation Standards

All documentation in this project follows these standards:
- Written in Markdown format
- Clear, concise language
- Code examples where appropriate
- Keep docs up-to-date with code changes
- Use ADRs for significant technical decisions

## 🔗 External Resources

- [HexForge Labs Website](https://hexforgelabs.com)
- [Project Repository](https://github.com/hexforge404/hexforgelabs.com)

---

**Last Updated:** 2026-01-01  
**Maintained By:** HexForge Labs Team

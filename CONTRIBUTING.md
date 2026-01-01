# Contributing to HexForge Portable Lab Assistant

Thank you for your interest in contributing to the HexForge Portable Lab Assistant (PLA) project! This guide will help you understand our development process and contribution requirements.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Diff Report Requirements](#diff-report-requirements)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Review Process](#review-process)

## Code of Conduct

This project adheres to a code of professional conduct. We expect all contributors to:

- Be respectful and constructive in all interactions
- Welcome newcomers and help them get started
- Focus on what is best for the project and community
- Show empathy and kindness toward others
- Accept constructive criticism gracefully

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. Read the [Local Development Setup](docs/setup/LOCAL_DEV.md)
2. Reviewed the [Architecture Overview](docs/architecture/OVERVIEW.md)
3. Understood [Repository Conventions](docs/decisions/0001-repo-conventions.md)
4. Set up your development environment

### First Time Setup

```bash
# Clone the repository
git clone https://github.com/hexforge404/hexforgelabs.com.git
cd hexforgelabs.com

# Install dependencies
make setup

# Run tests to ensure everything works
make test

# Start development environment
make dev
```

## Development Workflow

### 1. Find or Create an Issue

- Check existing issues for something to work on
- For new features, create an issue first to discuss
- Get approval before starting significant work

### 2. Create a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create your feature branch
git checkout -b <type>/<description>

# Examples:
git checkout -b feature/user-profile-page
git checkout -b fix/login-validation-error
git checkout -b docs/update-api-documentation
```

**Branch naming convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test additions
- `chore/` - Maintenance tasks

### 3. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed
- Keep changes focused and minimal

### 4. Test Your Changes

```bash
# Run linters
make lint

# Run tests
make test

# Test manually in development environment
make dev
```

### 5. Generate Diff Report

**Required for all code changes!**

```bash
# Generate diff report
make diff

# This creates: docs/diffs/YYYY-MM-DD__<description>.md
```

More details in [Diff Report Requirements](#diff-report-requirements) section.

### 6. Commit Your Changes

```bash
# Add your changes
git add .

# Commit with conventional commit message
git commit -m "type(scope): description"

# Add the diff report
git add docs/diffs/
git commit -m "docs: add diff report for <feature>"
```

### 7. Push and Create Pull Request

```bash
# Push your branch
git push origin <your-branch-name>

# Create PR on GitHub
# Use the PR template provided
```

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

- **feat** - New feature
- **fix** - Bug fix
- **docs** - Documentation only
- **style** - Formatting, missing semicolons, etc.
- **refactor** - Code restructuring without behavior change
- **test** - Adding or updating tests
- **chore** - Maintenance tasks, dependencies
- **perf** - Performance improvements
- **ci** - CI/CD pipeline changes
- **build** - Build system changes

### Scope (optional)

The scope identifies what part of the codebase is affected:

- `auth` - Authentication/authorization
- `api` - Backend API
- `frontend` - Frontend code
- `backend` - Backend code
- `assistant` - AI assistant
- `db` - Database
- `deps` - Dependencies
- `config` - Configuration

### Subject

- Use imperative mood: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Maximum 72 characters

### Examples

```bash
# Feature
feat(auth): add two-factor authentication

# Bug fix
fix(api): resolve race condition in order processing

# Documentation
docs(setup): update installation instructions

# Refactor
refactor(backend): simplify database connection logic

# Test
test(auth): add unit tests for login flow

# Chore
chore(deps): update express to v4.18.2

# Performance
perf(api): optimize product query with indexing

# With body
feat(auth): add JWT token refresh mechanism

Implement automatic token refresh when token is about to expire.
This improves user experience by preventing sudden logouts.

Resolves: #123
```

### Commit Message Rules

✅ **Do:**
- Write clear, descriptive commit messages
- Keep commits atomic (one logical change per commit)
- Reference issue numbers when applicable
- Explain "why" in the body, not "what"

❌ **Don't:**
- Make commits with generic messages like "fix bug" or "updates"
- Combine unrelated changes in one commit
- Leave commit messages vague

## Pull Request Process

### Before Creating a PR

Ensure you have:

- [ ] Written clear, working code
- [ ] Added/updated tests
- [ ] Run linters and fixed issues
- [ ] All tests pass
- [ ] Updated documentation
- [ ] Generated diff report (for code changes)
- [ ] Self-reviewed your changes
- [ ] Removed any debug code or console.logs

### PR Title

Use the same format as commit messages:

```
type(scope): description
```

Examples:
- `feat(auth): add two-factor authentication`
- `fix(api): resolve order processing bug`
- `docs: update contributing guidelines`

### PR Description

Use this template:

```markdown
## Description
[Brief summary of what this PR does]

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test addition/update

## Changes Made
- [Bullet point list of key changes]
- ...

## Testing Done
[Describe how you tested these changes]

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Diff Report
[Link to your diff report: docs/diffs/YYYY-MM-DD__description.md]

## Related Issues
Resolves: #123
Related to: #456

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published
- [ ] I have generated and committed a diff report (for code changes)
- [ ] I have updated the changelog/release notes (if applicable)
```

### PR Size Guidelines

**Prefer small PRs:**
- **Ideal:** < 200 lines changed
- **Acceptable:** 200-400 lines changed
- **Large:** > 400 lines (requires justification)

**For large changes:**
- Break into multiple smaller PRs when possible
- Explain why the change must be large
- Provide detailed documentation and testing

## Diff Report Requirements

### What is a Diff Report?

A diff report is a human-readable summary of code changes that:
- Lists all modified files
- Describes key changes in plain language
- Provides context for reviewers
- Includes a review checklist

### When to Generate

**Required for:**
- ✅ Code changes (any files in `src/`, `backend/`, `frontend/`, `assistant/`)
- ✅ Configuration changes that affect behavior
- ✅ Significant test modifications

**Not required for:**
- ❌ Documentation-only changes
- ❌ Minor typo fixes
- ❌ README updates (unless significant)

### How to Generate

```bash
# Generate diff report
make diff

# Or manually:
./scripts/gen_diff_report.sh

# For specific commits:
./scripts/gen_diff_report.sh <start-commit> <end-commit>
```

### Diff Report Format

The script generates a report with:

```markdown
# Diff Report: [Title]

**Date:** YYYY-MM-DD
**Author:** Your Name
**Branch:** feature/branch-name
**Base:** main
**Commit Range:** abc123..def456

## Summary
[2-3 sentence overview of changes]

## Changed Files
- path/to/file1.js (+50, -20)
- path/to/file2.py (+30, -10)
Total: 2 files changed, 80 insertions(+), 30 deletions(-)

## Key Changes

### path/to/file1.js
[Description of changes in this file]

### path/to/file2.py
[Description of changes in this file]

## Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No security vulnerabilities introduced
- [ ] Breaking changes documented
- [ ] Performance impact considered
```

### Committing the Diff Report

```bash
# After generating, commit it
git add docs/diffs/
git commit -m "docs: add diff report for feature name"
git push
```

## Code Style Guidelines

### General Principles

- Write code for humans first, machines second
- Be consistent with existing code
- Prefer clarity over cleverness
- Use meaningful names for variables and functions
- Keep functions small and focused
- Avoid deep nesting (max 3 levels)

### JavaScript/TypeScript

```javascript
// Use ES6+ features
const userName = 'Alice';
const userAge = 30;

// Arrow functions for callbacks
const numbers = [1, 2, 3];
const doubled = numbers.map(n => n * 2);

// Destructuring
const { name, age } = user;

// Template literals
const greeting = `Hello, ${name}!`;

// Async/await over promises
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
}

// JSDoc for functions
/**
 * Authenticates a user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<User>} Authenticated user object
 * @throws {AuthError} If authentication fails
 */
async function authenticateUser(email, password) {
  // Implementation
}
```

### Python

```python
# Follow PEP 8
import os
import sys

from typing import Optional, List

# Class names in PascalCase
class UserService:
    """Service for managing user operations."""
    
    def __init__(self, db_connection):
        self.db = db_connection
    
    def get_user(self, user_id: str) -> Optional[dict]:
        """
        Retrieve a user by ID.
        
        Args:
            user_id: The unique identifier for the user
            
        Returns:
            User dictionary if found, None otherwise
        """
        return self.db.users.find_one({"_id": user_id})

# Function names in snake_case
def calculate_order_total(items: List[dict]) -> float:
    """Calculate total price for order items."""
    return sum(item['price'] * item['quantity'] for item in items)
```

### React Components

```javascript
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Functional components with hooks
const UserProfile = ({ userId, onUpdate }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};

UserProfile.propTypes = {
  userId: PropTypes.string.isRequired,
  onUpdate: PropTypes.func,
};

export default UserProfile;
```

## Testing Requirements

### Test Coverage

- Aim for **80%+ code coverage**
- **100% coverage** for critical paths (auth, payments, security)
- All new features must include tests
- All bug fixes must include regression tests

### Test Types

**Unit Tests:**
- Test individual functions/methods
- Mock external dependencies
- Fast execution

**Integration Tests:**
- Test component interactions
- Use test database
- Slower but more realistic

**End-to-End Tests:**
- Test complete user workflows
- Use test environment
- Critical paths only

### Writing Tests

```javascript
// Unit test example
describe('UserService', () => {
  describe('authenticateUser', () => {
    it('should return user object for valid credentials', async () => {
      const user = await authenticateUser('test@example.com', 'password123');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    it('should throw error for invalid credentials', async () => {
      await expect(
        authenticateUser('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

## Documentation

### When to Update Documentation

Update documentation when you:
- Add new features
- Change existing behavior
- Add new API endpoints
- Modify configuration
- Fix significant bugs

### Documentation Types

**Code Comments:**
- Explain "why", not "what"
- Document complex algorithms
- Add JSDoc/docstrings for public functions

**README Files:**
- Every directory should have a README
- Explain purpose and usage
- Link to related docs

**API Documentation:**
- Document all public APIs
- Include examples
- Keep up-to-date with code

**ADRs:**
- Document significant technical decisions
- Store in `docs/decisions/`

## Review Process

### What Reviewers Look For

- **Correctness** - Does it solve the problem?
- **Code Quality** - Is it readable and maintainable?
- **Tests** - Are there adequate tests?
- **Performance** - Any performance concerns?
- **Security** - Any security vulnerabilities?
- **Documentation** - Is it documented?
- **Style** - Does it follow conventions?

### Responding to Feedback

- **Be receptive** - Reviews help improve code quality
- **Ask questions** - If feedback is unclear
- **Make changes** - Address all feedback
- **Explain decisions** - When you disagree respectfully
- **Say thanks** - Appreciate reviewers' time

### Getting Your PR Merged

1. Address all review feedback
2. Ensure all CI checks pass
3. Get approval from at least 1 reviewer
4. Squash commits if needed
5. Merge when approved

## Questions or Need Help?

- Check [documentation](docs/README.md)
- Review [common tasks](docs/runbooks/COMMON_TASKS.md)
- Ask in GitHub discussions
- Open an issue
- Contact: rduff@hexforgelabs.com

Thank you for contributing to HexForge PLA! 🚀

---

**Last Updated:** 2026-01-01  
**Maintained By:** HexForge Labs Team

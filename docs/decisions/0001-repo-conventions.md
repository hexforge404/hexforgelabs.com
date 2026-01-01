# ADR 0001: Repository Conventions

**Status:** Accepted  
**Date:** 2026-01-01  
**Decision Makers:** HexForge Labs Team  
**Category:** Process, Development Workflow

## Context and Problem Statement

As the HexForge Portable Lab Assistant (PLA) project grows, we need consistent conventions for:
- Code organization and naming
- Branch management and git workflow
- Commit message formatting
- Diff generation and change tracking
- Pull request process
- Documentation standards

Without clear conventions, code reviews become harder, collaboration suffers, and maintaining code quality becomes challenging.

## Decision Drivers

* **Consistency** - Team members need predictable patterns
* **Reviewability** - Changes should be easy to understand and review
* **Traceability** - All significant changes should be documented
* **Scalability** - Conventions should work as the team grows
* **Automation** - Enable automated checks and workflows
* **Onboarding** - New contributors should easily understand the workflow

## Considered Options

1. **Loose conventions** - Minimal rules, trust developers
2. **Standard conventions** - Documented conventions with recommended practices
3. **Strict conventions** - Enforced conventions with automated checks (chosen)

## Decision Outcome

**Chosen option:** Strict conventions with automated enforcement, because:
- Ensures consistent code quality across the project
- Enables effective automation and tooling
- Reduces cognitive load during code reviews
- Provides clear expectations for all contributors

## Conventions

### 1. Branch Naming Conventions

**Format:** `<type>/<short-description>`

**Types:**
- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `docs/` - Documentation-only changes
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks, dependency updates

**Examples:**
```bash
feature/user-authentication
fix/login-validation-error
hotfix/payment-gateway-timeout
docs/api-documentation-update
refactor/database-connection-pool
test/add-integration-tests
chore/update-dependencies
```

**Rules:**
- Use lowercase with hyphens
- Keep descriptions short but descriptive
- Branch from `main` for features
- Branch from `main` or `release/*` for hotfixes

### 2. Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

**Format:** `<type>(<scope>): <subject>`

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Adding or modifying tests
- `chore` - Maintenance tasks
- `perf` - Performance improvements
- `ci` - CI/CD changes
- `build` - Build system changes

**Scope** (optional): Component affected (e.g., `auth`, `api`, `frontend`, `backend`)

**Subject:** 
- Imperative mood ("add" not "added")
- No capitalization of first letter
- No period at the end
- Maximum 72 characters

**Examples:**
```bash
feat(auth): add JWT token refresh mechanism
fix(api): resolve race condition in order processing
docs(setup): update local development instructions
refactor(backend): simplify database connection logic
test(auth): add unit tests for login flow
chore(deps): update express to v4.18.2
perf(api): optimize product query with indexing
```

**Body and Footer** (optional but encouraged for complex changes):
```bash
feat(auth): add two-factor authentication

Implement TOTP-based 2FA using speakeasy library.
Users can enable 2FA in profile settings.

Resolves: #123
Breaking Change: Auth API now requires 2FA token
```

### 3. Diff Report Policy

**Requirement:** Generate a diff report for every PR that modifies code files.

**Process:**
1. Before creating PR, run: `make diff` or `./scripts/gen_diff_report.sh`
2. Script generates: `docs/diffs/YYYY-MM-DD__<short-title>.md`
3. Commit the diff report with your changes
4. Link to diff report in PR description

**Diff Report Format:**
```markdown
# Diff Report: <Title>

**Date:** YYYY-MM-DD
**Author:** Name
**Branch:** feature/branch-name
**Base:** main

## Summary
Brief overview of changes (2-3 sentences)

## Changed Files
- path/to/file1.js (+50, -20)
- path/to/file2.py (+30, -10)

## Key Changes
### file1.js
Brief description of changes

### file2.py
Brief description of changes

## Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No security vulnerabilities introduced
- [ ] Breaking changes documented
```

**When to Generate:**
- ✅ Code changes (src/, backend/, frontend/, assistant/)
- ✅ Configuration changes affecting behavior
- ✅ Test modifications
- ❌ Documentation-only changes (unless significant)
- ❌ Minor typo fixes

**Automation:**
- CI workflow validates diff report exists for code PRs
- Fails CI if report missing when code changed

### 4. Pull Request Process

**PR Title Format:** Same as commit convention
```
feat(auth): add two-factor authentication
```

**PR Description Template:**
```markdown
## Description
Brief summary of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Bullet list of key changes
- ...

## Testing Done
- How was this tested?
- What scenarios were covered?

## Diff Report
Link to diff report: [docs/diffs/2026-01-01__feature-name.md](docs/diffs/2026-01-01__feature-name.md)

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] Diff report generated
- [ ] No console.log or debug code left
- [ ] Linting passes
- [ ] All tests pass
```

**Review Process:**
1. PR created with proper title, description, and diff report
2. Automated checks run (linting, tests, diff validation)
3. At least 1 reviewer required
4. Reviewer checks code quality, logic, tests, documentation
5. Address feedback or request changes
6. Once approved, squash and merge to main

**Small PR Policy:**
- Prefer small, focused PRs (< 400 lines changed)
- Large PRs should be split when possible
- Exception: Auto-generated code, migrations

### 5. Directory and File Naming

**Directories:**
- Use lowercase with hyphens: `user-management/`
- Group related files logically
- Keep depth reasonable (max 4-5 levels)

**Files:**
- JavaScript/TypeScript: camelCase for files, PascalCase for components
  - `userService.js`, `authMiddleware.js`
  - `UserProfile.jsx`, `LoginForm.tsx`
- Python: snake_case
  - `user_service.py`, `auth_middleware.py`
- Documentation: UPPERCASE or Title Case
  - `README.md`, `CONTRIBUTING.md`
  - `Local-Development.md`
- Scripts: lowercase with hyphens
  - `gen-diff-report.sh`, `deploy-prod.sh`

**Code Files:**
- One primary export per file (where appropriate)
- File name should match primary export
- Group related utilities in a directory

### 6. Code Style Conventions

**General:**
- Use ESLint/Prettier for JavaScript/TypeScript
- Use Black/Pylint for Python
- 2 spaces for JS/TS, 4 spaces for Python
- Max line length: 100 characters
- Always use semicolons in JavaScript

**Comments:**
- Write self-documenting code when possible
- Add comments for complex logic or non-obvious decisions
- Use JSDoc/Docstrings for functions
- Keep comments up-to-date with code

**Imports:**
- Group imports: external, internal, relative
- Sort alphabetically within groups
- No unused imports

```javascript
// External libraries
import React from 'react';
import axios from 'axios';

// Internal modules
import { authService } from '@/services/auth';
import { config } from '@/config';

// Relative imports
import { Button } from '../components';
```

### 7. Testing Conventions

**Test File Naming:**
- JavaScript: `filename.test.js` or `filename.spec.js`
- Python: `test_filename.py`
- Place tests next to source or in `__tests__` directory

**Test Structure:**
- Arrange-Act-Assert pattern
- One assertion per test (when reasonable)
- Descriptive test names: `it('should authenticate user with valid credentials')`

**Coverage Requirements:**
- Aim for 80%+ code coverage
- 100% coverage for critical paths (auth, payments)
- Exclude generated/config files from coverage

### 8. Documentation Standards

**All Documentation:**
- Written in Markdown
- Clear, concise language
- Code examples where appropriate
- Keep up-to-date with code changes

**README Files:**
- Every directory with code should have a README
- Explain purpose, key files, how to use
- Link to related documentation

**API Documentation:**
- Document all public APIs
- Include: endpoint, method, parameters, response, examples
- Use OpenAPI/Swagger when possible

**Architectural Decision Records (ADRs):**
- Document significant architectural decisions
- Format: Context, Decision, Consequences
- Store in `docs/decisions/`
- Number sequentially: `0001-topic.md`

### 9. Release and Versioning

**Semantic Versioning:**
- Format: MAJOR.MINOR.PATCH (e.g., 1.2.3)
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

**Release Process:**
1. Run `make release-notes` to aggregate changes
2. Update version in package.json
3. Create git tag: `git tag v1.2.3`
4. Push tag: `git push origin v1.2.3`
5. GitHub Actions builds and deploys

**Changelog:**
- Maintain `docs/RELEASE_NOTES.md`
- Auto-generated from diff reports
- Manually curate for releases

## Consequences

### Positive

* Consistent codebase that's easier to navigate
* Clear expectations for all contributors
* Automated workflows can enforce standards
* Better code review efficiency
* Improved traceability of changes
* Professional, maintainable project

### Negative

* Initial learning curve for new contributors
* Some overhead in following processes
* May feel restrictive for small changes
* Requires discipline to maintain

### Neutral

* Need to maintain tooling and documentation
* Conventions may need updates as project evolves

## Implementation

1. ✅ Document conventions in this ADR
2. ✅ Create automation scripts (diff generation)
3. ✅ Set up CI/CD checks
4. ✅ Update CONTRIBUTING.md
5. ✅ Add PR template
6. ⏳ Team training session
7. ⏳ Monitor adoption and refine

## Compliance

These conventions are **required** for all code contributions. Non-compliant PRs may be rejected or require changes.

**Enforcement:**
- Automated checks in CI/CD
- Code review process
- Pre-commit hooks (optional, recommended)

**Exceptions:**
- Emergency hotfixes (document exception in commit)
- External/generated code (clearly marked)
- Approved by maintainers

## References

* [Conventional Commits](https://www.conventionalcommits.org/)
* [Semantic Versioning](https://semver.org/)
* [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
* [Google Style Guides](https://google.github.io/styleguide/)

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-01 | 1.0 | Initial version |

---

**Last Updated:** 2026-01-01  
**Next Review:** 2026-04-01 (Quarterly)  
**Owner:** HexForge Labs Team

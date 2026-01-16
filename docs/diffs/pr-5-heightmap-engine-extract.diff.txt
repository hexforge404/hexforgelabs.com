# Diff Report: heightmap-engine-extract

**Date:** 2026-01-15  
**Author:** Robert Duff  
**Branch:** feature/heightmap-engine-extract  
**Base:** main  
**Commit Range:** main...HEAD

## Summary

This diff report documents changes made in the `feature/heightmap-engine-extract` branch compared to `main`.

**Total Changes:**
- **Files Changed:** 51
- **Insertions:** 20522
- **Deletions:** 645

## Commits in This Change

- docs: add diff report for PR #5 (heightmap engine extract) (690204e)
- fix: heightmap contract validation + smoke script + tests (f076f02)
- feat: add heightmap engine extract (engine + proxy + tests + smoke) (ad90fce)
- docs: add diff report (35427a8)
- Update backend/utils/contractValidation.js (a3e2b10)
- Update docs/testing.md (e5d9deb)
- Merge branch 'main' into feature/heightmap-engine-extract (63d38d8)
- contract: enforce surface gateway + add backend tests (ad70ccb)
- feat: add surface page and route (c45a53c)
- Merge pull request #1 from hexforge404/copilot/create-repo-structure-and-docs (dc01f37)
- docs: add diff reports, release notes, and bootstrap completion summary (5f34037)
- feat: add complete documentation structure and diff workflow system (3a4a070)
- Initial plan (e466a29)

## Changed Files

- `.editorconfig` (A: +99, -0)
- `.github/workflows/diff-report.yml` (A: +148, -0)
- `.gitignore` (M: +54, -3)
- `BOOTSTRAP_COMPLETE.md` (A: +564, -0)
- `CODEOWNERS` (A: +50, -0)
- `CONTRIBUTING.md` (A: +650, -0)
- `Makefile` (A: +246, -0)
- `README.md` (M: +8, -0)
- `SECURITY.md` (A: +319, -0)
- `backend/jest.config.js` (A: +6, -0)
- `backend/main.js` (M: +5, -0)
- `backend/package-lock.json` (M: +4946, -635)
- `backend/package.json` (M: +8, -1)
- `backend/routes/heightmap.js` (A: +115, -0)
- `backend/routes/surface.js` (A: +191, -0)
- `backend/schemas/job_manifest.schema.json` (A: +83, -0)
- `backend/schemas/job_status.schema.json` (A: +60, -0)
- `backend/tests/contractValidation.test.js` (A: +59, -0)
- `backend/tests/heightmap.contract.test.js` (A: +120, -0)
- `backend/tests/surface.contract.test.js` (A: +112, -0)
- `backend/utils/contractValidation.js` (A: +86, -0)
- `docker-compose.yml` (M: +33, -0)
- `docs/README.md` (A: +86, -0)
- `docs/RELEASE_NOTES.md` (A: +90, -0)
- `docs/architecture/OVERVIEW.md` (A: +318, -0)
- `docs/decisions/0001-repo-conventions.md` (A: +411, -0)
- `docs/diffs/2026-01-01__copilot-create-repo-structure-and-docs.md` (A: +1051, -0)
- `docs/diffs/README.md` (A: +59, -0)
- `docs/diffs/pr-2-heightmap-engine-extract.diff.txt` (A: +6815, -0)
- `docs/diffs/pr-5-heightmap-engine-extract.diff.md` (A: +1051, -0)
- `docs/runbooks/COMMON_TASKS.md` (A: +568, -0)
- `docs/setup/LOCAL_DEV.md` (A: +293, -0)
- `docs/testing.md` (A: +37, -0)
- `frontend/package-lock.json` (M: +9, -0)
- `frontend/package.json` (M: +1, -0)
- `frontend/src/App.jsx` (M: +2, -0)
- `frontend/src/components/GlobalNav.jsx` (M: +1, -0)
- `frontend/src/pages/SurfacePage.css` (A: +383, -0)
- `frontend/src/pages/SurfacePage.jsx` (A: +454, -0)
- `frontend/src/services/surfaceApi.js` (A: +82, -0)
- `heightmap-engine/Dockerfile` (A: +17, -0)
- `heightmap-engine/main.py` (A: +156, -0)
- `heightmap-engine/requirements.txt` (A: +2, -0)
- `nginx/default.conf` (M: +6, -6)
- `reports/audit-2026-01-15.md` (A: +32, -0)
- `scripts/gen_diff_report.sh` (A: +239, -0)
- `scripts/gen_release_notes.sh` (A: +235, -0)
- `scripts/smoke-heightmap.sh` (A: +51, -0)
- `scripts/test-all.sh` (A: +15, -0)
- `src/README.md` (A: +30, -0)
- `tests/README.md` (A: +66, -0)

## Detailed Changes by File


### `.editorconfig`

**Changes:** +99, -0

```diff
diff --git a/.editorconfig b/.editorconfig
new file mode 100644
index 0000000..d47bbe3
--- /dev/null
+++ b/.editorconfig
@@ -0,0 +1,99 @@
+# EditorConfig helps maintain consistent coding styles across different editors and IDEs
+# https://editorconfig.org
+
+root = true
+
+# Default settings for all files
+[*]
+charset = utf-8
+end_of_line = lf
+insert_final_newline = true
+trim_trailing_whitespace = true
+
+# JavaScript, TypeScript, JSON
+[*.{js,jsx,ts,tsx,json,json5}]
+indent_style = space
+indent_size = 2
+max_line_length = 100
+
+# Python
+[*.py]
+indent_style = space
+indent_size = 4
+max_line_length = 100
+
+# Shell scripts
+[*.sh]
+indent_style = space
+indent_size = 2
+end_of_line = lf
+
+# YAML
+[*.{yml,yaml}]
+indent_style = space
+indent_size = 2
+
+# Markdown
+[*.md]
+indent_style = space
+indent_size = 2
+trim_trailing_whitespace = false
+max_line_length = off
+
+# HTML, CSS, SCSS
+[*.{html,css,scss,sass}]

... (diff truncated, 55 more lines)
```


### `.github/workflows/diff-report.yml`

**Changes:** +148, -0

```diff
diff --git a/.github/workflows/diff-report.yml b/.github/workflows/diff-report.yml
new file mode 100644
index 0000000..c57d3ec
--- /dev/null
+++ b/.github/workflows/diff-report.yml
@@ -0,0 +1,148 @@
+name: Diff Report Validation
+
+on:
+  pull_request:
+    branches:
+      - main
+      - develop
+    types: [opened, synchronize, reopened]
+
+jobs:
+  check-diff-report:
+    name: Validate Diff Report
+    runs-on: ubuntu-latest
+    
+    steps:
+      - name: Checkout code
+        uses: actions/checkout@v4
+        with:
+          fetch-depth: 0  # Fetch all history for diff comparison
+          
+      - name: Fetch base branch
+        run: |
+          git fetch origin ${{ github.base_ref }}:${{ github.base_ref }}
+      
+      - name: Check for code changes
+        id: check_changes
+        run: |
+          # Check if there are code changes (not just docs)
+          CODE_CHANGES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E '\.(js|jsx|ts|tsx|py|java|go|rs|c|cpp|h|sh|sql)$' || echo "")
+          
+          if [ -n "$CODE_CHANGES" ]; then
+            echo "has_code_changes=true" >> $GITHUB_OUTPUT
+            echo "Code changes detected:"
+            echo "$CODE_CHANGES"
+          else
+            echo "has_code_changes=false" >> $GITHUB_OUTPUT
+            echo "No code changes detected (docs-only PR)"
+          fi
+      
+      - name: Check for diff report
+        id: check_report
+        if: steps.check_changes.outputs.has_code_changes == 'true'
+        run: |
+          # Check if a new diff report was added in this PR

... (diff truncated, 104 more lines)
```


### `.gitignore`

**Changes:** +54, -3

```diff
diff --git a/.gitignore b/.gitignore
index ef2cac0..dbfeb15 100644
--- a/.gitignore
+++ b/.gitignore
@@ -37,6 +37,57 @@ __pycache__/
 # React build output (never commit)
 frontend/build/
 
-# Accidental terminal paste artifacts
-e message
-tage only what changed
+# Python virtual environments
+.venv/
+venv/
+ENV/
+env/
+*.egg-info/
+dist/
+
+# IDE and editor files
+.vscode/
+.idea/
+*.swp
+*.swo
+*~
+.project
+.classpath
+.settings/
+
+# Test coverage
+.coverage
+htmlcov/
+.pytest_cache/
+.tox/
+.hypothesis/
+
+# Temporary files
+*.tmp
+*.temp
+*.bak
+*.backup
+.cache/
+
+# OS files
+.DS_Store
+.DS_Store?
+._*
+.Spotlight-V100
+.Trashes
+ehthumbs.db

... (diff truncated, 15 more lines)
```


### `BOOTSTRAP_COMPLETE.md`

**Changes:** +564, -0

```diff
diff --git a/BOOTSTRAP_COMPLETE.md b/BOOTSTRAP_COMPLETE.md
new file mode 100644
index 0000000..2bfefb6
--- /dev/null
+++ b/BOOTSTRAP_COMPLETE.md
@@ -0,0 +1,564 @@
+# HexForge PLA - Bootstrap Complete! 🚀
+
+**Date:** 2026-01-01  
+**Project:** HexForge Portable Lab Assistant (PLA)  
+**Status:** Repository Structure & Documentation Complete
+
+This document provides a comprehensive overview of the complete repository bootstrap, documentation structure, and diff workflow system that has been implemented.
+
+---
+
+## 📁 Complete File Structure
+
+```
+hexforgelabs.com/
+├── .github/
+│   └── workflows/
+│       └── diff-report.yml          # Automated PR diff validation
+│
+├── docs/
+│   ├── architecture/
+│   │   └── OVERVIEW.md              # System architecture & design
+│   ├── decisions/
+│   │   └── 0001-repo-conventions.md # ADR: Repository conventions
+│   ├── diffs/
+│   │   ├── README.md                # Diff reports guide
+│   │   └── 2026-01-01__*.md         # Generated diff reports
+│   ├── runbooks/
+│   │   └── COMMON_TASKS.md          # DevOps runbook
+│   ├── setup/
+│   │   └── LOCAL_DEV.md             # Development setup guide
+│   ├── README.md                     # Documentation index
+│   └── RELEASE_NOTES.md              # Aggregated release notes
+│
+├── scripts/
+│   ├── gen_diff_report.sh           # Diff report generator (executable)
+│   └── gen_release_notes.sh         # Release notes aggregator (executable)
+│
+├── src/
+│   └── README.md                     # Source code placeholder
+│
+├── tests/
+│   └── README.md                     # Test structure guide
+│
+├── .editorconfig                     # Editor consistency rules

... (diff truncated, 520 more lines)
```


### `CODEOWNERS`

**Changes:** +50, -0

```diff
diff --git a/CODEOWNERS b/CODEOWNERS
new file mode 100644
index 0000000..48351b8
--- /dev/null
+++ b/CODEOWNERS
@@ -0,0 +1,50 @@
+# Code Owners
+
+# This file defines code ownership for automatic review assignment
+# When a PR modifies files matching a pattern, the corresponding
+# owner(s) are automatically requested as reviewers
+
+# Default owner for everything in the repo
+* @hexforge-labs
+
+# Documentation
+/docs/ @hexforge-labs
+*.md @hexforge-labs
+CONTRIBUTING.md @hexforge-labs
+SECURITY.md @hexforge-labs
+
+# Frontend
+/frontend/ @hexforge-labs
+/frontend/src/ @hexforge-labs
+
+# Backend
+/backend/ @hexforge-labs
+/backend/routes/ @hexforge-labs
+/backend/models/ @hexforge-labs
+
+# AI Assistant
+/assistant/ @hexforge-labs
+
+# Configuration
+/.github/ @hexforge-labs
+docker-compose.yml @hexforge-labs
+Dockerfile @hexforge-labs
+.gitignore @hexforge-labs
+
+# Scripts
+/scripts/ @hexforge-labs
+
+# Tests
+/tests/ @hexforge-labs
+*.test.js @hexforge-labs
+*.spec.js @hexforge-labs
+test_*.py @hexforge-labs
+
+# Infrastructure
+/nginx/ @hexforge-labs

... (diff truncated, 6 more lines)
```


### `CONTRIBUTING.md`

**Changes:** +650, -0

```diff
diff --git a/CONTRIBUTING.md b/CONTRIBUTING.md
new file mode 100644
index 0000000..1ef3c4b
--- /dev/null
+++ b/CONTRIBUTING.md
@@ -0,0 +1,650 @@
+# Contributing to HexForge Portable Lab Assistant
+
+Thank you for your interest in contributing to the HexForge Portable Lab Assistant (PLA) project! This guide will help you understand our development process and contribution requirements.
+
+## 📋 Table of Contents
+
+- [Code of Conduct](#code-of-conduct)
+- [Getting Started](#getting-started)
+- [Development Workflow](#development-workflow)
+- [Commit Conventions](#commit-conventions)
+- [Pull Request Process](#pull-request-process)
+- [Diff Report Requirements](#diff-report-requirements)
+- [Code Style Guidelines](#code-style-guidelines)
+- [Testing Requirements](#testing-requirements)
+- [Documentation](#documentation)
+- [Review Process](#review-process)
+
+## Code of Conduct
+
+This project adheres to a code of professional conduct. We expect all contributors to:
+
+- Be respectful and constructive in all interactions
+- Welcome newcomers and help them get started
+- Focus on what is best for the project and community
+- Show empathy and kindness toward others
+- Accept constructive criticism gracefully
+
+## Getting Started
+
+### Prerequisites
+
+Before contributing, ensure you have:
+
+1. Read the [Local Development Setup](docs/setup/LOCAL_DEV.md)
+2. Reviewed the [Architecture Overview](docs/architecture/OVERVIEW.md)
+3. Understood [Repository Conventions](docs/decisions/0001-repo-conventions.md)
+4. Set up your development environment
+
+### First Time Setup
+
+```bash
+# Clone the repository
+git clone https://github.com/hexforge404/hexforgelabs.com.git
+cd hexforgelabs.com

... (diff truncated, 606 more lines)
```


### `Makefile`

**Changes:** +246, -0

```diff
diff --git a/Makefile b/Makefile
new file mode 100644
index 0000000..4f6ded8
--- /dev/null
+++ b/Makefile
@@ -0,0 +1,246 @@
+# Makefile for HexForge Portable Lab Assistant
+# Provides common development tasks and workflows
+
+.PHONY: help setup install clean lint test diff release-notes dev build deploy
+
+# Default target - show help
+help:
+	@echo "HexForge PLA - Available Commands"
+	@echo "=================================="
+	@echo ""
+	@echo "Setup & Installation:"
+	@echo "  make setup          - Initial project setup (install dependencies)"
+	@echo "  make install        - Install all dependencies"
+	@echo "  make clean          - Clean build artifacts and caches"
+	@echo ""
+	@echo "Development:"
+	@echo "  make dev            - Start development environment"
+	@echo "  make lint           - Run linters on all code"
+	@echo "  make lint-fix       - Auto-fix linting issues"
+	@echo "  make test           - Run all tests"
+	@echo "  make test-coverage  - Run tests with coverage"
+	@echo ""
+	@echo "Documentation & Tracking:"
+	@echo "  make diff           - Generate diff report for current changes"
+	@echo "  make release-notes  - Generate release notes from diff reports"
+	@echo ""
+	@echo "Build & Deploy:"
+	@echo "  make build          - Build for production"
+	@echo "  make deploy         - Deploy to production (coming soon)"
+	@echo ""
+	@echo "Utilities:"
+	@echo "  make docker-up      - Start Docker containers"
+	@echo "  make docker-down    - Stop Docker containers"
+	@echo "  make docker-logs    - View Docker logs"
+	@echo "  make db-seed        - Seed database with test data"
+	@echo ""
+
+# Setup - Install all dependencies
+setup: install
+	@echo "✓ Setup complete!"
+	@echo ""
+	@echo "Next steps:"
+	@echo "  1. Configure environment: cp backend/.env.example backend/.env"
+	@echo "  2. Start development: make dev"

... (diff truncated, 202 more lines)
```


### `README.md`

**Changes:** +8, -0

```diff
diff --git a/README.md b/README.md
index f25d20b..419f1ec 100644
--- a/README.md
+++ b/README.md
@@ -32,6 +32,14 @@ This is the complete repository for the [HexForge Labs](https://hexforgelabs.com
 └── docker-compose.yml  # Full stack deployment
 ```
 
+## 🧪 How to Build + Test
+
+- Backend tests (preferred, in Docker): `docker compose run --rm backend npm test`
+- Backend tests (local host): `cd backend && npm test`
+- Frontend tests (CRA/Jest, requires frontend deps installed): `cd frontend && npm test -- --watchAll=false`
+- Heightmap smoke (engine + gateway): `docker compose up --build -d heightmapengine backend nginx && bash scripts/smoke-heightmap.sh`
+- See [docs/testing.md](docs/testing.md) for details and notes.
+
 ---
 
 ## ⚠️ Development Status
```


### `SECURITY.md`

**Changes:** +319, -0

```diff
diff --git a/SECURITY.md b/SECURITY.md
new file mode 100644
index 0000000..a77b059
--- /dev/null
+++ b/SECURITY.md
@@ -0,0 +1,319 @@
+# Security Policy
+
+## HexForge Portable Lab Assistant - Security Policy
+
+**Last Updated:** 2026-01-01  
+**Version:** 1.0
+
+## Our Commitment to Security
+
+At HexForge Labs, we take the security of our software seriously. This document outlines our security practices, how to report vulnerabilities, and what you can expect from us.
+
+## Supported Versions
+
+We currently support the following versions with security updates:
+
+| Version | Supported          | Status |
+| ------- | ------------------ | ------ |
+| main    | :white_check_mark: | Active development |
+| < 1.0   | :x:                | Pre-release - internal only |
+
+**Note:** As this is a pre-release internal project, we are actively developing security features. Public releases will follow a stricter security model.
+
+## Security Practices
+
+### Development Security
+
+**Code Security:**
+- Regular dependency audits using `npm audit` and `pip-audit`
+- Static code analysis in CI/CD pipeline
+- No hardcoded secrets or credentials
+- Environment-based configuration
+- Input validation on all user inputs
+- Output encoding to prevent XSS
+- Parameterized queries to prevent SQL injection
+
+**Authentication & Authorization:**
+- JWT-based authentication with secure token management
+- Password hashing using bcrypt (salt rounds: 10+)
+- Role-based access control (RBAC)
+- Session management with secure cookies
+- Token expiration and refresh mechanisms
+
+**Data Protection:**
+- Encryption in transit (HTTPS/TLS)

... (diff truncated, 275 more lines)
```


### `backend/jest.config.js`

**Changes:** +6, -0

```diff
diff --git a/backend/jest.config.js b/backend/jest.config.js
new file mode 100644
index 0000000..353a042
--- /dev/null
+++ b/backend/jest.config.js
@@ -0,0 +1,6 @@
+module.exports = {
+  testEnvironment: "node",
+  testMatch: ["**/tests/**/*.test.js"],
+  restoreMocks: true,
+  clearMocks: true,
+};
```


### `backend/main.js`

**Changes:** +5, -0

```diff
diff --git a/backend/main.js b/backend/main.js
index 344c57e..0f5f354 100644
--- a/backend/main.js
+++ b/backend/main.js
@@ -13,6 +13,7 @@ const toolRoutes = require('./routes/tools');
 const path = require('path');                   // ⬅️ move up here
 const uploadsRouter = require('./routes/uploads'); // ⬅️ and this
 const scriptLabRoutes = require('./routes/scriptLab');
+const surfaceRoutes = require('./routes/surface');
 
 require('dotenv').config();
 
@@ -147,9 +148,12 @@ const assistantSessionsRouter = require("./routes/assistantSessions");
 const assistantProjectsRouter = require("./routes/assistantProjects");
 const mediaRoutes = require("./routes/media");
 const toolsProxyRoutes = require("./routes/toolsProxy");
+const heightmapRoutes = require("./routes/heightmap");
 
 
 app.use("/api/tools", toolsProxyRoutes);
+app.use('/api/surface', apiLimiter, surfaceRoutes);
+app.use('/api/heightmap', apiLimiter, heightmapRoutes);
 app.use("/api/media", apiLimiter, mediaRoutes);
 app.use("/api/assistant/projects", assistantProjectsRouter);
 app.use("/api/assistant-sessions", apiLimiter, assistantSessionsRouter);
@@ -165,6 +169,7 @@ app.use("/api/memory", memoryRoutes);
 app.use('/api/notion', notionRoutes);
 app.use('/api/blog', blogRoutes);
 app.use('/tool', toolRoutes);
+app.use('/api/store/surface', apiLimiter, surfaceRoutes);
 
 app.use('/api/editor', editorRouter);
 app.use('/api/tools', toolRoutes);
```


### `backend/package-lock.json`

**Changes:** +4946, -635

```diff
diff --git a/backend/package-lock.json b/backend/package-lock.json
index 12bbb4b..2624df6 100644
--- a/backend/package-lock.json
+++ b/backend/package-lock.json
@@ -11,6 +11,8 @@
       "dependencies": {
         "@notionhq/client": "^3.0.1",
         "@sendgrid/mail": "^8.1.4",
+        "ajv": "^8.17.1",
+        "ajv-formats": "^3.0.1",
         "bcryptjs": "^3.0.2",
         "connect-mongo": "^5.1.0",
         "cookie-parser": "^1.4.7",
@@ -31,308 +33,2162 @@
         "strip-ansi": "^6.0.1",
         "stripe": "^17.7.0",
         "uuid": "^9.0.0"
+      },
+      "devDependencies": {
+        "jest": "^30.2.0",
+        "nock": "^13.3.3",
+        "supertest": "^7.2.2"
       }
     },
-    "node_modules/@mongodb-js/saslprep": {
-      "version": "1.2.0",
-      "resolved": "https://registry.npmjs.org/@mongodb-js/saslprep/-/saslprep-1.2.0.tgz",
-      "integrity": "sha512-+ywrb0AqkfaYuhHs6LxKWgqbh3I72EpEgESCw37o+9qPx9WTCkgDm2B+eMrwehGtHBWHFU4GXvnSCNiFhhausg==",
+    "node_modules/@babel/code-frame": {
+      "version": "7.28.6",
+      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.28.6.tgz",
+      "integrity": "sha512-JYgintcMjRiCvS8mMECzaEn+m3PfoQiyqukOMCCVQtoJGYJw8j/8LBJEiqkHLkfwCcs74E3pbAUFNg7d9VNJ+Q==",
+      "dev": true,
       "dependencies": {
-        "sparse-bitfield": "^3.0.3"
+        "@babel/helper-validator-identifier": "^7.28.5",
+        "js-tokens": "^4.0.0",
+        "picocolors": "^1.1.1"
+      },
+      "engines": {
+        "node": ">=6.9.0"
       }
     },
-    "node_modules/@notionhq/client": {
-      "version": "3.0.1",
-      "resolved": "https://registry.npmjs.org/@notionhq/client/-/client-3.0.1.tgz",
-      "integrity": "sha512-vHtFKrRKQg2PZSky1A9fTe+L9/WxNYRJWHmD6ZiBNgeN5jnFmv27ootRl9ROzEm/N+mOxfTo37EnuCHsaPgETg==",
-      "license": "MIT",
+    "node_modules/@babel/compat-data": {
+      "version": "7.28.6",

... (diff truncated, 6033 more lines)
```


### `backend/package.json`

**Changes:** +8, -1

```diff
diff --git a/backend/package.json b/backend/package.json
index 9624cf3..c8bf3fb 100644
--- a/backend/package.json
+++ b/backend/package.json
@@ -5,7 +5,7 @@
   "description": "",
   "main": "main.js",
   "scripts": {
-    "test": "echo \"Error: no test specified\" && exit 1",
+    "test": "jest --runInBand",
     "start": "node main.js"
   },
   "keywords": [],
@@ -13,6 +13,8 @@
   "dependencies": {
     "@notionhq/client": "^3.0.1",
     "@sendgrid/mail": "^8.1.4",
+    "ajv": "^8.17.1",
+    "ajv-formats": "^3.0.1",
     "bcryptjs": "^3.0.2",
     "connect-mongo": "^5.1.0",
     "cookie-parser": "^1.4.7",
@@ -33,5 +35,10 @@
     "strip-ansi": "^6.0.1",
     "stripe": "^17.7.0",
     "uuid": "^9.0.0"
+  },
+  "devDependencies": {
+    "jest": "^30.2.0",
+    "nock": "^13.3.3",
+    "supertest": "^7.2.2"
   }
 }
```


### `backend/routes/heightmap.js`

**Changes:** +115, -0

```diff
diff --git a/backend/routes/heightmap.js b/backend/routes/heightmap.js
new file mode 100644
index 0000000..e396994
--- /dev/null
+++ b/backend/routes/heightmap.js
@@ -0,0 +1,115 @@
+const express = require("express");
+const {
+  assertJobManifest,
+  assertJobStatusEnvelope,
+  buildErrorEnvelope,
+  ContractError,
+} = require("../utils/contractValidation");
+
+const router = express.Router();
+
+const ENGINE_BASE_URL = process.env.HEIGHTMAPENGINE_URL || "http://heightmapengine:8093";
+const SERVICE_NAME = process.env.HEIGHTMAP_SERVICE_NAME || "heightmapengine";
+
+async function proxyJson(path, init = {}) {
+  const url = `${ENGINE_BASE_URL}${path}`;
+  const resp = await fetch(url, {
+    ...init,
+    headers: {
+      Accept: "application/json",
+      ...(init.headers || {}),
+    },
+  });
+
+  const text = await resp.text();
+  let data;
+  try {
+    data = text ? JSON.parse(text) : {};
+  } catch (err) {
+    throw new ContractError("UPSTREAM_NON_JSON", `Expected JSON from ${url}`);
+  }
+
+  return { status: resp.status, data };
+}
+
+function handleError(res, err, jobId) {
+  if (err instanceof ContractError) {
+    console.error("heightmap contract error", err.code, err.detail);
+    return res
+      .status(502)
+      .json(buildErrorEnvelope(jobId || err.jobId, SERVICE_NAME, err.code, err.detail));
+  }
+
+  console.error("heightmap upstream error", err);
+  return res

... (diff truncated, 71 more lines)
```


### `backend/routes/surface.js`

**Changes:** +191, -0

```diff
diff --git a/backend/routes/surface.js b/backend/routes/surface.js
new file mode 100644
index 0000000..9d42e94
--- /dev/null
+++ b/backend/routes/surface.js
@@ -0,0 +1,191 @@
+// backend/routes/surface.js
+const express = require("express");
+const rateLimit = require("express-rate-limit");
+
+const {
+  assertJobManifest,
+  assertJobStatusEnvelope,
+  buildErrorEnvelope,
+  ContractError,
+} = require("../utils/contractValidation");
+
+const router = express.Router();
+
+// Prefer SURFACE_ENGINE_URL (newer), fall back to GLYPHENGINE_URL (older)
+const ENGINE_BASE_URL =
+  process.env.SURFACE_ENGINE_URL ||
+  process.env.GLYPHENGINE_URL ||
+  "http://glyphengine:8092";
+
+const SERVICE_NAME = process.env.SURFACE_SERVICE_NAME || "glyphengine";
+
+// Optional upstream auth (kept from legacy proxy behavior)
+const BASIC_AUTH = process.env.SURFACE_ENGINE_BASIC_AUTH || "";
+const API_KEY = process.env.SURFACE_ENGINE_API_KEY || "";
+
+// Basic limiter (same spirit as the older proxy)
+const limiter = rateLimit({
+  windowMs: 60 * 1000,
+  max: 30,
+  standardHeaders: true,
+  legacyHeaders: false,
+});
+
+function makeHeaders(extra = {}) {
+  const headers = {
+    Accept: "application/json",
+    ...extra,
+  };
+
+  // If upstream expects basic auth, we support the legacy env var.
+  // NOTE: BASIC_AUTH is treated as "user:pass" (same as previous code).
+  if (BASIC_AUTH) {
+    headers.Authorization = `Basic ${Buffer.from(BASIC_AUTH).toString("base64")}`;
+  }

... (diff truncated, 147 more lines)
```


### `backend/schemas/job_manifest.schema.json`

**Changes:** +83, -0

```diff
diff --git a/backend/schemas/job_manifest.schema.json b/backend/schemas/job_manifest.schema.json
new file mode 100644
index 0000000..9f7bbeb
--- /dev/null
+++ b/backend/schemas/job_manifest.schema.json
@@ -0,0 +1,83 @@
+{
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "$id": "https://hexforgelabs.com/schemas/job_manifest.schema.json",
+  "title": "HexForge Job Manifest (v1)",
+  "type": "object",
+  "required": ["version", "job_id", "service", "updated_at", "public_root", "public"],
+  "properties": {
+    "version": {
+      "type": "string",
+      "enum": ["v1"],
+      "description": "Manifest contract version."
+    },
+    "job_id": {
+      "type": "string",
+      "minLength": 3,
+      "description": "Stable job identifier (filesystem-safe)."
+    },
+    "service": {
+      "type": "string",
+      "minLength": 2,
+      "description": "Engine/service name (e.g., hexforge-glyphengine)."
+    },
+    "updated_at": {
+      "type": "string",
+      "format": "date-time",
+      "description": "ISO8601 timestamp for last update."
+    },
+    "subfolder": {
+      "type": ["string", "null"],
+      "pattern": "^[A-Za-z0-9_-]+$",
+      "description": "Optional sanitized subfolder used in public paths."
+    },
+    "public_root": {
+      "type": "string",
+      "pattern": "^/assets/",
+      "description": "Root folder for all public assets for this job."
+    },
+    "public": {
+      "type": "object",
+      "description": "Public asset references (relative URLs).",
+      "required": ["job_json", "enclosure", "textures", "previews"],
+      "properties": {
+        "job_json": { "type": "string", "pattern": "^/assets/" },
+

... (diff truncated, 39 more lines)
```


### `backend/schemas/job_status.schema.json`

**Changes:** +60, -0

```diff
diff --git a/backend/schemas/job_status.schema.json b/backend/schemas/job_status.schema.json
new file mode 100644
index 0000000..1421e68
--- /dev/null
+++ b/backend/schemas/job_status.schema.json
@@ -0,0 +1,60 @@
+{
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "$id": "https://hexforgelabs.com/schemas/job_status.schema.json",
+  "title": "HexForge Job Status Envelope",
+  "type": "object",
+  "required": ["job_id", "status", "service", "updated_at"],
+  "properties": {
+    "job_id": {
+      "type": "string",
+      "minLength": 3,
+      "description": "Stable job identifier (filesystem-safe)."
+    },
+    "status": {
+      "type": "string",
+      "enum": ["queued", "running", "complete", "failed"],
+      "description": "Current job state."
+    },
+    "service": {
+      "type": "string",
+      "minLength": 2,
+      "description": "Engine/service name (e.g., hexforge-glyphengine)."
+    },
+    "updated_at": {
+      "type": "string",
+      "format": "date-time",
+      "description": "ISO8601 timestamp for last update."
+    },
+    "progress": {
+      "type": "number",
+      "minimum": 0,
+      "maximum": 1,
+      "description": "Optional progress from 0.0 to 1.0."
+    },
+    "message": {
+      "type": "string",
+      "description": "Optional human-readable status message."
+    },
+    "error": {
+      "type": "object",
+      "additionalProperties": false,
+      "properties": {
+        "code": { "type": "string" },
+        "detail": { "type": "string" }
+      },

... (diff truncated, 16 more lines)
```


### `backend/tests/contractValidation.test.js`

**Changes:** +59, -0

```diff
diff --git a/backend/tests/contractValidation.test.js b/backend/tests/contractValidation.test.js
new file mode 100644
index 0000000..84ba1ec
--- /dev/null
+++ b/backend/tests/contractValidation.test.js
@@ -0,0 +1,59 @@
+const {
+  assertJobStatusEnvelope,
+  buildErrorEnvelope,
+  ContractError,
+} = require("../utils/contractValidation");
+
+const baseStatus = {
+  job_id: "job-123",
+  status: "queued",
+  service: "glyphengine",
+  updated_at: "2025-01-01T00:00:00Z",
+};
+
+describe("contractValidation", () => {
+  test("accepts a valid job status envelope without mutation", () => {
+    const payload = { ...baseStatus };
+    const result = assertJobStatusEnvelope(payload);
+    expect(result).toEqual(baseStatus);
+  });
+
+  test("strips additional properties via AJV removeAdditional", () => {
+    const payload = {
+      ...baseStatus,
+      extra_field: "should_be_removed",
+      nested: { keep: true, drop: "x" },
+    };
+
+    const result = assertJobStatusEnvelope(payload);
+    expect(result.extra_field).toBeUndefined();
+    expect(result.nested).toBeUndefined();
+  });
+
+  test("invalid payload raises ContractError and can be wrapped", () => {
+    const invalid = {
+      job_id: "job-123",
+      status: "queued",
+      updated_at: "2025-01-01T00:00:00Z",
+    }; // missing service
+
+    try {
+      assertJobStatusEnvelope(invalid);
+      throw new Error("expected ContractError");
+    } catch (err) {
+      expect(err).toBeInstanceOf(ContractError);

... (diff truncated, 15 more lines)
```


### `backend/tests/heightmap.contract.test.js`

**Changes:** +120, -0

```diff
diff --git a/backend/tests/heightmap.contract.test.js b/backend/tests/heightmap.contract.test.js
new file mode 100644
index 0000000..a3ab8c1
--- /dev/null
+++ b/backend/tests/heightmap.contract.test.js
@@ -0,0 +1,120 @@
+const express = require("express");
+const request = require("supertest");
+
+process.env.HEIGHTMAPENGINE_URL = "http://heightmapengine:8093";
+process.env.HEIGHTMAP_SERVICE_NAME = "heightmapengine";
+
+const heightmapRoutes = require("../routes/heightmap");
+
+function makeApp() {
+  const app = express();
+  app.use(express.json());
+  app.use("/api/heightmap", heightmapRoutes);
+  return app;
+}
+
+describe("/api/heightmap contract proxy", () => {
+  let fetchSpy;
+  let consoleErrorSpy;
+  let app;
+
+  beforeAll(() => {
+    app = makeApp();
+  });
+
+  beforeEach(() => {
+    fetchSpy = jest.spyOn(global, "fetch");
+    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
+  });
+
+  afterEach(() => {
+    fetchSpy.mockRestore();
+    consoleErrorSpy.mockRestore();
+  });
+
+  const publicSection = {
+    job_json: "/assets/heightmap/job-1/job.json",
+    enclosure: { stl: "/assets/heightmap/job-1/enclosure/enclosure.stl" },
+    textures: {
+      texture_png: "/assets/heightmap/job-1/textures/texture.png",
+      heightmap_png: "/assets/heightmap/job-1/textures/heightmap.png",
+    },
+    previews: {
+      hero: "/assets/heightmap/job-1/previews/hero.png",
+      iso: "/assets/heightmap/job-1/previews/iso.png",

... (diff truncated, 76 more lines)
```


### `backend/tests/surface.contract.test.js`

**Changes:** +112, -0

```diff
diff --git a/backend/tests/surface.contract.test.js b/backend/tests/surface.contract.test.js
new file mode 100644
index 0000000..74d3d20
--- /dev/null
+++ b/backend/tests/surface.contract.test.js
@@ -0,0 +1,112 @@
+const express = require("express");
+const request = require("supertest");
+
+process.env.GLYPHENGINE_URL = "http://glyphengine:8092";
+process.env.SURFACE_SERVICE_NAME = "glyphengine";
+
+const surfaceRoutes = require("../routes/surface");
+
+function makeApp() {
+  const app = express();
+  app.use(express.json());
+  app.use("/api/surface", surfaceRoutes);
+  return app;
+}
+
+describe("/api/surface contract proxy", () => {
+  let fetchSpy;
+  let consoleErrorSpy;
+  let app;
+
+  beforeAll(() => {
+    app = makeApp();
+  });
+
+  beforeEach(() => {
+    fetchSpy = jest.spyOn(global, "fetch");
+    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
+  });
+
+  afterEach(() => {
+    fetchSpy.mockRestore();
+    consoleErrorSpy.mockRestore();
+  });
+
+  test("returns validated status with extras stripped", async () => {
+    fetchSpy.mockResolvedValue(
+      new Response(
+        JSON.stringify({
+          job_id: "job-1",
+          status: "queued",
+          service: "glyphengine",
+          updated_at: "2025-01-01T00:00:00Z",
+          extra: "remove-me",
+        }),

... (diff truncated, 68 more lines)
```


### `backend/utils/contractValidation.js`

**Changes:** +86, -0

```diff
diff --git a/backend/utils/contractValidation.js b/backend/utils/contractValidation.js
new file mode 100644
index 0000000..eed115d
--- /dev/null
+++ b/backend/utils/contractValidation.js
@@ -0,0 +1,86 @@
+const Ajv = require("ajv/dist/2020");
+const addFormats = require("ajv-formats");
+
+const jobStatusSchema = require("../schemas/job_status.schema.json");
+const jobManifestSchema = require("../schemas/job_manifest.schema.json");
+
+const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: "all" });
+addFormats(ajv);
+
+const validateJobStatus = ajv.compile(jobStatusSchema);
+const validateJobManifest = ajv.compile(jobManifestSchema);
+const validateManifestPublic = ajv.compile({
+  ...jobManifestSchema.properties.public,
+  $id: "https://hexforgelabs.com/schemas/job_manifest_public.schema.json",
+});
+
+class ContractError extends Error {
+  constructor(code, detail, meta = {}) {
+    super(detail);
+    this.code = code;
+    this.detail = detail;
+    this.jobId = meta.jobId;
+  }
+}
+
+function formatAjvErrors(errors = []) {
+  return errors
+    .map((err) => {
+      const path = err.instancePath || "/";
+      return `${path} ${err.message}`.trim();
+    })
+    .join("; ");
+}
+
+function assertManifestPublic(payload) {
+  if (!validateManifestPublic(payload)) {
+    throw new ContractError("INVALID_MANIFEST_PUBLIC", formatAjvErrors(validateManifestPublic.errors));
+  }
+  return payload;
+}
+
+function assertJobManifest(payload) {
+  if (!validateJobManifest(payload)) {
+    throw new ContractError("INVALID_JOB_MANIFEST", formatAjvErrors(validateJobManifest.errors));

... (diff truncated, 42 more lines)
```


### `docker-compose.yml`

**Changes:** +33, -0

```diff
diff --git a/docker-compose.yml b/docker-compose.yml
index f438cca..beb5d05 100644
--- a/docker-compose.yml
+++ b/docker-compose.yml
@@ -71,6 +71,8 @@ services:
     depends_on:
       mongo:
         condition: service_healthy
+      heightmapengine:
+        condition: service_healthy
     networks:
       - hexforge-network
     volumes:
@@ -225,6 +227,37 @@ services:
       start_period: 20s
 
 
+  heightmapengine:
+    build:
+      context: ./heightmap-engine
+    image: hexforge-heightmapengine
+    container_name: hexforge-heightmapengine
+
+    environment:
+      HEIGHTMAP_OUTPUT_DIR: /data/hexforge3d/output/heightmap
+      HEIGHTMAP_PUBLIC_PREFIX: /assets/heightmap
+      HEIGHTMAP_SERVICE_NAME: heightmapengine
+      ROOT_PATH: /api/heightmap
+
+    volumes:
+      - /mnt/hdd-storage/ai-tools/engines/hexforge3d:/data/hexforge3d
+
+    networks:
+      - hexforge-network
+
+    restart: unless-stopped
+
+    expose:
+      - "8093"
+
+    healthcheck:
+      test: ["CMD-SHELL", "curl -fsS http://localhost:8093/health > /dev/null || exit 1"]
+      interval: 30s
+      timeout: 5s
+      retries: 3
+      start_period: 20s
+
+
 
 

... (diff truncated, 1 more lines)
```


### `docs/README.md`

**Changes:** +86, -0

```diff
diff --git a/docs/README.md b/docs/README.md
new file mode 100644
index 0000000..cfbf38e
--- /dev/null
+++ b/docs/README.md
@@ -0,0 +1,86 @@
+# HexForge Portable Lab Assistant (PLA) - Documentation
+
+Welcome to the HexForge PLA documentation hub. This directory contains all technical documentation, architecture decisions, runbooks, and development guides for the project.
+
+## 📚 Documentation Structure
+
+### Setup & Getting Started
+- **[Local Development Setup](./setup/LOCAL_DEV.md)** - How to set up your local development environment
+- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to this project
+
+### Architecture & Design
+- **[Architecture Overview](./architecture/OVERVIEW.md)** - System architecture, components, and design principles
+- **[Architectural Decision Records](./decisions/)** - Important technical decisions and their context
+  - [0001: Repository Conventions](./decisions/0001-repo-conventions.md)
+
+### Operations & Maintenance
+- **[Common Tasks Runbook](./runbooks/COMMON_TASKS.md)** - Everyday development and operations tasks
+- **[Security Policy](../SECURITY.md)** - Security practices and vulnerability disclosure
+
+### Change Tracking
+- **[Diff Reports](./diffs/)** - Detailed change reports for each significant code modification
+- **[Release Notes](./RELEASE_NOTES.md)** - Aggregated changes and release history
+
+## 🔍 Quick Navigation
+
+### For New Developers
+1. Start with [Local Development Setup](./setup/LOCAL_DEV.md)
+2. Read [Contributing Guidelines](../CONTRIBUTING.md)
+3. Review [Architecture Overview](./architecture/OVERVIEW.md)
+4. Check [Common Tasks](./runbooks/COMMON_TASKS.md) for daily workflows
+
+### For Contributors
+1. Read [Contributing Guide](../CONTRIBUTING.md) for commit conventions
+2. Use `make diff` to generate diff reports before submitting PRs
+3. Review [Repository Conventions ADR](./decisions/0001-repo-conventions.md)
+
+### For Maintainers
+1. Review [Diff Reports](./diffs/) for code changes
+2. Use `make release-notes` to aggregate changes
+3. Follow [Common Tasks](./runbooks/COMMON_TASKS.md) for operations
+
+## 🛠️ Quick Commands
+
+```bash

... (diff truncated, 42 more lines)
```


### `docs/RELEASE_NOTES.md`

**Changes:** +90, -0

```diff
diff --git a/docs/RELEASE_NOTES.md b/docs/RELEASE_NOTES.md
new file mode 100644
index 0000000..7bca1c5
--- /dev/null
+++ b/docs/RELEASE_NOTES.md
@@ -0,0 +1,90 @@
+# Release Notes
+
+**Project:** HexForge Portable Lab Assistant (PLA)  
+**Last Updated:** 2026-01-01
+
+This document aggregates changes from individual diff reports and provides a high-level view of project evolution.
+
+## Version History
+
+### v0.1.0 (2026-01-01)
+
+**Status:** In Development
+
+#### Overview
+
+This release includes 2 documented changes. See individual diff reports below for detailed information.
+
+#### Diff Reports
+
+- **[README](docs/diffs/README.md)** (README.md)
+  - 
+  - Files changed: 0
+multiple
+
+- **[copilot create repo structure and docs](docs/diffs/2026-01-01__copilot-create-repo-structure-and-docs.md)** (2026-01-01)
+  - This diff report documents changes made in the `copilot/create-repo-structure-and-docs` branch compared to `e466a29`.
+  - Files changed: 17
+
+
+#### Features Added
+
+
+#### Bugs Fixed
+
+
+#### Documentation Updates
+
+- copilot create repo structure and docs ([diff](docs/diffs/2026-01-01__copilot-create-repo-structure-and-docs.md))
+
+#### Refactoring & Improvements
+
+
+#### Statistics
+

... (diff truncated, 46 more lines)
```


### `docs/architecture/OVERVIEW.md`

**Changes:** +318, -0

```diff
diff --git a/docs/architecture/OVERVIEW.md b/docs/architecture/OVERVIEW.md
new file mode 100644
index 0000000..bb3dfce
--- /dev/null
+++ b/docs/architecture/OVERVIEW.md
@@ -0,0 +1,318 @@
+# Architecture Overview
+
+## HexForge Portable Lab Assistant (PLA) - System Architecture
+
+This document outlines the architecture, design principles, and key components of the HexForge Portable Lab Assistant platform.
+
+## 🎯 Architecture Goals
+
+### Primary Objectives
+1. **Modularity** - Components should be loosely coupled and independently deployable
+2. **Scalability** - System should scale horizontally to handle increased load
+3. **Maintainability** - Code should be easy to understand, test, and modify
+4. **Security** - Security-first approach with defense in depth
+5. **Observability** - Comprehensive logging, monitoring, and debugging capabilities
+6. **Performance** - Fast response times with efficient resource utilization
+
+### Design Principles
+- **Separation of Concerns** - Clear boundaries between frontend, backend, and AI services
+- **API-First Design** - Well-defined REST/GraphQL APIs as contracts
+- **Configuration over Code** - Environment-based configuration for flexibility
+- **Fail Fast** - Early validation and clear error messages
+- **Immutable Infrastructure** - Containers and declarative deployments
+- **Documentation as Code** - All architectural decisions tracked in ADRs
+
+## 🏗️ System Components
+
+### High-Level Architecture
+
+```
+┌─────────────────────────────────────────────────────────────┐
+│                        Client Layer                          │
+├─────────────────────────────────────────────────────────────┤
+│  Web Browser (React SPA)  │  Mobile App  │  API Clients    │
+└────────────────┬────────────────────────────────────────────┘
+                 │
+         ┌───────▼────────┐
+         │  Load Balancer  │
+         │   (NGINX)       │
+         └───────┬────────┘
+                 │
+    ┌────────────┴────────────┐
+    │                         │
+┌───▼─────────┐      ┌───────▼────────┐
+│  Frontend   │      │   API Gateway  │

... (diff truncated, 274 more lines)
```


### `docs/decisions/0001-repo-conventions.md`

**Changes:** +411, -0

```diff
diff --git a/docs/decisions/0001-repo-conventions.md b/docs/decisions/0001-repo-conventions.md
new file mode 100644
index 0000000..db96e6e
--- /dev/null
+++ b/docs/decisions/0001-repo-conventions.md
@@ -0,0 +1,411 @@
+# ADR 0001: Repository Conventions
+
+**Status:** Accepted  
+**Date:** 2026-01-01  
+**Decision Makers:** HexForge Labs Team  
+**Category:** Process, Development Workflow
+
+## Context and Problem Statement
+
+As the HexForge Portable Lab Assistant (PLA) project grows, we need consistent conventions for:
+- Code organization and naming
+- Branch management and git workflow
+- Commit message formatting
+- Diff generation and change tracking
+- Pull request process
+- Documentation standards
+
+Without clear conventions, code reviews become harder, collaboration suffers, and maintaining code quality becomes challenging.
+
+## Decision Drivers
+
+* **Consistency** - Team members need predictable patterns
+* **Reviewability** - Changes should be easy to understand and review
+* **Traceability** - All significant changes should be documented
+* **Scalability** - Conventions should work as the team grows
+* **Automation** - Enable automated checks and workflows
+* **Onboarding** - New contributors should easily understand the workflow
+
+## Considered Options
+
+1. **Loose conventions** - Minimal rules, trust developers
+2. **Standard conventions** - Documented conventions with recommended practices
+3. **Strict conventions** - Enforced conventions with automated checks (chosen)
+
+## Decision Outcome
+
+**Chosen option:** Strict conventions with automated enforcement, because:
+- Ensures consistent code quality across the project
+- Enables effective automation and tooling
+- Reduces cognitive load during code reviews
+- Provides clear expectations for all contributors
+
+## Conventions
+

... (diff truncated, 367 more lines)
```


### `docs/diffs/2026-01-01__copilot-create-repo-structure-and-docs.md`

**Changes:** +1051, -0

```diff
diff --git a/docs/diffs/2026-01-01__copilot-create-repo-structure-and-docs.md b/docs/diffs/2026-01-01__copilot-create-repo-structure-and-docs.md
new file mode 100644
index 0000000..bbbf3dd
--- /dev/null
+++ b/docs/diffs/2026-01-01__copilot-create-repo-structure-and-docs.md
@@ -0,0 +1,1051 @@
+# Diff Report: copilot-create-repo-structure-and-docs
+
+**Date:** 2026-01-01  
+**Author:** copilot-swe-agent[bot]  
+**Branch:** copilot/create-repo-structure-and-docs  
+**Base:** e466a29  
+**Commit Range:** e466a29..HEAD
+
+## Summary
+
+This diff report documents changes made in the `copilot/create-repo-structure-and-docs` branch compared to `e466a29`.
+
+**Total Changes:**
+- **Files Changed:** 17
+- **Insertions:** 3863
+- **Deletions:** 3
+
+## Commits in This Change
+
+- feat: add complete documentation structure and diff workflow system (3a4a070)
+
+## Changed Files
+
+- `.editorconfig` (A: +99, -0)
+- `.github/workflows/diff-report.yml` (A: +148, -0)
+- `.gitignore` (M: +54, -3)
+- `CODEOWNERS` (A: +50, -0)
+- `CONTRIBUTING.md` (A: +650, -0)
+- `Makefile` (A: +246, -0)
+- `SECURITY.md` (A: +319, -0)
+- `docs/README.md` (A: +78, -0)
+- `docs/architecture/OVERVIEW.md` (A: +318, -0)
+- `docs/decisions/0001-repo-conventions.md` (A: +411, -0)
+- `docs/diffs/README.md` (A: +59, -0)
+- `docs/runbooks/COMMON_TASKS.md` (A: +568, -0)
+- `docs/setup/LOCAL_DEV.md` (A: +293, -0)
+- `scripts/gen_diff_report.sh` (A: +239, -0)
+- `scripts/gen_release_notes.sh` (A: +235, -0)
+- `src/README.md` (A: +30, -0)
+- `tests/README.md` (A: +66, -0)
+
+## Detailed Changes by File
+
+

... (diff truncated, 1007 more lines)
```


### `docs/diffs/README.md`

**Changes:** +59, -0

```diff
diff --git a/docs/diffs/README.md b/docs/diffs/README.md
new file mode 100644
index 0000000..d0d9a15
--- /dev/null
+++ b/docs/diffs/README.md
@@ -0,0 +1,59 @@
+# Diff Reports
+
+This directory contains detailed diff reports for significant code changes in the project.
+
+## Purpose
+
+Diff reports provide:
+- Human-readable summaries of code changes
+- Context for reviewers
+- Historical record of modifications
+- Review checklists for quality assurance
+
+## Generating Diff Reports
+
+```bash
+# Generate a diff report
+make diff
+
+# Or manually
+./scripts/gen_diff_report.sh
+
+# For specific commit range
+./scripts/gen_diff_report.sh <start-commit> <end-commit>
+```
+
+## Report Format
+
+Each report includes:
+- **Summary** - Overview of changes
+- **Changed Files** - List of modified files with stats
+- **Detailed Changes** - Key code differences
+- **Review Checklist** - Quality assurance items
+
+## Naming Convention
+
+Files are named: `YYYY-MM-DD__<short-description>.md`
+
+Example: `2026-01-01__add-user-authentication.md`
+
+## When to Generate
+
+Generate a diff report for:
+- ✅ Code changes (src/, backend/, frontend/, assistant/)
+- ✅ Configuration changes affecting behavior

... (diff truncated, 15 more lines)
```


### `docs/diffs/pr-2-heightmap-engine-extract.diff.txt`

**Changes:** +6815, -0

```diff
diff --git a/docs/diffs/pr-2-heightmap-engine-extract.diff.txt b/docs/diffs/pr-2-heightmap-engine-extract.diff.txt
new file mode 100644
index 0000000..b6bdcb3
--- /dev/null
+++ b/docs/diffs/pr-2-heightmap-engine-extract.diff.txt
@@ -0,0 +1,6815 @@
+# Diff Report
+
+Base: origin/main
+Head: feature/heightmap-engine-extract
+Generated: 2026-01-15T13:24:12-05:00
+
+## Summary
+ README.md                                |    7 +
+ backend/jest.config.js                   |    6 +
+ backend/main.js                          |    2 +
+ backend/package-lock.json                | 5581 ++++++++++++++++++++++++++----
+ backend/package.json                     |    9 +-
+ backend/routes/surface.js                |  118 +
+ backend/schemas/job_manifest.schema.json |   83 +
+ backend/schemas/job_status.schema.json   |   54 +
+ backend/tests/contractValidation.test.js |   59 +
+ backend/tests/surface.contract.test.js   |  105 +
+ backend/utils/contractValidation.js      |   86 +
+ docs/testing.md                          |   30 +
+ nginx/default.conf                       |    6 +-
+ scripts/test-all.sh                      |   15 +
+ 14 files changed, 5522 insertions(+), 639 deletions(-)
+
+## Full diff (unified)
+diff --git a/README.md b/README.md
+index f25d20b..4c25a5f 100644
+--- a/README.md
++++ b/README.md
+@@ -32,6 +32,13 @@ This is the complete repository for the [HexForge Labs](https://hexforgelabs.com
+ └── docker-compose.yml  # Full stack deployment
+ ```
+ 
++## 🧪 How to Build + Test
++
++- Backend tests (preferred, in Docker): `docker compose run --rm backend npm test`
++- Backend tests (local host): `cd backend && npm test`
++- Frontend tests (CRA/Jest, requires frontend deps installed): `cd frontend && npm test -- --watchAll=false`
++- See [docs/testing.md](docs/testing.md) for details and notes.
++
+ ---
+ 
+ ## ⚠️ Development Status
+diff --git a/backend/jest.config.js b/backend/jest.config.js
+new file mode 100644

... (diff truncated, 6771 more lines)
```


### `docs/diffs/pr-5-heightmap-engine-extract.diff.md`

**Changes:** +1051, -0

```diff
diff --git a/docs/diffs/pr-5-heightmap-engine-extract.diff.md b/docs/diffs/pr-5-heightmap-engine-extract.diff.md
new file mode 100644
index 0000000..bbbf3dd
--- /dev/null
+++ b/docs/diffs/pr-5-heightmap-engine-extract.diff.md
@@ -0,0 +1,1051 @@
+# Diff Report: copilot-create-repo-structure-and-docs
+
+**Date:** 2026-01-01  
+**Author:** copilot-swe-agent[bot]  
+**Branch:** copilot/create-repo-structure-and-docs  
+**Base:** e466a29  
+**Commit Range:** e466a29..HEAD
+
+## Summary
+
+This diff report documents changes made in the `copilot/create-repo-structure-and-docs` branch compared to `e466a29`.
+
+**Total Changes:**
+- **Files Changed:** 17
+- **Insertions:** 3863
+- **Deletions:** 3
+
+## Commits in This Change
+
+- feat: add complete documentation structure and diff workflow system (3a4a070)
+
+## Changed Files
+
+- `.editorconfig` (A: +99, -0)
+- `.github/workflows/diff-report.yml` (A: +148, -0)
+- `.gitignore` (M: +54, -3)
+- `CODEOWNERS` (A: +50, -0)
+- `CONTRIBUTING.md` (A: +650, -0)
+- `Makefile` (A: +246, -0)
+- `SECURITY.md` (A: +319, -0)
+- `docs/README.md` (A: +78, -0)
+- `docs/architecture/OVERVIEW.md` (A: +318, -0)
+- `docs/decisions/0001-repo-conventions.md` (A: +411, -0)
+- `docs/diffs/README.md` (A: +59, -0)
+- `docs/runbooks/COMMON_TASKS.md` (A: +568, -0)
+- `docs/setup/LOCAL_DEV.md` (A: +293, -0)
+- `scripts/gen_diff_report.sh` (A: +239, -0)
+- `scripts/gen_release_notes.sh` (A: +235, -0)
+- `src/README.md` (A: +30, -0)
+- `tests/README.md` (A: +66, -0)
+
+## Detailed Changes by File
+
+

... (diff truncated, 1007 more lines)
```


### `docs/runbooks/COMMON_TASKS.md`

**Changes:** +568, -0

```diff
diff --git a/docs/runbooks/COMMON_TASKS.md b/docs/runbooks/COMMON_TASKS.md
new file mode 100644
index 0000000..bda6d4c
--- /dev/null
+++ b/docs/runbooks/COMMON_TASKS.md
@@ -0,0 +1,568 @@
+# Common Tasks Runbook
+
+This runbook contains step-by-step instructions for common development and operational tasks for the HexForge Portable Lab Assistant (PLA) project.
+
+## 🚀 Development Tasks
+
+### Starting Development Environment
+
+#### Quick Start (Recommended)
+```bash
+# Start all services with Docker Compose
+make dev
+# or
+docker-compose up -d
+
+# View logs
+docker-compose logs -f
+```
+
+#### Manual Start (Individual Services)
+```bash
+# Terminal 1: Start MongoDB
+docker run -d -p 27017:27017 --name mongo-dev mongo:latest
+
+# Terminal 2: Backend
+cd backend && npm run dev
+
+# Terminal 3: Frontend
+cd frontend && npm start
+
+# Terminal 4: Assistant
+cd assistant && python app.py
+```
+
+### Stopping Services
+
+```bash
+# Stop Docker Compose services
+docker-compose down
+
+# Stop and remove volumes (clean slate)
+docker-compose down -v
+
+# Stop individual service

... (diff truncated, 524 more lines)
```


### `docs/setup/LOCAL_DEV.md`

**Changes:** +293, -0

```diff
diff --git a/docs/setup/LOCAL_DEV.md b/docs/setup/LOCAL_DEV.md
new file mode 100644
index 0000000..e617d71
--- /dev/null
+++ b/docs/setup/LOCAL_DEV.md
@@ -0,0 +1,293 @@
+# Local Development Setup
+
+This guide walks you through setting up the HexForge Portable Lab Assistant (PLA) development environment on your local machine.
+
+## Prerequisites
+
+Before starting, ensure you have the following installed:
+
+### Required Software
+- **Git** (v2.30+) - Version control
+- **Node.js** (v18+) and npm - JavaScript runtime
+- **Python** (v3.9+) - Backend services
+- **Docker** (v20+) and Docker Compose - Containerization
+- **Make** - Build automation (optional but recommended)
+
+### Recommended Tools
+- **VS Code** or your preferred IDE
+- **Postman** or similar API testing tool
+- **MongoDB Compass** - Database GUI (optional)
+
+## Initial Setup
+
+### 1. Clone the Repository
+
+```bash
+# Clone the repository
+git clone https://github.com/hexforge404/hexforgelabs.com.git
+cd hexforgelabs.com
+
+# Checkout the appropriate branch
+git checkout main
+```
+
+### 2. Install Dependencies
+
+```bash
+# Use the Makefile for quick setup
+make setup
+
+# Or manually install dependencies
+npm install
+cd frontend && npm install && cd ..
+cd backend && npm install && cd ..
+cd assistant && pip install -r requirements.txt && cd ..

... (diff truncated, 249 more lines)
```


### `docs/testing.md`

**Changes:** +37, -0

```diff
diff --git a/docs/testing.md b/docs/testing.md
new file mode 100644
index 0000000..8eae558
--- /dev/null
+++ b/docs/testing.md
@@ -0,0 +1,37 @@
+# Testing Guide (Backend)
+
+## Prerequisites
+- Node 18 (matches backend Docker image)
+- From repo root: `cd backend && npm install` (installs test deps).
+
+## Run backend tests locally
+```bash
+cd backend
+npm test
+```
+
+## Run backend tests inside Docker
+```bash
+cd /path/to/hexforge-store
+docker compose run --rm backend npm test
+```
+
+## Heightmap smoke (when engine is running)
+```bash
+cd /mnt/hdd-storage/hexforge-store
+docker compose up --build -d heightmapengine backend nginx
+bash scripts/smoke-heightmap.sh
+```
+
+## Run both (helper script)
+```bash
+bash scripts/test-all.sh
+```
+
+## What is covered
+- Contract validation helpers (AJV): valid envelopes, extra-field stripping, error wrapping.
+- `/api/surface` proxy behavior: schema enforcement, error wrapping, docs proxying without leaking engine host.
+
+## Notes
+- Tests mock GlyphEngine via nock; no external services are needed.
+- Frontend tests continue to run via CRA (`npm test` in frontend) and are unchanged.
```


### `frontend/package-lock.json`

**Changes:** +9, -0

```diff
diff --git a/frontend/package-lock.json b/frontend/package-lock.json
index 10ae393..dcc177f 100644
--- a/frontend/package-lock.json
+++ b/frontend/package-lock.json
@@ -19,6 +19,7 @@
         "dotenv": "^16.4.7",
         "express-rate-limit": "^7.5.0",
         "http-proxy-middleware": "^3.0.3",
+        "lucide-react": "^0.475.0",
         "react": "^19.0.0",
         "react-dom": "^19.0.0",
         "react-router-dom": "^6.21.1",
@@ -10465,6 +10466,14 @@
         "yallist": "^3.0.2"
       }
     },
+    "node_modules/lucide-react": {
+      "version": "0.475.0",
+      "resolved": "https://registry.npmjs.org/lucide-react/-/lucide-react-0.475.0.tgz",
+      "integrity": "sha512-NJzvVu1HwFVeZ+Gwq2q00KygM1aBhy/ZrhY9FsAgJtpB+E4R7uxRk9M2iKvHa6/vNxZydIB59htha4c2vvwvVg==",
+      "peerDependencies": {
+        "react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0"
+      }
+    },
     "node_modules/lz-string": {
       "version": "1.5.0",
       "resolved": "https://registry.npmjs.org/lz-string/-/lz-string-1.5.0.tgz",
```


### `frontend/package.json`

**Changes:** +1, -0

```diff
diff --git a/frontend/package.json b/frontend/package.json
index 031337d..d6decdd 100644
--- a/frontend/package.json
+++ b/frontend/package.json
@@ -16,6 +16,7 @@
     "dotenv": "^16.4.7",
     "express-rate-limit": "^7.5.0",
     "http-proxy-middleware": "^3.0.3",
+    "lucide-react": "^0.475.0",
     "react": "^19.0.0",
     "react-dom": "^19.0.0",
     "react-router-dom": "^6.21.1",
```


### `frontend/src/App.jsx`

**Changes:** +2, -0

```diff
diff --git a/frontend/src/App.jsx b/frontend/src/App.jsx
index 20d18ff..098d2d6 100644
--- a/frontend/src/App.jsx
+++ b/frontend/src/App.jsx
@@ -28,6 +28,7 @@ import FloatingChatButton from 'components/FloatingChatButton';
 import ScriptLabPage from 'pages/ScriptLabPage';
 import MemoryPage from 'pages/MemoryPage';
 import AssistantPage from 'pages/AssistantPage';
+import SurfacePage from "./pages/SurfacePage";
 
 import UserAuthPage from 'pages/UserAuthPage';    // ✅ member login/register
 import AccountPage from 'pages/AccountPage';      // ✅ member account
@@ -269,6 +270,7 @@ const MainApp = () => {
             <Route path="/script-lab" element={<ScriptLabPage />} />
             <Route path="/memory" element={<MemoryPage />} />
             <Route path="/heightmap" element={<HeightmapPage />} />
+            <Route path="/surface" element={<SurfacePage />} />
 
             {/* Member accounts */}
             <Route
```


### `frontend/src/components/GlobalNav.jsx`

**Changes:** +1, -0

```diff
diff --git a/frontend/src/components/GlobalNav.jsx b/frontend/src/components/GlobalNav.jsx
index 277d0e2..e4bda34 100644
--- a/frontend/src/components/GlobalNav.jsx
+++ b/frontend/src/components/GlobalNav.jsx
@@ -10,6 +10,7 @@ const routes = [
   { path: '/chat', label: 'Chat' },
   { path: '/assistant', label: 'Full Assistant' },
   { path: '/script-lab', label: 'Script Lab' },
+  { path: '/surface', label: 'Surface' },
   { path: '/blog', label: 'Blog' }
 ];
 
```


### `frontend/src/pages/SurfacePage.css`

**Changes:** +383, -0

```diff
diff --git a/frontend/src/pages/SurfacePage.css b/frontend/src/pages/SurfacePage.css
new file mode 100644
index 0000000..23a9a3b
--- /dev/null
+++ b/frontend/src/pages/SurfacePage.css
@@ -0,0 +1,383 @@
+.surface-page{
+  min-height: calc(100vh - 80px);
+  padding: 3rem 1.25rem 4rem;
+  background: radial-gradient(circle at 10% 20%, rgba(0,255,200,0.08), transparent 30%),
+    radial-gradient(circle at 90% 10%, rgba(120,180,255,0.10), transparent 32%),
+    linear-gradient(135deg, #030712 0%, #020617 45%, #01030d 100%);
+  color: #e5f5ff;
+  font-family: "Inter var", "Segoe UI", system-ui, -apple-system, sans-serif;
+}
+
+.surface-header{
+  display:flex;
+  align-items:flex-start;
+  justify-content:space-between;
+  gap:1rem;
+  margin:0 auto 1.5rem;
+  max-width: 1200px;
+}
+
+.surface-header h1{
+  margin:0 0 0.35rem;
+  font-size: 2rem;
+  letter-spacing: 0.8px;
+}
+
+.surface-lede{
+  margin:0;
+  max-width: 680px;
+  color: rgba(220,235,255,0.75);
+  line-height:1.5;
+}
+
+.surface-eyebrow{
+  margin:0 0 0.2rem;
+  text-transform: uppercase;
+  letter-spacing: 1.4px;
+  font-weight: 800;
+  color: rgba(120,200,255,0.65);
+  font-size: 0.75rem;
+}
+
+.surface-chip{
+  display:inline-flex;
+  align-items:center;

... (diff truncated, 339 more lines)
```


### `frontend/src/pages/SurfacePage.jsx`

**Changes:** +454, -0

```diff
diff --git a/frontend/src/pages/SurfacePage.jsx b/frontend/src/pages/SurfacePage.jsx
new file mode 100644
index 0000000..d7278de
--- /dev/null
+++ b/frontend/src/pages/SurfacePage.jsx
@@ -0,0 +1,454 @@
+import React, { useEffect, useMemo, useState } from "react";
+import {
+  AlertTriangle,
+  Clock3,
+  Download,
+  FileDown,
+  Image as ImageIcon,
+  RefreshCw,
+  Sparkles,
+} from "lucide-react";
+import {
+  createSurfaceJob,
+  getSurfaceJobStatus,
+  getSurfaceManifest,
+} from "../services/surfaceApi";
+import "./SurfacePage.css";
+
+const SURFACE_ASSET_BASE = (
+  process.env.REACT_APP_SURFACE_ASSETS_URL || "/assets/surface"
+).replace(/\/+$/, "");
+
+function formatTs(value) {
+  if (!value) return "";
+  const ts = typeof value === "number" ? value * 1000 : value;
+  try {
+    return new Date(ts).toLocaleString();
+  } catch {
+    return String(value);
+  }
+}
+
+function resolveSurfaceUrl(pathOrUrl) {
+  if (!pathOrUrl) return null;
+  const raw = String(pathOrUrl).trim();
+  if (!raw) return null;
+
+  if (/^https?:\/\//i.test(raw)) return raw;
+
+  if (raw.startsWith("/assets/surface/")) return raw;
+  if (raw.startsWith("assets/surface/")) return `/${raw}`;
+
+  const cleaned = raw.replace(/^\/+/g, "");
+  if (cleaned.startsWith("assets/surface/")) {
+    return `${SURFACE_ASSET_BASE}/${cleaned.replace(/^assets\/surface\//, "")}`;

... (diff truncated, 410 more lines)
```


### `frontend/src/services/surfaceApi.js`

**Changes:** +82, -0

```diff
diff --git a/frontend/src/services/surfaceApi.js b/frontend/src/services/surfaceApi.js
new file mode 100644
index 0000000..1a106ae
--- /dev/null
+++ b/frontend/src/services/surfaceApi.js
@@ -0,0 +1,82 @@
+import axios from "axios";
+
+const SURFACE_BASES = ["/api/store/surface", "/api/surface"];
+
+class SurfaceApiError extends Error {
+  constructor(message, status, data) {
+    super(message);
+    this.name = "SurfaceApiError";
+    this.status = status;
+    this.data = data;
+  }
+}
+
+function normalizeError(err) {
+  const status = err?.response?.status ?? 0;
+  const data = err?.response?.data;
+  const message =
+    data?.message ||
+    data?.error ||
+    data?.detail ||
+    err?.message ||
+    "Surface request failed";
+  return new SurfaceApiError(message, status, data);
+}
+
+const client = axios.create({
+  timeout: 15000,
+  withCredentials: true,
+  headers: {
+    Accept: "application/json",
+    "Content-Type": "application/json",
+  },
+});
+
+async function request(method, path, body) {
+  let lastErr = null;
+
+  for (const base of SURFACE_BASES) {
+    try {
+      const url = `${base}${path}`;
+      const res = await client.request({ method, url, data: body });
+      return res.data;
+    } catch (err) {
+      const normalized = normalizeError(err);

... (diff truncated, 38 more lines)
```


### `heightmap-engine/Dockerfile`

**Changes:** +17, -0

```diff
diff --git a/heightmap-engine/Dockerfile b/heightmap-engine/Dockerfile
new file mode 100644
index 0000000..55b7829
--- /dev/null
+++ b/heightmap-engine/Dockerfile
@@ -0,0 +1,17 @@
+FROM python:3.11-slim
+
+WORKDIR /app
+
+ENV PYTHONUNBUFFERED=1 \
+    PYTHONDONTWRITEBYTECODE=1
+
+RUN apt-get update && apt-get install -y --no-install-recommends curl \
+    && rm -rf /var/lib/apt/lists/*
+
+COPY requirements.txt .
+RUN pip install --no-cache-dir -r requirements.txt
+
+COPY main.py .
+
+EXPOSE 8093
+CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8093"]
```


### `heightmap-engine/main.py`

**Changes:** +156, -0

```diff
diff --git a/heightmap-engine/main.py b/heightmap-engine/main.py
new file mode 100644
index 0000000..9a33a49
--- /dev/null
+++ b/heightmap-engine/main.py
@@ -0,0 +1,156 @@
+import json
+import os
+import re
+import shutil
+import uuid
+from datetime import datetime
+from pathlib import Path
+from typing import Optional
+
+from fastapi import BackgroundTasks, FastAPI, HTTPException
+from pydantic import BaseModel
+
+app = FastAPI(title="HexForge Heightmap Engine", version="1.0.0")
+
+OUTPUT_BASE = Path(os.getenv("HEIGHTMAP_OUTPUT_DIR", "/data/hexforge3d/output/heightmap"))
+PUBLIC_PREFIX = os.getenv("HEIGHTMAP_PUBLIC_PREFIX", "/assets/heightmap")
+SERVICE_NAME = os.getenv("HEIGHTMAP_SERVICE_NAME", "heightmapengine")
+
+JOBS = {}
+
+
+class CreateJobRequest(BaseModel):
+    name: Optional[str] = "heightmap"
+    subfolder: Optional[str] = None
+
+
+def _iso_now():
+    return datetime.utcnow().isoformat() + "Z"
+
+
+def _sanitize_subfolder(value: Optional[str]) -> Optional[str]:
+    if not value:
+        return None
+    value = value.strip()
+    if not value:
+        return None
+    if re.match(r"^[A-Za-z0-9_-]+$", value):
+        return value
+    return None
+
+
+def _ensure_dirs(path: Path):
+    path.mkdir(parents=True, exist_ok=True)
+

... (diff truncated, 112 more lines)
```


### `heightmap-engine/requirements.txt`

**Changes:** +2, -0

```diff
diff --git a/heightmap-engine/requirements.txt b/heightmap-engine/requirements.txt
new file mode 100644
index 0000000..ac98e3d
--- /dev/null
+++ b/heightmap-engine/requirements.txt
@@ -0,0 +1,2 @@
+fastapi==0.111.0
+uvicorn==0.30.3
```


### `nginx/default.conf`

**Changes:** +6, -6

```diff
diff --git a/nginx/default.conf b/nginx/default.conf
index 1cdfc23..4b7d665 100644
--- a/nginx/default.conf
+++ b/nginx/default.conf
@@ -116,7 +116,7 @@ server {
     # Heightmap API (Assistant)
     # -------------------------------------------------
     location ^~ /api/heightmap/ {
-        proxy_pass http://assistant:11435/api/heightmap/;
+        proxy_pass http://backend:8000/api/heightmap/;
         proxy_http_version 1.1;
         proxy_set_header Host              $host;
         proxy_set_header X-Real-IP         $remote_addr;
@@ -127,11 +127,11 @@ server {
     }
 
     location = /api/heightmap/docs {
-        proxy_pass http://assistant:11435/docs;
+        proxy_pass http://backend:8000/api/heightmap/docs;
     }
 
     location = /api/heightmap/openapi.json {
-        proxy_pass http://assistant:11435/openapi.json;
+        proxy_pass http://backend:8000/api/heightmap/openapi.json;
     }
 
     # -------------------------------------------------
@@ -180,7 +180,7 @@ server {
         add_header Cache-Control "no-store, no-cache, must-revalidate" always;
         add_header Pragma "no-cache" always;
 
-        proxy_pass http://glyphengine:8092/api/surface/;
+        proxy_pass http://backend:8000/api/surface/;
         proxy_http_version 1.1;
         proxy_set_header Host              $host;
         proxy_set_header X-Real-IP         $remote_addr;
@@ -192,11 +192,11 @@ server {
 
 
     location = /api/surface/docs {
-        proxy_pass http://glyphengine:8092/docs;
+        proxy_pass http://backend:8000/api/surface/docs;
     }
 
     location = /api/surface/openapi.json {
-        proxy_pass http://glyphengine:8092/openapi.json;
+        proxy_pass http://backend:8000/api/surface/openapi.json;
     }
 
     # -------------------------------------------------
```


### `reports/audit-2026-01-15.md`

**Changes:** +32, -0

```diff
diff --git a/reports/audit-2026-01-15.md b/reports/audit-2026-01-15.md
new file mode 100644
index 0000000..6319c6e
--- /dev/null
+++ b/reports/audit-2026-01-15.md
@@ -0,0 +1,32 @@
+# Audit Report – 2026-01-15
+
+## Context
+- Branch: feature/heightmap-engine-extract
+- Scope: heightmap engine proxy, backend contract validation, smoke + backend tests
+
+## Actions Taken
+- Ran heightmap smoke: `bash scripts/smoke-heightmap.sh` (now defaults to http://localhost:8000)
+- Ran backend tests: `cd backend && npm test`
+- Restarted backend container to pick up schema changes
+
+## Outcomes
+- Heightmap smoke: **PASS** after fixes
+- Backend tests: **PASS** (surface, heightmap, contractValidation)
+
+## Issues Found & Resolved
+1) Smoke script failing to parse job_id and status; heredoc parsing warnings. 
+   - Fixed parsing and BASE default in [scripts/smoke-heightmap.sh](../scripts/smoke-heightmap.sh#L1-L51).
+
+2) Heightmap job status failed contract (`MISSING_RESULT_PUBLIC`) because Ajv `removeAdditional: "all"` stripped `result.public` (schema lacked property definition). 
+   - Added explicit `result.public` property to job status schema to preserve public links in [backend/schemas/job_status.schema.json](../backend/schemas/job_status.schema.json#L1-L60).
+   - Restarted backend; smoke now returns complete status with assets.
+
+3) Surface docs proxy test asserted old fetch signature (URL-only). 
+   - Updated expectation to allow headers and AbortController signal in [backend/tests/surface.contract.test.js](../backend/tests/surface.contract.test.js#L90-L111).
+
+## Current Service State
+- Containers: backend (healthy), heightmapengine (healthy), nginx running. Heightmap proxy endpoint reachable at `http://localhost:8000/api/heightmap`.
+
+## Follow-ups
+- If deploying behind TLS, optionally set `BASE=https://localhost` when running smoke.
+- Consider expanding job_status schema to fully describe result payload (enclosure/textures/previews) if stricter validation is desired.
```


### `scripts/gen_release_notes.sh`

**Changes:** +235, -0

```diff
diff --git a/scripts/gen_release_notes.sh b/scripts/gen_release_notes.sh
new file mode 100755
index 0000000..a784ef1
--- /dev/null
+++ b/scripts/gen_release_notes.sh
@@ -0,0 +1,235 @@
+#!/usr/bin/env bash
+
+# gen_release_notes.sh - Aggregate diff reports into release notes
+# Usage: ./gen_release_notes.sh [version]
+
+set -e
+
+# Color codes
+GREEN='\033[0;32m'
+BLUE='\033[0;34m'
+YELLOW='\033[1;33m'
+NC='\033[0m'
+
+# Configuration
+DIFF_DIR="docs/diffs"
+OUTPUT_FILE="docs/RELEASE_NOTES.md"
+DATE=$(date +%Y-%m-%d)
+
+# Get version from argument or use "Unreleased"
+VERSION=${1:-"Unreleased"}
+
+echo -e "${BLUE}Generating release notes...${NC}"
+echo -e "Version: ${GREEN}$VERSION${NC}"
+echo ""
+
+# Check if diff directory exists and has files
+if [ ! -d "$DIFF_DIR" ] || [ -z "$(ls -A $DIFF_DIR 2>/dev/null)" ]; then
+    echo -e "${YELLOW}No diff reports found in $DIFF_DIR${NC}"
+    echo -e "${YELLOW}Generate some diff reports first: make diff${NC}"
+    exit 0
+fi
+
+# Count diff reports
+DIFF_COUNT=$(find "$DIFF_DIR" -name "*.md" | wc -l | tr -d ' ')
+echo -e "Found ${GREEN}$DIFF_COUNT${NC} diff reports"
+echo ""
+
+# Backup existing release notes if they exist
+if [ -f "$OUTPUT_FILE" ]; then
+    cp "$OUTPUT_FILE" "${OUTPUT_FILE}.bak"
+    echo -e "${YELLOW}Backed up existing release notes to ${OUTPUT_FILE}.bak${NC}"
+fi
+
+# Start generating release notes

... (diff truncated, 191 more lines)
```


### `scripts/smoke-heightmap.sh`

**Changes:** +51, -0

```diff
diff --git a/scripts/smoke-heightmap.sh b/scripts/smoke-heightmap.sh
new file mode 100755
index 0000000..d067453
--- /dev/null
+++ b/scripts/smoke-heightmap.sh
@@ -0,0 +1,51 @@
+#!/usr/bin/env bash
+set -euo pipefail
+
+BASE=${BASE:-http://localhost:8000}
+API="$BASE/api/heightmap"
+
+echo "[heightmap] creating job..."
+create_resp=$(curl -sk -X POST "$API/jobs" \
+  -H "Content-Type: application/json" \
+  -d '{"name":"smoke-heightmap"}')
+
+echo "$create_resp"
+job_id=$(python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('job_id') or '')" <<<"$create_resp")
+
+if [ -z "$job_id" ]; then
+  echo "[heightmap] failed to get job_id" >&2
+  exit 1
+fi
+
+tries=0
+status="queued"
+while [ $tries -lt 20 ]; do
+  status_resp=$(curl -sk "$API/jobs/$job_id")
+  status=$(python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('status',''))" <<<"$status_resp")
+  echo "[heightmap] status: $status"
+  if [ "$status" = "complete" ]; then
+    break
+  fi
+  if [ "$status" = "failed" ]; then
+    echo "$status_resp"
+    exit 1
+  fi
+  sleep 1
+  tries=$((tries+1))
+done
+
+if [ "$status" != "complete" ]; then
+  echo "[heightmap] job did not complete in time" >&2
+  exit 1
+fi
+
+echo "[heightmap] fetching assets..."
+assets_resp=$(curl -sk "$API/jobs/$job_id/assets")
+echo "$assets_resp"

... (diff truncated, 7 more lines)
```


### `scripts/test-all.sh`

**Changes:** +15, -0

```diff
diff --git a/scripts/test-all.sh b/scripts/test-all.sh
new file mode 100755
index 0000000..ba6aaff
--- /dev/null
+++ b/scripts/test-all.sh
@@ -0,0 +1,15 @@
+#!/usr/bin/env bash
+set -euo pipefail
+
+ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
+cd "$ROOT_DIR"
+
+echo "[backend] running tests in docker..."
+docker compose run --rm backend npm test
+
+echo "[frontend] checking dependencies..."
+if [ -d "$ROOT_DIR/frontend/node_modules" ]; then
+  (cd "$ROOT_DIR/frontend" && npm test -- --watchAll=false)
+else
+  echo "[frontend] skipped (frontend/node_modules not found; run npm install first if you want frontend tests)."
+fi
```


### `src/README.md`

**Changes:** +30, -0

```diff
diff --git a/src/README.md b/src/README.md
new file mode 100644
index 0000000..ae40ff8
--- /dev/null
+++ b/src/README.md
@@ -0,0 +1,30 @@
+# Source Code
+
+This directory will contain the core source code for the HexForge Portable Lab Assistant (PLA).
+
+## Structure (Planned)
+
+```
+src/
+├── lib/           # Shared libraries and utilities
+├── models/        # Data models and schemas
+├── services/      # Business logic services
+├── utils/         # Helper utilities
+├── config/        # Configuration files
+└── README.md      # This file
+```
+
+## Development Guidelines
+
+- Keep code modular and reusable
+- Follow the conventions in [Repository Conventions ADR](../docs/decisions/0001-repo-conventions.md)
+- Add tests for all new functionality
+- Document public APIs
+
+## Getting Started
+
+See the [Local Development Setup](../docs/setup/LOCAL_DEV.md) for instructions on setting up your development environment.
+
+---
+
+**Note:** This is a placeholder. Source code will be added as the project develops.
```


### `tests/README.md`

**Changes:** +66, -0

```diff
diff --git a/tests/README.md b/tests/README.md
new file mode 100644
index 0000000..733c996
--- /dev/null
+++ b/tests/README.md
@@ -0,0 +1,66 @@
+# Tests
+
+This directory contains all test files for the HexForge Portable Lab Assistant (PLA).
+
+## Structure
+
+```
+tests/
+├── unit/              # Unit tests
+├── integration/       # Integration tests
+├── e2e/              # End-to-end tests
+├── fixtures/         # Test fixtures and data
+├── helpers/          # Test utilities and helpers
+└── README.md         # This file
+```
+
+## Running Tests
+
+```bash
+# Run all tests
+make test
+
+# Run with coverage
+make test-coverage
+
+# Run specific test suite
+cd backend && npm test
+cd frontend && npm test
+cd assistant && pytest
+```
+
+## Writing Tests
+
+### Unit Tests
+- Test individual functions and methods
+- Mock external dependencies
+- Fast execution
+
+### Integration Tests
+- Test component interactions
+- Use test database
+- More realistic scenarios
+
+### E2E Tests

... (diff truncated, 22 more lines)
```


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

**Generated:** 2026-01-15  
**Script Version:** 1.0

# HexForge Labs Website Platform — Proof of Work

This package documents the existing HexForge Labs website platform at commit `92ba88926a5389fc1aab46ccbbf5c84f378291b2` on `main`. It provides concise, reviewable evidence of the Technical Portfolio route, its configuration-driven backend, administrative editing workflow, Dockerized deployed stack, Git history, and recorded local verification.

## What was built

The platform includes a React storefront and information site backed by Express and MongoDB. Its specialized Landing Pages system supports dedicated Memorial / Family, Funeral Home Director, and Technical Portfolio experiences. The Portfolio is implemented at `/portfolio`; `/work` redirects to that route.

The Portfolio is not a static page. Default content lives in code, administrators can maintain structured overrides through a dedicated editor, the backend sanitizes and stores those overrides in MongoDB, the public API merges them with safe defaults, and a specialized React page renders the result. The renderer also retains built-in fallback content if configuration retrieval fails.

## Technologies demonstrated

- React and React Router frontend composition
- Express REST APIs
- MongoDB with Mongoose schemas
- Input sanitization and bounded structured configuration
- Purpose-built administrative editing tools
- Dockerized Nginx, backend, and MongoDB services
- Git-based feature history and recorded build/test verification

## Deployed-stack architecture

The demonstrated content path is:

`defaults in code → sanitized Mongo overrides → merged public config → specialized React renderer`

The runtime evidence shows the Nginx, backend, and MongoDB containers running and healthy. Read-only checks through the locally exposed deployed endpoint returned HTTP 200 for both the Portfolio page and its configuration API. These checks establish the functioning deployed stack in the capture environment; they do not independently establish external Internet availability. No deployment or production mutation was performed while collecting this package.

## Routes and APIs

- Public Portfolio: `/portfolio`
- Alternate route: `/work` → `/portfolio`
- Public configuration API: `/api/landing-page/portfolio`
- Admin entry point: `/admin`
- Dedicated Admin Portfolio API: `/api/admin/portfolio-page`

## Relevant commits

- `92ba88926a5389fc1aab46ccbbf5c84f378291b2` (`92ba889`) — Add editable technical portfolio page
- `dd976bd` — Add editable Memorial and Funeral Home landing pages

## Verification discipline

Evidence was collected using navigation and GET requests only. The repository's general frontend test suite passed 7 of 7 tests; this is not Portfolio-specific test coverage. A fresh optimized frontend production build completed successfully with exit status 0 and no reported warnings. Containers were not restarted, rebuilt, stopped, or modified, and no database writes were made.

See `EVIDENCE_MANIFEST.md` for artifact provenance, sanitization, and limitations.

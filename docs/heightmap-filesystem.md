# HexForge Heightmap Engine – Folder and Path Contract

This document locks the file‑system layout and API contract for the HexForge Heightmap Engine.  It describes where files are written, how public URLs are built and what the frontend can assume.  The goal is to stabilise the folder structure across frontend, backend and public assets without introducing new features or changing the UI.

## 1️⃣ Canonical folder structure (single source of truth)

### Base directory

All heightmap outputs live under the **public assets** directory of the web application.  In a Create React App build, the `public` directory is copied to the build output and is served to clients unchanged:contentReference[oaicite:0]{index=0}.  Because files in the `public` directory are static, they are not processed or hashed by Webpack:contentReference[oaicite:1]{index=1}.  Using a static directory allows large heightmap files and previews to be served directly by the web server.

The canonical root for all generated files is:



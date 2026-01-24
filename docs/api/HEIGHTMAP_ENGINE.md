# Engine Identity — Heightmap API
The Heightmap Engine generates heightmaps and preview imagery (2D height fields) from uploaded grayscale inputs. It is the upstream stage for relief textures and height data.

## Scope
- Generates heightmaps and previews only.
- Publishes outputs to `/assets/heightmap/<job_id>/` for public access.
- Accepts optional job metadata (name, mode, sizing, inversion) and returns job status plus asset URLs.

## Out of Scope
- No geometry, STL, enclosure, or parametric case generation.
- No Surface Engine features (vents, mounting logic, texture-safe zones, etc.).

## Relationship
The Surface Engine consumes Heightmap outputs when producing enclosure geometry. Keep this page focused on heightmap creation; direct geometry belongs to the Surface Engine.

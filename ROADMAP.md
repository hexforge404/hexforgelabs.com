# HexForge Surface Engine Roadmap (Locked)

## Engine Identity
Surface Engine consumes heightmaps to produce functional, modular enclosure geometry for electronics, starting with Raspberry Pi systems. It is infrastructure, not a generic art or case generator.

## Phase Guardrails
- Phase 0 is complete; only bug fixes are allowed.
- No feature may advance unless it directly supports Raspberry Pi enclosures in Phase 1.
- Each later phase is reserved; do not implement ahead of schedule.

## Locked Roadmap
### Phase 0 — Foundation (DONE / ACTIVE)
- Parametric enclosure geometry
- Heightmap/surface-based relief
- STL + preview output
- Stable filesystem + URL contracts
- API-driven jobs
Rule: Complete; only bug fixes are allowed.

### Phase 1 — Raspberry Pi as Anchor (HIGHEST PRIORITY)
Defines tolerances, interfaces, design language, thermal philosophy.
Planned (do not implement yet):
- Board profile JSON (ports, LEDs, camera, antenna)
- Texture-safe zones
- Vent pattern generation
- Mounting hole logic
- Stack alignment keys
Rule: If a feature does not directly support Raspberry Pi cases, it does not exist yet.

### Phase 2 — Mounts, Brackets & Infrastructure
Extensions of Pi cases: wall mounts, DIN rail mounts, VESA adapters, rack ears.
Reserved concepts: hole pattern presets, load-bearing ribs, orientation-aware strength rules.

### Phase 3 — Thermal & Vent Intelligence
Texture as thermal function; vent density and airflow logic matter.

### Phase 4 — Internal Systems
Trays, inserts, cable guides; snap-fit vs screw logic; captive nut pockets; material-aware tolerances.

### Phase 5 — Attachment Intelligence
Magnets, slide locks, modular mating validation.

### Phase 6 — Printability Scoring (Optional)
Overhang analysis, wall thickness warnings, print risk estimation.

## What This Engine Is NOT
- Generic laptop skins
- Decorative-only art tiles
- Random novelty enclosures
- Over-custom phone ecosystems
- Phone cases are experimental only and not part of the roadmap

## Enforcement
- Roadmap is authoritative; proposals must map to a specific phase.
- Out-of-scope requests are rejected explicitly.
- Documentation and comments must preserve this contract; runtime behavior remains unchanged.

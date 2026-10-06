# 11 — Browse the SRD Spell Catalog

**What to build:** A player can search and inspect a locally bundled, versioned, and validated SRD 5.2.1 Spell Catalog from the Magic area without depending on a third-party service during play.

**Blocked by:** 04 — Edit and synchronize the Character Overview; 08 — Track Conditions with Rules Tooltips.

**Status:** claimed

- [x] The bundled catalogue contains the expected validated set of unique SRD 5.2.1 spells and excludes records from other sources.
- [x] Automated checks cover record count, levels zero through nine, required metadata, provenance, and representative source comparisons.
- [x] The Magic area searches by name and filters by level, class, school, ritual, and concentration.
- [x] A spell detail view shows casting time, range, components, material component, duration, concentration, ritual status, description, and higher-level effect.
- [x] Spell rules reuse the accessible Rules Tooltip interaction for linked SRD game terms.
- [x] The About or Legal view contains the exact required SRD 5.2.1 attribution.

## Implementation evidence

Verified 2026-10-05 in an isolated worktree from origin/main. Independent review completed with no actionable findings after fixes; awaiting PR. Not merged or deployed.

- Production build: `pnpm build` passes. Vite reports the bundled application chunk exceeds 500 kB; catalog is intentionally local.
- Calculation/domain checks: `pnpm test:calculations` — 181 passed, including 5 catalog checks.
- Database checks: `pnpm test:db` — 353 passed across 12 files. No schema changes or hosted migration needed.
- Focused browser checks: `pnpm exec playwright test e2e/spell-catalog.spec.ts` — 4 passed (two journeys on laptop Chromium and phone Chromium), covering Magic navigation, all filters, search, empty state, details, nested Rules Tooltip/focus return, exact attribution, offline browsing, and horizontal fit, semantic Teleport/Reincarnate table headers and row associations.
- Official PDF provenance, reproducible extraction and representative comparisons: `docs/rules/srd-spells.md`. 339 spells, level counts 27/57/57/42/34/38/31/20/17/16.
- Combined browser/data regression remains with the coordinator.

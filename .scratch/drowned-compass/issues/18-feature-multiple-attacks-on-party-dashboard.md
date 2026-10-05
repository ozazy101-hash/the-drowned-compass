# 18 — Feature multiple attacks on the Party Dashboard

**What to build:** A player can record any number of attacks, choose any subset to feature on the Party Dashboard, and recognize each featured attack by a consistent attack type/range icon and a concise text summary.

**Blocked by:** 06 — Read the Party at a glance; 09 — Manage attacks and actions.

**Status:** claimed

- [x] Combat continues to allow any number of saved attacks and actions without a product-level count cap. A player can select zero, one, or several saved attacks to feature on their Party card.
- [x] The featured selection persists and synchronizes independently of unrelated Combat edits. Removing an attack or changing it into an action removes it from the featured selection; deleted or non-attack records never appear on the Party card.
- [x] Featured attacks appear in their existing Combat order with concise player-entered values. The former single primary-attack selector and summary are replaced or migrated without losing an existing selection.
- [x] Each featured attack has a consistent generic icon for its player-selected type/range category (for example melee, ranged, or other), with a sensible generic default. Icons do not infer rules from free-text range and do not rely on official D&D artwork.
- [x] Attack names and values remain readable without relying on icon shape or colour alone. The Party card stays keyboard accessible and readable on laptop and phone even when several attacks are featured; identity, Hit Points, Armor Class, and Conditions retain their current priority.
- [x] Selection rules and card summaries live in the Combat domain interface, with the Party card rendering their result. Calculation, persistence, database, and focused browser tests cover multi-selection, ordering, removal, synchronization/conflict handling, and both viewport sizes.

## Comments

### 2026-10-03 — Read-only product exploration

The current Combat model has no explicit attack-count cap, but stores one `primaryId` and renders one Party Dashboard attack summary. The player asked to select several attacks for display, with standard icons representing attack type or range. This ticket records that change for later implementation; no application behavior or UI was changed during this exploration.


### 2026-10-05 — Implementation and verification

Feature selection uses its own version through the Combat command interface. Legacy primary selections migrate to a one-item list; deleting or converting an attack prunes selection. Generic category icons use the saved category and accompany readable text. The Party card renders Combat summaries below Conditions, preserving identity/HP/AC/Conditions priority.

Independent read-only review is clear after fixes for Conditions order, multi-selection adapter coverage, legacy database backfill coverage, and recovery from a failed draft after remote removal.

- Build: `pnpm build` passed.
- Combat calculation checks: `pnpm test:calculations tests/combat-entries.test.ts` — 4 passed.
- Rollback-only local database rehearsal: `pnpm test:db supabase/tests/database/featured_attacks_migration.generated.test.sql` — 49 assertions passed, 1 file. This includes original Combat permissions/invariants plus legacy backfill, independent selection, conflicts and pruning. Docker was started locally; no migration was applied.
- Focused browser checks: isolated server on port 4188, 2 workers, 60-second test timeout — 22 passed in 46.0 seconds (11 laptop Chromium, 11 phone Chromium). Run again with `pnpm exec playwright test --config=playwright.combat.config.ts`. Covers both adapters, persisted subset/order/categories, synchronization, keyboard selection/navigation, mobile overflow, physical Conditions priority, stale snapshots, conflict/removal recovery and failure/discard feedback.
- Full combined regression remains with the coordinator.

Release requires hosted migration `20261005180000_feature_multiple_attacks.sql` before deploying the frontend (which reads `featured_ids`). Hosted migration, merge, deployment and deployed smoke checks have not been performed.

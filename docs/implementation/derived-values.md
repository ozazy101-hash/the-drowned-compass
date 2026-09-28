# Derived Values (Ticket 05)

`src/domain/derived-values.ts` is the pure calculation seam. It accepts total level separately from class storage; today's Character Record supplies its single-class level. Calculation inputs and `derivedOverrides` are separate. Zero is an override; an absent key uses the calculation. Reset removes only that key.

Effective Ability modifiers and proficiency bonus feed saves, skills, initiative, and spell statistics. Effective Perception feeds Passive Perception. Final overrides do not flow upstream: initiative does not change Dexterity, and spell attack does not change spell save DC. An unset spellcasting Ability produces null spell calculations; each spell statistic can still have its own explicit override and resets to null.

The UI previews a draft override and marks it unsaved. Dependent fields use accepted inputs/overrides. Reset previews the calculated result immediately while preserving Saving/failure feedback until the backend acknowledges it. Each override and proficiency entry has its own conditional field version, retaining the existing draft and snapshot guards. An override draft remembers its starting version; a competing same-field update received before submission makes that save conflict. Explicit Retry deliberately adopts the latest version.

## Rules evidence

Verified against the [official SRD 5.2.1 PDF](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf) on 2026-09-28:

- Printed pages 6 and 21: Ability modifier table, including negative odd scores; calculation rounds down.
- Pages 8, 9 and 23: level-based proficiency thresholds and the standard skill-to-Ability mapping.
- Pages 8 and 22: proficiency adds once; skill expertise doubles it; Passive Perception uses 10 plus the Perception modifier; initiative uses Dexterity.
- Pages 22–23: spell attack uses the selected Ability modifier plus proficiency, and spell save DC adds 8.

Saving-throw expertise is a ticket-requested table extension, not an automatic SRD entitlement. Features, alternate skill Abilities, and situational bonuses use explicit overrides; this is not a full rules engine.

## Local verification

Run `pnpm test:calculations`, `pnpm test:e2e --workers=1`, `pnpm test:db`, and `pnpm build`. The database runner expands the actual migration into a rollback-only fixture because Supabase mounts test SQL without sibling migrations. It proves that legacy choices, claim metadata, and conditional versions survive the forward migration; generated test SQL is removed after the run.

Final review verification passed 50 browser tests (25 laptop, 25 phone) using `pnpm test:e2e --workers=1 --timeout=90000` on the busy development Mac. This extends the whole-test budget; assertion timeouts remain unchanged. The production build and all 111 database assertions also passed after the review fixes.

## Release boundary

Migration `20260928200000_calculate_and_override_derived_values.sql` converts existing saving-throw booleans to `none`/`proficient`, preserving the existing per-field versions, claim, and other inputs. It adds validated overrides and extends the existing membership/RLS-governed RPC with independent numeric writes and null resets. CHECK validator execution is explicitly granted to authenticated and denied to anonymous roles.

The schema and frontend must be released together: the old frontend expects boolean saving throws, while the new frontend requires the new override column. After release approval, apply the hosted migration and deploy the reviewed frontend in one release window, then refresh existing sessions. A migration push or Pages build alone is not release acceptance. Verify member saves, zero overrides, reset, proficiency states, reload persistence, and two-session different/same-field behavior on hosted Supabase. New edits to the hosted Ticket 04 Test Character require user permission.

## Released acceptance

The user approved release and temporary live test edits on 2026-09-28. The reviewed migration was applied to hosted project `qjiqnzujsuqoqaausrgy`; a follow-up dry-run confirmed no pending migrations. [PR #3](https://github.com/ozazy101-hash/the-drowned-compass/pull/3) merged at release commit `8e7dab814371b9b4c066eb1b50645c64e5d62f5f`, and its [GitHub Pages deployment](https://github.com/ozazy101-hash/the-drowned-compass/actions/runs/36482067218) succeeded.

Signed-in Player and Dungeon Master browsers verified the hosted calculations, proficiency/expertise, zero override persistence, dependent Passive Perception, reset, and independent live edits. A remote Initiative save received before the other browser submitted its draft produced a visible conflict, retained that draft, and preserved the accepted remote value. Explicit Retry saved the draft and both browsers converged without losing an independent Speed edit.

All temporary edits to the labelled test Character were restored, then verified after reload in both sessions. Its identity/claim remain intact; Ability Scores are all 10, level is 1, saves/skills are not proficient, AC is 10, maximum Hit Points is 1, Speed is 30, spellcasting Ability is unset, and no Derived Value overrides remain. Other Character Slots were not edited. Ticket 05 is resolved.

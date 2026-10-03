# 14 — Support multiclass Player Characters

**What to build:** A player can add, edit, and remove additional class-and-level entries after initial setup, with total level, proficiency bonus, spell statistics, and Party summaries updating consistently.

**Blocked by:** 05 — Calculate and override Derived Values; 06 — Read the Party at a glance.

**Status:** claimed

- [x] A Character Record supports one or more class-and-level entries while retaining a clear primary class.
- [x] Total level derives from the class entries and updates proficiency-dependent values.
- [x] The Party Dashboard presents a readable multiclass summary.
- [x] Removing or changing a class cannot produce an invalid negative or zero-level Character Record.
- [x] Multiclass changes save independently and synchronize across browsers.

## Comments

- 2026-10-03: Claimed Ticket 14 in managed worktree `ticket-14-multiclass`, branch `codex/ticket-14-multiclass`, based on remote main `8663b94`. Only this ticket is claimed.

- 2026-10-03: Implemented class-and-level entries with a protected primary entry, independent conditional writes/removal tombstones, total-level calculations, readable Party summaries and draft-preserving conflicts/Retry. Existing single-class records are backfilled exactly; legacy total-level writes adjust the primary entry without dropping additional classes.
- Verification: `pnpm build` and `git diff --check` pass. Calculation suite: **149/149**, including 18 new multiclass/compatibility cases. Local rollback-only database suite under the shared database lock: **247/247 assertions across 9 files**, including 43 new migration/security/conditional-write checks. Full branch browser suite under the shared browser lock: **142/142 cases (71 laptop, 71 phone) in 6.4 minutes**, including all 22 new multiclass/adapter cases. It used one worker, reserved port 4214 and a temporary 180000ms whole-test budget; assertion timeouts were unchanged and the temporary config was removed.
- Earlier focused browser pass: **13/14**. A compatibility-module edit during that run restarted the Vite test server and cleared its test Party, interrupting one laptop case; the same phone case passed. With source frozen, the complete 142-case run passed, including that laptop case. No unchanged full-suite rerun was needed.
- No remaining implementation blocker. Tracker remains **claimed** for review/release acceptance. Combined peer integration (Tickets 07, 08 and 15) and hosted acceptance are pending. No hosted migration, deploy or PR merge has been performed. Module contract, compatibility behavior and integration/release pointers: [implementation notes](../../../docs/implementation/multiclass-characters.md).

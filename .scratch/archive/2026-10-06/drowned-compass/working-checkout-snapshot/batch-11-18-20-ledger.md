# Batch 11, 18–20 verification ledger

Coordinator chat: `01a10dba-f474-7511-b3bb-492e1b015fa5`.
Baseline: origin/main `8298123ae6327db004cc84a6734146c568877f2b`.
Scope: reviewable PRs followed by one isolated combined production build, calculation/data/database and laptop/phone regression, then an exploratory preview for final human review. No merge, hosted migration, or deployment is authorized.

| Ticket | Implementation | Independent review | PR / head | Build / calculations | Database | Focused laptop / phone | Migration impact | Blocker |
|---|---|---|---|---|---|---|---|---|
| 11 Spell Catalog | Complete | Clear after fix/rereview | [PR #21](https://github.com/ozazy101-hash/the-drowned-compass/pull/21); `217bef9cc4c4d8efb6c125095657c5c075b2510f` | Build pass; focused 181/181 | Focused 353/353 | Focused 4/4 | None | None |
| 18 Featured attacks | Complete including integration fixes | Clear after original and integration fix/rereviews | [PR #22](https://github.com/ozazy101-hash/the-drowned-compass/pull/22); `160c6bb52efff7f4ba347cdc9819a235b958b2a8` | Build pass; focused 4/4 | Focused 49/49 | Focused 22/22 plus corrected cross-feature 2/2 | Featured-attacks migration before frontend | None |
| 19 Health controls | Complete | Clear after fix/rereview | [PR #20](https://github.com/ozazy101-hash/the-drowned-compass/pull/20); `4c261b24b2a3cc53f10c5e6e6132fc5bc7abc46d` | Build pass; focused 181/181 | Focused was blocked; resolved by combined 412/412 | Focused 12/12 | Health RPC migration before frontend; preserves legacy Temporary HP | None |
| 20 Currency labels | Complete | Clear; independent laptop/phone visual review | [PR #19](https://github.com/ozazy101-hash/the-drowned-compass/pull/19); `7bbfcef6cab7ad3db3159d2ca76b9d4e031c7163` | Build pass; focused 1/1 | No change; included in combined database suite | Focused 10/10 + 8/8 adapter | None | None |

As of the 2026-10-05 20:52 UTC follow-up, implementation and independent final review evidence were read in each parent chat and reviewer child chat. Tickets 11, 18 and 19 have observed fix/rereview evidence; Ticket 20 had no actionable findings. All four local branches include their ticket specs. GitHub metadata confirms PRs #19 and #20 are open, non-draft and unmerged with heads matching the local commits. CI diagnostics report no checks or statuses for either head; this is not a CI pass. Ticket 11 retains a production bundle-size warning.

## Tracker reconciliation

Per batch instructions, Tickets 06, 07, 08, 10, 14, and 15 are merged/deployed despite stale main statuses. Ticket 11 is unblocked by merged 04 and 08. Tickets 18–20 specs are local to the 6d3f checkout and must be copied into their respective PRs. Ticket 19's current spec recognizes deployed Ticket 07. Ticket 13's local Health/rest direction is relevant context; Tickets 12, 13, and 17 remain outside this batch. This ledger does not rewrite historical ticket evidence.

## Combined gate

The user explicitly authorized publishing Tickets 11 and 18; pushes succeeded and non-draft PRs [#21](https://github.com/ozazy101-hash/the-drowned-compass/pull/21) and [#22](https://github.com/ozazy101-hash/the-drowned-compass/pull/22) were created and attached to this chat. All four PR heads match the exact local commits above; all are open/unmerged and GitHub reports mergeable. No CI checks or statuses are configured/reported for these heads.

Isolated worktree: `/Users/oscarpauwels/.codex/worktrees/batch-11-18-20-integration/Dungeons&Dragons`, branch `codex/batch-11-18-20-integration`, combined commit `47fe84a667be07616fc40eb380a596659e6a3e94`. Base is `8298123ae6327db004cc84a6734146c568877f2b`; merge order is 11, 18, 19, 20. Local resolution commit `bcd9b02` retains both featured-attack prerequisite migration substitution and Health migration substitution in the database fixture generator. No application conflicts occurred.

Combined production build: PASS (`VITE_USE_IN_MEMORY_DATA=true pnpm build`), browser/local preview configuration, 722.01 kB JS / 186.32 kB gzip; Vite's >500 kB warning remains. Combined calculation/data/domain checks: 190/190 PASS. Combined local database rollback-only suite: 412/412 across 13 files PASS; this resolves Ticket 19's earlier execution blocker and covers both forward migrations without applying persistent or hosted schema changes. Full laptop/phone browser regression against the production build on strict port 4390: 206 cases running; pending final results. Hosted migrations, merges, deployment, and deployed smoke: not performed, separately gated on later user authorization.

## Follow-up

Existing active heartbeat `drowned-compass-ticket-progress` targets this coordinator every 30 minutes with all four chat IDs and the combined verification instruction. Its saved prompt stops follow-up after integrated results and requires silence while unchanged. No duplicate monitor was created.

## Integration correction and final gate

Production screenshot inspection exposed a Ticket 18 layout defect: featured rows and Conditions were below a 100%-height card button and clipped by the article's overflow. Text assertions alone missed it. Physical featured-row containment assertions failed on both laptop and phone with the prior CSS. The correction makes the card a flex column and its open-character button flexible with automatic height. The focused containment test then passed 2/2; all 22 focused Combat/adapter cases passed. Independent read-only reviewer `review_integration_clipping` checked the original spec, module criteria, diff and fresh production screenshots and cleared the fix. Production combined UI smoke passed 2/2 after rebuilding, with unclipped summaries, Health, currency, Magic and reload persistence.

Fix commit `5deb1e273044d947fa466adcde710af3be461383` was cherry-picked to Ticket 18 and pushed as updated PR #22 head `0356e759ec33902dc45b197e204bd1caa336eb6c`. It is recorded in integration ancestry by final combined commit `dfab1a3ef7a0a479b727dcde1bfeefba37a26c25`. All other ticket heads and base remain unchanged.

The first attempted full suite against a production preview was stopped: existing adapter tests import Vite source modules and use its shared-party test endpoint. That was a harness mismatch, not a valid production-suite result. The ensuing source-based run was stopped when screenshot inspection identified the layout defect; no completed full pass is claimed for either interrupted run. Final full suite runs on the corrected exact commit with the repository-required Vite test transport at strict port 4393, 2 workers, both viewport projects. Production artifact is separately smoke-tested at port 4390. Local preview is in-memory/localStorage and does not connect to hosted Party data.

## Final result — 2026-10-05

Final clean isolated integration commit: `b9c409af65a8ac7db034197edd67d388b3590faf`.
Exact base and four final PR heads are recorded above. No local source changes remain uncommitted. PR #22 includes the layout fix and the stale cross-feature browser expectation correction; other PR heads are unchanged.

| Gate | Result |
|---|---|
| Production build | PASS, corrected application artifact; 722.01 kB JS, warning above 500 kB |
| Calculation/data/domain | 190/190 PASS |
| Local database | 412/412 PASS across 13 rollback-only fixtures |
| Full browser suite | 204/206 passed in 8.2 minutes; 2 failures were one obsolete primary-selector test on both viewports |
| Corrected failed cases | 2/2 PASS in 7.0 seconds, independent review clear; test-only correction preserves attack/resource persistence before and after reload |
| Effective laptop result | All 103 cases pass: 102 in full suite plus 1 corrected rerun |
| Effective phone result | All 103 cases pass: 102 in full suite plus 1 corrected rerun |
| Built production cross-feature smoke | 2/2 PASS in 22.9 seconds, laptop and phone; fresh screenshots independently inspected |
| Hosted migrations | NOT APPLIED |
| GitHub PR merges | NOT PERFORMED |
| Deployment / deployed smoke | NOT PERFORMED |

The full suite ran at `dfab1a3ef7a0a479b727dcde1bfeefba37a26c25`. Only `e2e/limited-resources.spec.ts` test assertions differ in the final commit; application source and built artifact are identical. Do not represent the result as a single clean 206/206 run: it is 204 full-run passes plus 2 corrected rerun passes. The remaining test used the removed Primary attack selector; it now checks the featured Cutlass checkbox and summary alongside Second Wind, including reload. Independent reviewer cleared this test-only correction.

Preview: http://127.0.0.1:4390/the-drowned-compass/ . Player password: `player-password`; Dungeon Master password: `dm-password`. The production preview uses localStorage/in-memory Party data and does not access hosted Party data. It remains running for exploratory review. The app browser opening was queued for this chat.

Evidence and temporary reproduction harnesses are preserved under `.scratch/drowned-compass/verification/batch-11-18-20/`. The monitor has been paused as requested after integrated results. Final user review precedes any separate merge/release authorization. Release must apply `20261005180000_feature_multiple_attacks.sql`, then `20261005190000_simplify_health_controls.sql`, before the frontend; preserve the local database-runner integration resolution when combining PRs. GitHub reports no configured checks/statuses for these heads; local verification is recorded separately.

## Authorized release

User approved merging, then explicitly approved both hosted migrations and the automatic deployment. The hosted dry run listed only `20261005180000_feature_multiple_attacks.sql` and `20261005190000_simplify_health_controls.sql`. Both applied successfully in that order. Postflight dry run reports remote up to date with zero pending migrations.

Health PR #20 was prepared by merging reviewed Ticket 18 into its branch and preserving the exact tested database fixture resolution; head is `a3b235a394e49629a09703cff49cf418d5d268a4`. Integration ancestry commit `5e6585c9e3375b354477cd0d17e3ca0f04986f2b` has an identical tree to tested `b9c409af65a8ac7db034197edd67d388b3590faf` (git diff exit 0).

All four PRs merged with expected-head guards, in order:
- PR #21 / Ticket 11: `72cbc037ac6ca52ffb4cb8c5a080f3c68cce5ef6`
- PR #22 / Ticket 18: `9f4533cbc3a13bda21169d7a05cb256c43be8844`
- PR #20 / Ticket 19: `343a7d9bfb83acd184d8ee6751159d94a18ffdd0`
- PR #19 / Ticket 20: `65a8d7e0a8dfc392c343a9084741b6ace41b06ea`

Fetched final main is `65a8d7e0a8dfc392c343a9084741b6ace41b06ea`; its complete tree is identical to tested `b9c409a` (git diff exit 0). Final Pages run: https://github.com/ozazy101-hash/the-drowned-compass/actions/runs/37376319385 . Deployment and live smoke verification are underway; do not infer them from completed merges.

## Release completion

All four PRs merged; both hosted migrations applied and postflight found zero pending migrations. Final main `65a8d7e0a8dfc392c343a9084741b6ace41b06ea` exactly matches the verified integration tree. GitHub Pages run [37376319385](https://github.com/ozazy101-hash/the-drowned-compass/actions/runs/37376319385) completed successfully, including build and deploy jobs. Intermediate merge runs were cancelled by the configured Pages concurrency policy.

Authenticated read-only deployed UI smoke passed: party overview and About / Legal load; existing Character loads; Health direct controls render correctly with unknown HP disabled; Combat shows multiple featured attacks interface; Inventory displays all five full currency labels; Magic loads 339 spells, Fireball search returns two matches, and Fireball details show rules and source. Returned to party overview and retained live browser as deliverable. No hosted Character values were changed; hosted save mutations were not repeated. The prior integrated laptop/phone regression remains the functional regression evidence. Scheduled follow-up remains paused; batch complete.

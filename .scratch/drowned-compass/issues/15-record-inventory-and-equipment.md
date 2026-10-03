# 15 — Record inventory and equipment

**What to build:** A player can maintain a deliberately basic Inventory of equipment, currency, and notable magical items without introducing automatic encumbrance or equipment-rule calculations.

**Blocked by:** 04 — Edit and synchronize the Character Overview.

**Status:** claimed

- [x] The Inventory area supports adding, editing, ordering, and removing equipment and notable magical items.
- [x] Currency can be entered and corrected without automatic conversion or campaign-economy behaviour.
- [x] Inventory entries remain player-authored and make no automatic Armor Class, attack, or carrying-capacity changes.
- [x] Inventory changes save independently and synchronize across browsers.
- [x] The basic Inventory remains usable on phone and laptop layouts.

## Comments

- Claimed in isolated `codex/ticket-15-inventory` worktree.

- Implemented independent item/denomination persistence, Inventory UI, conditional-write adapters and additive migration from remote main `8663b94` in the managed worktree.
- Milestone validation: `pnpm build` and `git diff --check` pass; `pnpm test:calculations` passes 132/132; rollback-only `pnpm test:db` passes 240 assertions across 9 files (36 inventory assertions). No persistent local or hosted migration was applied.
- Initial Inventory journey: 6/6 passed across laptop and phone. First full browser attempt was stopped (exit 130; 40 passed, 1 failed, 1 interrupted) after a source edit triggered Vite reload during verification. Subsequent full run: 131 passed, 3 failed, exit 1 in 6.5 minutes: two ambiguous currency locators and one existing phone cross-tab resource race. Currency locators corrected; repeated focused verification is queued under the shared browser lock before a final full run.

- Final diagnosis: a 100-iteration three-writer loop failed 3/6 runs. A minimized 300-iteration two-tab loop failed both current and pre-inventory remote-main adapters (4/12 matched runs failed). After using committed IndexedDB snapshots, all 6 corrected runs passed while 3/6 unchanged-baseline runs still failed. This isolates the existing race to localStorage snapshot visibility rather than Inventory rules. Temporary baseline source and diagnostic files were removed.
- Final focused verification: shared-lock `playwright.ticket15.config.ts` on isolated port 4215, one worker, `--repeat-each=3 --timeout=180000`, covering `inventory.spec.ts`, `inventory-adapters.spec.ts`, `local-party-data.spec.ts`, and `limited-resources-adapters.spec.ts`: **78/78 passed**, exit 0, 2.5 minutes. Inventory covers equipment/magic editing, order/removal, reload, unchanged Armor Class, simultaneous denominations, stale correction/Retry, failure/Retry and invalid amount feedback on laptop/phone. Cross-feature writes include Overview, resources, Combat and Inventory for 100 iterations; the minimized local race uses 300 iterations.
- Additional final local snapshot regression: **12/12 passed**, exit 0, 19.7 seconds, three repetitions on laptop/phone, proving canonical reload despite a stale legacy mirror and successful save/realtime delivery despite mirror quota failure.
- Final build passes; calculation/domain suite **132/132 passed**, exit 0; rollback-only database suite **240/240 assertions across 9 files passed**, exit 0 (36 Inventory assertions). `git diff --check` passes.
- Coordinator explicitly requested no further standalone full-suite run after diagnosis: final combined full-suite verification will follow once across peer tickets. Status remains claimed pending PR review/integration and approved release. The isolated temporary browser config was removed. No PR merge, persistent schema apply, hosted migration or deployment was performed.

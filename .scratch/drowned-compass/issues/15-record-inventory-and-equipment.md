# 15 — Record inventory and equipment

**What to build:** A player can maintain a deliberately basic Inventory of equipment, currency, and notable magical items without introducing automatic encumbrance or equipment-rule calculations.

**Blocked by:** 04 — Edit and synchronize the Character Overview.

**Status:** claimed

- [ ] The Inventory area supports adding, editing, ordering, and removing equipment and notable magical items.
- [ ] Currency can be entered and corrected without automatic conversion or campaign-economy behaviour.
- [ ] Inventory entries remain player-authored and make no automatic Armor Class, attack, or carrying-capacity changes.
- [ ] Inventory changes save independently and synchronize across browsers.
- [ ] The basic Inventory remains usable on phone and laptop layouts.

## Comments

- Claimed in isolated `codex/ticket-15-inventory` worktree.

- Implemented independent item/denomination persistence, Inventory UI, conditional-write adapters and additive migration from remote main `8663b94` in the managed worktree.
- Milestone validation: `pnpm build` and `git diff --check` pass; `pnpm test:calculations` passes 132/132; rollback-only `pnpm test:db` passes 240 assertions across 9 files (36 inventory assertions). No persistent local or hosted migration was applied.
- Initial Inventory journey: 6/6 passed across laptop and phone. First full browser attempt was stopped (exit 130; 40 passed, 1 failed, 1 interrupted) after a source edit triggered Vite reload during verification. Subsequent full run: 131 passed, 3 failed, exit 1 in 6.5 minutes: two ambiguous currency locators and one existing phone cross-tab resource race. Currency locators corrected; repeated focused verification is queued under the shared browser lock before a final full run.

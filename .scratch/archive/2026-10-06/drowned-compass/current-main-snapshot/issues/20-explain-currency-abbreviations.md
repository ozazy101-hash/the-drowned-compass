# 20 — Explain Inventory currency abbreviations

**What to build:** Make Inventory coin denominations understandable without requiring players to know their abbreviations.

**Blocked by:** 15 — Record inventory and equipment.

**Status:** resolved

- [x] Inventory labels identify Copper pieces (CP), Silver pieces (SP), Electrum pieces (EP), Gold pieces (GP), and Platinum pieces (PP).
- [x] Each amount retains its existing independently saved denomination and validation. This change adds no currency conversion or new database fields.
- [x] Labels and help remain readable and accessible on laptop and phone; focused Inventory browser coverage is updated for the displayed and accessible labels.

## Comments

### 2026-10-03 — Player testing feedback

The player could not tell what EP and SP meant during the combined local preview. This is Inventory presentation copy within the existing module; no application code changed during this discussion.

### 2026-10-05 — Implementation and focused verification

Ready for PR review; merge and deployment remain pending. Inventory headings, input labels, and save buttons now spell out each denomination while retaining its abbreviation. The existing independent records, validation, persistence seam, and domain module are unchanged; no conversion or database fields were added.

- `pnpm build`: passed (TypeScript and production Vite build).
- `pnpm test:calculations tests/inventory.test.ts`: 1 passed (1.7s).
- `pnpm exec playwright test e2e/inventory.spec.ts --config=playwright.ticket20.config.ts`: 10 passed (22.1s), 5 laptop and 5 phone. Includes all five visible and accessible labels, focus, responsive bounds, independent saves/reload, validation, synchronization/conflict retry, and failed saves.
- `pnpm exec playwright test e2e/inventory-adapters.spec.ts --config=playwright.ticket20.config.ts`: 8 passed (35.8s), 4 laptop and 4 phone.
- The temporary browser config used this worktree's Vite server on `127.0.0.1:4320`, `--strictPort`, `reuseExistingServer: false`, and the matching base URL, preventing reuse of another ticket's server. The temporary config is removed before commit.
- Local database checks were not run because schema and persistence code are unchanged. Hosted migrations, merge, and deployment were not performed. The coordinator owns the full combined regression.

Module review: presentation copy remains in Inventory; App, PartyData, and the inventory domain interface require no change. The deletion test preserves existing depth: Inventory continues to own editing/save feedback while validation stays in its domain module.

Independent review: clear against the original spec and deep-module criteria. Reviewer inspected Desktop Chrome and Pixel 7 screenshots on a separate strict-port server (`4321`); all five labels, save buttons, and currency help were readable without clipping or horizontal overflow. No actionable findings.

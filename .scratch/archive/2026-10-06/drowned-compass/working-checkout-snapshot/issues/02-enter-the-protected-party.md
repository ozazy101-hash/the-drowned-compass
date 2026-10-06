# 02 — Enter the protected Party

**What to build:** A visitor can choose Player or Dungeon Master access, enter the corresponding shared password, and reach the protected Party Dashboard. Supabase authentication, membership, grants, and Row Level Security protect the Party while keeping the login experience intentionally simple.

**Blocked by:** 01 — View the Party Dashboard shell.

**Status:** resolved

- [x] Player and Dungeon Master role choices each authenticate with their configured shared identity and open the Party Dashboard.
- [x] Invalid credentials produce a clear error without revealing which credential failed.
- [x] Refreshing preserves the current browser session, and signing out affects only that browser.
- [x] Local Supabase security tests prove that Party members can read and update the Party while unauthenticated and non-member identities cannot access it.
- [x] Browser roles cannot create or delete Character Slots.

## Comments

- The production TypeScript/Vite build passes with the configured Supabase browser variables.
- The isolated in-memory Playwright suite passes all eight laptop and phone checks, covering both role choices, the non-revealing invalid-credential message, refresh persistence, and browser-local sign-out.
- Read-only hosted checks confirm that unauthenticated REST requests to `parties`, `character_slots`, and `party_members` are rejected with PostgreSQL error `42501`.
- The pgTAP suite covers Player and Dungeon Master reads and updates, non-member and unauthenticated denial, and the absence of Character Slot insert/delete grants. Update assertions were strengthened to prove that authorized updates affect rows rather than merely avoiding an error.
- After Docker Desktop was installed, the local Supabase migration applied cleanly and `pnpm test:db` passed all 21 pgTAP assertions (`Files=1, Tests=21, Result: PASS`).
- Live verification completed on 2026-09-22: both configured shared identities authenticated, displayed the same six Character Slots, preserved their sessions across refresh, and signed out successfully. Showing the same Party to both roles is intentional at this stage; the richer Dungeon Master overview belongs to Ticket 06. No passwords were recorded.

# 02 — Enter the protected Party

**What to build:** A visitor can choose Player or Dungeon Master access, enter the corresponding shared password, and reach the protected Party Dashboard. Supabase authentication, membership, grants, and Row Level Security protect the Party while keeping the login experience intentionally simple.

**Blocked by:** 01 — View the Party Dashboard shell.

**Status:** claimed

- [ ] Player and Dungeon Master role choices each authenticate with their configured shared identity and open the Party Dashboard.
- [ ] Invalid credentials produce a clear error without revealing which credential failed.
- [ ] Refreshing preserves the current browser session, and signing out affects only that browser.
- [ ] Local Supabase security tests prove that Party members can read and update the Party while unauthenticated and non-member identities cannot access it.
- [ ] Browser roles cannot create or delete Character Slots.

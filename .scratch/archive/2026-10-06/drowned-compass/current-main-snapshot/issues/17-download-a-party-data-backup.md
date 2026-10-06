# 17 — Download a Party Data Backup

**What to build:** After the core Party Companion is complete, the Dungeon Master can download a portable JSON backup of the information managed by the application without implying that campaign story or preparation is included.

**Blocked by:** 06 — Read the Party at a glance; 07 — Track Hit Points and survival; 08 — Track Conditions with Rules Tooltips; 09 — Manage attacks and actions; 10 — Track limited resources; 12 — Manage Character Spells and spell slots; 13 — Preview and resolve rests; 14 — Support multiclass Player Characters; 15 — Record inventory and equipment; 16 — Record features and story.

**Status:** resolved

**Delivery:** implementation and local acceptance complete; review-ready, pending separate human release approval.

- [x] Dungeon Master access offers a clearly labelled Party Data Backup download after core acceptance is complete.
- [x] The JSON contains Character Records, Character Spells, Session Trackers, and Party Companion settings with an explicit schema version.
- [x] The export excludes credentials, secret keys, authentication tokens, and unrelated Supabase data.
- [x] The interface explains that the file is not a backup of campaign story, world, sessions, or Dungeon Master preparation.
- [x] Player access cannot invoke the Dungeon Master backup action.

## Answer

DM access downloads a versioned, allowlisted JSON snapshot of saved Character Records, Character Spells, Session Trackers and the persisted party name setting. Character Story backstories and notes are included; campaign material, credentials, operational rest receipts and unsaved drafts are excluded. Backend-derived DM authority protects the action in both adapters, and stale responses after signout cannot initiate downloads.

Evidence, schema policy, validation and release order: [Ticket17 delivery ledger](../ticket-17-delivery.md). No hosted migration, merge or deployment was performed by this ticket.

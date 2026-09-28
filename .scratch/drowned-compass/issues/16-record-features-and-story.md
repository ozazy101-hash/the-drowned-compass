# 16 — Record features and story

**What to build:** A player can maintain the basic non-inventory remainder of the Character Record: class, species, background and feat summaries plus appearance, personality, backstory, allies, and notes.

**Blocked by:** 04 — Edit and synchronize the Character Overview.

**Status:** claimed

- [x] The Features area supports player-authored class, species, background, and feat summaries.
- [x] The Story area supports appearance, personality, backstory, allies, and general notes.
- [x] Long text remains readable and editable on phone and laptop layouts.
- [x] Feature and Story changes save independently and synchronize without replacing one another.
- [x] The prototype does not expose private or Dungeon Master-only notes.

## Comments

2026-09-29: Implemented and locally verified on `codex/ticket-16-features-story`; review PR [#7](https://github.com/ozazy101-hash/the-drowned-compass/pull/7). Features and Story use independently versioned records, explicit save/conflict/Retry feedback and draft preservation. The confirmed neighboring-save draft-loss race is fixed and covered by a repeatable browser regression.

Verification: production build and diff check pass; 40 selected laptop/phone browser tests pass, plus six repeated draft-race checks; 144 rollback-only database assertions pass, including 33 assertions rehearsing the actual new migration. Independent Standards and Spec review have no remaining findings. See `docs/implementation/features-and-story.md` for integration seams, commands and testing limits.

Status remains claimed pending accepted release. Hosted migration and frontend deployment need user approval; apply `20260928221600_record_features_and_story.sql` before deploying the frontend. No hosted database migration or data edit was performed.

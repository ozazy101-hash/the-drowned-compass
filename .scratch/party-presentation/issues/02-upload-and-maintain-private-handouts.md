# 02 — Upload and maintain private Handouts

**Status:** ready-for-agent

**Blocked by:** None

**Spec:** [Party content and presentation](../spec.md)

## What to build

Deliver the DM-only private Dungeon Master Library: upload images/PDFs, assign titles, browse thumbnails and reopen saved content after reload.

## Module and interface

A Handout module owns file validation, saved metadata, private visibility, access and upload failure recovery. Its small interface expresses upload/list/open operations rather than exposing bucket names, object keys or database rows. Supabase and local/in-memory adapters justify the persistence seam. Keep new content independent of Character Record reloads; choose concrete file limits and supported image MIME types during implementation and document them in the UI.

## Placement and reuse decision

Place the new content capability behind the existing data composition: createPartyData, createSupabasePartyData and createInMemoryPartyData. Reuse their authentication/session authority and the existing authenticated Supabase client within each app window; do not add an independent content login, duplicate client initialization or a second top-level environment/configuration factory. A focused capability exposed by PartyData/composition may have its own small interface, but callers receive that capability rather than a growing list of unrelated PartyData methods. Internal content adapter code may live in a dedicated file, following supabase-limited-resources.ts, without becoming another public facade.

Own content metadata, visibility and protected file references here so later Grid Maps use the same library lifecycle. File and map-specific implementations can remain internal; do not build a generic document framework in anticipation. Existing character-text.ts, inventory.ts and CharacterRecord are not hosts for campaign-level Handouts. Reuse local-party-store session authority and transaction patterns; content/blob storage stays separate from the serialized Party snapshot.

## Acceptance

- [ ] New uploads begin private; only the DM can upload/manage or enumerate private Handouts.
- [ ] Database and storage policies deny Player and anonymous access, including direct metadata/object requests.
- [ ] Successful upload is not shown as saved before usable content and metadata are committed; failed uploads/retries do not create misleading or duplicate library entries.
- [ ] Images and complete PDFs open correctly; validate type/size and show readable errors for unsupported or corrupt files.
- [ ] Titles, thumbnails, search and private/revealed filters are supported; private previews never become public thumbnail URLs.
- [ ] No player uploads, annotations, folders, AI generator or visual overhaul.

## Verification and architecture review

Verify accepted/error outcomes through the module interface in both adapters. Exercise real local database/storage authorization and failed uploads. Add focused DM laptop/phone upload/reload/PDF browser journeys and a Player direct-access denial. Build/type check. Do not substitute a mocked UI test for policy verification.

Complete the [shared depth/review gate](../spec.md#implementation-and-review-gate) before resolving this ticket. Record results and outstanding blockers under Comments.

## Comments

2026-10-06: Created from the completed grilling session; implementation has not started.

2026-10-06: Reviewed planned placement against existing modules; updated reuse guidance before implementation.

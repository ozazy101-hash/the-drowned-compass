# Private Map Artwork release runbook

Local acceptance does not authorize hosted changes, main merge, deployment or paid generation. Apply this runbook only after those separate decisions. Live generation stays disabled, quota0/spend0. Retained image fixtures prove workflow, not a fresh provider submission, semantic fidelity or universal cold CPU success.

## Hosting prerequisite

The accepted local server uses pinned Supabase Edge v1.74.3 main supervisor plus fresh oneshot PREPARE/FINALIZE workers,1900/2000ms CPU,256MiB per worker and150s wall. Ordinary hosted Edge Functions must demonstrate compatible user-worker creation, supervisor response transport/private nonce isolation, persistent private proofs, authenticated immutable storage, and deadline/cancel/recovery/attachment under this topology. Local Docker success is not that hosted proof. Keep provider disabled until hosted topology is measured and approved; no new host is provisioned here. The3071ms cold PREPARE failure remains real. Local JWT fixtures allow iat120s margin with absolute expiry unchanged; fresh hosted Auth login timing remains unverified. Physical projector square measurement remains manual.

## Dependency order and preservation

1. Freeze the exact reviewed source and verify source equality against the later evidence commit. Confirm backup/restore access and export hosted public/auth/storage schema, row counts and canonical SHA256 hashes for every existing table; separately inventory immutable storage object name/size/digest. Keep originals. Record currently presented/revealed maps and Handouts. Never reset the database.
2. Review pending migration history against the existing released migrations through `20261007130000_prepared_map_stages.sql`. Rehearse on an isolated restored database, including legacy revealed maps and an object referenced by both map and revealed Handout. Do not execute historical migrations twice.
3. Apply pending files in order: `20261009100000_private_map_artwork_versions.sql` (immutable versions, registration lineage/coherent snapshot); `20261009110000_dm_private_grid_maps.sql` (DM map privacy/old-command denial); `20261009120000_manual_map_reveal_masks.sql` (revision-checked masks); `20261009140000_private_map_generation.sql` (disabled job/proof ledger); `20261009150000_map_generation_nullable_parent.sql` (reference-only creation); `20261009160000_map_generation_recovery.sql` (known receipt recovery, deadline ceiling).
4. Inventory retained rows after each migration and compare canonical hashes for untouched fields/tables. Expected additive rows/columns and intentional privacy changes must be explained individually. Compare existing object digests byte-for-byte. Verify existing map IDs/documents/background dimensions/digests, Handout visibility/object identities and all Character fields are retained. Schema hashes necessarily change; data preservation is not proved by counts alone.

Concrete read-only inventories:

```sql
select version from supabase_migrations.schema_migrations order by version;
select id,party_id,title,visibility,version,document,background from public.party_grid_maps order by id;
select id,party_id,title,visibility,version,object_id from public.party_handouts order by id;
select bucket_id,name,metadata from storage.objects order by bucket_id,name;
select party_id,live_enabled,fixture_enabled,quota,spend_cents,concurrency,wait_seconds,retention_seconds from public.party_map_generation_settings;
```

Use `scripts/local-verification.mjs` snapshot algorithm as the canonical hash model: ordered JSON rows, SHA256 per table, aggregate data hash, normalized schema dump. Adapt the read-only transport to the approved hosted endpoint; the local script deliberately rejects hosted use. Do not print credentials or private prompt/object bytes into delivery logs.

## Authority and deployed smoke

Use separately authenticated DM, Player and anonymous clients and uniquely owned release smoke fixtures. First prove DM can open the exact map-version object, then prove Player/anonymous cannot list metadata, read workspace/jobs, open version/reference, retrieve that known object path or obtain a signed URL. Expired DM must be denied. Raw old `change_party_grid_map` reveal/withdraw RPC commands must fail and leave rows unchanged. A revealed Handout sharing the same object must remain readable through its legitimate grant; withdrawing it must remove that grant. Previously copied map bytes cannot be revoked.

After separately authorized frontend/function deployment, test laptop and touch phone: Invent/sketch/upload/variants/area branch with1024-square lossless outside RGBA; explicit selection/full-hidden first presentation; mask save/reload/conflict; aligned/incompatible stages; popup close/reopen; session loss and stale pending render; PDF reveal/player independent pages/replace/withdraw; Character editing during generation and content operations. Inspect display DOM/network: only flattened visible frames, no complete map/source URL/prompt/reference. Confirm rate limits and unknown-result reconciliation do not issue a second known submission. Record physical calibration measurement separately. No paid call on page load; initial enabled/fixture-enabled flags false and quota/spend zero must be checked server-side.

## Rollback limits

Stop new work/disable generation first and preserve active jobs/receipts/reservations/artwork/proofs. If the new frontend fails, serve a maintenance view or previous compatible private-map client; reverting to the former map-sharing frontend is unsafe and its reveal/withdraw calls remain denied. Do not roll back privacy policies to grant player map access. New immutable versions/jobs/masks and changed authorization semantics mean dropping tables/down migrations loses accepted work. Restore from the verified backup only under explicit authorization and a reviewed data-reconciliation plan; retain subsequent rows/objects separately. Cancelling a submitted provider job does not promise billing reversal, and unknown receipts do not release reservations automatically. Record hosted migration, deployment, smoke and projector outcomes separately from local acceptance.

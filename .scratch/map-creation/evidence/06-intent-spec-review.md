# Ticket06 original-intent projection — independent Spec/security review

Frozen source: `97f2ea1e25e60c5e2506932e63f9fe010ab82db1`.
Exact base: `7bdcdd54741d9c52d664b9b278562508dea8a651`.
Verdict: **PASS**. No actionable Spec/security findings in this narrow reopening. Previous06 review documents remain unchanged.

## Scope and result

Authorized semantic generation outcomes now return the selected job's persisted originalIntent. This supports retry of jobB independently of mutable current draftA and restores failed/cancelled job intent after reload. The change touches only server application, application tests and optional domain outcome typing; the SQL ledger/projection and durable scheduling state remain unchanged. SQL workspace projection may omit originalIntent, so its optional type is appropriate and callers fetch the selected authorized job rather than fabricating an original brief from current draft.

The projection constructs a new10-field whitelist, with explicit grid/region nested whitelists. It validates request identity against job identity, recognized source/kind, bounds, terrain/edge enums and duplicate coordinates. Unknown top-level/nested persisted fields are dropped; malformed identity, region/source/grid data returns bounded semantic failure with no job. Strings such as title/instructions are intentionally the DM's original brief. No privileged ledger spread, immutable object metadata/path/digest, proof, provider credentials or server key is projected.

Authorization precedes projection: submit invokes the authoritative reservation, reads/cancel/output invoke owned(job), and owned REST read resolves current DM membership before filtering job by exact request and party. Caller-provided intent on a read is ignored; snapshots use the persisted row. SQL atomic attachment, cancellation/deadline guards, live-disabled defaults, immutable verification and display behavior are unchanged.

## Independent checks

- `node --test supabase/functions/map-generation/application.test.mjs`: **22passed,0failed,0skipped**. Successful/failed/cancelled reloads, selectedB versusA, uncertain same-request no-resubmission, access denial, nested whitelist isolation and malformed identity/source/grid are covered.
- Ran additional independent in-process checks using the production authenticatedUser, supabaseGenerationStore and generationApplication.handle/execute with mockHTTP. The auth endpoint precedes membership lookup; Player/anonymous membership denial stops before ledger query; another-party DM receives no job because the owned adapter filters by party. Authorized DM receives the original stored brief despite forged caller intent. Deliberately injected ledger proof/object/key markers and nested unknown fields never appear in results.
- Independently exercised malformed persisted requestId, null terrain entry and invalid source with that actual owned REST adapter: each returned ok:false, no job, no sensitive marker. No external provider/storage/verifier operation was invoked.
- Reviewed exactly3changed files against the exact base; noSQL migrations/projection grants or workshop/display files changed. SourceHEAD verified as the frozen SHA.

## Limits

The adapter checks use explicitly mockedHTTP, not live authority/provider evidence. NoSQL/browser/storage leases acquired or mutated; no credentials, new provider calls, paid spend, hosted changes, migration application, source edits, commits or agents. WriterbuildPASS is supplied evidence, not an independently rerun build. Distinct Standards/depth review and07 actual retry/browser journey remain separate.

# Map artwork implementation batch ledger

Coordinator initialized: 2026-10-09 (Europe/London)
Planning/source base: `0b596249f1598da1df102046c9e7823e66067983`
Integration checkout: `/Users/oscarpauwels/.codex/worktrees/map-artwork-integration/Dungeons&Dragons`
Status: waiting for complete roster; no ticket released.

## Authorization and acceptance

Implementation, isolated integration and local verification authorized. Hosted migrations, main merge and deployment require later authorization. Primary/planning checkouts and existing previews remain preserved. Every ticket has a root coordinating an implementation subagent and a distinct independent review subagent. Acceptance requires committed implementation, frozen source SHA, passing Standards/depth and Spec reviews, relevant exact-head verification, and honest remaining limitations. ready-for-agent is not dependency acceptance.

## Ticket roster and dependency gate

|Ticket|Task ID|State|Dependencies|Released base|Frozen source/evidence|Review/verification|
|---|---|---|---|---|---|---|
|03|01a11fdf-620c-7632-8079-294535be5eb8|waiting-roster (ready)|none|—|—|—|
|04|01a11fdf-769d-7270-a3fd-1f2999a4567f|waiting-roster (ready)|none|—|—|—|
|05|pending|waiting-roster|04|—|—|—|
|06|pending|waiting-roster|03,04|—|—|—|
|07|pending|waiting-roster|04,06|—|—|—|
|08|pending|waiting-roster|07|—|—|—|
|09|pending|waiting-roster|04|—|—|—|
|10|pending|waiting-roster|05,07,09|—|—|—|
|11|pending|waiting-roster|08,10|—|—|—|
|12|pending|waiting-roster|03–11|—|—|—|

## Module and interface handoffs

- 03: internal injected provider port, normalized output/runtime/limits and real feasibility evidence; probe does not become a second production application.
- 04: Grid Map domain + PartyContent authoritative workspace read/observe, immutable versions, digest separate from trusted registration/canonical dimensions, atomic accepted presentation snapshot and revision.
- 05: map backend/storage privacy and retired player/legacy sharing; preserve Handout access and mixed-object references.
- 06: sole server generation application owns jobs/usage/reconciliation/cancellation/compositing/atomic attachment; PartyContent transports semantic outcomes.
- 07: workshop inputs/private inspection/selection intent and shared scene drawing; Use this map may remain unwired until10.
- 08: fixed-extent rectangle revisions through06; lossless authoritative output and verified registration inheritance.
- 09: mask domain stroke/history and expected-revision persistence against validated geometry key.
- 10: Party Display consumes coherent authorized snapshot; session epochs, local calibration and flattened masked frames only.
- 11: single domain compatibility predicate; atomic mask retention and local pan/calibration retention.
- 12: combined gate, independent final reviews, integrated preview and release runbook.

## Shared-file ownership and verification leases

No leases issued before roster. 03 initially owns its probe/report/evidence files only;04 owns PartyContent/Grid Map domain/persistence foundation. Shared PartyContent/GridMap/PartyDisplay edits require named exclusive owner and coordinator handoff. Browser automation, local SQL fixture mutations and paid live-provider corpus each require exclusive leases; pure isolated build/domain checks may run concurrently. Never reset database or remove another task fixture. Record baseline, own fixture IDs, cleanup and exact test source.

## Integration and evidence journal

- 2026-10-09: Read repository instructions, accepted spec, architecture review, tickets03–12, CONTEXT, ADR0003/0004/0005, codebase-design skill and DEEPENING. Created managed integration checkout from pinned planning base. Await complete roster before03/04 release.

- 2026-10-09: Ticket03 readiness received; pinned base/instructions confirmed. Readiness acknowledged with explicit continued hold pending complete roster. No implementation/verification lease issued.

- 2026-10-09: Ticket04 readiness received; pinned clean base and instructions confirmed. Continued hold acknowledged pending full roster. No leases issued.

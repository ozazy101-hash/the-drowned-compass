# Ticket11 independent Standards/depth re-review

Frozen source: `82e1164f24099908a09be4e68a23cd87e271a38b`.
Accepted comparison base: `288e653c055f6d08e0e02bacea1047ed6ef65575`.
Previous reviewed source: `7d747d376c95eca5f6c9f0db90c7b36763bd9c08`.
Distinct Standards/depth reviewer; source read-only, no fixture/browser/build lease used.

Verdict: **Standards/depth FAIL** for the newly exposed invariant bypass below.

## Fixed previous path

Ordinary Clear now retains pending acknowledgement and its registrationReference. Re-presenting the same pending stage keeps registrationChanged true; reset still cannot remove it. Auth invalidation and disposal deliberately discard the guard. The added browser regression uses actual Clear/Use controls and asserts uncover remains disabled; this addresses the originally reported normal UI path.

## Actionable finding

[P2] Keep acknowledgement-discard control internal — `src/features/presentation/party-display.ts:34` and returned interface at267. The implementation adds preserveAcknowledgement to clear() but returns that same function directly as public clear. Consequently the PartyDisplay interface now exposes clear(undefined,false), which discards both pending flag and registrationReference; re-presenting the same version then allows reveal/save without measured-square confirmation. The module's hidden lifecycle invariant has become an undocumented caller policy knob. Keep the optional force-discard argument for authorized()/dispose() inside the implementation, but export a focused wrapper with the prior public message-only clear contract. No new public lifecycle bypass is needed for this fix. Verify the public interface preserves acknowledgement and internal session termination still blanks/disposes correctly.

## Otherwise retained assessment

Module placement, existing matchingMapGeometry reuse plus family condition, atomic PartyContent/domain selection and mask retention, shared flattened rendering, private workshop inspection identities and controller-owned reveal acknowledgement otherwise satisfy Standards/depth. No App.tsx/PartyData scattering, extra stage manager, schema, pipeline, renderer or snapshot assembler. Deletion test remains satisfied by existing Party Display's coordination/local lifecycle behavior. Tests cross public commands/results and real controls rather than spying on helpers. Local privileged image fixtures and bounded JWT allowance are explicitly labelled; neither is represented as live provider execution or fresh Auth login.

## Verification limits

Confirmed HEAD and source equality to the corrected frozen SHA. Writer exact-head tests were running; no test pass count is asserted here and no competing fixture/build/browser operation was started. Physical projector measurement remains manual. Report-only mutation; no source edits.

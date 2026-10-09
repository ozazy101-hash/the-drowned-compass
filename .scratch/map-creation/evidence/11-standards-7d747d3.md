# Ticket11 independent Standards/depth review

Frozen source: `7d747d376c95eca5f6c9f0db90c7b36763bd9c08`.
Comparison base: `288e653c055f6d08e0e02bacea1047ed6ef65575`.
Reviewer: distinct Standards/depth subagent; source inspection only, no fixture/browser lease acquired.

Verdict: **Standards/depth FAIL** pending the calibration lifecycle finding below.

## Actionable finding

[P2] Preserve pending calibration acknowledgement across Clear and re-presentation — `src/features/presentation/party-display.ts:183`, with the reset in existing `clear()` at lines33–35 and acceptance at179–188. An incompatible accepted selection sets `registrationChanged=true`, blocking reveal/save until measured-square confirmation. Calling public `clear()` discards both registrationReference and that pending flag. Presenting the same incompatible selected version again then enters accept() without a registrationReference, so acknowledgement is absent and reveal commands can save without confirmation. This contradicts the recorded module contract that the display owns the acknowledgement invariant. Keep pending acknowledgement alive through the appropriate session-local lifecycle or otherwise enforce it when the same pending stage is re-presented; verify through public commands and actual UI. The distinct Spec reviewer first reported this case; Standards independently confirms the concrete source path.

## Placement and depth

The implementation otherwise follows the accepted module placements: no App.tsx/PartyData business-logic expansion, new facade, stage manager, generation pipeline, schema change or snapshot assembler. Party Display retains the existing presentMap/reveal/calibration interface, consumes one accepted snapshot and delegates geometry to matchingMapGeometry. Family identity remains an additional necessary condition. Atomic mask retention remains at PartyContent/domain persistence; changed digests do not redefine registration. Workshop adds inspection/parent/displayed identities as presentation only. MapRevealControls and DisplayControls reflect the display-owned state instead of owning the transition.

The deletion test passes for the chosen existing module: deleting Party Display would spread authorization, accepted-frame coordination, calibration and reveal acknowledgement across views. No redundant seam is introduced. Domain tests exercise chooseMapPresentation outcomes, rather than private helper spies; browser tests exercise real controls/controller commands and flattened canvas pixels. The privileged stage attachment fixture is explicitly labelled and never claimed as proof of generation or provider preservation. Bounded local JWT iat allowance is labelled and preserves absolute expiry.

## Verification limits

Confirmed no source diff from frozen head while reviewing. Inspected writer build output (success) and browser log (in progress at inspection; laptop pass shown); these are writer evidence, not independently rerun checks. Avoided build and browser/SQL races while writer held the lease. Physical projector measurement, actual generation/provider verification and fresh Auth login remain outside this review's claims. No source edits made; review report only.

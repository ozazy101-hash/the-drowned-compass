# Ticket11 independent Spec review — PASS

Exact reviewed source: `c83f29a3098e24c329da73302ea03ccc708e1b05`.
Accepted dependency base: `288e653c055f6d08e0e02bacea1047ed6ef65575`.
Reviewer is distinct from implementation writer and independent Standards/depth reviewer. Reviewed full base-to-source diff and final corrective commits against AGENTS/instruction documents, CONTEXT, ADR0004/0005, tracker README, accepted spec/architecture review, tickets04/08/09/10/11, accepted08/10 evidence contracts and11 module contract. No unresolved actionable Spec findings.

## Acceptance

- Same-family compatibility retains the single trusted `matchingMapGeometry` predicate. Grid dimensions/distances, image pixel dimensions, placement and registration are checked independently of content digest. Whole generation receives fresh registration through existing authoritative attachment; constrained accepted revision inherits trusted registration without a new stage capability or generation pipeline.
- Compatible stages preserve accepted Reveal Mask, calibrated square pixels, pan and saved background placement without fitting. Real popup assertions establish73-pixel squares,50/50 pan,292px displayed width and unchanged mask. Changed-region pixels remain hidden during the aligned switch.
- Incompatible selection is rejected atomically with the current presentation/frame intact. The mismatch feedback names family/grid/artwork registration and offers explicit new-map setup. Confirmed setup starts hidden, resets position, and requires measured-square acknowledgement. Uncover command, save, UI actions, undo/redo and ordinary-reset paths cannot bypass pending acknowledgement.
- Ordinary Clear preserves pending acknowledgement/reference; compatible reselection and reopen do not clear it. Explicit calibration confirmation clears it, while auth loss/disposal discard session-local state. Public clear retains its existing small interface and does not expose the internal discard option.
- Authoritative observed incompatible presentation and later nonempty-mask updates remain opaque while local acknowledgement is pending. The renderer derives an all-hidden output using the existing rasterizer, retaining the accepted authority snapshot unchanged. Publication checks snapshot revision, session/render epochs and captured acknowledgement state, so an async render cannot publish through a changed acknowledgement state. A genuine second PartyContent adapter chooses a different family and accepts16 uncovered cells: the local popup remains black until explicit Confirm.
- Private inspection, saved parent and accepted displayed identities are distinct and visible. Older retained parent branching is available through existing commands and does not implicitly present. No outpainting, new compatibility seam, snapshot assembler, compositor or player map sharing is added. Accepted08 fixed-canvas lossless lineage remains authoritative.
- Existing popup/calibration/session semantics are reused. Reopen checks authority and restores masked output; Clear blanks it; membership revocation blanks output. Source contains no new display endpoints or original-image/prompt/control transfer to the popup.

## Evidence checked

Final exact-source build PASS, `11-build-c83f29a.txt` (existing Vite warnings retained).
Final focused domain27/27 PASS, `11-domain-c83f29a.txt`; independent reviewer rerun27/27 PASS via `playwright.calculations.config.ts`, output `/private/tmp/ticket11-spec-domain-c83f29a`.
Actual laptop/phone two-window stage journeys2/2 PASS in49.8s, `11-browser-c83f29a.txt`. Browser source exercises actual Workshop/DisplayControls/PartyDisplay with genuine local SQL/storage authority, pointer/touch uncover, branch/inspect/explicit switches, hidden pixels and transforms, incompatible cancellation/setup, Clear-before-confirm/reset/direct-command guards, second-adapter observations, reopen, and membership revocation. Original known owned objects are first proven readable by DM; player/expired-DM/anonymous metadata and known-object-path access are denied.
Decoded fixture comparison covers786,432 outside pixels with zero mismatches. Fixtures explicitly model the accepted04/08 registration attachment contract through privileged setup; they are not generation/verifier/provider evidence. Final cleanup reports2 owned parties,4 users,6 objects removed; independently read before/final baseline JSON equality is true. Working tracked source equality to frozen source was verified.

## Corrected findings and limits

Historical FAIL report `11-spec-7d747d3.md` preserves Clear/reselection acknowledgement bypass and later observed-mask rendering finding. Final source resolves both and adds focused regressions. No remaining Spec finding.

Live provider stays disabled/quota0/spend0; this review makes no paid-provider capability claim. Local fixture JWT iat uses a labelled120-second margin preserving absolute expiry and explicit expired-DM/player/anonymous denial; it is not fresh Supabase Auth login proof or a universal clock fix. Fixture generation endpoint503 and denial diagnostics are retained honestly. Physical projector measurement remains manual. No schema/hosted migration, main merge or deployment is performed or authorized here. Existing10 lifecycle regression is running separately at this unchanged source; coordinator closure must record its result, source/evidence equality and final lease release. Ticket12 owns combined integration and release evidence.

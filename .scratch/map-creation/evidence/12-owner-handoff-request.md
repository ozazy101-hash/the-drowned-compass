# Narrow accepted-module owner handoff request

Frozen integration source222e42f0a9cb701ddb90bb22bb726d046d8e84da; production Party Display byte-equal to accepted80bae39. Combinedcase34 reached successful genuine CharacterCAS edits/conflict while retained-artwork submit response remained outstanding, private PDF reveal/playerread, display page2, PNG replacement and successful Player PNGread. It failed line65 waiting for `Party Display page1` aria-label after replacement (5s). No pixel/state failure has been established.

Source: `src/features/presentation/party-display.ts` lines49–51 capture `page=state.page` and setcanvasaria-label before rendering; image branch line66 emits canonical state `{pages:1,page:1}` but label remains oldpage2. PDFclamping has analogous stale label potential if shorterPDFreplacespage2. This predates map integration. Existing lifecycle tests check visiblecanvas plus page1of1state, and do not catch label mismatch.

Proposed minimal accepted-module correction: assign canvas aria-label from canonical accepted render page after PDFclamp/PNGpage1, within existing epoch/render guards before bodyreplaceChildren. No lifecycle/auth/popup/calibration/geometry/job changes. Need owner handoff before implementation; none performed. Independent reviewers should assess whether this existingP3 accessibility defect is an actionable release gate or separately tracked follow-up.

Approved test correction: new cross-feature test should assert accepteddisplaystate `{page:1,pages:1}`, visiblecanvas and actual replacementPNGpixels; retain same genuine sharing/Character/generation outcomes. This does not establish aria-label correctness and delivery must disclose the label defect unless corrected through reviewed owner handoff.

# Ticket06 nullable-parent correction — independent Spec/security review

Frozen correction source: `826e32102eee1c1b1f12e260ace1ee8340cd20f3`.
Evidence/dependency base: `32faf3b1e03a709aa79a82a1f3bc1d6b05829c07`.
Prior accepted source: `52b7c3f6d5023fa01af3e2283fd2213453c0a1db`.
Verdict: **PASS**. No actionable findings in this narrow correction. Prior06 review history remains in06-spec-review.md and was not overwritten.

## Scope and reasoning

The additive150000 migration normalizes the owned JSON-null parentBackground binding back to SQLNULL for comparison with the retained SQLNULL background. An unchanged reference-only saved parent can therefore pass completion and completed receipt recovery. A real nonnull background against the captured null binding still satisfies IS DISTINCT FROM and is rejected; captured nonnull backgrounds remain unchanged by nullif, so ordinary equality/change detection is preserved. The missing-parent and parent-document checks are unchanged.

Independently extracted complete_map_generation from the accepted140000 migration and compared it with the new replacement. Exact text equality holds after only two expected substitutions: CREATE FUNCTION→CREATE OR REPLACE FUNCTION and the parentBackground comparator→nullif comparator. No other proof/object/digest/receipt/current revision/membership/deadline/cancellation/geometry checks, locks or04 attachment arguments changed. The accepted prior migration is unchanged. CREATE OR REPLACE retains the existing function identity/privileges; there is no new client authority grant. The security-definer and empty search_path declarations remain identical.

## Checks and evidence assessment

- Independently verified the frozen diff against the exact base contains only the additive migration and focused rollback SQL test.
- Reviewed the10-test SQL fixture: genuine04 DM attachment with reference-only parent; production generation reservation capturing JSONnull; actual parent-background mutation rejected with no extra version; restored SQLNULL completes exactly once, retains parent/reference and recovers original receipt; no presentation selected.
- Independently parsed writer SQL transcript:10/10TAP checks, no not-ok lines, finalROLLBACK. Parsed old-function reproduction:6/6TAP checks, finalROLLBACK, demonstrating the original unchanged-NULL rejection. These are reviewed writer executions, not independent SQL reruns.
- Independently compared recorded before/after JSON snapshots for exact equality, supporting the rollback/schema-and-data-preservation evidence. Additive migration remains unapplied persistently per delivery record; this review does not authorize application or hosted release.
- FrozenHEAD verified as826e32102eee1c1b1f12e260ace1ee8340cd20f3.

## Limits

NoSQL/browser/storage fixture mutation, database reset, persistent migration application, source edits, commits, agents, provider credential use or paid/live calls. No browser/runtime or raster verification execution is claimed by this SQL-only correction. Genuine07 phone discovery and later integrated journey verification remain coordinator evidence. Distinct Standards/depth review is separate.

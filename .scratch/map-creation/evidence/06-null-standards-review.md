# Ticket06 nullable-parent independent Standards/depth review

Verdict: **PASS**. No actionable Standards/depth findings.

Frozen source: `826e32102eee1c1b1f12e260ace1ee8340cd20f3`.
Exact evidence/source base: `32faf3b1e03a709aa79a82a1f3bc1d6b05829c07`.

Reviewed the exact two-file delta in the retained Ticket06 worktree against the repository module-design, domain and ticket-delivery instructions and earlier recorded deep-module reviews. Previous review files are preserved. This is a narrow additive correction, not a changed public generation interface or new ledger.

The accepted140000 migration remains byte-identical. The150000 migration replaces the same owned atomic attachment function with one comparison correction: normalize JSON null in retained parentBackground to SQL NULL before IS DISTINCT FROM. SQL NULL now equals the serialized absent artwork of a genuine reference-only parent. Non-null JSON backgrounds remain structurally compared, and an actual changed background is still rejected. Parent identity/document, party authority, proof/object/digest bindings, original provider-receipt deadline, revision/receipt checks, locks and no-implicit-presentation behavior remain unchanged. CREATE OR REPLACE preserves the existing function identity and privileges. No browser/client adaptation or ordering burden is introduced; normalization remains local to the SQL mapping that created this representation mismatch.

Independent non-mutating checks:

- Frozen HEAD equals the source SHA and migration/test working-tree source matches it: **PASS**.
- Exact base-to-source diff whitespace check: **PASS**.
- Programmatic git-show comparison confirms prior140000 migration is byte-identical and replacement function differs only in CREATE OR REPLACE plus the parentBackground nullif normalization: **PASS**.
- Inspected focused rollback test plan and all10 assertions: genuine04 reference-only parent attachment, retained SQL NULL/JSON-null binding, real changed-parent rejection, preservation after rejection, successful completion, one appended version, parent preservation, same-receipt recovery and no presentation selection. These exercise observable attachment outcomes rather than helper spies.

Coordinator reports original-function reproduction6/6 and corrected focused rollback10/10, exact schema/data baseline restoration, and no persistent migration application. These counts are coordinator evidence, not independently executed SQL by this reviewer. No SQL mutation, provider call, browser lease, source edit or fixture action was performed. TypeScript/build repetition is unnecessary for this SQL-only correction. A distinct Spec reviewer supplies its separate verdict; hosted migration/deployment remains a later authorization gate.

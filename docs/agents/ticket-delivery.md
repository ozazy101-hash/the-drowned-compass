# Ticket delivery

Use this workflow when several Drowned Compass tickets are in progress or a change needs browser, database, integration, or release verification. The ticket files remain the source of truth for scope and dependencies; the repository scripts and test configuration remain the source of truth for commands.

## Coordinate a batch

When the user wants tickets worked in parallel, keep one coordinator chat for dependencies, PRs, test evidence, integrated verification, and release status. Keep each ticket's implementation in its own chat and branch. The coordinator records what is ready, blocked, merged, and deployed, and avoids sending multiple tickets through the same full browser regression. A coordinator chat tracks work; it does not replace the ticket files or authorize a merge or deployment.

Before dispatching a new batch, reconcile merged tickets' tracker statuses and ensure new ticket files are committed to the shared branch. Check blockers against implemented and merged work, rather than treating a stale `claimed` label as proof that a dependency remains unfinished.

## Verify at the right scope

For each ticket, run the relevant build, calculation, and database checks, plus focused automated browser checks of its changed flow at laptop and phone sizes. Record exact pass counts or blockers for each category. A human UI preview is useful for product feedback, but routine ticket progress should not wait on a separate manual browser session when automated checks can verify the behavior.

After related PRs are reviewable, combine their heads in an isolated local integration worktree. Resolve integration conflicts there and run one full browser and data regression against the combined result. Give the user a single integrated preview for exploratory testing before merging when they want to test the UI. Repeat the combined pass only after a material code change or a failed check requires it.

Track calculation, database, focused browser, combined regression, hosted migration, merge, and deployed-site smoke checks as separate results. A passing local test is not evidence that a hosted migration or deployment succeeded. Verify hosted schema changes in dependency order and check the deployed site after the release.

For module boundaries and the deep-module review, follow `docs/agents/module-design.md` during each ticket's implementation and review.

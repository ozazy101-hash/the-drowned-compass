# Ticket 21 — released

User reviewed the production preview and explicitly approved deployment on 2026-10-05. PR #23 merged with expected head `c3c2089e25b67126cca13e7ff57961b6815b8eb0` into main at `e3dfe433f0a07a6a609d3206ba8e64bb99a20935`. Fetched main has exactly the reviewed head’s tree (`git diff --exit-code`, exit 0).

GitHub Pages deployment [37381625348](https://github.com/ozazy101-hash/the-drowned-compass/actions/runs/37381625348) completed successfully for that merge SHA. No database migrations were needed or applied.

Authenticated read-only live smoke passed: Combat Catalog opens with 79 entries (38 weapons, 41 selected class abilities); Sneak Attack search, modifier label, rules summary, and source-page link work; Dagger search, base dice, melee/thrown range, properties, mastery, source links, and template action render. No live templates were saved and no hosted Character data changed during this smoke. Existing local acceptance remains 193 domain/calculation, 28 focused browser, and 4 final production smoke cases passing, with production build/type check passing. Ticket 21 is resolved by accepted release; its main ticket file’s claimed status is the historical pre-release snapshot.

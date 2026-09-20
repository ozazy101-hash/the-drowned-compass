# 01 — View the Party Dashboard shell

**What to build:** A deployable walking skeleton of The Drowned Compass that presents the Party Companion's dark supernatural-pirate shell and six unclaimed Character Slots through the Party data seam. This slice establishes the React, TypeScript, Vite, browser-test, in-memory adapter, and GitHub Pages build path by making one real user-visible journey work.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Opening the application shows The Drowned Compass title, a restrained compass placeholder, and exactly six unclaimed Character Slots.
- [x] The shell is operable and legible at representative phone and laptop widths.
- [x] A browser-level test verifies the six-slot journey through the in-memory Party data adapter.
- [x] The production build succeeds with a GitHub Pages project-site base path.

## Comments

- Implemented on `codex/ticket-01-dashboard-shell` through the injected in-memory Party data adapter.
- Verified with Playwright in laptop and phone Chrome profiles and with the production TypeScript/Vite build.
- Two-axis review completed: spec passed; domain-language findings from the standards review were corrected before resolution.

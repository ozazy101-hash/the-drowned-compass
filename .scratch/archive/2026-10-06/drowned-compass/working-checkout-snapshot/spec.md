# The Drowned Compass Party Companion

**Status:** ready-for-agent

## Problem Statement

A six-character Dungeons & Dragons group needs a shared, attractive place to maintain Player Character information during play. Paper and PDF Character Records contain useful detail but are slow to scan on phones, difficult for the Dungeon Master to compare, and unable to synchronize health, Conditions, spell slots, and other Session Trackers across devices. Existing full rules platforms are broader than the group's immediate need, while a static mock-up would not provide trustworthy shared editing.

The group needs a focused Party Companion: a Party Dashboard for at-a-glance decisions, deep Character Pages for play and reference, simple shared access during the prototype, and a safe path toward individual accounts and richer rules assistance later. The product must support the 2024 rules without quietly becoming a complete character-building or rules engine.

## Solution

Build The Drowned Compass as a responsive React, TypeScript, and Vite application hosted on GitHub Pages. Supabase provides authentication, shared PostgreSQL data, Row Level Security, and realtime updates. The prototype exposes a shared Player password and a separate Dungeon Master password, both with full editing access to the same six Character Slots.

Every login opens a dark supernatural-pirate Party Dashboard. A player can softly claim an empty slot through a short setup flow, then complete a Character Record through Overview, Combat, Magic, Inventory, Features, and Story areas. The application derives only dependable calculations, provides explicit manual overrides, and keeps players in control of values that require wider rule interpretation.

Session play is supported through hit-point actions, optional Temporary Hit Points, Conditions, death saves, Heroic Inspiration, limited resources, spell slots, and previewable rest actions. Magic uses a bundled, validated SRD 5.2.1 Spell Catalog with Custom Spells for missing content. SRD spells and Conditions expose accessible Rules Tooltips on hover, keyboard focus, and tap.

## User Stories

1. As a visitor, I want to see The Drowned Compass login screen, so that I understand which Party Companion I am entering.
2. As a visitor, I want to choose Player or Dungeon Master access, so that I can enter through the appropriate role.
3. As a player, I want to enter one shared Player password, so that I can use the prototype without creating an individual account.
4. As the Dungeon Master, I want a separate password, so that the product can distinguish my role from Player access.
5. As an authenticated user, I want my browser session to remain signed in, so that I do not repeatedly enter the password during play.
6. As an authenticated user, I want sign-out to affect only my current browser, so that I do not disconnect other people sharing the same role identity.
7. As a visitor with an invalid password, I want a clear, non-revealing error, so that I can retry without learning internal account details.
8. As an outsider, I want Party data to remain inaccessible, so that the public login page does not expose Character Records.
9. As an authenticated user, I want every login to open the Party Dashboard, so that I can deliberately select the character I need.
10. As the Dungeon Master, I want to see all six Character Slots together, so that I can assess the Party at a glance.
11. As a player, I want to see which Character Slots are claimed or unclaimed, so that I can select the correct one.
12. As the Dungeon Master, I want each claimed card to show character and player identity, so that I can connect characters to people.
13. As the Dungeon Master, I want each card to show class, subclass, total level, and multiclass summary, so that I can understand Party composition.
14. As the Dungeon Master, I want each card to show current, maximum, and optional Temporary Hit Points, so that I can assess health.
15. As the Dungeon Master, I want each card to show Armor Class, so that I can resolve attacks quickly.
16. As the Dungeon Master, I want active Conditions, concentration, and downed state to be prominent, so that temporary effects are not forgotten.
17. As the Dungeon Master, I want compact Ability modifiers, Passive Perception, spell save DC, a primary attack, Heroic Inspiration, and one important resource, so that commonly requested values are available without opening a Character Page.
18. As a phone user, I want dashboard cards to prioritize identity, health, Armor Class, and Conditions, so that the most important information remains readable on a narrow screen.
19. As an authenticated user, I want to select any claimed card, so that I can open and edit its Character Page.
20. As a player, I want to select an unclaimed Character Slot, so that I can begin entering my character.
21. As a player, I want soft claiming to require only player name, character name, primary class, subclass, species, background, and level, so that setup remains short.
22. As a player, I want to enter the six Ability Scores during setup, so that dependable Derived Values are available immediately.
23. As a player, I want setup to open the Character Page as soon as those two steps are complete, so that everything else can be entered gradually.
24. As a party member, I want a claim to identify responsibility without locking edits, so that the shared-password prototype remains flexible.
25. As a party member, I want the six Character Slots to be pre-created, so that no browser user can accidentally create or delete Party membership.
26. As a player, I want a generic compass or silhouette placeholder when no artwork exists, so that an incomplete character still looks intentional.
27. As a player, I want an Overview area for identity, health, defenses, Ability Scores, saves, skills, and Conditions, so that my most-used Character Record information is together.
28. As a player, I want to enter Ability Scores and see their modifiers, so that I do not calculate them repeatedly.
29. As a player, I want proficiency bonus to derive from total character level, so that it updates consistently.
30. As a player, I want to mark saves and skills as proficient or expert, so that their Derived Values are calculated correctly.
31. As a player, I want Passive Perception to derive from my Perception modifier, so that the Dungeon Master can use it confidently.
32. As a player, I want initiative to derive from Dexterity, so that the common case requires no duplicate entry.
33. As a spellcaster, I want spell attack modifier and spell save DC to derive from my chosen spellcasting Ability and proficiency bonus, so that they remain consistent.
34. As a player, I want to override any Derived Value explicitly, so that unusual features and table rulings are supported.
35. As a player, I want an overridden value to be visually distinguishable, so that I know it is no longer following the calculation.
36. As a player, I want to reset an override to the calculated value, so that I can return to normal behaviour easily.
37. As a player, I want Armor Class, maximum Hit Points, speed, attacks, damage, equipment, and feature text to remain player-entered, so that the prototype does not pretend to understand every rule interaction.
38. As a multiclass player, I want to add multiple class-and-level entries, so that total level and Party summaries represent my character.
39. As a new player, I want initial setup to request only one primary class, so that multiclass support does not lengthen onboarding.
40. As a player, I want a Combat area for attacks, actions, death saves, Heroic Inspiration, and limited-use resources, so that active play information is easy to reach.
41. As a player, I want to apply a numeric amount of damage, so that the application can update health predictably.
42. As a player, I want damage to consume Temporary Hit Points before current Hit Points, so that the official buffer rule is represented.
43. As a player, I want to heal by a numeric amount without exceeding maximum Hit Points, so that health remains valid.
44. As a player, I want current, maximum, and Temporary Hit Points to remain directly editable, so that I can correct data or use table rulings.
45. As a player, I want Temporary Hit Points to remain visually quiet when zero, so that an optional rule field does not clutter every character.
46. As a player, I want to undo a recent mistaken Hit Point change, so that a mistyped amount does not disrupt play.
47. As a player, I want to track death-save successes and failures, so that reaching 0 Hit Points is handled without a separate sheet.
48. As a player, I want to track Heroic Inspiration, so that it is visible when needed.
49. As a player, I want to add a standard SRD Condition from a searchable list, so that its name and explanation are consistent.
50. As a player, I want to add a Custom Condition, so that homebrew and unusual effects remain possible.
51. As the Dungeon Master, I want active Conditions to update on the Party Dashboard, so that I do not have to inspect every Character Page.
52. As a player, I want limited resources to have current, maximum, and recovery values, so that class and feature uses can be tracked.
53. As a player, I want a resource to recover on Short Rest, Long Rest, Dawn, or Manual reset, so that varied recovery rules are represented without hard-coding every feature.
54. As a player, I want a Short Rest or Long Rest action to preview every proposed change, so that I remain in control.
55. As a player, I want to exclude individual changes from a rest before confirming, so that exceptions can be respected.
56. As a player, I want Short Rest to restore Short Rest resources, so that frequently recovering abilities are quick to reset.
57. As a player, I want Long Rest to propose restoring Short Rest and Long Rest resources, spell slots, and current Hit Points while clearing Temporary Hit Points and death saves, so that normal recovery is efficient.
58. As a player, I want a Magic area showing spellcasting statistics, spell slots, and Character Spells, so that magic is usable during play.
59. As a player, I want to enter maximum spell slots by spell level, so that multiclassing and special casting systems remain under player control.
60. As a player, I want to spend and restore spell slots interactively, so that remaining slots are visible during a session.
61. As a player, I want to search the SRD Spell Catalog by name, so that adding a spell is quick.
62. As a player, I want to filter spells by level, class, school, ritual, and concentration, so that I can narrow a large catalogue.
63. As a player, I want class filters to guide rather than block selection, so that feats, items, multiclassing, and homebrew remain possible.
64. As a player, I want an unusual class selection to produce a gentle warning rather than an error, so that I can confirm an intentional choice.
65. As a player, I want a selected Spell Catalog entry to become a Character Spell without copying its rules text into my Character Record, so that catalogue corrections remain centralized.
66. As a player, I want to mark a Character Spell as Known, Prepared, Always Prepared, or granted by an item or feature, so that its availability is clear.
67. As a player, I want to add character-specific spell notes, so that table rulings and tactical reminders are preserved.
68. As a player, I want to create a Custom Spell when the catalogue lacks one, so that non-SRD content can still be tracked without copied proprietary descriptions.
69. As a player, I want a Custom Spell to remain confined to my Character Record, so that it does not silently become shared catalogue content.
70. As a player, I want spell details to show casting time, range, components, material component, duration, concentration, ritual status, description, and higher-level effect, so that I can use SRD spells without leaving the Character Page.
71. As a user, I want an SRD spell or Condition term to expose a Rules Tooltip on pointer hover, keyboard focus, and tap, so that explanations work across input methods.
72. As a user, I want linked game terms inside an explanation to open their own Rules Tooltip, so that I can follow contextual rules in the style of a modern role-playing interface.
73. As a keyboard user, I want Rules Tooltips to be reachable and dismissible without a pointer, so that the rules interface is accessible.
74. As a phone user, I want tap interactions to replace hover-only behaviour, so that explanations remain usable on touchscreens.
75. As a user, I want an About or Legal view with the exact SRD 5.2.1 attribution, so that licensed rules content is presented correctly.
76. As a player, I want a basic Inventory area for equipment, currency, and notable magic items, so that commonly referenced possessions are recorded.
77. As a player, I want a basic Features area for class, species, background, and feat summaries, so that important abilities have a home.
78. As a player, I want a basic Story area for appearance, personality, backstory, allies, and notes, so that character identity is represented beyond combat statistics.
79. As an editor, I want visible Saving and Saved feedback, so that I know whether shared changes reached the backend.
80. As an editor, I want updates to save at field or focused-section granularity, so that unrelated concurrent edits do not overwrite one another.
81. As an authenticated user, I want changes from another device to appear without reloading, so that the Party shares current information.
82. As two people editing different fields, we want both changes preserved, so that shared editing is practical.
83. As two people editing the same field, we want the latest accepted update to win visibly, so that conflict behaviour is understandable.
84. As a user who loses connectivity, I want a clear offline or save-failure state, so that I do not mistake unsaved changes for persisted data.
85. As a laptop user, I want a rich multi-column layout, so that I can scan substantial Character Record information efficiently.
86. As a phone user, I want compact navigation and session-critical information first, so that the app remains useful at the table.
87. As any user, I want health and Conditions communicated through labels, icons, and numbers rather than colour alone, so that state remains accessible.
88. As any user, I want the interface to use a dark supernatural-pirate visual language, so that it feels specific to The Drowned Compass.
89. As any user, I want a restrained compass placeholder and text wordmark rather than official D&D branding, so that the prototype has a coherent but legally cautious identity.
90. As the Dungeon Master, I want a low-priority Party Data Backup download if core work is complete, so that Character Records and Session Trackers can be preserved outside Supabase.

## Implementation Decisions

- Build a client-rendered React, TypeScript, and Vite application that supports GitHub Pages project-site base paths.
- Treat the rendered Party Companion as the primary module interface for users and browser-level acceptance tests.
- Define one internal Party data seam with two adapters: a Supabase adapter for production and an in-memory adapter for browser tests and local interaction development. The interface hides authentication state, Party loading, field-level updates, subscriptions, and save errors from callers.
- Use Supabase Auth with two pre-created identities: one shared Player identity and one Dungeon Master identity. Disable public registration. The login interface presents only role and password; fixed account identifiers remain an implementation detail.
- Use local-scope sign-out so one device cannot invalidate every session sharing a prototype identity.
- Represent access through Party membership and role data rather than relying on hidden frontend values. Row Level Security allows only authenticated members of The Drowned Compass Party to read and update its data.
- Seed exactly six Character Slots administratively. Browser users cannot create or delete Character Slots in the prototype.
- Store a soft claim as player-facing ownership information without using it to restrict updates during the shared-password phase.
- Keep identity, core statistics, and frequently displayed Session Trackers in structured records. Store repeatable attacks, resources, classes, spells, features, inventory items, Conditions, and notes as independently addressable records rather than one monolithic Character Record document.
- Include update metadata and a version or equivalent conditional-write mechanism so that save conflicts and stale writes can be detected rather than silently replacing an entire Character Record.
- Subscribe authenticated clients to permitted Party changes through Supabase Realtime. Apply incoming changes at field or record granularity.
- Place Ability modifiers, proficiency bonus, save and skill modifiers, Passive Perception, initiative, spell attack modifier, spell save DC, damage application, healing, and rest proposals behind a pure calculation module interface.
- Store manual overrides separately from source inputs. A Derived Value uses its calculated result when no override exists and its explicit override when present.
- Model proficiency state as none, proficient, or expertise where applicable.
- Model multiclassing as repeatable class-and-level entries. Total level is the sum used for proficiency bonus and Party display.
- Keep Armor Class, Hit Point maximum, speed, attacks, damage, spell-slot maxima, equipment, and feature text player-entered.
- Treat Temporary Hit Points as optional. Damage consumes them before current Hit Points; they do not increase maximum Hit Points or behave as healing.
- Persist enough Hit Point change information to show and safely reverse recent health actions in a shared-edit environment.
- Model Conditions as associations with either immutable SRD Condition definitions or character-scoped custom definitions.
- Model Session Trackers with current, maximum, and recovery timing values. Rest actions first produce a preview; confirmation applies only selected changes.
- Bundle a versioned, application-owned SRD 5.2.1 Spell Catalog. Use a pinned community export only as an import aid, validate the expected 339 unique records and representative entries against the official PDF, and ship no runtime dependency on an external spell service.
- Preserve spell provenance and exact CC BY 4.0 attribution. Do not scrape D&D Beyond or pre-populate non-SRD descriptions.
- Store Character Spells as associations to catalogue IDs plus character-specific availability state and notes. Store Custom Spells separately and never promote them automatically into the Spell Catalog.
- Implement Rules Tooltips as one interaction that supports hover, focus, and tap. Nested game terms may open another explanation, while focus management and dismissal prevent inaccessible tooltip traps.
- Use a responsive information hierarchy rather than shrinking a paper sheet. The desktop dashboard presents six readable cards; phone layouts reveal identity, health, Armor Class, and Conditions first.
- Use CSS and code-native ornament for the initial compass placeholder and visual system. Official D&D or Baldur's Gate logos and copied interface artwork are not assets of the prototype.
- Provide a Party Data Backup only after core acceptance criteria are satisfied. The backup contains Party Companion data, not campaign story, world, session history, or Dungeon Master preparation.
- Keep the Supabase URL and publishable key in frontend configuration. Never place a Supabase secret key, service-role key, or role password in source control or the browser bundle.
- Deploy through a GitHub Actions Pages workflow after a public GitHub remote is created. Create the remote after approving this spec and its ticket breakdown, before implementation begins.

## Testing Decisions

- Prefer tests at the highest stable seam: browser-visible behaviour. Tests describe what players and the Dungeon Master can observe, not React structure, hook calls, SQL query shape, or other implementation details.
- Run primary browser journeys against the rendered application with the in-memory Party data adapter. Cover role login, dashboard loading, soft claiming, Character Page editing, Derived Values and overrides, Hit Point actions, Conditions, resources and rests, Spell Catalog selection, Custom Spells, Rules Tooltips, save feedback, error feedback, and responsive navigation.
- Give the in-memory adapter realtime semantics so two browser contexts can prove that distinct field updates survive and accepted changes become visible across sessions.
- Test the pure calculation module directly with table-driven cases for Ability modifiers, proficiency bonus, save and skill proficiency, expertise, Passive Perception, initiative, spell statistics, Temporary Hit Point damage order, healing caps, and rest previews.
- Test Supabase schema, grants, and Row Level Security against a local Supabase environment. Prove that Player and Dungeon Master identities can read and update this Party, unauthenticated and non-member identities cannot, and browser roles cannot create or delete Character Slots.
- Add a narrow adapter contract suite that both the in-memory and Supabase Party data adapters must satisfy for loading, updating, version conflicts, subscriptions, and error reporting.
- Validate the bundled Spell Catalog during tests: expected unique record count, levels zero through nine, required fields, SRD-only provenance, and representative records checked against the official source.
- Test Rules Tooltips with pointer, keyboard, and touch-equivalent interactions. Verify focus return, dismissal, nested term navigation, and accessible naming.
- Test layouts at representative phone and laptop viewports. Assert information priority and operability rather than pixel-perfect screenshots alone.
- Test production builds with the configured GitHub Pages base path so routing and static assets work when hosted below a repository URL.
- Treat a ticket as complete only when its user-visible acceptance journey passes, relevant calculation or security tests pass, and the production build remains green.

## Out of Scope

- Individual Player accounts, password recovery, invitations, and enforced Character Ownership
- Private or Dungeon Master-only notes
- Campaign story, world, locations, encounters, maps, session history, initiative order, or adventure preparation
- Full character creation, legal-choice validation, automatic levelling, or a comprehensive 2024 rules engine
- Automatic Armor Class, maximum Hit Point, weapon, damage, equipment, multiclass spell-slot, or feature calculation
- Non-SRD spell descriptions or other copied proprietary rulebook content
- Rich Rules References for every attack and feature beyond SRD spells and Conditions
- Character-art upload, AI generation, cropping, moderation, or gallery management
- Offline editing, conflict reconciliation after offline work, or installable PWA behaviour
- Dice rolling
- Data import and automated restore
- Multiple Parties or campaign creation
- Custom domain and privately published GitHub Pages
- A production-grade individual-account migration within this prototype

## Further Notes

- The canonical domain language is defined in `CONTEXT.md`.
- The hosting and data architecture is recorded in ADR 0001.
- The licensed Spell Catalog boundary is recorded in ADR 0002.
- `docs/prototype-brief.md` captures the agreed product boundary, while the research notes under `docs/research/` provide primary-source support for Supabase, the Party Dashboard, and SRD spell content.
- The source repository is intentionally created after the spec and ticket breakdown are approved and before implementation starts.
- The Party Data Backup is a stretch goal and must not block core acceptance.

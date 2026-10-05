# Combat Catalog provenance and behavior

Source: [official SRD 5.2.1 PDF](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), downloaded 2026-10-05; SHA-256 `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`. The PDF is licensed CC BY 4.0. About / Legal preserves the exact attribution and discloses these adaptations.

`src/data/srd/combat-5.2.1.json` contains all 38 rows of the page-91 weapon table and 41 selected core-class abilities. Weapon damage, properties, and mastery reproduce that table, with range made explicit from properties and normal melee reach (pages 14–15, 89–90). Thrown weapons retain melee and thrown ranges. Reach weapons show 10 feet. Ammunition types and the mounted Lance exception remain in Properties. Mastery is a reference, never inferred eligibility.

Class abilities are application-owned summaries, not full replacement rules. Each entry identifies its class, minimum class level, kind of use, and the official page containing the feature; continued rules and scaling tables may appear on the next page. The selection spans the 12 core SRD classes and intentionally favors commonly referenced combat effects, including eight Fighter and eleven Rogue entries. It excludes subclasses, feats, monsters, and non-SRD content. Use the source link for full requirements, choices, progression, and exceptions. New entries should be checked against the pinned official PDF and included in the catalog integrity tests.

The read-only catalog is bundled with the app and requires no external API or database table during play. Choosing a weapon opens a new Attack draft with base dice, range, damage type, properties/mastery notes, and source URL. Its attack bonus is blank and no Ability is selected. Choosing a class ability opens an Action reference draft with a rules summary and source URL. Saving only records the user’s Combat entry; no attack is rolled, bonus calculated, Health changed, resource consumed, or spell cast.

Templates become independent player-editable snapshots in existing Combat notes, rather than live catalog associations. Later catalog corrections do not overwrite player notes. This deliberately avoids a schema migration while preserving provenance in the draft. A future calculation layer should introduce explicit structured source associations and separate manual overrides instead of parsing notes or treating these snapshots as calculated data.

Search filters compose by name, entry type, class, and maximum class level. Level filtering includes entries acquired at or below that class level; weapons have no class level. Neither filters nor template selection enforce Character Record eligibility. Only one new Combat draft is permitted at a time. Existing draft/version/conflict handling, shared updates, and featured selection remain responsible for persistence.

No hosted migration, release, or live Character changes are required to review this frontend change.

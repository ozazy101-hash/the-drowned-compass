# The Drowned Compass - Prototype Brief

## Purpose

The Drowned Compass is an online Party Companion for one six-character Dungeons & Dragons campaign using the 2024 rules. It helps players maintain their Character Records and Session Trackers while giving the Dungeon Master a concise view of the Party. It is not a campaign manager, virtual tabletop, character-building engine, or repository for story, world, encounter, or private DM information.

## Access

- The public login page offers Player and Dungeon Master access.
- Six players share one temporary Player password.
- The Dungeon Master has a separate password.
- Both roles may view and edit all six Character Records during the prototype.
- Supabase Auth protects access; credentials are never stored in the GitHub repository or browser bundle.
- Individual accounts and enforced Character Ownership are the first major upgrade.

## Primary flows

1. A user signs in as Player or Dungeon Master.
2. Every login opens the Party Dashboard.
3. Six Character Slots exist from the start.
4. A player softly claims a slot by entering player and character identity, then the six Ability Scores.
5. The player completes the rest of the Character Record at their own pace.
6. Changes save by field, synchronize through Supabase, and appear on other open devices.

## Party Dashboard

Each character card prioritizes:

- Character artwork placeholder, name, class or classes, subclass, and total level
- Current and maximum hit points, temporary hit points, and Armor Class
- Active Conditions, concentration, and unmistakable unconscious or dead state
- Six compact Ability modifiers
- Passive Perception
- Spell save DC when applicable
- Primary attack summary
- Heroic Inspiration
- One important limited resource

Selecting a card opens its Character Page.

## Character Page

- **Overview:** identity, artwork placeholder, health, defenses, Ability Scores, saves, skills, and Conditions
- **Combat:** attacks, actions, death saves, Heroic Inspiration, and limited-use resources
- **Magic:** spellcasting statistics, manually entered spell-slot maxima, remaining slots, SRD spells, and Custom Spells
- **Inventory:** basic editable equipment, currency, and notable magical items
- **Features:** basic editable class, species, background, and feat summaries
- **Story:** basic editable appearance, personality, backstory, allies, and notes

Multiclassing is supported in the data model. Initial setup asks for one primary class; further classes can be added later from the Character Page.

## Calculations and overrides

The prototype derives:

- Ability modifiers
- Proficiency bonus from total level
- Saving throws and skills, including expertise
- Passive Perception
- Initiative
- Spell attack modifier and spell save DC
- Remaining and maximum resource presentation

Armor Class, maximum hit points, speed, attacks, damage, spell-slot maxima, equipment, and feature text are player-entered. Every Derived Value offers an explicit Override and Reset to calculated value action.

## Session interaction

- Apply Damage consumes temporary hit points before current hit points.
- Heal is capped at maximum hit points.
- Current, maximum, and temporary hit points remain directly editable.
- Recent hit-point changes can be undone.
- Conditions come from the SRD catalogue with a Custom Condition option.
- Each resource is tagged Short Rest, Long Rest, Dawn, or Manual.
- Rest actions preview their effects and allow individual changes to be unchecked before confirmation.

## Spells and rules explanations

- The bundled, versioned Spell Catalog contains only validated SRD 5.2.1 spells and carries the required CC BY 4.0 attribution.
- Players search and filter spells by name, level, class, school, ritual, and concentration.
- Class filters guide but never prevent selection.
- Character Spells support Known, Prepared, Always Prepared, and item or feature-granted states.
- Missing spells can be added as character-specific Custom Spells with player-entered details.
- SRD spell and Condition terms expose Rules Tooltips on hover, keyboard focus, and tap.
- Linked terms inside an explanation can open their own Rules Tooltips, in the style of contextual game-rule explanations rather than static footnotes.
- Broader Rules References for attacks and features are a high-priority upgrade.

## Visual direction

- Working title: **The Drowned Compass**
- Tone: grim pirates and supernatural ocean horror
- Palette: storm black, moonlit teal, weathered brass, and restrained blood-red accents
- Branding: a simple compass emoji or generic compass placeholder beside a text wordmark; original artwork can replace it later
- Do not use official D&D or Baldur's Gate logos or copy their interface artwork
- Responsive layouts support both phones and laptops

## Technology and hosting

- React, TypeScript, and Vite frontend
- GitHub Pages deployment from a public repository
- Supabase Auth, Postgres, Row Level Security, and Realtime
- Online-only operation
- Public application code contains only a Supabase publishable key; secret keys never enter the frontend

## Priority boundary

The core experience takes priority over the Party Data Backup. Individual accounts and broader Rules References are the first upgrades after the prototype.

Deferred work includes character-art upload or generation, non-SRD catalogue content, a character creation or levelling engine, offline synchronization, dice rolling, data import and restore, and enforced per-character ownership.

## Prototype acceptance

The prototype is accepted when both roles can sign in; six blank slots can be claimed and edited; the Party Dashboard, Overview, Combat, and Magic experiences work on phones and laptops; calculations, overrides, Session Trackers, rests, Rules Tooltips, spell selection, Custom Spells, realtime synchronization, and Supabase access controls behave correctly; and Inventory, Features, and Story provide basic editable coverage.

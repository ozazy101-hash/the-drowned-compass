# The Drowned Compass

This context describes the shared language for The Drowned Compass, a party companion for a grim pirate campaign touched by supernatural ocean horror. It covers the Party, its Player Characters, and Handouts and Grid Maps the Dungeon Master prepares for sharing. The Campaign's wider plot, world, session history, and Dungeon Master notes remain outside this context.

## Language

**Campaign**:
The broader ongoing Dungeons & Dragons game in which the Party participates. The Campaign provides the product's theme and context and the material shared as Handouts; its wider story, world, and session history are not managed by the Party Companion.
_Avoid_: Party data, workspace

**Party Companion**:
The shared aid for maintaining the Party’s Character Records and play state, reading revealed Handouts, and preparing DM-private Grid Maps for the Party Display.
_Avoid_: Campaign manager, virtual tabletop

**Party**:
The six Player Characters whose records and current play state are tracked together.
_Avoid_: Team, roster

**Player Character**:
A character controlled by a player and included in the party.
_Avoid_: Avatar, profile

**Character Record**:
The complete party-visible information describing one player character, including identity, capabilities, resources, equipment, spells, features, and story details.
_Avoid_: Profile, card

**Character Slot**:
One of six reserved places in the campaign for a Player Character. A slot may be unclaimed before a player begins its Character Record.
_Avoid_: Account, empty character

**Claim**:
The association of a Character Slot with its Character Owner. During the prototype, a claim identifies responsibility without preventing other campaign members from editing.
_Avoid_: Create, reserve

**Character Page**:
The play-focused view of one Character Record, combining frequently used session information with access to deeper details.
_Avoid_: Character sheet, profile page

**Party Dashboard**:
The concise overview of all six player characters, intended primarily to help the Dungeon Master assess the party at a glance.
_Avoid_: Home page, roster

**Character Owner**:
The player responsible for a player character and, in the eventual full product, authorized to maintain its record.
_Avoid_: Account owner, administrator

**Dungeon Master**:
The person running the Campaign who assesses the Party and chooses which Handouts to reveal.
_Avoid_: Admin, game owner

**Ability Score**:
One of a player character's six core attributes: Strength, Dexterity, Constitution, Intelligence, Wisdom, or Charisma.
_Avoid_: Main stat, base stat

**Derived Value**:
A character value calculated from other Character Record information but replaceable by an explicit player-supplied value when the calculation does not fit the character.
_Avoid_: Hard-coded value, base stat

**Session Tracker**:
A frequently changing value used during play, such as current hit points, temporary hit points, conditions, Heroic Inspiration, spell slots, death saves, or limited-use features.
_Avoid_: Stat, counter

**Condition**:
A standard or custom state currently affecting a Player Character, such as Blinded, Frightened, Poisoned, Prone, or Unconscious.
_Avoid_: Status, effect

**Party Data Backup**:
A portable copy of the Party's Character Records, Character Spells, Session Trackers, and Party Companion settings. It does not contain the Campaign's story, world, or session history.
_Avoid_: Campaign export, campaign backup

**Rules Reference**:
An explanation or external source associated with a spell, condition, attack, feature, or other game element. The prototype supplies Rules References for SRD spells and conditions; the Combat Catalog also supplies weapon and selected class-ability references.
_Avoid_: Compendium, rulebook

**Rules Tooltip**:
A contextual presentation of a Rules Reference that can expose linked game terms for further explanation, including Conditions mentioned inside another rule.
_Avoid_: Help text, hover text

**Spell Catalog**:
The read-only collection of spells published in SRD 5.2.1 and available for players to search and add to a Character Record.
_Avoid_: Spell database, D&D Beyond spells

**Character Spell**:
A Spell Catalog entry associated with a Player Character, together with character-specific state such as Known, Prepared, Always Prepared, granted source, and notes.
_Avoid_: Catalog spell, spell copy

**Custom Spell**:
A player-entered spell that is absent from the Spell Catalog. Its name, level, and notes belong only to that Character Record and do not become shared catalog content.
_Avoid_: Homebrew catalog entry, unofficial spell

**Character Artwork**:
The visual representation associated with a player character, initially supplied as a preloaded image and later replaceable by an upload.
_Avoid_: Avatar, icon

**Combat Catalog**:
The read-only SRD weapon templates and selected class-ability summaries that players can inspect and use to start editable Combat entries. It supplies references and starting values, without applying character-based rules or effects.
_Avoid_: Attack calculator, automatic combat engine

**Handout**:
An image or PDF containing material from the Campaign, such as a letter or map, that the Dungeon Master can reveal to the Party.
_Avoid_: Asset, attachment

**Dungeon Master Library**:
The Dungeon Master's collection of Handouts and Grid Maps, including unrevealed material that players cannot access.
_Avoid_: Secret database, private folder

**Party Library**:
The collection of revealed Handouts that players can revisit independently of the Party Display. DM-private Grid Maps are prepared and presented separately.
_Avoid_: Revealed database, shared folder

**Reveal**:
The Dungeon Master’s act of making a private Handout available in the Party Library. Uncover describes showing an area of a Grid Map on the Party Display.
_Avoid_: Upload, map presentation

**Party Display**:
The shared view of a Handout or Grid Map selected by the Dungeon Master for everyone to see during play. It is distinct from the Party Dashboard and from each player's independent reading in the Party Library.
_Avoid_: Party Dashboard, DM screen

**Present**:
The Dungeon Master’s act of selecting a Handout or saved Grid Map version for the Party Display. Presenting a private Handout also reveals it; presenting a Grid Map does not distribute it to players.
_Avoid_: Upload, share screen

**Withdraw**:
The Dungeon Master’s act of removing a revealed Handout from Party access while retaining it privately. Withdrawal cannot undo material already seen or copied.
_Avoid_: Delete, erase, hide map area

**Grid Map**:
A DM-private visual map on a square grid for physical miniatures, made from drawn details, uploaded or generated artwork, or both. Its uncovered areas can appear on the Party Display; it does not enforce movement, attacks or visibility rules.
_Avoid_: Virtual tabletop, rules engine

**Map Grid**:
The square cells defining a Grid Map's dimensions and game distances, with five game feet per square as the default.
_Avoid_: Screen pixels, physical square size

**Map Background**:
The image forming the landscape beneath a Grid Map’s grid and drawn details. It may be uploaded or generated artwork, rather than editable map geometry.
_Avoid_: Editable terrain, generated wall geometry

**Display Calibration**:
The adjustment that makes a projected Map Grid square match the desired physical size on the table. It is distinct from the Grid Map's game distances and ordinary viewing zoom.
_Avoid_: Map scale, fit to screen

**Map Artwork Version**:
An immutable illustrated result belonging to a Grid Map, retained for comparison or further revision. A version may be selected for presentation without replacing earlier versions.
_Avoid_: Mutable history entry, candidate row

**Prepared Map Stage**:
A saved Map Artwork Version the Dungeon Master intends to use at a later story moment, such as a newly discovered chamber or changed scenery.
_Avoid_: Reveal Mask, automatic timeline

**Reveal Mask**:
The map regions currently concealed or uncovered on the Party Display, independent of the underlying artwork and Display Calibration.
_Avoid_: Player vision, artwork revision

**Uncover**:
The Dungeon Master’s act of making selected map regions visible on the Party Display without changing artwork or granting Party Library access.
_Avoid_: Reveal Handout, regenerate

**Hide**:
The Dungeon Master’s act of concealing selected map regions on the Party Display without removing the DM’s artwork.
_Avoid_: Withdraw Handout, delete map

# D&D 2024 spell catalogue: licensing and implementation research

Research date: 20 September 2026

## Recommendation

Ship a **versioned, local catalogue containing only the 339 spells in Wizards of the Coast's SRD 5.2.1**. Store the catalogue with the site or in Supabase rather than querying a third-party API at runtime. Include Wizards' required CC BY 4.0 attribution in an About/Legal view and in the data-import provenance.

For a quick prototype, use Open5e's filtered `srd-2024` data as an import aid, pin the exact source commit or exported file, and validate the record count plus a sample of records against Wizards' PDF. A later hardening pass should make the import reproducible directly from the official PDF. Players must also be able to create a **custom spell** when a spell is absent; do not supply copied descriptions for non-SRD spells.

This gives the prototype a searchable list now without scraping D&D Beyond, depending on an external service during play, or importing unlicensed Player's Handbook content.

## Official facts (primary sources)

### The current 2024-rules SRD

- Wizards' current 2024-rules reference is **System Reference Document 5.2.1**, published in English on **1 May 2025**. Wizards calls the rule family represented by SRD 5.2 “5.5e” on its comparison table, although this project can continue to call it the 2024 rules. [Wizards' official SRD hub](https://www.dndbeyond.com/srd)
- The official document contains class spell lists and full spell descriptions on pages 104–175. [Official SRD 5.2.1 PDF](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf) Community parsers report 339 spell descriptions; treat that as an expected import invariant to verify rather than as an official published count. [`rschaeff/srd`](https://github.com/rschaeff/srd)
- SRD 5.2 added 20 spells beyond SRD 5.1, but that does **not** mean it contains every spell in the 2024 Player's Handbook. Wizards explicitly says some spells and other content are omitted. [Wizards' SRD 5.2 FAQ](https://www.dndbeyond.com/srd#SRD5.2FAQ)

### What may be reproduced

The whole SRD 5.2.1 document is made available under the [Creative Commons Attribution 4.0 International licence](https://creativecommons.org/licenses/by/4.0/legalcode). The licence permits copying, redistribution, and adaptation—including commercial use—subject to attribution and the other CC BY terms. Because the SRD itself includes the spell names, spell metadata/mechanics, class lists, and descriptions, those elements **for spells actually present in SRD 5.2.1** may be stored and reproduced in the website.

Use Wizards' requested attribution wording exactly:

> This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

The PDF says not to add other attribution to Wizards or its parent/affiliates, although “compatible with fifth edition” or “5E compatible” is permitted. CC BY also requires changes to be indicated where applicable and does not license trademarks or imply endorsement. [Official SRD 5.2.1, legal-information page](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=1)

Wizards separately warns that only the SRD—not merely overlapping material in the D&D Beyond Basic Rules—is released through this Creative Commons route. [Wizards' Creator FAQ](https://www.dndbeyond.com/creator-faq)

### Official formats

Wizards' current SRD page offers the English SRD and conversion guide as PDF downloads. No first-party JSON, CSV, database dump, or public spell API is listed there. Therefore:

- The official PDF is the source of truth.
- Any JSON, Markdown conversion, or API is a community transformation and should be version-pinned and checked, even when the underlying text is lawfully CC-licensed.
- “Data came from an open-source repository” is not itself enough; the spell content's licence and provenance must still point back to SRD 5.2.1.

## Community structured-data options (repository claims, not Wizards guarantees)

**Verification boundary:** no ready-made structured dataset was verified record-by-record as a faithful SRD 5.2.1 transcription during this research. Open5e is the strongest candidate based on its public documentation, source tree, release history, and licensing posture, but its exported `srd-2024` records still require validation against the official PDF before shipping.

### Open5e API v2 — best import aid

Open5e is the most practical community option found:

- Its current API documentation describes a maintained v2 JSON API, resource filtering, and source-document filters; the documented `srd-2024` key can isolate the 2024 SRD records. [Open5e API documentation](https://open5e.com/api-docs)
- Its repository contains the API and source data, has a long public history, supports self-hosting, and includes SRD 5.2 ingestion work. [Open5e repository](https://github.com/open5e/open5e-api), [v2.0.0 release notes](https://github.com/open5e/open5e-api/releases/tag/v2.0.0)
- The code is under a modified MIT licence, but that licence explicitly excludes third-party SRD content and says the project makes no claim to license included SRD/OGL content. The spell text's permissions therefore come from Wizards' CC BY 4.0 release, not Open5e's software licence. [Open5e licence](https://github.com/open5e/open5e-api/blob/staging/LICENSE.md)

Use Open5e as a **build/import source**, not a live production dependency. Filter strictly to `document.key = srd-2024`; otherwise Open5e also exposes third-party sources governed by different licences. Save the resulting normalized records locally, preserve source/version metadata, and validate them against the official PDF. This avoids API availability, schema-change, pagination, and accidental mixed-source risks during a game.

Suggested imported fields:

```text
id / slug
name
level
school
casting_time
range
components
material_component
duration
concentration
ritual
description
higher_levels
class_list
source = "srd-5.2.1"
source_url
source_version
imported_at
```

### Other community conversions — useful for comparison, not preferred dependencies

- [`downfallx/dnd-5e-srd-markdown`](https://github.com/downfallx/dnd-5e-srd-markdown) claims to convert the full SRD 5.2.1 to Markdown under CC BY 4.0, but it is a lightly maintained, single-commit conversion and is not structured JSON. Its README also makes broad count claims that should not be accepted without verification.
- [`rschaeff/srd`](https://github.com/rschaeff/srd) claims to parse the official PDF into JSON and reports 339 spells. It is useful corroboration for the expected count and a possible reference for a future importer, but it is a very small repository and does not present itself as a stable data service. Review its code and licence status before reusing the parser.
- [`azemoning/omni-5e`](https://github.com/azemoning/omni-5e) provides a structured REST API over SRD 5.2.1, but its documented import path depends on the community Markdown conversion above. It adds more moving parts than this prototype needs.
- The established [5e-bits API documentation](https://5e-bits.github.io/docs/next/introduction) describes an open SRD API, but the public documentation and FAQ still center on the older SRD/OGL dataset. Do not assume an endpoint contains the 2024 rules without verifying its dataset/version and licence record by record.

These are claims and artefacts from their own repositories. They are not endorsements or accuracy guarantees from Wizards.

## Why not scrape D&D Beyond

Do not scrape D&D Beyond pages, authenticated endpoints, or purchased digital books.

- D&D Beyond's current terms describe its digital content as licensed for personal, non-commercial entertainment rather than transferred to the account holder.
- The prohibited-actions section expressly names automation software, bots, spiders, scripts, and extraction tools that interact with or collect information about the service in unauthorized ways.
- Wizards can suspend accounts for terms violations or IP infringement.

[D&D Beyond Terms of Service](https://www.dndbeyond.com/en/terms-conditions)

The SRD PDF already provides a clearly licensed source, so scraping adds contractual and operational risk without a useful benefit.

## Non-SRD spells

A player's 2024 character may use a spell that is not in SRD 5.2.1. The prototype should handle this without silently building an unlicensed Player's Handbook database:

1. Search the local SRD catalogue.
2. If absent, offer **Add custom spell**.
3. Let the player enter a name and their own short notes, or store only the mechanical values they provide for their character.
4. Mark the record `source = custom` and never merge it into the shared SRD catalogue automatically.
5. Do not pre-populate or copy the official non-SRD description from D&D Beyond, a purchased book, or an unofficial dataset.

A future licensed-content integration should have its own decision and licence review. DMs Guild permission is not a general licence to reproduce Player's Handbook content on an independently hosted website, and Wizards' Fan Content Policy does not turn verbatim rulebook copying into open content. [Wizards' Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy)

## Prototype implementation sequence

1. Export Open5e v2 spells filtered to `srd-2024`, or parse pages 104–175 of the official PDF.
2. Normalize to a small application-owned schema and record the source version.
3. Assert exactly 339 unique spell records, levels 0–9, no blank names/descriptions, and no records from another source document.
4. Spot-check at least one spell at every level plus class-list membership against the official PDF.
5. Commit the normalized JSON or seed it into a read-only Supabase `spell_catalog` table.
6. Add the exact SRD attribution to the app's About/Legal view and repository data notice.
7. In the character sheet, store only the chosen catalogue spell ID plus character-specific fields such as prepared state and notes; custom spells remain separate records.
8. Keep the picker usable without a live third-party API: search and filter by name, level, class, school, ritual, and concentration locally.

For this small campaign, bundled JSON is the simplest prototype. Supabase becomes worthwhile only if catalogue administration or updates need to happen without redeploying the site.

## Risk summary

| Risk | Control |
|---|---|
| Community conversion contains errors | Validate count and samples against official PDF; later make the import reproducible from PDF |
| Third-party API is down or changes schema | Vendor a pinned snapshot; no runtime dependency |
| Open5e query mixes in other publishers | Filter strictly to `srd-2024` and verify every record's source |
| Missing 2024 PHB spells frustrate players | Provide custom-spell entry without copied official description |
| Attribution is omitted | Put the exact wording in a persistent Legal/About view and data notice |
| D&D Beyond terms or copyright are breached | Do not scrape or copy non-SRD descriptions |

This is product and technical research, not legal advice.

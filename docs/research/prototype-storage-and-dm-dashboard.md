# Prototype storage and DM dashboard research

Research date: 20 September 2026. Sources are first-party product documentation unless explicitly marked as an inference.

## Recommendation

Use **GitHub Pages for the static frontend and Supabase for shared data, authentication, realtime updates, and character artwork**.

For six friends, this is manageable rather than especially complicated. The browser can talk directly to Supabase, so ordinary sign-in, character edits, live refreshes, and image uploads do not require a custom server. The non-optional work is a small database schema plus correctly tested Row Level Security (RLS) policies.

Use email/password accounts from the prototype onward, even while every campaign member is allowed to edit every character. This supports both phones and laptops and creates a clean path to character ownership later. Anonymous sign-in is a poor fit: an anonymous identity cannot be recovered after sign-out, cleared browser data, or moving to another device, and Supabase recommends CAPTCHA because anonymous sign-ups can be abused ([anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)).

## Minimal architecture

```text
GitHub Pages (HTML/CSS/JS)
        |
        | supabase-js + public publishable key + signed-in user's JWT
        v
Supabase Auth ---- Postgres + RLS ---- Realtime
                          |
                          +---------- Storage (character artwork)
```

Suggested minimum tables:

- `campaigns`: one row for this campaign.
- `campaign_members`: `campaign_id`, `user_id`, and role (`player` or `dm`).
- `characters`: six pre-created blank rows with `campaign_id` and a nullable `owner_user_id`.
- Either columns or small section rows for frequently changed play state: current HP, temporary HP, conditions, inspiration, spell slots, death saves, and limited-use resources.

For the prototype, policies should allow any authenticated member of this campaign to read and update its six characters. Do not allow browser-side character creation or deletion; seed the six rows administratively. Later, change only the update policy so a character can be edited by its `owner_user_id` and the DM. This avoids redesigning storage when ownership is introduced.

Do not save the whole character sheet as one giant JSON document on every change. Realtime carries changes to other clients but does not merge concurrent edits. Save the changed field or section, and include `updated_at`, `updated_by`, and preferably a version used in conditional updates. This makes it much less likely that one player's HP change overwrites another player's spell-slot change.

## Security and operational caveats

- A Supabase **publishable key is expected to be visible in a browser**. Security must come from database grants, RLS, and the signed-in user's JWT. A secret/service-role key bypasses RLS and must never be shipped to GitHub Pages ([securing data](https://supabase.com/docs/guides/database/secure-data), [API keys](https://supabase.com/docs/guides/getting-started/api-keys)).
- Enable RLS on every exposed table, revoke access from the unauthenticated `anon` role, grant only the required operations to `authenticated`, and create separate policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` as applicable ([RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)).
- Do not put a shared campaign password or secret in frontend code. Anything deployed to GitHub Pages can be read by a visitor. The safe equivalent is six authenticated accounts plus a server-side campaign-membership table.
- Hosted email confirmation is enabled by default. Supabase's built-in sender is best-effort and limited to two emails per hour, so onboarding six people requires either custom SMTP or a deliberately controlled setup flow ([password auth](https://supabase.com/docs/guides/auth/passwords)). A practical prototype flow is to temporarily disable email confirmation, let the six players sign up, add their user IDs to `campaign_members`, and then disable new sign-ups; Supabase exposes both configuration switches ([general auth configuration](https://supabase.com/docs/guides/auth/general-configuration)).
- Add the character tables to the Realtime publication. Postgres Changes then delivers permitted changes to clients and applies RLS to what each client may receive ([Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization)).
- Put portraits in a private `character-art` bucket. Storage uses RLS; restrict access to campaign members and restrict uploads by image MIME type and size, for example 5 MB ([Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [bucket restrictions](https://supabase.com/docs/guides/storage/buckets/creating-buckets)). Use unique filenames for replacements rather than repeatedly overwriting one CDN-backed path ([standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)).
- Supabase's current free allowance is far beyond a six-person prototype, but inactive free projects can pause and free projects do not provide downloadable managed backups. Keep occasional off-site database exports ([billing quotas](https://supabase.com/docs/guides/platform/billing-on-supabase), [free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [backups](https://supabase.com/docs/guides/platform/backups)).

### Credible alternative

Firebase can provide client-side email/password authentication, Firestore security rules, realtime document listeners, and file security without a custom backend ([Firebase Auth](https://firebase.google.com/docs/auth/web/password-auth), [Firestore security](https://firebase.google.com/docs/firestore/security/overview), [realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)). It is not simpler for this project, and Firebase's web Cloud Storage setup currently requires the pay-as-you-go Blaze plan ([Storage web setup](https://firebase.google.com/docs/storage/web/start)). Supabase's relational membership model and SQL/RLS are a more direct fit.

## What Baldur's Gate 3 prioritises

### First-party evidence

Larian does not publish a formal information hierarchy for the final character screen. Its first-party posts and patch notes nevertheless show these consistent priorities:

- Keep a compact **vertical party line with portraits** visible while playing, alongside a separate action/resource bar and combat order. Larian described its UI objective as reducing clutter while keeping needed information accessible ([Community Update 15](https://baldursgate3.game/news/community-update-15-absolute-frenzy_49)).
- Make the detailed sheet a separate, searchable/filterable surface for **stats, proficiencies, spellbook, equipment, and inventory**, rather than forcing every detail into the persistent party strip ([Community Update 15](https://baldursgate3.game/news/community-update-15-absolute-frenzy_49)).
- Emphasise actionable progression and identity details on the sheet: **main ability, XP, equipment slots, skills, proficiency, and expertise** ([Patch 2](https://baldursgate3.game/news/patch-2-now-live_89), [Patch 4](https://baldursgate3.game/news/patch-4-now-live_96)).
- Make session state legible: official notes specifically refer to health bars, low-health feedback, available spell slots, conditions, resource bars, and downed/dead state in the HUD and party UI ([Patch 2](https://baldursgate3.game/news/patch-2-now-live_89), [Patch 3](https://baldursgate3.game/news/patch-3-mac-support-magic-mirror-more_93), [Patch 6](https://baldursgate3.game/news/patch-6-now-live_108)).
- Offer a multi-character **Party View** while preserving the same order as the persistent party line, so switching and comparison remain spatially predictable ([Patch 3](https://baldursgate3.game/news/patch-3-mac-support-magic-mirror-more_93)).

These sources are first-party but are release notes and an early-access UI announcement, not a complete specification of the current screen. The dashboard mapping below is therefore a design inference, not a claim that BG3 displays precisely this set of fields.

### Inference for this DM dashboard

The useful lesson is progressive disclosure, not visual imitation. A DM scanning six characters needs the state that changes decisions now; details can open on demand.

Each character card should prioritise:

1. Portrait, character name, class/subclass, and level.
2. Current/max HP, temporary HP, AC, and unmistakable downed/dead state.
3. Active conditions and concentration.
4. Six compact ability modifiers; these satisfy the request for “main stats” without consuming a full sheet.
5. Passive Perception, spell save DC (when applicable), and a concise primary attack summary.
6. Inspiration and the most important limited resource for that character, if one exists.

Clicking a card should open the full Character Page for saves, skills, attacks, spell slots, resources, features, inventory, notes, and editing. On phones, show identity + HP/AC/conditions first and collapse the remaining summary. On laptops, fit six cards in a readable grid rather than reproducing BG3's game HUD.

Two deliberate deviations from BG3 are appropriate:

- BG3's party UI is optimised for one player controlling a video-game party; this dashboard is for a DM comparing six independently controlled player characters. Passive Perception and spell save DC therefore deserve more prominence here.
- Do not rely on colour alone for health or status. Pair colour with text, icons, and numbers, following the accessibility intent visible in Larian's colour-blind improvements to portrait frames and character markers ([Patch 4](https://baldursgate3.game/news/patch-4-now-live_96)).

## Decision implication

Shared editing changes the prototype from a purely static mock-up into a small real application, but it does **not** require abandoning GitHub Pages or building a custom server. The clean scope is:

- GitHub Pages frontend.
- Supabase email/password auth and one campaign-membership model.
- Six blank, shared-editable character rows.
- RLS from day one.
- Realtime for visible cross-device updates.
- Private image upload bucket.
- Ownership and DM-only permissions deferred, but already supported by the schema.

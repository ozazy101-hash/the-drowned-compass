import { test } from "./browser-fixtures";
import { expect, type WebSocketRoute } from "@playwright/test";

test("the Supabase adapter catches up when a realtime connection returns", async ({ page }) => {
  let partyName = "Before reconnect";
  const sockets: WebSocketRoute[] = [];
  let joined = 0;
  await page.route("https://supabase-contract.invalid/rest/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      contentType: "application/json",
      json: path.endsWith("/parties") ? { id: "test-party", name: partyName } : [],
    });
  });
  await page.routeWebSocket(/supabase-contract\.invalid\/realtime\/v1\/websocket/, (socket) => {
    sockets.push(socket);
    socket.onMessage((message) => {
      const [joinRef, ref, topic, event, payload] = JSON.parse(String(message));
      if (event !== "phx_join" && event !== "heartbeat") return;
      const response = event === "phx_join" ? {
        postgres_changes: payload.config.postgres_changes.map(
          (filter: Record<string, unknown>, index: number) => ({ ...filter, id: index + 1 }),
        ),
      } : {};
      socket.send(JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response }]));
      if (event === "phx_join") joined += 1;
    });
  });

  await page.goto("./");
  await page.evaluate(async () => {
    const modulePath = "/the-drowned-compass/src/data/supabase-party-data.ts";
    const { createSupabasePartyData } = await import(modulePath);
    const adapter = createSupabasePartyData("https://supabase-contract.invalid", "test-publishable-key");
    const initialParty = await adapter.getParty();
    document.body.dataset.subscribedParty = initialParty.name;
    const unsubscribe = adapter.subscribeToParty((party: { name: string }) => {
      document.body.dataset.subscribedParty = party.name;
    });
    window.addEventListener("pagehide", unsubscribe, { once: true });
  });
  await expect.poll(() => joined).toBe(1);
  await expect(page.locator("body")).toHaveAttribute("data-subscribed-party", "Before reconnect");

  // The update happens while disconnected; there is no UPDATE event to replay.
  partyName = "After reconnect";
  sockets[0].close({ code: 1012, reason: "Reconnect contract test" });
  await expect.poll(() => joined).toBe(2);
  await expect(page.locator("body")).toHaveAttribute("data-subscribed-party", "After reconnect");
});

test('the Supabase adapter maps and conditionally persists proficiency and independent overrides', async ({ page }) => {
  const row = {
    id:'test-slot', position:1, claimed_at:'2026-09-28T00:00:00Z',
    player_name:'Mara', character_name:'Neris Vale', primary_class:'Rogue', subclass:'Thief', species:'Human', background:'Sailor', level:5,
    strength:9, dexterity:17, constitution:13, intelligence:14, wisdom:12, charisma:11,
    saving_throw_proficiencies:{ strength:'none', dexterity:'proficient', constitution:'none', intelligence:'none', wisdom:'expertise', charisma:'none' },
    skill_proficiencies:{ perception:'expertise' }, armor_class:16,max_hit_points:24,speed:30,spellcasting_ability:null,
    derived_overrides:{} as Record<string,number>,overview_field_versions:{} as Record<string,number>,
  };
  await page.route('https://supabase-contract.invalid/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    let json: unknown;
    if (url.pathname.endsWith('/rpc/update_character_overview_field')) {
      const { target_field:field,next_value:next,expected_version:version } = route.request().postDataJSON();
      const currentVersion = row.overview_field_versions[field] ?? 0;
      const accepted = version === currentVersion;
      if (accepted) {
        if (field.startsWith('override.')) {
          const key=field.slice(9);
          if (next === null) delete row.derived_overrides[key]; else row.derived_overrides[key]=next;
        } else if (field === 'save.wisdom') row.saving_throw_proficiencies.wisdom=next;
        row.overview_field_versions[field]=currentVersion+1;
      }
      json=[{ accepted,current_version:row.overview_field_versions[field] }];
    } else if (url.pathname.endsWith('/character_survival') || url.pathname.endsWith('/character_classes') || url.pathname.endsWith('/limited_resources')) json=[];
    else if (url.pathname.endsWith('/parties')) json={ id:'test-party',name:'The Drowned Compass' };
    else if (url.pathname.endsWith('/character_inventory_entries') || url.pathname.endsWith('/character_text_entries') || url.pathname.endsWith('/character_conditions') || url.pathname.endsWith('/character_magic')) json=[];
    else if (url.pathname.endsWith('/character_combat_entries') || url.pathname.endsWith('/character_primary_attacks')) json=[];
    else {
      expect(url.searchParams.get('select')).toContain('derived_overrides');
      json=[row];
    }
    await route.fulfill({ contentType:'application/json',json });
  });
  await page.goto('./');
  const results = await page.evaluate(async () => {
    const modulePath='/the-drowned-compass/src/data/supabase-party-data.ts';
    const { createSupabasePartyData }=await import(modulePath);
    const adapter=createSupabasePartyData('https://supabase-contract.invalid','test-publishable-key');
    const initial=await adapter.getParty();
    const zero=await adapter.updateCharacterOverviewField('test-slot','override.initiative',0,0);
    const independent=await adapter.updateCharacterOverviewField('test-slot','override.skill.perception',8,0);
    const conflict=await adapter.updateCharacterOverviewField('test-slot','override.initiative',9,0);
    const reset=await adapter.updateCharacterOverviewField('test-slot','override.initiative',null,1);
    const proficiency=await adapter.updateCharacterOverviewField('test-slot','save.wisdom','proficient',0);
    return { initial,zero,independent,conflict,reset,proficiency };
  });
  expect(results.initial.slots[0].character.savingThrowProficiencies.wisdom).toBe('expertise');
  expect(results.zero.slot.character.derivedOverrides).toEqual({ initiative:0 });
  expect(results.independent.slot.character.derivedOverrides).toEqual({ initiative:0,'skill.perception':8 });
  expect(results.conflict.ok).toBe(false);
  expect(results.conflict.slot.character.derivedOverrides.initiative).toBe(0);
  expect(results.reset.slot.character.derivedOverrides).toEqual({ 'skill.perception':8 });
  expect(results.proficiency.slot.character.savingThrowProficiencies.wisdom).toBe('proficient');
});

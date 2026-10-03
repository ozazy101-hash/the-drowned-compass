import { expect, test } from '@playwright/test';
import { applyCombatEntryCommand, emptyCombatEntries, type CombatEntryCommand } from '../src/domain/combat-entries';
import { abilityScoreKeys, skillKeys } from '../src/domain/party';

for (const adapterName of ['memory','supabase'] as const) {
  test(`${adapterName} adapter loads records, maps versions, submits conditional writes, rejects conflicts and reports errors`, async ({ page }, testInfo) => {
    const abilities = Object.fromEntries(abilityScoreKeys.map(key => [key,10]));
    const saves = Object.fromEntries(abilityScoreKeys.map(key => [key,'none']));
    const skills = Object.fromEntries(skillKeys.map(key => [key,'none']));
    const combat = emptyCombatEntries();
    const row = { id:'character-slot-1',position:1,claimed_at:'2026-09-28T00:00:00Z',player_name:'Mara',character_name:'Neris Vale',primary_class:'Rogue',subclass:'Thief',species:'Human',background:'Sailor',level:3,...abilities,saving_throw_proficiencies:saves,skill_proficiencies:skills,armor_class:10,max_hit_points:1,speed:30,spellcasting_ability:null,derived_overrides:{},overview_field_versions:{} };
    const commands: CombatEntryCommand[] = [];
    let failNext = false;
    if (adapterName === 'supabase') {
      await page.route('https://supabase-combat-contract.invalid/rest/v1/**', async route => {
        const path = new URL(route.request().url()).pathname;
        let json: unknown;
        if (path.endsWith('/rpc/update_character_combat_entry')) {
          const body = route.request().postDataJSON();
          expect(body.target_slot_id).toBe('character-slot-1');
          commands.push(body.command);
          if (failNext) { failNext=false; await route.fulfill({ status:503, json:{ message:'Unavailable' } }); return; }
          json=applyCombatEntryCommand(combat,body.command);
        } else if (path.endsWith('/parties')) json={ id:'test-party',name:'The Drowned Compass' };
        else if (path.endsWith('/character_slots')) json=[row];
        else if (path.endsWith('/character_combat_entries')) json=combat.entries.map(e => ({ ...e,slot_id:row.id }));
        else if (path.endsWith('/character_primary_attacks')) json=[{ slot_id:row.id,primary_id:combat.primaryId,version:combat.primaryVersion }];
        else if (path.endsWith('/character_classes')) json=[];
        else if (path.endsWith('/limited_resources')) json=[];
        else if (path.endsWith('/character_text_entries')) json=[];
        else throw new Error(`Unexpected route: ${path}`);
        await route.fulfill({ json });
      });
    }
    await page.goto(`./?partyTestId=contract-${encodeURIComponent(testInfo.testId)}-${testInfo.project.name}`);
    const results = await page.evaluate(async ({ adapterName, abilities, saves, skills }) => {
      const memoryPath='/the-drowned-compass/src/data/in-memory-party-data.ts';
      const supabasePath='/the-drowned-compass/src/data/supabase-party-data.ts';
      const adapter = adapterName === 'memory' ? (await import(memoryPath)).createInMemoryPartyData() : (await import(supabasePath)).createSupabasePartyData('https://supabase-combat-contract.invalid','test-publishable-key');
      if (adapterName === 'memory') await adapter.claimCharacterSlot('character-slot-1', { playerName:'Mara',characterName:'Neris Vale',primaryClass:'Rogue',subclass:'Thief',species:'Human',background:'Sailor',level:3,abilityScores:abilities,savingThrowProficiencies:saves,skillProficiencies:skills,armorClass:10,maxHitPoints:1,speed:30,spellcastingAbility:null,derivedOverrides:{},fieldVersions:{} });
      const initial=await adapter.getParty();
      const id='39000000-0000-4000-8000-000000000010';
      const details={ kind:'attack',name:'Cutlass',attackBonus:'0',ability:null,range:'5 feet',damage:'1d6',damageType:'Slashing',notes:'Player notes' };
      const created=await adapter.updateCombatEntry('character-slot-1',{ type:'save',id,details,rank:1024,expectedVersion:0 });
      const primary=await adapter.updateCombatEntry('character-slot-1',{ type:'primary',id,expectedVersion:0 });
      const edited=await adapter.updateCombatEntry('character-slot-1',{ type:'save',id,details:{ ...details,notes:'Updated' },rank:1024,expectedVersion:1 });
      const stale=await adapter.updateCombatEntry('character-slot-1',{ type:'move',id,rank:0,expectedVersion:1 });
      const moved=await adapter.updateCombatEntry('character-slot-1',{ type:'move',id,rank:0,expectedVersion:2 });
      const removed=await adapter.updateCombatEntry('character-slot-1',{ type:'remove',id,expectedVersion:3 });
      const loaded=await adapter.getParty();
      return { initial,created,primary,edited,stale,moved,removed,loaded };
    }, { adapterName, abilities, saves, skills });
    const state = (result: typeof results.created) => result.slot.character.combatEntries;
    expect(results.initial.slots[0].character.combatEntries.entries).toEqual([]);
    expect(state(results.created).entries[0]).toMatchObject({ details:{ name:'Cutlass',attackBonus:'0' },version:1,rank:1024,deleted:false });
    expect(state(results.primary)).toMatchObject({ primaryId:'39000000-0000-4000-8000-000000000010',primaryVersion:1 });
    expect(state(results.edited).entries[0]).toMatchObject({ details:{ notes:'Updated' },version:2 });
    expect(results.stale.ok).toBe(false);
    expect(state(results.stale).entries[0].rank).toBe(1024);
    expect(state(results.moved).entries[0]).toMatchObject({ rank:0,version:3 });
    expect(state(results.removed)).toMatchObject({ primaryId:null,primaryVersion:2,entries:[{ deleted:true,version:4 }] });
    expect(results.loaded.slots[0].character.combatEntries).toEqual(state(results.removed));
    if (adapterName === 'supabase') {
      expect(commands.map(command => command.expectedVersion)).toEqual([0,0,1,1,2,3]);
      failNext=true;
    } else {
      await page.route('**/__drowned_compass_test_party?**', route => route.request().method() === 'PATCH' ? route.abort() : route.continue());
    }
    const failed = await page.evaluate(async adapterName => {
      const path=adapterName === 'memory' ? '/the-drowned-compass/src/data/in-memory-party-data.ts' : '/the-drowned-compass/src/data/supabase-party-data.ts';
      const module=await import(path);
      const adapter=adapterName === 'memory' ? module.createInMemoryPartyData() : module.createSupabasePartyData('https://supabase-combat-contract.invalid','test-publishable-key');
      try { await adapter.updateCombatEntry('character-slot-1',{ type:'primary',id:null,expectedVersion:2 }); return false; } catch { return true; }
    },adapterName);
    expect(failed).toBe(true);
  });
}

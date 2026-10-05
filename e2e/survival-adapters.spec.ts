import { test } from './browser-fixtures';
import { expect } from '@playwright/test';
import { initialSurvival, transitionSurvival, type SurvivalCommand } from '../src/domain/survival';
for (const backend of ['in-memory','Supabase']) test(`${backend} survival contract rejects stale writes, preserves unrelated data, reloads and reports failure`,async ({page}) => {
  let state = initialSurvival(); let fail = false;
  const character = { playerName:'Mara',characterName:'Neris',primaryClass:'Rogue',subclass:'Thief',species:'Human',background:'Sailor',level:3,abilityScores:{},savingThrowProficiencies:{},skillProficiencies:{},armorClass:18,maxHitPoints:20,speed:30,spellcastingAbility:null,derivedOverrides:{},fieldVersions:{} };
  await page.route('https://survival-contract.invalid/rest/v1/**',async route => {
    const path = new URL(route.request().url()).pathname; let json: unknown = [];
    if (path.endsWith('/rpc/update_character_survival')) {
      const args = route.request().postDataJSON();
      expect(args.target_slot_id).toBe('slot');
      if (fail) { fail=false; await route.fulfill({status:503,json:{message:'Unavailable'}}); return; }
      const next = args.expected_version === state.version && args.maximum_version === 0 ? transitionSurvival(state,args.command as SurvivalCommand,20,0) : null;
      json = !!next; if (next) state = next;
    } else if(path.endsWith('/parties')) json = {id:'party',name:'Party'};
    else if(path.endsWith('/character_slots')) json = [{id:'slot',position:1,claimed_at:'2026-10-03',player_name:'Mara',character_name:'Neris',primary_class:'Rogue',subclass:'Thief',species:'Human',background:'Sailor',level:3,strength:10,dexterity:10,constitution:10,intelligence:10,wisdom:10,charisma:10,saving_throw_proficiencies:{},skill_proficiencies:{},armor_class:18,max_hit_points:20,speed:30,spellcasting_ability:null,derived_overrides:{},overview_field_versions:{}}];
    else if(path.endsWith('/character_survival')) json = [{slot_id:'slot',state}];
    await route.fulfill({json});
  });
  await page.goto('./');
  await page.evaluate(character => localStorage.setItem('drowned-compass-party',JSON.stringify({name:'Party',slots:[{id:'slot',position:1,character}]})),character);
  const result = await page.evaluate(async backend => {
    const memory = '/the-drowned-compass/src/data/in-memory-party-data.ts'; const production = '/the-drowned-compass/src/data/supabase-party-data.ts';
    const data = backend === 'in-memory' ? (await import(memory)).createInMemoryPartyData() : (await import(production)).createSupabasePartyData('https://survival-contract.invalid','test-key');
    const first = await data.updateSurvival('slot',{kind:'set-current',value:20},0,0);
    const damage = await data.updateSurvival('slot',{kind:'subtract',amount:7},1,0);
    const staleUndo = await data.updateSurvival('slot',{kind:'undo'},1,0);
    const staleMaximum = await data.updateSurvival('slot',{kind:'add',amount:3},2,1);
    const undo = await data.updateSurvival('slot',{kind:'undo'},2,0);
    return {first,damage,staleUndo,staleMaximum,undo,reloaded:await data.getParty()};
  },backend);
  expect(result.first.ok).toBe(true); expect(result.damage.slot.character.survival.current).toBe(13);
  expect(result.staleUndo.ok).toBe(false); expect(result.staleUndo.slot.character.survival.current).toBe(13);
  expect(result.staleMaximum.ok).toBe(false); expect(result.undo.ok).toBe(true);
  expect(result.reloaded.slots[0].character).toMatchObject({armorClass:18,survival:{current:20,version:3}});
  if (backend==='Supabase') {
    fail=true;
    const failure = await page.evaluate(async () => {
      const path='/the-drowned-compass/src/data/supabase-party-data.ts';
      const data=(await import(path)).createSupabasePartyData('https://survival-contract.invalid','test-key');
      let failed=false; try {await data.updateSurvival('slot',{kind:'subtract',amount:2},3,0);} catch {failed=true;}
      return {failed,retry:await data.updateSurvival('slot',{kind:'subtract',amount:2},3,0)};
    });
    expect(failure.failed).toBe(true); expect(failure.retry.slot.character.survival.current).toBe(18);
  }
});

test('cross-tab survival, Overview and resource writes keep every accepted change',async ({page,context}) => {
  await page.goto('./'); const other=await context.newPage(); await other.goto('./');
  await page.evaluate(() => localStorage.setItem('drowned-compass-party',JSON.stringify({name:'Party',slots:[{id:'slot',position:1,character:{characterName:'Neris',abilityScores:{},fieldVersions:{},maxHitPoints:20}}]})));
  for (let version=0;version<4;version++) {
    const results=await Promise.all([
      page.evaluate(async version => {const path='/the-drowned-compass/src/data/in-memory-party-data.ts'; return (await import(path)).createInMemoryPartyData().updateSurvival('slot',{kind:'correct',field:'current',value:10+version},version,0);},version),
      other.evaluate(async version => {const path='/the-drowned-compass/src/data/in-memory-party-data.ts'; return (await import(path)).createInMemoryPartyData().updateCharacterOverviewField('slot','armorClass',15+version,version);},version),
      other.evaluate(async version => {const path='/the-drowned-compass/src/data/in-memory-party-data.ts'; return (await import(path)).createInMemoryPartyData().writeLimitedResource('slot',{id:'11111111-1111-4111-8111-111111111111',name:'Luck',current:version,maximum:4,recovery:'Manual',position:0,important:true,deleted:false},version);},version),
    ]);
    expect(results.every(result => result.ok)).toBe(true);
    const character=await page.evaluate(async () => {const path='/the-drowned-compass/src/data/in-memory-party-data.ts';return (await (await import(path)).createInMemoryPartyData().getParty()).slots[0].character;});
    expect(character).toMatchObject({armorClass:15+version,survival:{current:10+version,version:version+1},limitedResources:[{current:version,version:version+1}]});
  }
  await other.close();
});

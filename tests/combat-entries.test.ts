import { test, expect } from '@playwright/test';
import { applyCombatEntryCommand as apply, emptyCombatEntries, availableFeaturedAttackIds, featuredAttackIds, featuredAttackSummaries, mergeCombatEntries, type CombatEntries, type CombatEntryDetails } from '../src/domain/combat-entries';
const details: CombatEntryDetails = { kind:'attack', name:'Cutlass', attackBonus:'0', ability:null, range:'120 feet', damage:'1d6', damageType:'slashing', notes:'' };
function state() { const s=emptyCombatEntries(); for(let i=0;i<40;i++) apply(s,{type:'save',id:String(i),details:{...details,name:`Attack ${i}`},rank:40-i,expectedVersion:0}); return s; }
test('unlimited records, any subset, Combat ordering and explicit category default',()=> {
 const s=state(); expect(s.entries).toHaveLength(40);
 expect(apply(s,{type:'featured',ids:['0','2','1'],expectedVersion:0})).toBe(true);
 expect(featuredAttackSummaries(s).map(a=>a.id)).toEqual(['2','1','0']);
 expect(featuredAttackSummaries(s)[0]).toMatchObject({category:'other',summary:'Attack 2 · +0 to hit · 1d6 slashing · 120 feet'});
 expect(apply(s,{type:'featured',ids:[],expectedVersion:1})).toBe(true); expect(featuredAttackSummaries(s)).toEqual([]);
});
test('legacy primary migration and independent selection versions reject stale conflicts',()=> {
 const s=state(); s.primaryId='0'; expect(featuredAttackIds(s)).toEqual(['0']);
 apply(s,{type:'featured',ids:['0','1'],expectedVersion:0});
 apply(s,{type:'save',id:'0',details:{...details,category:'melee'},rank:40,expectedVersion:1});
 expect(s.primaryVersion).toBe(1); expect(apply(s,{type:'featured',ids:['2'],expectedVersion:0})).toBe(false);
 expect(featuredAttackIds(s)).toEqual(['0','1']); expect(featuredAttackSummaries(s)[1].category).toBe('melee');
});
test('remove/conversion prune selected records and delayed snapshots cannot revive them',()=> {
 const s=state(); apply(s,{type:'featured',ids:['0','1','2'],expectedVersion:0}); const old=structuredClone(s);
 apply(s,{type:'remove',id:'0',expectedVersion:1}); apply(s,{type:'save',id:'1',details:{...details,kind:'action'},rank:39,expectedVersion:1});
 expect(s.primaryVersion).toBe(3); expect(featuredAttackIds(s)).toEqual(['2']); expect(availableFeaturedAttackIds(s,['0','1','2'])).toEqual(['2']);
 expect(featuredAttackSummaries(mergeCombatEntries(s,old)).map(a=>a.id)).toEqual(['2']);
 expect(()=>apply(s,{type:'featured',ids:['0'],expectedVersion:3})).toThrow();
 expect(()=>apply(s,{type:'featured',ids:['1'],expectedVersion:3})).toThrow();
});
test('independent newer entry and selection snapshots merge without overwriting either',()=> {
 const s=state(); const selection=structuredClone(s); apply(selection,{type:'featured',ids:['1','2'],expectedVersion:0});
 apply(s,{type:'save',id:'1',details:{...details,name:'Changed elsewhere'},rank:1,expectedVersion:1});
 const merged: CombatEntries=mergeCombatEntries(s,selection); expect(featuredAttackIds(merged)).toEqual(['1','2']); expect(featuredAttackSummaries(merged)[0].summary).toContain('Changed elsewhere');
});

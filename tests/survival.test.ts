import { test, expect } from '@playwright/test';
import { initialSurvival, transitionSurvival, survivalState, mergeSurvival } from '../src/domain/survival';
for (const [current, temporary, amount, hp, temp] of [[20,5,3,20,2],[20,5,12,13,0],[4,2,99,0,0],[0,9,9,0,0],[20,0,0,20,0]]) {
  test(`damage ${current}/${temporary} by ${amount}`, () => {
    const next = transitionSurvival({ ...initialSurvival(), current, temporary }, { kind: 'damage', amount }, 20, 0)!;
    expect([next.current,next.temporary]).toEqual([hp,temp]);
  });
}
for (const [current,amount,maximum,expected] of [[1,5,20,6],[19,5,20,20],[0,9999,20,20]]) test(`healing ${current}+${amount}`, () => {
  expect(transitionSurvival({ ...initialSurvival(), current, temporary: 8 }, { kind:'heal', amount }, maximum, 0)).toMatchObject({ current:expected, temporary:8 });
});
test('corrections, shared history, maximum guard, survival preservation and single undo', () => {
  const corrected = transitionSurvival(initialSurvival(), { kind:'correct',field:'current',value:40 },20,1)!;
  const damage = transitionSurvival(corrected, { kind:'damage',amount:9 },20,1)!;
  const inspiration = transitionSurvival(damage,{ kind:'track',field:'inspiration',value:true },20,1)!;
  expect(transitionSurvival(inspiration,{kind:'undo'},20,2)).toBeNull();
  const undone = transitionSurvival(inspiration,{kind:'undo'},20,1)!;
  expect(undone).toMatchObject({current:40,inspiration:true,version:4,undo:null});
  expect(transitionSurvival(undone,{kind:'undo'},20,1)).toBeNull();
  expect(transitionSurvival(corrected,{kind:'correct',field:'temporary',value:17},20,1)).toMatchObject({current:40,temporary:17});
});
for (const value of [-1,1.5,10000,NaN]) test(`invalid amount ${value}`, () => {
  expect(() => transitionSurvival(initialSurvival(),{kind:'correct',field:'current',value},20,0)).toThrow();
});
test('unknown HP and bounded death saves; downed status never uses colour alone', () => {
  expect(() => transitionSurvival(initialSurvival(),{kind:'damage',amount:1},20,0)).toThrow('Set Current');
  expect(() => transitionSurvival(initialSurvival(),{kind:'track',field:'failures',value:4},20,0)).toThrow();
  expect(survivalState({...initialSurvival(),current:0})).toBe('Downed · Unconscious');
  expect(survivalState({...initialSurvival(),current:0,successes:3})).toContain('Stable');
});

test('delayed snapshots retain the latest accepted survival version', () => {
  const current = {...initialSurvival(),current:12,version:3};
  expect(mergeSurvival(current,{...initialSurvival(),current:18,version:2})).toEqual(current);
  expect(mergeSurvival(current,{...current,current:9,version:4}).current).toBe(9);
});

for (const [kind,current,amount,expected] of [['subtract',20,1,19],['subtract',3,99,0],['add',19,5,20],['subtract',27,1,20]] as const) test(`neutral ${kind} ${current} by ${amount}`, () => {
 const next=transitionSurvival({...initialSurvival(),current,temporary:9},{kind,amount},20,0)!;
 expect(next).toMatchObject({current:expected,temporary:9});
});
test('bounded initial setup and correction preserve survival trackers',()=> {
 expect(transitionSurvival({...initialSurvival(),inspiration:true},{kind:'set-current',value:20},20,0)).toMatchObject({current:20,inspiration:true});
 expect(()=>transitionSurvival(initialSurvival(),{kind:'set-current',value:21},20,0)).toThrow();
 expect(()=>transitionSurvival(initialSurvival(),{kind:'subtract',amount:1},20,0)).toThrow('Set Current');
});

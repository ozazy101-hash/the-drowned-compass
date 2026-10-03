import { setOverviewValue } from '../src/domain/overview-fields';
import { expect, test } from '@playwright/test';
import { applyClassEdit, characterClasses, classSummary, mergeClasses, projectClasses, totalLevel } from '../src/domain/character-classes';
import { calculateDerivedValues } from '../src/domain/derived-values';
import { abilityScoreKeys, skillKeys, type CharacterRecord } from '../src/domain/party';

const secondary = '11111111-1111-4111-8111-111111111111';
function record(): CharacterRecord {
  return { playerName: 'Mara', characterName: 'Neris', primaryClass: 'Rogue', subclass: 'Thief', species: 'Human', background: 'Sailor', level: 3,
    abilityScores: { strength: 9, dexterity: 17, constitution: 13, intelligence: 14, wisdom: 12, charisma: 11 },
    savingThrowProficiencies: Object.fromEntries(abilityScoreKeys.map(key => [key, 'proficient'])) as CharacterRecord['savingThrowProficiencies'],
    skillProficiencies: Object.fromEntries(skillKeys.map(key => [key, 'expertise'])) as CharacterRecord['skillProficiencies'],
    armorClass: 10, maxHitPoints: 1, speed: 30, spellcastingAbility: 'wisdom', derivedOverrides: {}, fieldVersions: {} };
}
test('legacy single-class records retain identity and level', () => {
  const character = record();
  expect(characterClasses(character)).toEqual([{ id: 'primary', name: 'Rogue', level: 3, version: 1, deleted: false }]);
  expect(totalLevel(character)).toBe(3);
  expect(classSummary(character)).toBe('Level 3 Rogue · Thief');
  expect(character.classes).toBeUndefined();
});
for (const [added, bonus] of [[1,2],[2,3],[6,4],[10,5],[14,6],[17,6]]) {
  test(`multiclass total ${3 + added} drives proficiency, expertise, saves and spell statistics`, () => {
    const character = record();
    expect(applyClassEdit(character, { id: secondary, name: ' Cleric ', level: added, deleted: false }, 0)).toBe(true);
    const derived = calculateDerivedValues({ ...character, totalLevel: totalLevel(character) });
    expect(derived.proficiencyBonus.value).toBe(bonus);
    expect(derived['save.wisdom'].value).toBe(1 + bonus);
    expect(derived['skill.perception'].value).toBe(1 + bonus * 2);
    expect(derived.passivePerception.value).toBe(11 + bonus * 2);
    expect(derived.spellAttack.value).toBe(1 + bonus);
    expect(derived.spellSaveDC.value).toBe(9 + bonus);
    expect(character.level).toBe(3 + added);
    expect(character.primaryClass).toBe('Rogue');
  });
}
for (const level of [0,-1,1.5,21,NaN,Infinity]) {
  test(`invalid class level ${level} leaves the record unchanged`, () => {
    const character = record(); const before = structuredClone(character);
    expect(() => applyClassEdit(character, { id: secondary, name: 'Cleric', level, deleted: false }, 0)).toThrow();
    expect(character).toEqual(before);
  });
}
test('total cap, class name, identity, version and primary removal are enforced atomically', () => {
  const character = record();
  for (const edit of [
    { id: secondary, name: 'Cleric', level: 18, deleted: false },
    { id: 'primary', name: 'Rogue', level: 3, deleted: true },
    { id: secondary, name: ' ', level: 1, deleted: false },
    { id: 'bad', name: 'Cleric', level: 1, deleted: false },
    { id: secondary, name: 'x'.repeat(161), level: 1, deleted: false },
  ]) expect(() => applyClassEdit(character, edit, 0)).toThrow();
  expect(() => applyClassEdit(character, { id: secondary, name: 'Cleric', level: 1, deleted: false }, -1)).toThrow();
  expect(character.classes).toBeUndefined();
});
test('independent class edits survive, stale edits conflict and deletion cannot be resurrected', () => {
  const character = record();
  const cleric = { id: secondary, name: 'Cleric', level: 2, deleted: false };
  expect(applyClassEdit(character, cleric, 0)).toBe(true);
  expect(applyClassEdit(character, { id: 'primary', name: 'Ranger', level: 4, deleted: false }, 1)).toBe(true);
  expect(applyClassEdit(character, { ...cleric, level: 3 }, 1)).toBe(true);
  expect(totalLevel(character)).toBe(7);
  expect(applyClassEdit(character, cleric, 1)).toBe(false);
  expect(classSummary(character)).toBe('Level 7 · Ranger 4 (primary) / Cleric 3 · Thief');
  expect(applyClassEdit(character, { ...cleric, deleted: true }, 2)).toBe(true);
  expect(totalLevel(character)).toBe(4);
  expect(applyClassEdit(character, cleric, 2)).toBe(false);
  expect(applyClassEdit(character, cleric, 3)).toBe(false);
});
test('delayed snapshots preserve accepted class edits and removals alongside independent inputs', () => {
  const newer = record(); const old = structuredClone(newer);
  applyClassEdit(newer, { id: secondary, name: 'Cleric', level: 2, deleted: false }, 0);
  const beforeRemoval = structuredClone(newer);
  applyClassEdit(newer, { id: secondary, name: 'Cleric', level: 2, deleted: true }, 1);
  old.armorClass = 18;
  old.classes = mergeClasses(newer, old); projectClasses(old);
  expect(old.armorClass).toBe(18); expect(totalLevel(old)).toBe(3);
  expect(mergeClasses(newer, beforeRemoval).find(entry => entry.id === secondary)).toMatchObject({ deleted: true, version: 2 });
});
test('manual overrides keep their effective values after multiclass edits', () => {
  const character = record(); character.derivedOverrides = { proficiencyBonus: 0, spellSaveDC: 19 };
  applyClassEdit(character, { id: secondary, name: 'Cleric', level: 2, deleted: false }, 0);
  const values = calculateDerivedValues({ ...character, totalLevel: totalLevel(character) }, character.derivedOverrides);
  expect(values.proficiencyBonus).toMatchObject({ value: 0, calculated: 3, overridden: true });
  expect(values['save.wisdom'].value).toBe(1); expect(values.spellSaveDC.value).toBe(19);
});

test('legacy Overview level writes adjust primary to the requested total and retain secondary entries', () => {
  const character = record();
  applyClassEdit(character, { id: secondary, name: 'Cleric', level: 2, deleted: false }, 0);
  setOverviewValue(character, 'level', 6);
  expect(totalLevel(character)).toBe(6);
  expect(characterClasses(character).find(entry => entry.id === 'primary')?.level).toBe(4);
  expect(characterClasses(character).find(entry => entry.id === secondary)?.level).toBe(2);
  const before = structuredClone(character);
  expect(() => setOverviewValue(character, 'level', 2)).toThrow();
  expect(character).toEqual(before);
  expect(() => setOverviewValue(character, 'level', '6')).toThrow();
});

import { expect, test } from '@playwright/test';
import { abilityModifier, proficiencyBonus, proficiencyModifier, calculateDerivedValues, derivedValueKeys, type DerivedValueKey } from '../src/domain/derived-values';
import { abilityScoreKeys, skillKeys, type AbilityScoreKey, type SkillKey, type SkillProficiency } from '../src/domain/party';

const input = {
  totalLevel: 5,
  abilityScores: { strength: 9, dexterity: 17, constitution: 13, intelligence: 14, wisdom: 12, charisma: 11 },
  savingThrowProficiencies: Object.fromEntries(abilityScoreKeys.map(key => [key, 'none'])) as Record<AbilityScoreKey, SkillProficiency>,
  skillProficiencies: Object.fromEntries(skillKeys.map(key => [key, 'none'])) as Record<SkillKey, SkillProficiency>,
  spellcastingAbility: 'intelligence' as AbilityScoreKey | null,
};
for (const [score, modifier] of [[1,-5],[8,-1],[9,-1],[10,0],[11,0],[16,3],[17,3],[20,5],[30,10]]) {
  test(`Ability Score ${score} yields ${modifier}`, () => expect(abilityModifier(score)).toBe(modifier));
}
for (const [level, bonus] of [[1,2],[4,2],[5,3],[8,3],[9,4],[12,4],[13,5],[16,5],[17,6],[20,6]]) {
  test(`total level ${level} yields proficiency ${bonus}`, () => expect(proficiencyBonus(level)).toBe(bonus));
}
for (const [training, value] of [['none',-1],['proficient',2],['expertise',5]] as const) {
  test(`${training} adds the correct proficiency to a negative Ability modifier`, () => {
    expect(proficiencyModifier(-1,3,training)).toBe(value);
    const result = calculateDerivedValues({ ...input,
      savingThrowProficiencies: { ...input.savingThrowProficiencies, strength: training },
      skillProficiencies: { ...input.skillProficiencies, athletics: training },
    });
    expect(result['save.strength'].value).toBe(value);
    expect(result['skill.athletics'].value).toBe(value);
  });
}
test('all skills use their agreed Ability and spell and passive statistics use agreed inputs', () => {
  const results = calculateDerivedValues(input);
  const expected = { acrobatics:3, animalHandling:1, arcana:2, athletics:-1, deception:0, history:2,
    insight:1, intimidation:0, investigation:2, medicine:1, nature:2, perception:1, performance:0,
    persuasion:0, religion:2, sleightOfHand:3, stealth:3, survival:1 };
  for (const key of skillKeys) expect(results[`skill.${key}`].value).toBe(expected[key]);
  expect(results.initiative.value).toBe(3);
  expect(results.passivePerception.value).toBe(11);
  expect(results.spellAttack.value).toBe(5);
  expect(results.spellSaveDC.value).toBe(13);
});
for (const key of derivedValueKeys) {
  for (const override of [0,-7,12]) {
    test(`${key} preserves explicit ${override} and reset restores calculation`, () => {
      const overrides = { [key]: override };
      const results = calculateDerivedValues(input, overrides);
      expect(results[key]).toMatchObject({ value:override, overridden:true });
      const calculated = results[key].calculated;
      delete overrides[key];
      expect(calculateDerivedValues(input, overrides)[key]).toEqual({ value:calculated, calculated, overridden:false });
    });
  }
}
test('effective Ability, proficiency, and Perception overrides flow downstream without mutating inputs', () => {
  const before = JSON.stringify(input);
  const result = calculateDerivedValues({ ...input, skillProficiencies: { ...input.skillProficiencies, perception:'expertise' } }, {
    'ability.wisdom': 4, proficiencyBonus: 0, 'ability.dexterity': -2, 'ability.intelligence': -1,
  });
  expect(result['skill.perception'].value).toBe(4);
  expect(result.passivePerception.value).toBe(14);
  expect(result.initiative.value).toBe(-2);
  expect(result.spellAttack.value).toBe(-1);
  expect(result.spellSaveDC.value).toBe(7);
  expect(calculateDerivedValues(input, { 'skill.perception':0 }).passivePerception.value).toBe(10);
  expect(JSON.stringify(input)).toBe(before);
});
test('final overrides do not feed unrelated or upstream values', () => {
  const base = calculateDerivedValues(input);
  const overrides: Partial<Record<DerivedValueKey, number>> = { spellAttack:0, initiative:0, passivePerception:0, 'save.wisdom':0 };
  const result = calculateDerivedValues(input, overrides);
  for (const key of ['spellSaveDC','ability.dexterity','skill.perception','ability.wisdom'] as const) expect(result[key]).toEqual(base[key]);
});
test('unset spellcasting Ability stays unknown, supports independent zero overrides, and resets to unknown', () => {
  const unset = { ...input, spellcastingAbility: null };
  const result = calculateDerivedValues(unset, { spellAttack:0 });
  expect(result.spellAttack).toEqual({ calculated:null, value:0, overridden:true });
  expect(result.spellSaveDC.value).toBeNull();
  expect(calculateDerivedValues(unset).spellAttack.value).toBeNull();
});

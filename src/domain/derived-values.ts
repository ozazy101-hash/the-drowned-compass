import { abilityScoreKeys, skillKeys, type AbilityScoreKey, type AbilityScores, type SkillKey, type SkillProficiency } from './party.ts';

export type DerivedValueKey =
  | `ability.${AbilityScoreKey}` | `save.${AbilityScoreKey}` | `skill.${SkillKey}`
  | 'proficiencyBonus' | 'passivePerception' | 'initiative' | 'spellAttack' | 'spellSaveDC';
export type DerivedOverrides = Partial<Record<DerivedValueKey, number>>;
export type DerivedValue = { calculated: number | null; value: number | null; overridden: boolean };
export const derivedValueKeys: DerivedValueKey[] = [
  ...abilityScoreKeys.map((key): DerivedValueKey => `ability.${key}`),
  ...abilityScoreKeys.map((key): DerivedValueKey => `save.${key}`),
  ...skillKeys.map((key): DerivedValueKey => `skill.${key}`),
  'proficiencyBonus', 'passivePerception', 'initiative', 'spellAttack', 'spellSaveDC',
];
export const skillAbilities: Record<SkillKey, AbilityScoreKey> = {
  acrobatics: 'dexterity', animalHandling: 'wisdom', arcana: 'intelligence', athletics: 'strength',
  deception: 'charisma', history: 'intelligence', insight: 'wisdom', intimidation: 'charisma',
  investigation: 'intelligence', medicine: 'wisdom', nature: 'intelligence', perception: 'wisdom',
  performance: 'charisma', persuasion: 'charisma', religion: 'intelligence', sleightOfHand: 'dexterity',
  stealth: 'dexterity', survival: 'wisdom',
};

export function abilityModifier(score: number): number { return Math.floor((score - 10) / 2); }
export function proficiencyBonus(totalLevel: number): number { return 2 + Math.floor((totalLevel - 1) / 4); }
export function proficiencyModifier(ability: number, bonus: number, training: SkillProficiency): number {
  return ability + bonus * (training === 'expertise' ? 2 : training === 'proficient' ? 1 : 0);
}

// This seam takes total level independently of how classes are eventually stored.
// Dependencies use effective (possibly overridden) values. A final override stays local:
// spell attack does not feed DC, and initiative does not feed Dexterity.
export function calculateDerivedValues(input: {
  abilityScores: AbilityScores;
  totalLevel: number;
  savingThrowProficiencies: Record<AbilityScoreKey, SkillProficiency>;
  skillProficiencies: Record<SkillKey, SkillProficiency>;
  spellcastingAbility: AbilityScoreKey | null;
}, overrides: DerivedOverrides = {}): Record<DerivedValueKey, DerivedValue> {
  const results = {} as Record<DerivedValueKey, DerivedValue>;
  const put = (key: DerivedValueKey, calculated: number | null) => {
    const override = overrides[key];
    results[key] = { calculated, value: override ?? calculated, overridden: override !== undefined };
    return results[key].value;
  };
  for (const key of abilityScoreKeys) put(`ability.${key}`, abilityModifier(input.abilityScores[key]));
  const bonus = put('proficiencyBonus', proficiencyBonus(input.totalLevel))!;
  for (const key of abilityScoreKeys) {
    put(`save.${key}`, proficiencyModifier(results[`ability.${key}`].value!, bonus, input.savingThrowProficiencies[key]));
  }
  for (const key of skillKeys) {
    put(`skill.${key}`, proficiencyModifier(results[`ability.${skillAbilities[key]}`].value!, bonus, input.skillProficiencies[key]));
  }
  put('passivePerception', 10 + results['skill.perception'].value!);
  put('initiative', results['ability.dexterity'].value!);
  const spellModifier = input.spellcastingAbility === null ? null : results[`ability.${input.spellcastingAbility}`].value! + bonus;
  put('spellAttack', spellModifier);
  put('spellSaveDC', spellModifier === null ? null : 8 + spellModifier);
  return results;
}

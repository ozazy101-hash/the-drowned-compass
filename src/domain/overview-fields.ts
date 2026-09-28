import { abilityScoreKeys, skillKeys, type AbilityScoreKey, type CharacterRecord, type OverviewFieldKey, type OverviewFieldValue } from './party.ts';
import { derivedValueKeys, type DerivedValueKey } from './derived-values.ts';

export function overviewValue(character: CharacterRecord, field: OverviewFieldKey): OverviewFieldValue {
  if (field.startsWith('override.')) return character.derivedOverrides[field.slice(9) as DerivedValueKey] ?? null;
  if (field.startsWith('save.')) return character.savingThrowProficiencies[field.slice(5) as AbilityScoreKey];
  if (field.startsWith('skill.')) return character.skillProficiencies[field.slice(6) as keyof CharacterRecord['skillProficiencies']];
  if (abilityScoreKeys.includes(field as AbilityScoreKey)) return character.abilityScores[field as AbilityScoreKey];
  return (character as unknown as Record<string, OverviewFieldValue>)[field];
}

export function setOverviewValue(character: CharacterRecord, field: OverviewFieldKey, value: OverviewFieldValue) {
  if (field.startsWith('override.')) {
    const key = field.slice(9) as DerivedValueKey;
    if (!derivedValueKeys.includes(key) || (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || value < -999 || value > 999))) {
      throw new Error('Invalid Derived Value override.');
    }
    if (value === null) delete character.derivedOverrides[key];
    else character.derivedOverrides[key] = value as number;
  } else if (field.startsWith('save.')) {
    if (!abilityScoreKeys.includes(field.slice(5) as AbilityScoreKey) || !['none', 'proficient', 'expertise'].includes(String(value))) throw new Error('Invalid saving throw proficiency.');
    character.savingThrowProficiencies[field.slice(5) as AbilityScoreKey] = value as CharacterRecord['savingThrowProficiencies'][AbilityScoreKey];
  } else if (field.startsWith('skill.')) {
    if (!skillKeys.includes(field.slice(6) as keyof CharacterRecord['skillProficiencies']) || !['none', 'proficient', 'expertise'].includes(String(value))) throw new Error('Invalid skill proficiency.');
    character.skillProficiencies[field.slice(6) as keyof CharacterRecord['skillProficiencies']] = value as CharacterRecord['skillProficiencies'][keyof CharacterRecord['skillProficiencies']];
  } else if (abilityScoreKeys.includes(field as AbilityScoreKey)) {
    character.abilityScores[field as AbilityScoreKey] = value as number;
  } else {
    (character as unknown as Record<string, OverviewFieldValue>)[field] = value;
  }
}

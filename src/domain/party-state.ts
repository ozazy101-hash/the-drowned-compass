import { mergeMagic } from './character-magic';
import { mergeSurvival } from './survival';
import { mergeClasses, projectClasses } from './character-classes';
import { mergeInventory } from './inventory';
import { mergeResources } from './limited-resources';
import { mergeCharacterText } from './character-text';
import { mergeConditions } from './conditions';
import { mergeCombatEntries } from './combat-entries';
import { overviewValue, setOverviewValue } from './overview-fields';
import type { CharacterRecord, CharacterSlot, OverviewFieldKey, Party } from './party';

function mergeCharacterRecords(current: CharacterRecord, incoming: CharacterRecord) {
  const merged: CharacterRecord = {
    ...incoming,
    survival: mergeSurvival(current.survival, incoming.survival),
    classes: mergeClasses(current, incoming),
    limitedResources: mergeResources(current.limitedResources, incoming.limitedResources),
    inventory: mergeInventory(current.inventory, incoming.inventory),
    textEntries: mergeCharacterText(current.textEntries, incoming.textEntries),
    magic: mergeMagic(current.magic, incoming.magic),
    conditions: mergeConditions(current.conditions, incoming.conditions),
    combatEntries: mergeCombatEntries(current.combatEntries, incoming.combatEntries),
    abilityScores: { ...incoming.abilityScores },
    savingThrowProficiencies: { ...incoming.savingThrowProficiencies },
    skillProficiencies: { ...incoming.skillProficiencies },
    derivedOverrides: { ...incoming.derivedOverrides },
    fieldVersions: { ...incoming.fieldVersions },
  };

  for (const field of Object.keys(current.fieldVersions) as OverviewFieldKey[]) {
    const currentVersion = current.fieldVersions[field] ?? 0;
    if (currentVersion > (incoming.fieldVersions[field] ?? 0)) {
      if (field !== 'primaryClass' && field !== 'level') setOverviewValue(merged, field, overviewValue(current, field));
      merged.fieldVersions[field] = currentVersion;
    }
  }
  projectClasses(merged);
  return merged;
}

/** Accept a loaded/realtime Party without rolling back newer accepted fields or claims.
 * Equal versions retain the existing feature-specific tie semantics.
 * Neither input is mutated; absent current state accepts the incoming snapshot as-is.
 */
export function reconcileParty(current: Party | null, incoming: Party): Party {
  if (!current) return incoming;
  return {
    ...incoming,
    slots: incoming.slots.map((slot) => {
      const currentSlot = current.slots.find((candidate) => candidate.id === slot.id);
      if (!currentSlot?.character) return slot;
      if (!slot.character) return currentSlot;
      return {
        ...slot,
        character: mergeCharacterRecords(currentSlot.character, slot.character),
      };
    }),
  };
}

/** Accept a command's changed slot, retaining the rest of the Party.
 * A null Party remains unloaded; an unclaimed command result replaces that slot.
 * Character records use exactly the same reconciliation as realtime snapshots.
 */
export function reconcilePartySlot(current: Party | null, incoming: CharacterSlot): Party | null {
  if (!current) return current;
  return {
    ...current,
    slots: current.slots.map((slot) => {
      if (slot.id !== incoming.id) return slot;
      if (!slot.character || !incoming.character) return incoming;
      return { ...incoming, character: mergeCharacterRecords(slot.character, incoming.character) };
    }),
  };
}

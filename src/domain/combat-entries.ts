import type { AbilityScoreKey } from './party.ts';

export type CombatEntryDetails = {
  kind: 'attack' | 'action';
  name: string;
  attackBonus: string;
  ability: AbilityScoreKey | null;
  range: string;
  damage: string;
  damageType: string;
  notes: string;
};
export type CombatEntry = { id: string; details: CombatEntryDetails; rank: number; version: number; deleted: boolean };
export type CombatEntries = { entries: CombatEntry[]; primaryId: string | null; primaryVersion: number };
export type CombatEntryCommand =
  | { type: 'save'; id: string; details: CombatEntryDetails; rank: number; expectedVersion: number }
  | { type: 'remove'; id: string; expectedVersion: number }
  | { type: 'move'; id: string; rank: number; expectedVersion: number }
  | { type: 'primary'; id: string | null; expectedVersion: number };

export function emptyCombatEntries(): CombatEntries { return { entries: [], primaryId: null, primaryVersion: 0 }; }
export function visibleCombatEntries(state: CombatEntries) {
  return state.entries.filter(entry => !entry.deleted).sort((a,b) => a.rank - b.rank || a.id.localeCompare(b.id));
}
export function mergeCombatEntries(current = emptyCombatEntries(), incoming = emptyCombatEntries()): CombatEntries {
  const entries = new Map(incoming.entries.map(entry => [entry.id, entry]));
  for (const entry of current.entries) {
    if (entry.version > (entries.get(entry.id)?.version ?? 0)) entries.set(entry.id, entry);
  }
  const primary = current.primaryVersion > incoming.primaryVersion ? current : incoming;
  return { entries: [...entries.values()], primaryId: primary.primaryId, primaryVersion: primary.primaryVersion };
}
export function primaryAttackSummary(state = emptyCombatEntries()): string | null {
  const entry = state.entries.find(entry => entry.id === state.primaryId && !entry.deleted && entry.details.kind === 'attack');
  if (!entry) return null;
  const d = entry.details;
  const bonus = d.ability ? `${d.ability[0].toUpperCase()}${d.ability.slice(1)}` : d.attackBonus ? `${Number(d.attackBonus) >= 0 ? '+' : ''}${Number(d.attackBonus)} to hit` : '';
  return [d.name, bonus, [d.damage, d.damageType].filter(Boolean).join(' '), d.range].filter(Boolean).join(' · ');
}
export function validateCombatDetails(details: CombatEntryDetails) {
  if (!details || !['attack','action'].includes(details.kind) || typeof details.name !== 'string' || !details.name.trim() || details.name.length > 120) throw new Error('Enter a name up to 120 characters.');
  for (const key of ['attackBonus','range','damage','damageType','notes'] as const) {
    if (typeof details[key] !== 'string' || details[key].length > (key === 'notes' ? 4000 : 120)) throw new Error('Short fields allow 120 characters; notes allow 4000.');
  }
  if (details.attackBonus !== '' && (!/^-?\d{1,3}$/.test(details.attackBonus) || Math.abs(Number(details.attackBonus)) > 999)) throw new Error('Attack bonus must be a whole number from -999 to 999.');
  if (details.ability !== null && !['strength','dexterity','constitution','intelligence','wisdom','charisma'].includes(details.ability)) throw new Error('Choose a relevant Ability.');
}
// Used by both local storage and the shared browser-test transport.
export function applyCombatEntryCommand(state: CombatEntries, command: CombatEntryCommand): boolean {
  if (!command || !['save','move','remove','primary'].includes(command.type)) throw new Error('Invalid attack or action command.');
  if (command.type !== 'primary' && (typeof command.id !== 'string' || !command.id)) throw new Error('Invalid record.');
  if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 0) throw new Error('Invalid version.');
  if (command.type === 'primary') {
    if (command.expectedVersion !== state.primaryVersion) return false;
    if (command.id !== null && !state.entries.some(e => e.id === command.id && !e.deleted && e.details.kind === 'attack')) throw new Error('Choose an available attack.');
    state.primaryId = command.id;
    state.primaryVersion += 1;
    return true;
  }
  const entry = state.entries.find(e => e.id === command.id);
  if ((entry?.version ?? 0) !== command.expectedVersion || entry?.deleted) return false;
  if (command.type === 'save') {
    validateCombatDetails(command.details);
    if (!Number.isFinite(command.rank) || Math.abs(command.rank) > 1e12) throw new Error('Invalid order.');
    if (entry) { entry.details = structuredClone(command.details); entry.rank = command.rank; entry.version += 1; }
    else state.entries.push({ id: command.id, details: structuredClone(command.details), rank: command.rank, version: 1, deleted: false });
    if (state.primaryId === command.id && command.details.kind !== 'attack') { state.primaryId = null; state.primaryVersion += 1; }
  } else {
    if (!entry) return false;
    if (command.type === 'remove') {
      entry.deleted = true;
      if (state.primaryId === entry.id) { state.primaryId = null; state.primaryVersion += 1; }
    } else {
      if (!Number.isFinite(command.rank) || Math.abs(command.rank) > 1e12) throw new Error('Invalid order.');
      entry.rank = command.rank;
    }
    entry.version += 1;
  }
  return true;
}

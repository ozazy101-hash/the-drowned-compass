import { findSpell } from './spell-catalog.ts';
export const availabilityKinds = ['Known', 'Prepared', 'Always Prepared', 'Item granted', 'Feature granted'] as const;
export type SpellAvailability = typeof availabilityKinds[number];
export type CharacterSpell = { id: string; catalogId: string | null; name: string; level: number; availability: SpellAvailability; source: string; notes: string; deleted: boolean; version: number };
export type SpellSlot = { id: string; level: number; maximum: number; remaining: number; version: number };
export type MagicCommand =
  | { kind: 'spell'; spell: Omit<CharacterSpell, 'version'>; expectedVersion: number }
  | { kind: 'slots'; level: number; action: 'configure'; maximum: number; remaining: number; expectedVersion: number }
  | { kind: 'slots'; level: number; action: 'spend' | 'restore'; expectedVersion: number };
export type CharacterMagic = { spells: CharacterSpell[]; slots: SpellSlot[] };
export function emptyMagic(): CharacterMagic { return { spells: [], slots: [] }; }
function mergeRecords<T extends { id: string; version: number }>(current: T[], incoming: T[]) {
  const records = new Map(incoming.map(record => [record.id, record]));
  for (const record of current) if (record.version > (records.get(record.id)?.version ?? 0)) records.set(record.id, record);
  return [...records.values()];
}
export function mergeMagic(current = emptyMagic(), incoming = emptyMagic()): CharacterMagic {
  return { spells: mergeRecords(current.spells, incoming.spells), slots: mergeRecords(current.slots, incoming.slots) };
}
export function validateMagicCommand(command: MagicCommand) {
  if (!command || !Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 0 || command.expectedVersion >= Number.MAX_SAFE_INTEGER) throw new Error('Invalid Magic version.');
  if (command.kind === 'spell') {
    const s = command.spell;
    if (!s || Object.keys(s).sort().join(',') !== 'availability,catalogId,deleted,id,level,name,notes,source' || typeof s.deleted !== 'boolean' || !availabilityKinds.includes(s.availability) || typeof s.source !== 'string' || s.source.length > 240 || typeof s.notes !== 'string' || s.notes.length > 10000) throw new Error('Invalid Character Spell.');
    if (s.catalogId !== null) {
      if (typeof s.catalogId !== 'string' || !findSpell(s.catalogId) || s.id !== s.catalogId || s.name !== '' || s.level !== 0) throw new Error('Choose a Spell Catalog entry.');
    } else if (!/^custom\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s.id) || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 120 || !Number.isInteger(s.level) || s.level < 0 || s.level > 9) throw new Error('Custom Spells need a name and level from 0 to 9.');
    if ((s.availability === 'Item granted' || s.availability === 'Feature granted') && !s.source.trim()) throw new Error('Enter the item or feature granting this spell.');
  } else if (command.kind === 'slots') {
    if (!Number.isInteger(command.level) || command.level < 1 || command.level > 9 || !['configure', 'spend', 'restore'].includes(command.action)) throw new Error('Choose a spell slot level from 1 to 9.');
    if (command.action === 'configure' && (![command.maximum, command.remaining].every(n => Number.isInteger(n) && n >= 0 && n <= 99) || command.remaining > command.maximum)) throw new Error('Remaining slots must be between 0 and the maximum (up to 99).');
  } else throw new Error('Invalid Magic command.');
}
// Applies only the addressed spell or slot level; retained tombstones protect removal and re-add.
export function applyMagicCommand(state: CharacterMagic, command: MagicCommand): boolean {
  validateMagicCommand(command);
  if (command.kind === 'spell') {
    const prior = state.spells.find(s => s.id === command.spell.id);
    if ((prior?.version ?? 0) !== command.expectedVersion || (!prior && command.spell.deleted)) return false;
    if (prior && prior.catalogId !== command.spell.catalogId) throw new Error('Spell identity cannot change.');
    const s = command.spell;
    const next: CharacterSpell = { id: s.id, catalogId: s.catalogId, name: s.name.trim(), level: s.level, availability: s.availability, source: s.source.trim(), notes: s.notes, deleted: s.deleted, version: command.expectedVersion + 1 };
    if (prior) Object.assign(prior, next); else state.spells.push(next);
  } else {
    const prior = state.slots.find(s => s.level === command.level);
    if ((prior?.version ?? 0) !== command.expectedVersion) return false;
    const maximum = command.action === 'configure' ? command.maximum : prior?.maximum ?? 0;
    const remaining = command.action === 'configure' ? command.remaining : (prior?.remaining ?? 0) + (command.action === 'spend' ? -1 : 1);
    if (remaining < 0 || remaining > maximum) throw new Error('No slots can be spent or restored beyond the configured bounds.');
    const next = { id: `slots.${command.level}`, level: command.level, maximum, remaining, version: command.expectedVersion + 1 };
    if (prior) Object.assign(prior, next); else state.slots.push(next);
  }
  return true;
}

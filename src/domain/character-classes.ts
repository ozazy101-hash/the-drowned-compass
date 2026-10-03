import type { CharacterRecord } from './party.ts';

export type CharacterClass = { id: string; name: string; level: number; version: number; deleted: boolean };
export type ClassEdit = Omit<CharacterClass, 'version'>;

// The primary entry has a stable identity; removing it would leave identity ambiguous.
// Additional entries are independent records. Tombstones preserve stale-write detection.
export function characterClasses(character: CharacterRecord): CharacterClass[] {
  return character.classes ?? [{ id: 'primary', name: character.primaryClass, level: character.level,
    version: 1, deleted: false }];
}
export function totalLevel(character: CharacterRecord): number {
  return characterClasses(character).filter(entry => !entry.deleted).reduce((sum, entry) => sum + entry.level, 0);
}
export function classSummary(character: CharacterRecord): string {
  const entries = characterClasses(character).filter(entry => !entry.deleted);
  const primary = entries.find(entry => entry.id === 'primary')!;
  if (entries.length === 1) return `Level ${primary.level} ${primary.name} · ${character.subclass}`;
  const ordered = [primary, ...entries.filter(entry => entry.id !== 'primary')];
  return `Level ${totalLevel(character)} · ${ordered.map(entry => `${entry.name} ${entry.level}${entry.id === 'primary' ? ' (primary)' : ''}`).join(' / ')} · ${character.subclass}`;
}
export function validateClassEdit(edit: ClassEdit, expectedVersion: number) {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new Error('Invalid class version.');
  if (edit.id !== 'primary' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(edit.id)) throw new Error('Invalid class identity.');
  if (typeof edit.name !== 'string' || !edit.name.trim() || edit.name.trim().length > 160) throw new Error('Enter a class name (up to 160 characters).');
  if (!Number.isInteger(edit.level) || edit.level < 1 || edit.level > 20) throw new Error('Class levels must be whole numbers from 1 to 20.');
  if (typeof edit.deleted !== 'boolean' || (edit.id === 'primary' && edit.deleted)) throw new Error('The primary class cannot be removed.');
}
export function applyClassEdit(character: CharacterRecord, edit: ClassEdit, expectedVersion: number): boolean {
  validateClassEdit(edit, expectedVersion);
  const entries = characterClasses(character);
  const previous = entries.find(entry => entry.id === edit.id);
  if ((previous?.version ?? 0) !== expectedVersion) return false;
  // Removed entries cannot be restored by a delayed editor. Add a fresh entry instead.
  if (previous?.deleted || (!previous && edit.deleted)) return false;
  const next = { ...edit, name: edit.name.trim(), version: expectedVersion + 1 };
  const updated = [...entries.filter(entry => entry.id !== edit.id), next];
  const level = updated.filter(entry => !entry.deleted).reduce((sum, entry) => sum + entry.level, 0);
  if (level < 1 || level > 20) throw new Error('Total level must be between 1 and 20.');
  character.classes = updated;
  projectClasses(character);
  // Keep legacy field clients conditional against any primary edit.
  character.fieldVersions.level = (character.fieldVersions.level ?? 0) + 1;
  if (edit.id === 'primary') character.fieldVersions.primaryClass = (character.fieldVersions.primaryClass ?? 0) + 1;
  return true;
}
export function projectClasses(character: CharacterRecord) {
  const primary = characterClasses(character).find(entry => entry.id === 'primary')!;
  character.primaryClass = primary.name;
  character.level = totalLevel(character);
}
export function mergeClasses(current: CharacterRecord, incoming: CharacterRecord): CharacterClass[] {
  const entries = new Map(characterClasses(incoming).map(entry => [entry.id, entry]));
  for (const entry of characterClasses(current)) {
    if (entry.version > (entries.get(entry.id)?.version ?? 0)) entries.set(entry.id, entry);
  }
  return [...entries.values()].map(entry => ({ ...entry }));
}

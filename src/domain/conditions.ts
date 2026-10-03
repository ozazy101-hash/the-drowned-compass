import { standardConditionNames } from './rules-reference.ts';
export type Condition = { id: string; standard: string | null; label: string; deleted: boolean; version: number };
export type ConditionCommand = { id: string; standard: string | null; label: string; deleted: boolean; expectedVersion: number };
export function activeConditions(entries: readonly Condition[] = []) { return entries.filter(e => !e.deleted); }
export function mergeConditions(current: Condition[] = [], incoming: Condition[] = []) {
  const records = new Map(incoming.map(e => [e.id, e]));
  for (const e of current) if (e.version > (records.get(e.id)?.version ?? 0)) records.set(e.id, e);
  return [...records.values()];
}
export function validateCondition(c: ConditionCommand) {
  if (!c || !Number.isSafeInteger(c.expectedVersion) || c.expectedVersion < 0 || typeof c.deleted !== 'boolean') throw new Error('Invalid Condition command.');
  if (c.standard !== null) {
    if (!(standardConditionNames as readonly string[]).includes(c.standard) || c.id !== `srd.${c.standard}` || c.label !== c.standard) throw new Error('Choose a standard SRD Condition.');
  } else if (!/^custom\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(c.id) || typeof c.label !== 'string' || !c.label.trim() || c.label.length > 120) throw new Error('Custom Conditions need a name of 1–120 characters.');
}
// Mutates only the addressed association; retained versions make removal/re-add safe.
export function applyConditionCommand(entries: Condition[], command: ConditionCommand): boolean {
  validateCondition(command);
  const prior = entries.find(e => e.id === command.id);
  if ((prior?.version ?? 0) !== command.expectedVersion) return false;
  if (prior && prior.standard !== command.standard) throw new Error('Condition identity cannot change.');
  const label = command.label.trim();
  if (!command.deleted && entries.some(e => e.id !== command.id && !e.deleted && e.standard === command.standard && e.label.toLowerCase() === label.toLowerCase())) throw new Error('That Condition is already active.');
  if (!prior && command.deleted) return false;
  const next = { id: command.id, standard: command.standard, label, deleted: command.deleted, version: command.expectedVersion + 1 };
  if (prior) Object.assign(prior, next); else entries.push(next);
  return true;
}

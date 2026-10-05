import type { CharacterRecord } from './party.ts';
import { initialSurvival } from './survival.ts';
export type RestKind = 'Short Rest' | 'Long Rest';
export type RestChange =
  | { kind: 'health'; field: 'current' | 'successes' | 'failures'; expectedVersion: number; maximumVersion?: number }
  | { kind: 'resource'; id: string; expectedVersion: number }
  | { kind: 'slots'; level: number; expectedVersion: number };
export type RestCommand = { operationId: string; rest: RestKind; changes: RestChange[] };
export type RestProposal = { key: string; label: string; before: string; after: string; change: RestChange };
export const restChangeKey = (c: RestChange) => c.kind === 'health' ? `health.${c.field}` : c.kind === 'resource' ? `resource.${c.id.toLowerCase()}` : `slots.${c.level}`;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const version = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER;
export function validateRestCommand(command: RestCommand) {
  if (!command || Object.keys(command).sort().join(',') !== 'changes,operationId,rest' || !uuid.test(command.operationId) || !['Short Rest', 'Long Rest'].includes(command.rest) || !Array.isArray(command.changes) || !command.changes.length || command.changes.length > 1000) throw new Error('Invalid rest command.');
  const keys = new Set<string>();
  for (const c of command.changes) {
    if (!c || !version(c.expectedVersion)) throw new Error('Invalid rest version.');
    const fields = Object.keys(c).sort().join(',');
    if (c.kind === 'resource') {
      if (fields !== 'expectedVersion,id,kind' || !uuid.test(c.id) || c.expectedVersion >= 2147483647) throw new Error('Invalid rest resource.');
    } else if (c.kind === 'slots') {
      if (fields !== 'expectedVersion,kind,level' || command.rest !== 'Long Rest' || !Number.isInteger(c.level) || c.level < 1 || c.level > 9) throw new Error('Invalid rest slots.');
    } else if (c.kind === 'health') {
      if (command.rest !== 'Long Rest' || !['current', 'successes', 'failures'].includes(c.field) || fields !== (c.field === 'current' ? 'expectedVersion,field,kind,maximumVersion' : 'expectedVersion,field,kind') || (c.field === 'current' && !version(c.maximumVersion))) throw new Error('Invalid rest health.');
    } else throw new Error('Invalid rest change.');
    const key = restChangeKey(c); if (keys.has(key)) throw new Error('Duplicate rest change.'); keys.add(key);
  }
}
// Only saved state supplies recovery values. Zero/full counts create no proposed writes.
export function previewRest(character: CharacterRecord, rest: RestKind): RestProposal[] {
  const proposals: RestProposal[] = [];
  const add = (label: string, before: string, after: string, change: RestChange) => proposals.push({ key: restChangeKey(change), label, before, after, change });
  for (const r of character.limitedResources ?? []) if (!r.deleted && r.current !== r.maximum && (r.recovery === 'Short Rest' || (rest === 'Long Rest' && r.recovery === 'Long Rest'))) add(r.name, `${r.current} / ${r.maximum}`, `${r.maximum} / ${r.maximum}`, { kind: 'resource', id: r.id, expectedVersion: r.version });
  if (rest === 'Long Rest') {
    const s = character.survival ?? initialSurvival();
    if (s.current !== character.maxHitPoints) add('Current Hit Points', s.current === null ? 'Unknown' : String(s.current), String(character.maxHitPoints), { kind: 'health', field: 'current', expectedVersion: s.version, maximumVersion: character.fieldVersions.maxHitPoints ?? 0 });
    for (const field of ['successes', 'failures'] as const) if (s[field] !== 0) add(`Death save ${field}`, String(s[field]), '0', { kind: 'health', field, expectedVersion: s.version });
    for (const s of character.magic?.slots ?? []) if (s.remaining !== s.maximum) add(`Level ${s.level} spell slots`, `${s.remaining} / ${s.maximum}`, `${s.maximum} / ${s.maximum}`, { kind: 'slots', level: s.level, expectedVersion: s.version });
  }
  return proposals;
}
// Validate every selected record first: conflicts never leave partial recovery.
// The latest operation receipt makes an immediate ambiguous network retry idempotent.
export function applyRestCommand(character: CharacterRecord, command: RestCommand): boolean {
  validateRestCommand(command);
  if (character.lastRest?.operationId === command.operationId) {
    const fingerprint = (c: RestCommand) => JSON.stringify([c.operationId, c.rest, c.changes.map(change => change.kind === 'health' ? [change.kind, change.field, change.expectedVersion, change.maximumVersion] : change.kind === 'resource' ? [change.kind, change.id, change.expectedVersion] : [change.kind, change.level, change.expectedVersion])]);
    if (fingerprint(character.lastRest) !== fingerprint(command)) throw new Error('Rest operation identity cannot change.');
    return true;
  }
  const proposals = previewRest(character, command.rest);
  for (const c of command.changes) {
    const candidate = proposals.find(p => p.key === restChangeKey(c))?.change;
    if (!candidate || candidate.expectedVersion !== c.expectedVersion || (c.kind === 'health' && c.field === 'current' && (candidate as typeof c).maximumVersion !== c.maximumVersion)) return false;
  }
  const health = command.changes.filter(c => c.kind === 'health');
  if (health.length) {
    const next = structuredClone(character.survival ?? initialSurvival());
    for (const c of health) if (c.kind === 'health') { next[c.field] = c.field === 'current' ? character.maxHitPoints : 0; if (c.field === 'current') next.undo = null; }
    next.version++; character.survival = next;
  }
  for (const c of command.changes) {
    if (c.kind === 'resource') { const r = character.limitedResources!.find(r => r.id.toLowerCase() === c.id.toLowerCase())!; r.current = r.maximum; r.version++; }
    if (c.kind === 'slots') { const s = character.magic!.slots.find(s => s.level === c.level)!; s.remaining = s.maximum; s.version++; }
  }
  character.lastRest = structuredClone(command);
  return true;
}

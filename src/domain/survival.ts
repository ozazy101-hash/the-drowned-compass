export type Health = { current: number | null; temporary: number };
export type Survival = Health & {
  version: number; successes: number; failures: number; unconscious: boolean; inspiration: boolean;
  undo: { before: Health; maximumVersion: number; label: string } | null;
};
export type SurvivalCommand =
  | { kind: 'damage' | 'heal'; amount: number }
  | { kind: 'correct'; field: 'current' | 'temporary'; value: number }
  | { kind: 'track'; field: 'successes' | 'failures'; value: number }
  | { kind: 'track'; field: 'unconscious' | 'inspiration'; value: boolean }
  | { kind: 'undo' };
export function initialSurvival(): Survival {
  return { current: null, temporary: 0, version: 0, successes: 0, failures: 0, unconscious: false, inspiration: false, undo: null };
}
function integer(value: number, maximum = 9999) {
  if (!Number.isInteger(value) || value < 0 || value > maximum) throw new Error(`Enter a whole number from 0 to ${maximum}.`);
}
// Unknown current HP remains explicit until a player supplies it. Corrections permit table rulings above maximum.
export function transitionSurvival(state: Survival, command: SurvivalCommand, maximum: number, maximumVersion: number): Survival | null {
  if (!['damage', 'heal', 'correct', 'track', 'undo'].includes(command.kind)) throw new Error('Invalid survival command.');
  if (command.kind === 'track' && !['successes', 'failures', 'unconscious', 'inspiration'].includes(command.field)) throw new Error('Invalid survival field.');
  const next = structuredClone(state);
  if (command.kind === 'undo') {
    if (!state.undo || state.undo.maximumVersion !== maximumVersion) return null;
    Object.assign(next, state.undo.before); next.undo = null;
  } else if (command.kind === 'track') {
    if (command.field === 'successes' || command.field === 'failures') integer(command.value, 3);
    else if (typeof command.value !== 'boolean') throw new Error('Choose a survival state.');
    Object.assign(next, { [command.field]: command.value });
  } else {
    const value = command.kind === 'correct' ? command.value : command.amount;
    integer(value);
    if (command.kind !== 'correct' && state.current === null) throw new Error('Set Current Hit Points before applying damage or healing.');
    if (command.kind === 'correct') {
      if (!['current', 'temporary'].includes(command.field)) throw new Error('Invalid health field.');
      next[command.field] = value;
    } else if (command.kind === 'damage') {
      next.temporary = Math.max(0, state.temporary - value);
      next.current = Math.max(0, state.current! - Math.max(0, value - state.temporary));
    } else {
      next.current = Math.min(maximum, state.current! + value);
    }
    next.undo = { before: { current: state.current, temporary: state.temporary }, maximumVersion, label: command.kind };
  }
  next.version++;
  return next;
}
export function survivalState(state: Survival) {
  if (state.failures === 3) return 'Three failed death saves';
  if (state.current === 0) return state.successes === 3 ? 'Downed · Stable' : 'Downed · Unconscious';
  return state.unconscious ? 'Unconscious' : null;
}

export function mergeSurvival(current?: Survival, incoming?: Survival): Survival {
  return (current?.version ?? 0) > (incoming?.version ?? 0) ? current! : incoming ?? initialSurvival();
}

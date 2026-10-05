import './survival.css';
import { useState } from 'react';
import { initialSurvival, survivalState, transitionSurvival, type SurvivalCommand } from '../domain/survival';
import type { CharacterSlot, PartyData } from '../domain/party';
export function SurvivalSection({ slot, partyData, onSlotChanged }: { slot: CharacterSlot; partyData: PartyData; onSlotChanged: (slot: CharacterSlot) => void }) {
  const character = slot.character!; const state = character.survival ?? initialSurvival();
  const [pending, setPending] = useState<SurvivalCommand | null>(null);
  const [amount, setAmount] = useState(''); const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false);
  const [correction, setCorrection] = useState({ value: '' });
  async function save(command: SurvivalCommand) {
    setPending(command); setBusy(true); setStatus('Saving…');
    try {
      transitionSurvival(state, command, character.maxHitPoints, character.fieldVersions.maxHitPoints ?? 0);
      const result = await partyData.updateSurvival(slot.id, command, state.version, character.fieldVersions.maxHitPoints ?? 0);
      onSlotChanged(result.slot);
      setStatus(result.ok ? 'Saved' : 'Survival changed elsewhere. Review the latest values and try again.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Save failed. Try again.'); }
    finally { setPending(null); setBusy(false); }
  }
  const number = (value: string) => value.trim() === '' ? NaN : Number(value);
  return <section className="overview-panel survival-panel" aria-label="Health">
    <h2>Health</h2>
    <p className="survival-vitals">Current HP: <strong>{state.current ?? 'Unknown'}</strong> / {character.maxHitPoints}</p>
    {survivalState(state) && <p role="note">{survivalState(state)}</p>}
    <fieldset disabled={busy}>
      <legend>Health actions</legend>
      <div className="health-stepper">
        <button type="button" aria-label="Subtract one Hit Point" disabled={state.current === null || state.current === 0} onClick={() => void save({ kind: 'subtract', amount: 1 })}>−</button>
        <button type="button" aria-label="Add one Hit Point" disabled={state.current === null || state.current >= character.maxHitPoints} onClick={() => void save({ kind: 'add', amount: 1 })}>+</button>
      </div>
      <label>Amount<input type="number" inputMode="numeric" min="0" max="9999" step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <button type="button" disabled={state.current === null} onClick={() => void save({ kind: 'subtract', amount: number(amount) })}>Subtract</button>
      <button type="button" disabled={state.current === null} onClick={() => void save({ kind: 'add', amount: number(amount) })}>Add</button>
      <details><summary>{state.current === null ? 'Set Current Hit Points' : 'Correct Current Hit Points'}</summary>
        <label>Current Hit Points<input type="number" inputMode="numeric" min="0" max={character.maxHitPoints} step="1" value={correction.value} onChange={e => setCorrection({ value: e.target.value })} /></label>
        <button type="button" onClick={() => void save({ kind: 'set-current', value: number(correction.value) })}>Save Current Hit Points</button>
        <p>Maximum Hit Points comes from the Character Record in Overview.</p>
      </details>
      {(['successes', 'failures'] as const).map(field => <label key={field}>Death-save {field}<select value={state[field]} onChange={e => void save({ kind: 'track', field, value: Number(e.target.value) })}>{[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}</select></label>)}
      <label><input type="checkbox" checked={pending?.kind === 'track' && pending.field === 'inspiration' ? pending.value : state.inspiration} onChange={e => void save({ kind: 'track', field: 'inspiration', value: e.target.checked })} />Heroic Inspiration</label>
      <label><input type="checkbox" checked={pending?.kind === 'track' && pending.field === 'unconscious' ? pending.value : state.unconscious} onChange={e => void save({ kind: 'track', field: 'unconscious', value: e.target.checked })} />Unconscious (manual)</label>
    </fieldset>
    <p role="status" aria-live="polite">{status}</p>
  </section>;
}

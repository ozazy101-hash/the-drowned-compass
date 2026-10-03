import './survival.css';
import { useState } from 'react';
import { initialSurvival, survivalState, transitionSurvival, type SurvivalCommand } from '../domain/survival';
import type { CharacterSlot, PartyData } from '../domain/party';
export function SurvivalSection({ slot, partyData, onSlotChanged }: { slot: CharacterSlot; partyData: PartyData; onSlotChanged: (slot: CharacterSlot) => void }) {
  const character = slot.character!; const state = character.survival ?? initialSurvival();
  const [pending, setPending] = useState<SurvivalCommand | null>(null);
  const [amount, setAmount] = useState(''); const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false);
  const [correction, setCorrection] = useState({ field: 'current' as 'current' | 'temporary', value: '' });
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
  return <section className="overview-panel survival-panel" aria-label="Hit Points and survival">
    <h2>Hit Points and survival</h2>
    <p className="survival-vitals">Current HP: <strong>{state.current ?? 'Unknown'}</strong> / {character.maxHitPoints}{state.temporary > 0 && <> · Temporary HP: {state.temporary}</>}</p>
    {survivalState(state) && <p role="note">{survivalState(state)}</p>}
    <fieldset disabled={busy}>
      <legend>Health actions</legend>
      <label>Damage or healing amount<input type="number" min="0" max="9999" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <button type="button" onClick={() => void save({ kind: 'damage', amount: number(amount) })}>Apply Damage</button>
      <button type="button" onClick={() => void save({ kind: 'heal', amount: number(amount) })}>Heal</button>
      {state.undo && <p>Recent HP action: {state.undo.label}</p>}
      <button type="button" disabled={!state.undo || state.undo.maximumVersion !== (character.fieldVersions.maxHitPoints ?? 0)} onClick={() => void save({ kind: 'undo' })}>Undo recent HP action</button>
      <label>Correct health field<select value={correction.field} onChange={e => setCorrection({ ...correction, field: e.target.value as 'current' | 'temporary' })}><option value="current">Current Hit Points</option><option value="temporary">Temporary Hit Points</option></select></label>
      <label>Corrected Hit Points<input type="number" min="0" max="9999" value={correction.value} onChange={e => setCorrection({ ...correction, value: e.target.value })} /></label>
      <button type="button" onClick={() => void save({ kind: 'correct', field: correction.field, value: number(correction.value) })}>Save HP correction</button>
      <p>Maximum Hit Points can be corrected in Overview. Temporary Hit Points absorb damage and remain separate from healing.</p>
      {(['successes', 'failures'] as const).map(field => <label key={field}>Death-save {field}<select value={state[field]} onChange={e => void save({ kind: 'track', field, value: Number(e.target.value) })}>{[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}</select></label>)}
      <label><input type="checkbox" checked={pending?.kind === 'track' && pending.field === 'inspiration' ? pending.value : state.inspiration} onChange={e => void save({ kind: 'track', field: 'inspiration', value: e.target.checked })} />Heroic Inspiration</label>
      <label><input type="checkbox" checked={pending?.kind === 'track' && pending.field === 'unconscious' ? pending.value : state.unconscious} onChange={e => void save({ kind: 'track', field: 'unconscious', value: e.target.checked })} />Unconscious (manual)</label>
    </fieldset>
    <p role="status" aria-live="polite">{status}</p>
  </section>;
}

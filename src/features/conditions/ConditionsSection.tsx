import { useState } from 'react';
import { activeConditions, type Condition, type ConditionCommand } from '../../domain/conditions';
import { rulesReferences, standardConditionNames } from '../../domain/rules-reference';
import type { CharacterSlot, PartyData } from '../../domain/party';
import { RulesTooltip } from '../rules/RulesTooltip';

export function ConditionList({ conditions = [], remove, rename, busy = false }: {
  conditions?: Condition[]; remove?: (c: Condition) => void; rename?: (c: Condition, label: string) => void; busy?: boolean;
}) {
  const active = activeConditions(conditions);
  return <div className="condition-list" role="group" aria-label="Active Conditions">
    <strong>Conditions</strong>
    {!active.length && <span>No active Conditions</span>}
    {active.map(c => <span key={c.id} className="condition-chip">
      {c.standard ? <RulesTooltip reference={rulesReferences[c.standard]} /> : <>
        <span className="custom-label">{c.label} <small>(Custom)</small></span>
        {rename && <CustomRename condition={c} onSave={rename} busy={busy} />}
      </>}
      {remove && <button type="button" disabled={busy} aria-label={`Remove ${c.label} Condition`} onClick={() => remove(c)}>×</button>}
    </span>)}
  </div>;
}
function CustomRename({ condition, onSave, busy }: { condition: Condition; onSave: (c: Condition, label: string) => void; busy: boolean }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(condition.label);
  if (!editing) return <button disabled={busy} type="button" aria-label={`Rename ${condition.label} Condition`} onClick={() => { setLabel(condition.label); setEditing(true); }}>Rename</button>;
  return <form onSubmit={e => { e.preventDefault(); onSave(condition, label); setEditing(false); }}>
    <input autoFocus aria-label={`New name for ${condition.label}`} value={label} maxLength={120} required onChange={e => setLabel(e.target.value)} />
    <button disabled={busy || !label.trim()} type="submit">Save name</button>
    <button type="button" onClick={() => setEditing(false)}>Cancel rename</button>
  </form>;
}
export function ConditionsSection({ slot, partyData, onSlotChanged }: {
  slot: CharacterSlot; partyData: PartyData; onSlotChanged: (slot: CharacterSlot) => void;
}) {
  const conditions = slot.character?.conditions ?? [];
  const [search, setSearch] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState<ConditionCommand | null>(null);
  const save = async (command: ConditionCommand) => {
    setBusy(true); setMessage('Saving…'); setRetry(null);
    try {
      const result = await partyData.updateCondition(slot.id, command);
      onSlotChanged(result.slot);
      if (result.ok) { setMessage('Saved'); if (!command.standard && command.expectedVersion === 0) setLabel(''); }
      else { setMessage('Conditions changed elsewhere. Review the current Conditions and retry.'); setRetry(command); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The Condition could not be saved.'); setRetry(command); }
    finally { setBusy(false); }
  };
  return <section className="overview-section conditions-section" aria-labelledby="conditions-heading">
    <h2 id="conditions-heading">Conditions</h2>
    <ConditionList conditions={conditions} busy={busy}
      remove={c => void save({ ...c, deleted: true, expectedVersion: c.version })}
      rename={(c, name) => void save({ ...c, label: name, expectedVersion: c.version })} />
    <label>Search standard Conditions<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
    <div className="condition-selector">
      {standardConditionNames.filter(name => name.toLowerCase().includes(search.toLowerCase().trim())).map(name => {
        const prior = conditions.find(c => c.id === `srd.${name}`);
        return <button key={name} type="button" disabled={busy || (!!prior && !prior.deleted)} onClick={() => void save({ id: `srd.${name}`, standard: name, label: name, deleted: false, expectedVersion: prior?.version ?? 0 })}>
          {prior && !prior.deleted ? `${name} — active` : `Add ${name}`}
        </button>;
      })}
      {!standardConditionNames.some(name => name.toLowerCase().includes(search.toLowerCase().trim())) && <p>No standard Conditions match.</p>}
    </div>
    <form onSubmit={e => { e.preventDefault(); void save({ id: `custom.${crypto.randomUUID()}`, standard: null, label, deleted: false, expectedVersion: 0 }); }}>
      <label>Custom Condition name<input value={label} required maxLength={120} onChange={e => setLabel(e.target.value)} /></label>
      <button type="submit" disabled={busy || !label.trim()}>Add Custom Condition</button>
    </form>
    <p role="status">{message}</p>
    {retry && <button type="button" disabled={busy} onClick={() => void save({ ...retry, expectedVersion: conditions.find(c => c.id === retry.id)?.version ?? 0 })}>Retry Condition save</button>}
    <details><summary>Rules licensing and attribution</summary>
      <p>This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at <a href="https://www.dndbeyond.com/srd">https://www.dndbeyond.com/srd</a>. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at <a href="https://creativecommons.org/licenses/by/4.0/legalcode">https://creativecommons.org/licenses/by/4.0/legalcode</a>.</p>
      <p>Rules References are condensed summaries. Consult the linked official source for complete rules.</p>
    </details>
  </section>;
}

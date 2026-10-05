import { useLayoutEffect, useState } from 'react';
import { availabilityKinds, emptyMagic, type CharacterSpell, type MagicCommand, type SpellSlot } from '../../domain/character-magic';
import { characterClasses } from '../../domain/character-classes';
import { findSpell } from '../../domain/spell-catalog';
import type { CharacterSlot, OverviewUpdateResult, PartyData } from '../../domain/party';
import { SpellCatalog, SpellDetails } from './SpellCatalog';
import './magic.css';
type Save = (command: MagicCommand) => Promise<OverviewUpdateResult>;
const nameOf = (spell: CharacterSpell) => spell.catalogId ? findSpell(spell.catalogId)?.name ?? 'Spell' : spell.name;
function SpellEditor({ spell, save, visible }: { spell: CharacterSpell; save: Save; visible: boolean }) {
  const [draft, setDraft] = useState(spell);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState<boolean | null>(null);
  const stale = dirty && spell.version !== draft.version;
  useLayoutEffect(() => { if (!dirty) setDraft(spell); }, [spell.version, dirty]);
  const edit = (patch: Partial<CharacterSpell>) => { setDraft({ ...draft, ...patch }); setDirty(true); setFailed(null); setMessage('Unsaved changes'); };
  const submit = async (deleted = false, overwrite = false) => {
    setBusy(true); setMessage('Saving…'); setFailed(null);
    try {
      const { version: _version, ...data } = draft;
      const result = await save({ kind: 'spell', spell: { ...data, deleted }, expectedVersion: overwrite ? spell.version : draft.version });
      if (result.ok) { setDirty(false); setMessage('Saved'); }
      else { setDirty(true); setMessage('This spell changed elsewhere. Review the saved spell before replacing it.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Spell could not be saved.'); setFailed(deleted); }
    finally { setBusy(false); }
  };
  const catalog = spell.catalogId ? findSpell(spell.catalogId) : undefined;
  if (spell.deleted && !dirty && failed === null) return null;
  return <article hidden={!visible} className="magic-record" aria-label={`${nameOf(spell)} Character Spell`}>
    <h3>{nameOf(spell)} {catalog ? '' : '(Custom)'}</h3>
    <fieldset disabled={busy}>
      {!catalog && <><label>Custom Spell name<input value={draft.name} maxLength={120} onChange={e => edit({ name: e.target.value })} /></label>
      <label>Custom Spell level<input type="number" min="0" max="9" value={Number.isNaN(draft.level) ? '' : draft.level} onChange={e => edit({ level: e.target.value === '' ? NaN : Number(e.target.value) })} /></label></>}
      <label>Availability<select aria-label="Availability" value={draft.availability} onChange={e => edit({ availability: e.target.value as CharacterSpell['availability'] })}>{availabilityKinds.map(kind => <option key={kind}>{kind}</option>)}</select></label>
      <label>Granted source (item or feature)<input value={draft.source} maxLength={240} onChange={e => edit({ source: e.target.value })} /></label>
      <label>Player notes<textarea value={draft.notes} maxLength={10000} onChange={e => edit({ notes: e.target.value })} /></label>
      <div className="magic-actions"><button type="button" disabled={!dirty || stale} onClick={() => void submit()}>Save spell</button>
      <button type="button" disabled={dirty || stale} onClick={() => void submit(true)}>Remove spell</button>
      {failed !== null && <button type="button" onClick={() => void submit(failed)}>Retry spell save</button>}</div>
      {stale && <div className="magic-conflict"><p>The saved spell is now {spell.deleted ? 'removed' : `${nameOf(spell)}, level ${catalog?.level ?? spell.level}, ${spell.availability}, source: ${spell.source || 'none'}, notes: ${spell.notes || 'none'}`}. Your draft is retained.</p>
        <button type="button" onClick={() => { setDraft(spell); setDirty(false); setMessage('Loaded saved spell'); }}>Use saved spell</button>
        <button type="button" onClick={() => void submit(false, true)}>Replace saved spell with draft</button>
      </div>}
    </fieldset><p role="status">{message}</p>
    {catalog && <details><summary>Read {catalog.name} rules</summary><SpellDetails spell={catalog} /></details>}
  </article>;
}
function SlotEditor({ slot, save }: { slot: SpellSlot; save: Save }) {
  const [draft, setDraft] = useState(slot), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [retry, setRetry] = useState<MagicCommand | null>(null);
  const [conflictAction, setConflictAction] = useState<'spend' | 'restore' | null>(null);
  const stale = (dirty && draft.version !== slot.version) || conflictAction !== null;
  useLayoutEffect(() => { if (!dirty) setDraft(slot); }, [slot.version, dirty]);
  const run = async (command: MagicCommand) => {
    setBusy(true); setRetry(null); setMessage('Saving…');
    try {
      const result = await save(command);
      if (result.ok) { setDirty(false); setConflictAction(null); setMessage('Saved'); }
      else {
        if (command.kind === 'slots' && command.action !== 'configure') setConflictAction(command.action);
        else setDirty(true);
        setMessage('Slots changed elsewhere. Review the saved values.');
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Slots could not be saved.'); setRetry(command); }
    finally { setBusy(false); }
  };
  const configure = (overwrite = false): MagicCommand => ({ kind: 'slots', level: slot.level, action: 'configure', maximum: draft.maximum, remaining: draft.remaining, expectedVersion: overwrite ? slot.version : draft.version });
  return <article className="magic-record" aria-label={`Level ${slot.level} spell slots`}>
    <h3>Level {slot.level} slots · {slot.remaining} / {slot.maximum}</h3>
    <fieldset disabled={busy}>
      <div className="magic-actions"><button type="button" disabled={dirty || stale || slot.remaining <= 0} onClick={() => void run({ kind: 'slots', level: slot.level, action: 'spend', expectedVersion: slot.version })}>Spend slot</button>
      <button type="button" disabled={dirty || stale || slot.remaining >= slot.maximum} onClick={() => void run({ kind: 'slots', level: slot.level, action: 'restore', expectedVersion: slot.version })}>Restore slot</button></div>
      <div className="magic-slot-inputs">{(['maximum', 'remaining'] as const).map(field => <label key={field}>{field === 'maximum' ? 'Maximum slots' : 'Remaining slots'}<input type="number" min="0" max={field === 'maximum' ? 99 : draft.maximum} value={Number.isNaN(draft[field]) ? '' : draft[field]} onChange={e => { setDraft({ ...draft, [field]: e.target.value === '' ? NaN : Number(e.target.value) }); setDirty(true); setConflictAction(null); setRetry(null); setMessage('Unsaved changes'); }} /></label>)}</div>
      <button type="button" disabled={!dirty || stale} onClick={() => void run(configure())}>Save slot counts</button>
      {retry && <button type="button" onClick={() => void run(retry)}>Retry slot save</button>}
      {stale && <div className="magic-conflict"><p>Saved values: {slot.remaining} remaining, {slot.maximum} maximum. Your draft is retained.</p><button type="button" onClick={() => { setDraft(slot); setDirty(false); setConflictAction(null); setRetry(null); setMessage('Loaded saved slots'); }}>Use saved slots</button>{conflictAction ? <button type="button" disabled={conflictAction === 'spend' ? slot.remaining <= 0 : slot.remaining >= slot.maximum} onClick={() => void run({ kind: 'slots', level: slot.level, action: conflictAction, expectedVersion: slot.version })}>Retry {conflictAction} on saved slots</button> : <button type="button" onClick={() => void run(configure(true))}>Replace saved slots with draft</button>}</div>}
    </fieldset><p role="status">{message}</p>
  </article>;
}
export function MagicSection({ slot, partyData, onSlotChanged }: { slot: CharacterSlot; partyData: PartyData; onSlotChanged: (slot: CharacterSlot) => void }) {
  const magic = slot.character?.magic ?? emptyMagic();
  const [name, setName] = useState(''), [level, setLevel] = useState('0'), [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [retry, setRetry] = useState<MagicCommand | null>(null);
  const save: Save = async command => { const result = await partyData.updateMagic(slot.id, command); onSlotChanged(result.slot); return result; };
  const add = async (command: MagicCommand) => {
    setBusy(true); setRetry(null); setMessage('Saving…');
    try { const result = await save(command); if (result.ok) { setMessage('Spell added'); if (command.kind === 'spell' && !command.spell.catalogId) setName(''); }
      else setMessage('This spell changed elsewhere. Review your Character Spells and select it again.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Spell could not be saved.'); setRetry(command); }
    finally { setBusy(false); }
  };
  const spells = magic.spells;
  return <>
    <section className="overview-section character-magic-section" aria-labelledby="character-spells-heading">
      <h2 id="character-spells-heading">Character Spells</h2>
      <p>Known: learned or recorded, but not marked prepared. Prepared: chosen for current play. Always Prepared: available without using a preparation choice. Item granted and Feature granted: available through the named source; follow its limits. These labels are manual and do not calculate casting permissions.</p>
      <label>Search Character Spells<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <div className="magic-grid">{spells.map(s => <SpellEditor key={s.id} visible={`${nameOf(s)} ${s.notes}`.toLowerCase().includes(search.toLowerCase())} spell={s} save={save} />)}</div>
      {!magic.spells.some(s => !s.deleted) && <p>No Character Spells yet. Add a catalog entry or create a Custom Spell.</p>}
      <form onSubmit={e => { e.preventDefault(); void add({ kind: 'spell', expectedVersion: 0, spell: { id: `custom.${crypto.randomUUID()}`, catalogId: null, name, level: Number(level), availability: 'Known', source: '', notes: '', deleted: false } }); }}>
        <fieldset disabled={busy}><legend>Create a Custom Spell</legend><p>Custom Spells belong only to this Character Record.</p><label>New Custom Spell name<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>New Custom Spell level<select aria-label="New Custom Spell level" value={level} onChange={e => setLevel(e.target.value)}>{Array.from({ length: 10 }, (_, n) => <option key={n} value={n}>{n === 0 ? 'Cantrip' : `Level ${n}`}</option>)}</select></label><button disabled={!name.trim()} type="submit">Create Custom Spell</button></fieldset>
      </form><p role="status">{message}</p>{retry && <button type="button" disabled={busy} onClick={() => void add(retry)}>Retry adding spell</button>}
    </section>
    <section className="overview-section character-magic-section" aria-labelledby="spell-slots-heading"><h2 id="spell-slots-heading">Spell slots</h2><p>Enter maximum and remaining slots manually for each level. Class levels do not change these counts.</p><div className="magic-grid">{Array.from({ length: 9 }, (_, index) => {
      const level = index + 1; return <SlotEditor key={level} slot={magic.slots.find(s => s.level === level) ?? { id: `slots.${level}`, level, maximum: 0, remaining: 0, version: 0 }} save={save} />;
    })}</div></section>
    <SpellCatalog busy={busy} activeIds={magic.spells.filter(s => !s.deleted).map(s => s.id)} characterClasses={slot.character ? characterClasses(slot.character).filter(c => !c.deleted).map(c => c.name) : []} onAdd={catalogId => void add({ kind: 'spell', expectedVersion: magic.spells.find(s => s.id === catalogId)?.version ?? 0, spell: { id: catalogId, catalogId, name: '', level: 0, availability: 'Known', source: '', notes: '', deleted: false } })} />
  </>;
}

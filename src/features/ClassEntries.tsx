import { useRef, useState } from 'react';
import { characterClasses, totalLevel, validateClassEdit, type CharacterClass, type ClassEdit } from '../domain/character-classes';
import type { CharacterSlot, PartyData } from '../domain/party';

type SaveClass = (edit: ClassEdit, version: number) => Promise<boolean>;
function ClassEditor({ entry, onSave, onCancel }: { entry: CharacterClass; onSave: SaveClass; onCancel: () => void }) {
  const [draft, setDraft] = useState<{ name: string; level: string } | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
  const [message, setMessage] = useState('');
  const baseVersion = useRef(entry.version);
  const removal = useRef(false);
  const primary = entry.id === 'primary';
  const visible = draft ?? { name: entry.name, level: String(entry.level) };
  const feedback = `class-${entry.id}-feedback`;
  function change(field: 'name' | 'level', value: string) {
    if (!draft) baseVersion.current = entry.version;
    setDraft({ ...visible, [field]: value });
    setState('unsaved'); setMessage('Unsaved changes.'); removal.current = false;
  }
  async function save(remove = false, retry = false) {
    const edit: ClassEdit = remove ? { ...entry, deleted: true }
      : { id: entry.id, name: visible.name.trim(), level: Number(visible.level), deleted: false };
    try { validateClassEdit(edit, retry ? entry.version : baseVersion.current); }
    catch (error) { setState('unsaved'); setMessage((error as Error).message); return; }
    if (!draft) { baseVersion.current = entry.version; setDraft(visible); }
    if (retry) baseVersion.current = entry.version;
    removal.current = remove;
    setState('saving');
    try {
      if (!await onSave(edit, baseVersion.current)) {
        setState('unsaved'); setMessage('Changed elsewhere. Your class edit is not saved.'); return;
      }
      setDraft(null); setState('saved'); setMessage('');
    } catch (error) {
      setState('unsaved'); setMessage(`Not saved. ${(error as Error).message}`);
    }
  }
  if (entry.deleted && !draft) return null;
  return <article className="text-entry" aria-label={primary ? 'Primary class entry' : `Class entry ${entry.name || 'new'}`}>
    <h3>{primary ? 'Primary class' : 'Additional class'}</h3>
    <label>{primary ? 'Primary class' : 'Class name'}
      <input value={visible.name} maxLength={160} aria-describedby={feedback} disabled={state === 'saving'}
        onChange={event => change('name', event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void save(); } }} />
    </label>
    <label>{primary ? 'Level' : 'Class level'}
      <input type="number" min={1} max={20} step={1} value={visible.level} aria-describedby={feedback} disabled={state === 'saving'}
        onChange={event => change('level', event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void save(); } }} />
    </label>
    <div className="text-entry__actions">
      <button type="button" className="secondary-button" disabled={state === 'saving' || entry.deleted} onClick={() => void save()}>Save class</button>
      {!primary && <button type="button" className="text-button" disabled={state === 'saving' || entry.deleted} onClick={() => { if (!entry.version) onCancel(); else void save(true); }}>Remove class</button>}
      {draft && state !== 'saving' && <button type="button" className="text-button" onClick={() => { setDraft(null); setState('idle'); setMessage(''); }}>Discard changes</button>}
    </div>
    <p id={feedback} className={`save-feedback save-feedback--${state}`} role={state === 'unsaved' && message !== 'Unsaved changes.' ? 'alert' : 'status'}>
      {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : message}
      {state === 'unsaved' && message.startsWith('Changed elsewhere') && !entry.deleted && <button type="button" onClick={() => void save(removal.current, true)}>Retry</button>}
      {state === 'unsaved' && message.startsWith('Not saved.') && !entry.deleted && <button type="button" onClick={() => void save(removal.current, true)}>Retry</button>}
    </p>
    {entry.deleted && draft && <p>Removed elsewhere. Discard this draft and add a new class if needed.</p>}
  </article>;
}
export function ClassEntries({ slot, partyData, onSlotChanged }: {
  slot: CharacterSlot; partyData: PartyData; onSlotChanged: (slot: CharacterSlot) => void;
}) {
  const [newEntries, setNewEntries] = useState<CharacterClass[]>([]);
  const entries = new Map(newEntries.map(entry => [entry.id, entry]));
  for (const entry of characterClasses(slot.character!)) entries.set(entry.id, entry);
  const save: SaveClass = async (edit, version) => {
    const result = await partyData.editCharacterClass(slot.id, edit, version);
    onSlotChanged(result.slot);
    return result.ok;
  };
  return <section className="overview-section" aria-label="Classes">
    <div className="section-heading"><div><p className="section-heading__eyebrow">Character progression</p><h2>Classes</h2></div><p>Total level: {totalLevel(slot.character!)}</p></div>
    <p>Save each class independently. Total level updates proficiency and spell statistics. Subclass belongs to your primary class; spell slots and features remain player-entered.</p>
    <button className="secondary-button" type="button" onClick={() => setNewEntries(current => [...current, {
      id: crypto.randomUUID(), name: '', level: 1, version: 0, deleted: false,
    }])}>Add class</button>
    <div className="character-text__grid">
      {[...entries.values()].sort((a, b) => a.id === 'primary' ? -1 : b.id === 'primary' ? 1 : a.id.localeCompare(b.id)).map(entry => <ClassEditor
        key={entry.id} entry={entry} onSave={save} onCancel={() => setNewEntries(current => current.filter(candidate => candidate.id !== entry.id))} />)}
    </div>
  </section>;
}

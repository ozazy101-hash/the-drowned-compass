import { useRef, useState, type KeyboardEvent } from 'react';
import { orderedInventoryItems, validateInventory } from '../domain/inventory';
import type { InventoryDraft, InventoryEntry, InventoryKind } from '../domain/inventory';
import type { CharacterSlot, PartyData } from '../domain/party';
const currencyLabels = {
  cp: 'Copper pieces (CP)',
  sp: 'Silver pieces (SP)',
  ep: 'Electrum pieces (EP)',
  gp: 'Gold pieces (GP)',
  pp: 'Platinum pieces (PP)',
} as const;

type SaveText = (entry: InventoryDraft, version: number) => Promise<boolean>;
function ItemEditor({ entry, label, item, onSave, onCancelNew }: {
  entry: InventoryEntry; label: string; item?: boolean; onSave: SaveText; onCancelNew?: () => void;
}) {
  const [draft, setDraft] = useState<InventoryDraft | null>(null);
  const draftRef = useRef<InventoryDraft | null>(null);
  const dirty = draft !== null;
  const visible = draft ?? entry;
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
  const [message, setMessage] = useState('');
  const revision = useRef(0);
  const request = useRef(0);
  const baseVersion = useRef(entry.version);
  const pendingRemoval = useRef(false);
  const id = entry.id.replaceAll('.', '-');
  function change(field: 'title' | 'body' | 'rank', value: string | number) {
    if (!draftRef.current) baseVersion.current = entry.version;
    revision.current += 1;
    pendingRemoval.current = false;
    draftRef.current = { ...(draftRef.current ?? entry), [field]: value, deleted: false };
    setDraft(draftRef.current);
    setState(current => current === 'saving' ? 'saving' : 'unsaved'); setMessage('Unsaved changes.');
  }
  async function save(remove = false, retry = false) {
    if (!draftRef.current && !remove) {
      if (item && !entry.title.trim()) { setState('unsaved'); setMessage('Enter an item name before saving.'); }
      return;
    }
    if (!draftRef.current) {
      baseVersion.current = entry.version;
      draftRef.current = { ...entry };
      setDraft(draftRef.current);
    }
    pendingRemoval.current = remove;
    const next = { ...draftRef.current, deleted: remove, title: item ? draftRef.current.title.trim() : '' };
    if (item && !next.title) { setState('unsaved'); setMessage('Enter an item name before saving.'); return; }
    try { validateInventory(next); } catch (error) {
      setState('unsaved'); setMessage(error instanceof Error ? error.message : 'Check the inventory values.'); return;
    }
    if (retry) baseVersion.current = entry.version;
    const expected = baseVersion.current;
    const savedRevision = revision.current;
    const savedRequest = ++request.current;
    setState('saving');
    try {
      const accepted = await onSave(next, expected);
      if (request.current !== savedRequest) return;
      if (accepted) baseVersion.current = expected + 1;
      if (savedRevision !== revision.current) {
        setState('unsaved'); setMessage('You have newer changes that are not saved.'); return;
      }
      if (!accepted) {
        setState('unsaved'); setMessage('Changed elsewhere. Your text is not saved.'); return;
      }
      draftRef.current = null; setDraft(null); setState('saved'); setMessage('');
    } catch {
      if (request.current !== savedRequest) return;
      setState('unsaved'); setMessage('Not saved. Check your connection and retry.');
    }
  }
  function keySave(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault(); if (state !== 'saving') void save();
    }
  }
  if (entry.deleted && !dirty) return null;
  return (
    <article className="text-entry" aria-label={label}>
      <h3>{label}</h3>
      {item && <label htmlFor={`${id}-title`}>Item name
        <input id={`${id}-title`} value={visible.title} maxLength={160}
          aria-describedby={`${id}-feedback`} onChange={event => change('title', event.target.value)} onKeyDown={keySave} />
      </label>}
      <label htmlFor={`${id}-body`}>{item ? 'Notes' : label}
        {item ? <textarea id={`${id}-body`} rows={6} maxLength={20000} value={visible.body}
          aria-describedby={`${id}-feedback`} onChange={event => change('body', event.target.value)} onKeyDown={keySave} />
          : <input id={`${id}-body`} type="text" inputMode="numeric" maxLength={9} value={visible.body} aria-describedby={`${id}-feedback`} onChange={event => change('body', event.target.value)} onKeyDown={keySave} />}
      </label>
      {item && <label>Display order<input type="number" min={0} max={999999} value={visible.rank} onChange={event => change('rank', Number(event.target.value))} /></label>}
      <div className="text-entry__actions">
        <button className="secondary-button" type="button" disabled={state === 'saving'} onClick={() => void save()}>Save {item ? 'item' : label}</button>
        {item && <button className="text-button" type="button" disabled={state === 'saving'} onClick={() => { if (entry.version === 0) onCancelNew?.(); else void save(true); }}>Remove item</button>}
        {state === 'unsaved' && <button className="text-button" type="button" onClick={() => {
          request.current += 1; revision.current += 1; draftRef.current = null; setDraft(null); setState('idle'); setMessage('');
        }}>Discard changes</button>}
      </div>
      <p id={`${id}-feedback`} className={`save-feedback save-feedback--${state}`}
        role={state === 'unsaved' ? 'alert' : 'status'} aria-live="polite">
        {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : message}
        {state === 'unsaved' && message !== 'Unsaved changes.' && <button type="button" onClick={() => void save(pendingRemoval.current, true)}>Retry</button>}
      </p>
      {dirty && entry.deleted && <p>Removed elsewhere. Retry restores your text, or discard your changes.</p>}
    </article>
  );
}

export function Inventory({ slot, partyData, onSlotChanged }: {
  slot: CharacterSlot; partyData: PartyData; onSlotChanged: (slot: CharacterSlot) => void;
}) {
  const [local, setLocal] = useState<InventoryEntry[]>([]);
  const [kind, setKind] = useState<InventoryKind>('equipment');
  const entries = new Map(local.map(e => [e.id, e]));
  for (const entry of slot.character?.inventory ?? []) entries.set(entry.id, entry);
  const save: SaveText = async (entry, version) => {
    const result = await partyData.saveInventoryEntry(slot.id, entry, version);
    onSlotChanged(result.slot); return result.ok;
  };
  return <section className="overview-section character-text" aria-label="Inventory">
    <h2>Inventory</h2>
    <p>Player-authored possessions. Items do not change Armor Class, attacks or carrying capacity. Lower display order numbers appear first.</p>
    <label>Item category<select value={kind} onChange={e => setKind(e.target.value as InventoryKind)}><option value="equipment">Equipment</option><option value="magic">Notable magic item</option></select></label>
    <button type="button" className="secondary-button" onClick={() => setLocal(list => [...list, { id: `item.${crypto.randomUUID()}`, kind, title: '', body: '', rank: entries.size, version: 0, deleted: false }])}>Add item</button>
    <div className="character-text__grid">{orderedInventoryItems([...entries.values()]).map(entry => <ItemEditor key={entry.id} entry={entry} label={entry.kind === 'magic' ? 'Notable magic item' : 'Equipment'} item onSave={save} onCancelNew={() => setLocal(list => list.filter(e => e.id !== entry.id))} />)}</div>
    <h3>Currency</h3><p>Enter each amount directly. No automatic conversion.</p>
    <div className="character-text__grid">{(['cp','sp','ep','gp','pp'] as const).map(kind => <ItemEditor key={kind} entry={entries.get(`currency.${kind}`) ?? { id: `currency.${kind}`, kind, title: '', body: '0', rank: 0, version: 0, deleted: false }} label={currencyLabels[kind]} onSave={save} />)}</div>
  </section>;
}

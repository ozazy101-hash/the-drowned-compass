import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { abilityScoreKeys, type CharacterSlot, type PartyData } from '../domain/party';
import { emptyCombatEntries, availableFeaturedAttackIds, featuredAttackIds, visibleCombatEntries, validateCombatDetails, type CombatEntry, type CombatEntryDetails, type CombatEntryCommand } from '../domain/combat-entries';

type Save = (command: CombatEntryCommand) => Promise<boolean>;
type FeedbackState = { status: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'; message: string };
const idleFeedback: FeedbackState = { status:'idle', message:'' };
function Feedback({ state, retry }: { state: FeedbackState; retry: () => void }) {
  return <div className="save-feedback" role={state.status === 'error' ? 'alert' : 'status'} aria-live="polite">
    {state.message}{state.status === 'error' && <button type="button" onClick={retry}>Retry</button>}
  </div>;
}
function EntryField({ label, id, children, className = '' }: { label: string; id: string; children: ReactNode; className?: string }) {
  return <div className={`setup-field ${className}`}><label htmlFor={id}><span>{label}</span></label>{children}</div>;
}
function EntryEditor({ entry, onSave, onCreated, onCancel, initiallySaved = false, upRank, downRank }: { entry: CombatEntry; onSave: Save; onCreated?: () => void; onCancel?: () => void; initiallySaved?: boolean; upRank?: number; downRank?: number }) {
  const [localDraft, setDraft] = useState(entry.details);
  const [dirty, setDirty] = useState(false);
  // Clean editors follow accepted records directly; snapshot effects must never hydrate over typing.
  const draft = dirty ? localDraft : entry.details;
  const [feedback, setFeedback] = useState<FeedbackState>(initiallySaved ? { status:'saved', message:'Saved' } : idleFeedback);
  const revision = useRef(0);
  const request = useRef(0);
  const draftVersion = useRef(entry.version);
  const pending = useRef<CombatEntryCommand | null>(null);
  const isNew = entry.version === 0;
  function change(patch: Partial<CombatEntryDetails>) {
    if (!dirty) draftVersion.current = entry.version;
    revision.current += 1;
    setDirty(true);
    setDraft(current => ({ ...(dirty ? current : entry.details), ...patch }));
    setFeedback({ status:'unsaved', message:'Changes not saved.' });
  }
  async function send(command: CombatEntryCommand) {
    const currentRequest = ++request.current;
    const currentRevision = revision.current;
    pending.current = command;
    setFeedback({ status:'saving', message:'Saving…' });
    try {
      const ok = await onSave(command);
      if (currentRequest !== request.current) return;
      if (currentRevision !== revision.current) { setFeedback({ status:'error', message:'Newer changes not saved.' }); return; }
      if (!ok) { setFeedback({ status:'error', message:'Changed elsewhere. Your changes are not saved.' }); return; }
      setFeedback({ status:'saved', message:'Saved' });
      setDirty(false);
      if (command.type === 'save') onCreated?.();
    } catch { if (currentRequest === request.current) setFeedback({ status:'error', message:'Not saved. Check your connection and retry.' }); }
  }
  function save(event?: FormEvent) {
    event?.preventDefault();
    try { validateCombatDetails(draft); } catch (error) { setFeedback({ status:'error', message:`${(error as Error).message} Changes not saved.` }); return; }
    void send({ type: 'save', id: entry.id, details: draft, rank: entry.rank, expectedVersion: draftVersion.current });
  }
  function retry() {
    draftVersion.current = entry.version;
    // Newer typing must be submitted, never the payload of an older request.
    if (dirty || pending.current?.type === 'save' || !pending.current) save();
    else void send({ ...pending.current, expectedVersion: entry.version });
  }
  if (entry.deleted && !dirty) return null;
  const title = isNew ? `New ${draft.kind}` : entry.details.name;
  return <article className="combat-entry" aria-label={title}>
    <form onSubmit={save}>
      <div className="section-heading"><h3>{title}</h3><span>{draft.kind === 'attack' ? 'Attack' : 'Action'}</span></div>
      {entry.deleted && <p role="alert">Removed elsewhere. This draft cannot be saved. Copy your notes or discard the draft.</p>}
      <div className="overview-grid combat-entry__fields">
        <EntryField label="Record type" id={`${entry.id}-kind`}><select id={`${entry.id}-kind`} value={draft.kind} onChange={e => change({ kind:e.target.value as CombatEntryDetails['kind'] })}><option value="attack">Attack</option><option value="action">Action</option></select></EntryField>
        <EntryField label="Name" id={`${entry.id}-name`}><input id={`${entry.id}-name`} maxLength={120} value={draft.name} onChange={e => change({ name:e.target.value })} /></EntryField>
        {draft.kind === 'attack' && <>
          <EntryField label="Attack category" id={`${entry.id}-category`}><select id={`${entry.id}-category`} value={draft.category ?? 'other'} onChange={e => change({ category:e.target.value as CombatEntryDetails['category'] })}><option value="other">Other</option><option value="melee">Melee</option><option value="ranged">Ranged</option></select></EntryField>
          <EntryField label="Relevant Ability" id={`${entry.id}-relevant-ability`}><select id={`${entry.id}-relevant-ability`} value={draft.ability ?? ''} onChange={e => {
            change({ ability:(e.target.value || null) as CombatEntryDetails['ability'], ...(e.target.value ? { attackBonus:'' } : {}) });
          }}><option value="">Manual attack bonus</option>{abilityScoreKeys.map(key => <option key={key} value={key}>{key[0].toUpperCase() + key.slice(1)}</option>)}</select></EntryField>
          {!draft.ability && <EntryField label="Attack bonus" id={`${entry.id}-attack-bonus`}><input id={`${entry.id}-attack-bonus`} type="number" min={-999} max={999} step={1} value={draft.attackBonus} onChange={e => change({ attackBonus:e.target.value })} /></EntryField>}
          <EntryField label="Range" id={`${entry.id}-range`}><input id={`${entry.id}-range`} maxLength={120} value={draft.range} onChange={e => change({ range:e.target.value })} /></EntryField>
          <EntryField label="Damage" id={`${entry.id}-damage`}><input id={`${entry.id}-damage`} maxLength={120} value={draft.damage} onChange={e => change({ damage:e.target.value })} /></EntryField>
          <EntryField label="Damage type" id={`${entry.id}-damage-type`}><input id={`${entry.id}-damage-type`} maxLength={120} value={draft.damageType} onChange={e => change({ damageType:e.target.value })} /></EntryField>
        </>}
      </div>
      <EntryField label="Notes" id={`${entry.id}-notes`}><textarea id={`${entry.id}-notes`} maxLength={4000} rows={3} value={draft.notes} onChange={e => change({ notes:e.target.value })} /></EntryField>
      <div className="combat-entry__actions">
        <button className="secondary-button" type="submit" disabled={feedback.status === 'saving' || entry.deleted || (!dirty && !isNew)}>Save {draft.kind}</button>
        {dirty && !isNew && <button className="text-button" type="button" onClick={() => { revision.current += 1; setDirty(false); setFeedback(idleFeedback); }}>Discard draft</button>}
        {!isNew && <>
          <button className="text-button" type="button" disabled={dirty || feedback.status === 'saving' || upRank === undefined || entry.deleted} onClick={() => void send({ type:'move', id:entry.id, rank:upRank!, expectedVersion:entry.version })}>Move up</button>
          <button className="text-button" type="button" disabled={dirty || feedback.status === 'saving' || downRank === undefined || entry.deleted} onClick={() => void send({ type:'move', id:entry.id, rank:downRank!, expectedVersion:entry.version })}>Move down</button>
          <button className="text-button" type="button" disabled={dirty || feedback.status === 'saving' || entry.deleted} onClick={() => void send({ type:'remove', id:entry.id, expectedVersion:entry.version })}>Remove {draft.kind}</button>
        </>}
      </div>
      {onCancel && <button className="text-button" type="button" disabled={feedback.status === 'saving'} onClick={onCancel}>Cancel new {draft.kind}</button>}
      <Feedback state={feedback} retry={retry} />
    </form>
  </article>;
}
export function CombatEntriesSection({ slot, partyData, onSlotChanged }: { slot: CharacterSlot; partyData: PartyData; onSlotChanged: (slot: CharacterSlot) => void }) {
  const state = slot.character?.combatEntries ?? emptyCombatEntries();
  const visible = visibleCombatEntries(state);
  const [creating, setCreating] = useState<CombatEntry | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<string[] | null>(null);
  const [primaryFeedback, setPrimaryFeedback] = useState<FeedbackState>(idleFeedback);
  const primaryCommand = useRef<CombatEntryCommand | null>(null);
  const primaryRequest = useRef(0);
  const save: Save = async command => {
    const result = await partyData.updateCombatEntry(slot.id, command);
    onSlotChanged(result.slot);
    return result.ok;
  };
  async function primary(ids: string[], expectedVersion = state.primaryVersion) {
    ids = availableFeaturedAttackIds(state, ids);
    const currentRequest = ++primaryRequest.current;
    primaryCommand.current = { type:'featured', ids, expectedVersion };
    setSelectionDraft(ids);
    setPrimaryFeedback({ status:'saving', message:'Saving…' });
    try {
      const ok = await save(primaryCommand.current);
      if (primaryRequest.current === currentRequest && ok) setSelectionDraft(null);
      if (primaryRequest.current === currentRequest) setPrimaryFeedback(ok ? { status:'saved', message:'Saved' } : { status:'error', message:'Changed elsewhere. Featured selection not saved.' });
    } catch { if (primaryRequest.current === currentRequest) setPrimaryFeedback({ status:'error', message:'Not saved. Check your connection and retry.' }); }
  }
  function add(kind: 'attack' | 'action') {
    setCreating({ id:crypto.randomUUID(), version:0, deleted:false, rank:(visible.at(-1)?.rank ?? 0)+1024,
      details:{ kind, name:'', attackBonus:'', ability:null, range:'', damage:'', damageType:'', notes:'' } });
  }
  return <section className="overview-section" aria-labelledby="attacks-heading">
    <div className="section-heading"><div><p className="section-heading__eyebrow">Combat</p><h2 id="attacks-heading">Attacks &amp; Actions</h2></div><p>Player-entered values. Save each attack or action when ready.</p></div>
    <p className="combat-entry__guidance">A relevant Ability is a reminder; enter attack and damage values from your Character Record. No weapon or class rules are applied.</p>
    <fieldset className="combat-featured" disabled={primaryFeedback.status === 'saving'}>
      <legend>Featured attacks on the Party Dashboard</legend>
      <p>Choose any number of saved attacks, or leave all unchecked.</p>
      {visible.filter(e => e.details.kind === 'attack').map(e => <label key={e.id}><input type="checkbox" checked={(selectionDraft ?? featuredAttackIds(state)).includes(e.id)} onChange={event => void primary(event.target.checked ? [...(selectionDraft ?? featuredAttackIds(state)), e.id] : (selectionDraft ?? featuredAttackIds(state)).filter(id => id !== e.id))} />{e.details.name}</label>)}
      {visible.every(e => e.details.kind !== 'attack') && <p>Save an attack to feature it here.</p>}
    </fieldset>
    <Feedback state={primaryFeedback} retry={() => { if (primaryCommand.current?.type === 'featured') void primary(primaryCommand.current.ids); }} />
    {selectionDraft !== null && primaryFeedback.status === 'error' && <button type="button" className="text-button" onClick={() => { setSelectionDraft(null); primaryCommand.current = null; setPrimaryFeedback(idleFeedback); }}>Use saved selection</button>}
    {visible.length === 0 && !creating && <p>No attacks or actions recorded yet.</p>}
    <div className="combat-entry-list">
      {state.entries.filter(e => e.id !== creating?.id).sort((a,b) => a.rank-b.rank || a.id.localeCompare(b.id)).map(entry => {
        const index = visible.findIndex(e => e.id === entry.id);
        const previous = visible[index-1];
        const next = visible[index+1];
        return <EntryEditor key={entry.id} entry={entry} onSave={save} initiallySaved={entry.id === lastCreatedId}
          upRank={previous ? (previous.rank + (visible[index-2]?.rank ?? previous.rank-2048))/2 : undefined}
          downRank={next ? (next.rank + (visible[index+2]?.rank ?? next.rank+2048))/2 : undefined} />;
      })}
      {creating && <div><EntryEditor key={creating.id} entry={state.entries.find(e => e.id === creating.id) ?? creating} onSave={save} onCreated={() => { setLastCreatedId(creating.id); setCreating(current => current?.id === creating.id ? null : current); }} onCancel={() => setCreating(null)} /></div>}
    </div>
    <div className="combat-entry__actions"><button className="secondary-button" type="button" disabled={!!creating} onClick={() => add('attack')}>Add attack</button><button className="secondary-button" type="button" disabled={!!creating} onClick={() => add('action')}>Add action</button></div>
  </section>;
}

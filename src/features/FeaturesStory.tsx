import { useRef, useState, type KeyboardEvent } from 'react';
import {
  featureKinds, storyKinds, textKindLabels,
  type CharacterTextDraft, type CharacterTextEntry, type FeatureKind,
} from '../domain/character-text';
import type { CharacterSlot, PartyData } from '../domain/party';

type SaveText = (entry: CharacterTextDraft, version: number) => Promise<boolean>;

function TextEditor({ entry, label, feature, onSave, onCancelNew }: {
  entry: CharacterTextEntry; label: string; feature?: boolean; onSave: SaveText; onCancelNew?: () => void;
}) {
  const [draft, setDraft] = useState<CharacterTextDraft | null>(null);
  const draftRef = useRef<CharacterTextDraft | null>(null);
  const dirty = draft !== null;
  const visible = draft ?? entry;
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
  const [message, setMessage] = useState('');
  const revision = useRef(0);
  const request = useRef(0);
  const baseVersion = useRef(entry.version);
  const pendingRemoval = useRef(false);
  const id = entry.id.replaceAll('.', '-');
  function change(field: 'title' | 'body', value: string) {
    if (!draftRef.current) baseVersion.current = entry.version;
    revision.current += 1;
    pendingRemoval.current = false;
    draftRef.current = { ...(draftRef.current ?? entry), [field]: value, deleted: false };
    setDraft(draftRef.current);
    setState(current => current === 'saving' ? 'saving' : 'unsaved'); setMessage('Unsaved changes.');
  }
  async function save(remove = false, retry = false) {
    if (!draftRef.current && !remove) {
      if (feature && !entry.title.trim()) { setState('unsaved'); setMessage('Enter a feature name before saving.'); }
      return;
    }
    if (!draftRef.current) {
      baseVersion.current = entry.version;
      draftRef.current = { ...entry };
      setDraft(draftRef.current);
    }
    pendingRemoval.current = remove;
    const next = { ...draftRef.current, deleted: remove, title: feature ? draftRef.current.title.trim() : '' };
    if (feature && !next.title) { setState('unsaved'); setMessage('Enter a feature name before saving.'); return; }
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
      {feature && <label htmlFor={`${id}-title`}>Feature name
        <input id={`${id}-title`} value={visible.title} maxLength={160}
          aria-describedby={`${id}-feedback`} onChange={event => change('title', event.target.value)} onKeyDown={keySave} />
      </label>}
      <label htmlFor={`${id}-body`}>{feature ? 'Summary' : label}
        <textarea id={`${id}-body`} rows={feature ? 6 : 10} maxLength={20000} value={visible.body}
          aria-describedby={`${id}-feedback`} onChange={event => change('body', event.target.value)} onKeyDown={keySave} />
      </label>
      <div className="text-entry__actions">
        <button className="secondary-button" type="button" disabled={state === 'saving'} onClick={() => void save()}>Save {feature ? 'feature' : label}</button>
        {feature && <button className="text-button" type="button" disabled={state === 'saving'} onClick={() => { if (entry.version === 0) onCancelNew?.(); else void save(true); }}>Remove feature</button>}
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

export function FeaturesStory({ slot, partyData, onSlotChanged, area }: {
  slot: CharacterSlot; partyData: PartyData; onSlotChanged: (slot: CharacterSlot) => void;
  area: 'Features' | 'Story';
}) {
  const [localEntries, setLocalEntries] = useState<CharacterTextEntry[]>([]);
  const [kind, setKind] = useState<FeatureKind>('class');
  const entries = slot.character?.textEntries ?? [];
  const save: SaveText = async (entry, version) => {
    const result = await partyData.saveCharacterTextEntry(slot.id, entry, version);
    onSlotChanged(result.slot);
    return result.ok;
  };
  const byId = new Map(localEntries.map(entry => [entry.id, entry]));
  for (const entry of entries) byId.set(entry.id, entry);
  return (
    <section className="overview-section character-text" aria-label={area}>
      <div className="section-heading"><div><p className="section-heading__eyebrow">Character Record</p><h2>{area}</h2></div></div>
      <p>Visible to the whole Party. Save each {area === 'Features' ? 'feature' : 'field'} independently. Ctrl or ⌘ + Enter saves your text.</p>
      {area === 'Features' ? <>
        <p>Write your own class, species, background and feat summaries. Feature text does not change character statistics.</p>
        <div className="text-entry__add">
          <label htmlFor="feature-kind">Feature source
            <select id="feature-kind" value={kind} onChange={event => setKind(event.target.value as FeatureKind)}>
              {featureKinds.map(key => <option key={key} value={key}>{textKindLabels[key]}</option>)}
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={() => setLocalEntries(current => [...current, {
            id: `feature.${crypto.randomUUID()}`, kind, title: '', body: '', version: 0, deleted: false,
          }])}>Add feature</button>
        </div>
        {![...byId.values()].some(entry => featureKinds.includes(entry.kind as FeatureKind) && !entry.deleted) && <p>No features recorded yet.</p>}
        <div className="character-text__grid">
          {[...byId.values()].filter(entry => featureKinds.includes(entry.kind as FeatureKind)).map(entry =>
            <TextEditor key={entry.id} entry={entry} label={`${textKindLabels[entry.kind]} feature`} feature onSave={save}
              onCancelNew={() => setLocalEntries(current => current.filter(candidate => candidate.id !== entry.id))} />)}
        </div>
      </> : <div className="character-text__grid">
        {storyKinds.map(kind => {
          const entry = entries.find(entry => entry.id === `story.${kind}`) ?? {
            id: `story.${kind}`, kind, title: '', body: '', version: 0, deleted: false,
          };
          return <TextEditor key={entry.id} entry={entry} label={textKindLabels[kind]} onSave={save} />;
        })}
      </div>}
    </section>
  );
}

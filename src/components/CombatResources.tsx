import { useEffect, useRef, useState, type FormEvent } from 'react';
import { importantResource, recoveryTimings, validateResource, visibleResources, type LimitedResource, type ResourceWrite, type ResourceWriteResult } from '../domain/limited-resources';
import type { PartyData } from '../domain/party';

export function ImportantResourceSummary({ resources }: { resources?: LimitedResource[] }) {
  const resource = importantResource(resources);
  return resource ? <span className="important-resource">{resource.name}: {resource.current} / {resource.maximum}</span> : null;
}

type Draft = { name: string; current: string; maximum: string; recovery: LimitedResource['recovery'] };
const toDraft = (resource: ResourceWrite): Draft => ({ name: resource.name, current: String(resource.current), maximum: String(resource.maximum), recovery: resource.recovery });

type EditorProps = {
  resource: LimitedResource;
  isNew?: boolean;
  save: (resource: ResourceWrite, version: number) => Promise<ResourceWriteResult>;
  onAdded?: () => void;
  movePosition?: { up?: number; down?: number };
};
function ResourceEditor({ resource, isNew, save, onAdded, movePosition }: EditorProps) {
  const [draft, setDraft] = useState(toDraft(resource));
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState('');
  const revision = useRef(0);
  const startingVersion = useRef(resource.version);
  const latestResource = useRef(resource);
  latestResource.current = resource;
  const pending = useRef<ResourceWrite | null>(null);
  const saving = useRef(false);
  useEffect(() => { if (!dirty && !saving.current) { setDraft(toDraft(resource)); startingVersion.current = resource.version; } }, [resource, dirty]);

  function change(key: keyof Draft, value: string) {
    if (!dirty) startingVersion.current = resource.version;
    revision.current += 1;
    setDirty(true);
    setDraft(current => ({ ...current, [key]: value }));
    setState('Unsaved changes');
    pending.current = null;
  }
  function draftWrite(): ResourceWrite {
    if (!draft.current.trim() || !draft.maximum.trim()) throw new Error('Enter current and maximum uses.');
    const write = { ...resource, name: draft.name, current: Number(draft.current), maximum: Number(draft.maximum), recovery: draft.recovery };
    validateResource(write);
    return write;
  }
  async function persist(write: ResourceWrite, version: number) {
    if (saving.current) return;
    const submittedRevision = revision.current;
    pending.current = write;
    saving.current = true;
    setState('Saving…');
    try {
      const result = await save(write, version);
      if (revision.current !== submittedRevision) return;
      if (!result.ok) { setState('Another session changed this resource. Your changes are unsaved.'); return; }
      setDirty(false);
      pending.current = null;
      startingVersion.current = result.resources.find(candidate => candidate.id === resource.id)?.version ?? version + 1;
      setState('Saved');
      if (isNew) onAdded?.();
    } catch { if (revision.current === submittedRevision) setState('Save failed. Your changes are unsaved.'); }
    finally { saving.current = false; }
  }
  function submit(event?: FormEvent) {
    event?.preventDefault();
    try { void persist(draftWrite(), startingVersion.current); }
    catch (error) { setState((error as Error).message); }
  }
  function action(patch: Partial<ResourceWrite>) { void persist({ ...resource, ...patch }, resource.version); }
  const failed = state.includes('unsaved.');
  const invalid = state.startsWith('Enter');
  if (resource.deleted && !dirty) return null;
  return <form className="resource-editor" aria-label={isNew ? 'New limited resource' : `Resource ${resource.name}`} noValidate onSubmit={submit}>
    {resource.deleted && <p role="alert">This resource was removed in another session. Copy any unsaved details before discarding them.</p>}
    <div className="resource-fields">
      <label>Name<input required maxLength={100} value={draft.name} onChange={e => change('name', e.target.value)} /></label>
      <label>Current<input type="number" min={0} max={Number(draft.maximum)} step={1} required value={draft.current} onChange={e => change('current', e.target.value)} /></label>
      <label>Maximum<input type="number" min={0} max={9999} step={1} required value={draft.maximum} onChange={e => change('maximum', e.target.value)} /></label>
      <label>Recovery<select value={draft.recovery} onChange={e => change('recovery', e.target.value)}>{recoveryTimings.map(timing => <option key={timing}>{timing}</option>)}</select></label>
    </div>
    <div className="resource-actions">
      <button type="submit" disabled={state === 'Saving…' || resource.deleted}>{isNew ? 'Add resource' : 'Save resource'}</button>
      {!isNew && <>
        <button type="button" disabled={resource.deleted || dirty || state === 'Saving…' || resource.current === 0} onClick={() => action({ current: resource.current - 1 })}>Spend 1</button>
        <button type="button" disabled={resource.deleted || dirty || state === 'Saving…' || resource.current === resource.maximum} onClick={() => action({ current: resource.current + 1 })}>Restore 1</button>
        <button type="button" aria-pressed={resource.important} disabled={resource.deleted || dirty || state === 'Saving…'} onClick={() => action({ important: !resource.important })}>{resource.important ? 'Important resource' : 'Make important'}</button>
        <button type="button" disabled={resource.deleted || dirty || state === 'Saving…' || movePosition?.up === undefined} onClick={() => action({ position: movePosition!.up! })}>Move up</button>
        <button type="button" disabled={resource.deleted || dirty || state === 'Saving…' || movePosition?.down === undefined} onClick={() => action({ position: movePosition!.down! })}>Move down</button>
        <button type="button" disabled={resource.deleted || dirty || state === 'Saving…'} onClick={() => action({ deleted: true })}>Remove resource</button>
      </>}
    </div>
    {dirty && !isNew && <button type="button" disabled={state === 'Saving…'} onClick={() => {
      setDirty(false); setDraft(toDraft(resource)); startingVersion.current = resource.version; pending.current = null; setState('');
    }}>Discard changes</button>}
    <p className="save-feedback" role={failed || invalid ? 'alert' : 'status'}>{state}</p>
    {failed && !resource.deleted && <button type="button" onClick={() => {
      try { void persist(pending.current ?? draftWrite(), latestResource.current.version); } catch (error) { setState((error as Error).message); }
    }}>Retry</button>}
  </form>;
}

export function CombatResources({ slotId, resources = [], partyData, onChanged }: {
  slotId: string; resources?: LimitedResource[]; partyData: PartyData; onChanged: (resources: LimitedResource[]) => void;
}) {
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const ordered = visibleResources(resources);
  const save = async (write: ResourceWrite, version: number) => {
    const result = await partyData.writeLimitedResource(slotId, write, version);
    onChanged(result.resources);
    return result;
  };
  const newResource: LimitedResource = resources.find(resource => resource.id === newId) ?? { id: newId, name: '', current: 1, maximum: 1, recovery: 'Manual', position: (ordered.at(-1)?.position ?? 0) + 1024, important: false, version: 0, deleted: false };
  return <section className="overview-section" aria-labelledby="resources-heading">
    <div className="section-heading"><div><p className="section-heading__eyebrow">Combat · Session Trackers</p><h2 id="resources-heading">Limited resources</h2></div></div>
    <p>Track uses and recovery timing. Mark one important resource for the Party Dashboard. Recovery timing records when a resource recovers; rest actions follow in a later ticket.</p>
    {ordered.length === 0 && <p>No limited resources yet.</p>}
    {resources.filter(resource => resource.id !== newId).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)).map(resource => { const index = ordered.findIndex(candidate => candidate.id === resource.id); return <ResourceEditor key={resource.id} resource={resource} save={save} movePosition={{
      up: index <= 0 ? undefined : ((ordered[index - 2]?.position ?? ordered[index - 1].position - 2048) + ordered[index - 1].position) / 2,
      down: index < 0 || index === ordered.length - 1 ? undefined : (ordered[index + 1].position + (ordered[index + 2]?.position ?? ordered[index + 1].position + 2048)) / 2,
    }} />; })}
    <ResourceEditor key={newId} resource={newResource} isNew save={save} onAdded={() => setNewId(crypto.randomUUID())} />
  </section>;
}

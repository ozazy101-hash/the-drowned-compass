import { useState } from 'react';
import { previewRest, type RestCommand, type RestKind, type RestProposal } from '../../domain/character-rests';
import type { CharacterSlot, PartyData } from '../../domain/party';
import './rests.css';
type Preview = { rest: RestKind; proposals: RestProposal[]; excluded: string[] };
export function RestSection({ slot, partyData, onSlotChanged }: { slot: CharacterSlot; partyData: PartyData; onSlotChanged: (slot: CharacterSlot) => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [retry, setRetry] = useState<RestCommand | null>(null), [conflict, setConflict] = useState(false);
  if (!slot.character) return null;
  const open = (rest: RestKind) => { setPreview({ rest, proposals: previewRest(slot.character!, rest), excluded: [] }); setRetry(null); setConflict(false); setMessage(''); };
  const selected = preview?.proposals.filter(p => !preview.excluded.includes(p.key)) ?? [];
  const confirm = async (command: RestCommand) => {
    setBusy(true); setMessage('Saving rest…'); setRetry(null);
    try {
      const result = await partyData.resolveRest(slot.id, command); onSlotChanged(result.slot);
      if (result.ok) { setPreview(null); setConflict(false); setMessage(`${command.rest} saved. ${command.changes.length} selected recoveries accepted together.`); }
      else { setConflict(true); setMessage('The selected saved records changed. This attempt applied no recoveries. Review current saved values and create a fresh preview; an earlier interrupted attempt may already have completed.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The rest could not be saved.'); setRetry(command); }
    finally { setBusy(false); }
  };
  return <section className="overview-section rest-section" aria-labelledby="rests-heading">
    <h2 id="rests-heading">Rests</h2>
    <p>Preview recoveries from saved values before confirming. Unsaved drafts stay with their editors.</p>
    <div className="rest-actions"><button disabled={busy} onClick={() => open('Short Rest')}>Preview Short Rest</button><button disabled={busy} onClick={() => open('Long Rest')}>Preview Long Rest</button></div>
    {preview && <div className="rest-preview" aria-label={`${preview.rest} preview`}>
      <h3>{preview.rest} preview</h3>
      <p>{preview.rest === 'Short Rest' ? 'Only resources tagged Short Rest recover.' : 'Resources tagged Short Rest or Long Rest, manually configured spell slots, current Hit Points and death saves can recover. Unknown current Hit Points become the saved maximum.'} Full and zero-maximum counts need no change. Legacy Temporary Hit Points are preserved.</p>
      <fieldset disabled={busy || !!retry || conflict}><legend>Choose recoveries</legend>
        {preview.proposals.map(p => <label key={p.key} className="rest-change"><input type="checkbox" checked={!preview.excluded.includes(p.key)} onChange={e => setPreview({ ...preview, excluded: e.target.checked ? preview.excluded.filter(k => k !== p.key) : [...preview.excluded, p.key] })} /><span>{p.label}: <strong>{p.before} → {p.after}</strong></span></label>)}
        {!preview.proposals.length && <p>No saved values need recovery.</p>}
        <button disabled={!selected.length} onClick={() => void confirm({ operationId: crypto.randomUUID(), rest: preview.rest, changes: selected.map(p => p.change) })}>Confirm {preview.rest}</button>
      </fieldset>
      <div className="rest-actions">{retry && <button disabled={busy} onClick={() => void confirm(retry)}>Retry rest save</button>}{(conflict || retry) && <button disabled={busy} onClick={() => open(preview.rest)}>Create fresh preview</button>}<button disabled={busy} onClick={() => { setPreview(null); setRetry(null); setConflict(false); setMessage('Rest preview cancelled. No new recoveries applied.'); }}>Cancel rest</button></div>
    </div>}
    <p role="status">{message}</p>
  </section>;
}

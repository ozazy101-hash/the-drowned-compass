import { useEffect, useRef, useState } from 'react';
import { filterHandouts, handoutLimits, type Handout, type HandoutChange, type PartyContent } from '../../domain/party-content';
import type { AccessRole } from '../../domain/party';
import { HandoutMedia } from './HandoutMedia';
import './handouts.css';
import { DisplayControls } from '../presentation/DisplayControls';
import type { PartyDisplay } from '../presentation/party-display';
function Preview({ item, content }: { item: Handout; content: PartyContent }) {
  const [blob, setBlob] = useState<Blob>();
  const [failed, setFailed] = useState(false);
  useEffect(() => { let current = true; void content.open(item.id,item.contentVersion).then(value => { if (current) setBlob(value); }).catch(() => { if (current) setFailed(true); }); return () => { current = false; }; }, [content, item.id,item.contentVersion]);
  return blob ? <HandoutMedia blob={blob} thumbnail /> : <span>{failed ? 'Preview unavailable — open to retry' : 'Loading preview…'}</span>;
}
function Download({blob,item}:{blob:Blob;item:Handout}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{const value=URL.createObjectURL(blob);setUrl(value);return()=>URL.revokeObjectURL(value);},[blob]);
  const extension=item.mime==='application/pdf'?'pdf':item.mime==='image/jpeg'?'jpg':item.mime==='image/webp'?'webp':'png';
  return <a href={url||undefined} download={`${item.title.replace(/[^a-z0-9 _-]/gi,'_')}.${extension}`}>Download Handout</a>;
}
export function HandoutLibrary({ content, onBack,role='dungeon-master', display }: { content: PartyContent; onBack: () => void; role?:AccessRole; display?:PartyDisplay }) {
  const dm=role==='dungeon-master';
  const [items, setItems] = useState<Handout[]>([]);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState<'' | 'private' | 'revealed'>('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File>();
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [loading,setLoading]=useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selected,setSelected]=useState<string>();
  const [opened, setOpened] = useState<{ id:string;contentVersion:number;blob: Blob }>();
  const [renameTitle, setRenameTitle] = useState('');
  const [replacement,setReplacement]=useState<File>();
  const [refresh,setRefresh]=useState(0);
  const [openRetry,setOpenRetry]=useState(0);
  const replacementInput=useRef<HTMLInputElement>(null);
  const retry=useRef<{key:string;input:HandoutChange}|undefined>(undefined);
  const item=items.find(candidate=>candidate.id===selected);
  const visible=filterHandouts(items,{search,visibility:dm?visibility||undefined:'revealed'});
  useEffect(()=>{
    let current=true;setLoading(true);
    const stop=content.subscribe(snapshot=>{
      if(!current)return;
      setLoading(false);
      if('error' in snapshot){setError(snapshot.error);setItems([]);return;}
      setItems(snapshot.items);
    });return()=>{current=false;stop();};
  },[content,refresh]);
  useEffect(()=>{
    if(selected&&!item&&!loading){setSelected(undefined);setOpened(undefined);setMessage('This Handout is no longer available in your Library.');}
  },[selected,item,loading]);
  useEffect(()=>{
    if(!item)return;
    let current=true;setOpened(undefined);
    void content.open(item.id,item.contentVersion).then(blob=>{if(current)setOpened({id:item.id,contentVersion:item.contentVersion,blob});}).catch(failure=>{if(current){setError(failure.message);if(!dm)setSelected(undefined);}});
    return()=>{current=false;};
  },[content,item?.id,item?.contentVersion,openRetry,dm]);
  async function upload(event: React.SubmitEvent) {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement; if (!file || busy) return; setBusy(true); setError(''); setMessage('');
    try { const saved = await content.upload({ requestId, title, file }); setMessage(`Saved privately: ${saved.title}`); setFile(undefined); setTitle(''); form.reset(); setRequestId(crypto.randomUUID()); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Upload failed. Please retry.'); }
    finally { setBusy(false); }
  }
  function open(value:Handout){setSelected(value.id);setRenameTitle(value.title);setReplacement(undefined);setError('');retry.current=undefined;}
  async function change(command:HandoutChange['command']) {
    if(!item||busy)return;setBusy(true);setError('');setMessage('');
    const key=`${item.id}:${command.kind}:${command.kind==='rename'?command.title:command.kind==='replace'?`${command.file.name}:${command.file.size}:${command.file.lastModified}`:''}`;
    if(retry.current?.key!==key)retry.current={key,input:{id:item.id,expectedVersion:item.version,requestId:crypto.randomUUID(),command}};
    try{
      const result=await content.change(retry.current.input);
      if(!result.ok){setError('This Handout changed elsewhere. Your draft is retained. Review its current state, then retry your action.');retry.current=undefined;}
      else{setMessage(command.kind==='withdraw'?'Withdrawn. Copies already obtained cannot be recalled.':command.kind==='reveal'?'Revealed to the Party Library.':command.kind==='replace'?'Replacement saved.':'Title saved.');retry.current=undefined;if(command.kind==='replace'){setReplacement(undefined);if(replacementInput.current)replacementInput.current.value='';}}
      setItems(current=>current.map(value=>value.id===result.item.id&&value.version<=result.item.version?result.item:value));
    }catch(failure){setError(failure instanceof Error?failure.message:'The change could not finish. Please retry.');}
    finally{setBusy(false);}
  }
  const blob=item&&opened?.id===item.id&&opened.contentVersion===item.contentVersion?opened.blob:undefined;
  return <main className="handout-library">
    <button onClick={onBack}>Back to Party</button><h1>{dm?'Dungeon Master Library':'Party Library'}</h1>
    <p>{dm?'Uploads are private until you reveal them.':'Revealed Handouts remain available independently of what the Dungeon Master is viewing.'}</p>
    {dm&&display&&<DisplayControls display={display} item={item}/>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {item ? <section aria-label="Open Handout">
      <button onClick={() => {setSelected(undefined);setOpened(undefined);}}>Back to Library</button><h2>{item.title}</h2>
      <p>{item.visibility==='revealed'?'Revealed':'Private'}</p>
      {dm&&<>
        <form onSubmit={event=>{event.preventDefault();void change({kind:'rename',title:renameTitle});}}><label>Handout title<input value={renameTitle} maxLength={160} onChange={event => setRenameTitle(event.target.value)} required /></label><button disabled={busy}>Save title</button></form>
        <div className="handout-actions"><button disabled={busy} onClick={()=>void change({kind:item.visibility==='private'?'reveal':'withdraw'})}>{item.visibility==='private'?'Reveal to Party':'Withdraw from Party'}</button></div>
        <form onSubmit={event=>{event.preventDefault();if(replacement)void change({kind:'replace',file:replacement});}}><label>Replacement file<input ref={replacementInput} id="handout-replacement" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={busy} onChange={event=>{setReplacement(event.target.files?.[0]);retry.current=undefined;}} /></label><button disabled={busy||!replacement}>{item.visibility==='revealed'?'Replace for everyone':'Replace private Handout'}</button></form>
      </>}
      {blob?<><Download blob={blob} item={item}/><HandoutMedia key={`${item.id}:${item.contentVersion}`} blob={blob}/></>:<><p>Opening current Handout…</p><button onClick={()=>setOpenRetry(value=>value+1)}>Retry opening Handout</button></>}
    </section> : <>
      {dm&&<form onSubmit={upload} aria-label="Upload Handout"><h2>Upload a private Handout</h2>
        <p>{handoutLimits}</p><label>Title<input value={title} maxLength={160} required disabled={busy} onChange={event => { setTitle(event.target.value); setRequestId(crypto.randomUUID()); }} /></label>
        <label>File<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={busy} onChange={event => { setFile(event.target.files?.[0]); setRequestId(crypto.randomUUID()); }} required /></label>
        <button disabled={busy || !file}>{busy ? 'Saving…' : 'Save private Handout'}</button>
      </form>}
      <div className="handout-filters"><label>Search Handouts<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>{dm&&<label>Visibility<select value={visibility} onChange={event => setVisibility(event.target.value as typeof visibility)}><option value="">All</option><option value="private">Private</option><option value="revealed">Revealed</option></select></label>}<button onClick={() => { setError(''); setRefresh(value=>value+1); }}>Refresh Library</button></div>
      <div className="handout-grid">{visible.map(value => <article key={`${value.id}:${value.contentVersion}`}><button disabled={busy} onClick={() => open(value)}><Preview item={value} content={content} /><strong>{value.title}</strong><span>{value.visibility === 'private' ? 'Private' : 'Revealed'} · {value.mime === 'application/pdf' ? 'PDF' : 'Image'}</span></button></article>)}</div>
      {loading?<p>Loading Library…</p>:!visible.length&&<p>No Handouts match this view.</p>}
    </>}
  </main>;
}

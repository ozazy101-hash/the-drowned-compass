import {useEffect,useRef,useState} from 'react';
import type {PartyDisplay} from '../presentation/party-display';
import type {GridMapChange,PartyContent,SavedGridMap} from '../../domain/party-content';
import {MapDrawing} from './GridMapEditor';
/** The Library renders accepted documents only, including independent player reading. */
export function SavedMapLibrary({content,onOpen,display,dm=true}:{content:PartyContent;onOpen?:(id:string)=>void;display?:PartyDisplay;dm?:boolean}) {
 const [items,setItems]=useState<SavedGridMap[]>([]),[error,setError]=useState(''),[readError,setReadError]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[loading,setLoading]=useState(true);
 const [selected,setSelected]=useState<string>(),[opened,setOpened]=useState<{id:string;version:number;url:string}>();
 const retry=useRef<GridMapChange|undefined>(undefined);
 const item=items.find(value=>value.id===selected);
 useEffect(()=>{
  let current=true,generation=0;setLoading(true);
  const stop=content.subscribe(snapshot=>{
   const version=++generation;
   if('error' in snapshot){setReadError(snapshot.error);setItems([]);setLoading(false);return;}
   void content.listMaps().then(value=>{if(current&&version===generation){setItems(value);setReadError('');setLoading(false);}}).catch(failure=>{if(current&&version===generation){setReadError(failure.message);setItems([]);setLoading(false);}});
  });return()=>{current=false;stop();};
 },[content,revision]);
 useEffect(()=>{
  let current=true,url:string|undefined;setOpened(undefined);
  if(!item)return;
  if(!item.background){setOpened({id:item.id,version:item.version,url:''});return;}
  void content.openMapBackground(item.id,item.version).then(blob=>{if(current){url=URL.createObjectURL(blob);setOpened({id:item.id,version:item.version,url});}}).catch(failure=>{if(current)setError(failure.message);});
  return()=>{current=false;if(url)URL.revokeObjectURL(url);};
 },[content,item?.id,item?.version,revision]);
 async function change(value:SavedGridMap) {
  if(busy)return;setBusy(true);setError('');
  const kind=value.visibility==='private'?'reveal':'withdraw';
  if(retry.current?.id!==value.id||retry.current.command.kind!==kind)retry.current={id:value.id,expectedVersion:value.version,requestId:crypto.randomUUID(),command:{kind}};
  try {
   const result=await content.changeMap(retry.current);
   if(!result.ok)setError('This Grid Map changed elsewhere. Review the current saved version, then retry.');
   else setMessage(kind==='reveal'?'Grid Map revealed to Party Library.':'Grid Map withdrawn. Copies already obtained cannot be recalled.');
   retry.current=undefined;setRevision(value=>value+1);
  }catch(failure){setError((failure as Error).message);}
  finally{setBusy(false);}
 }
 return <section aria-label="Saved Grid Maps"><h2>Saved Grid Maps</h2><p>{dm?'Saved maps. Open one to edit its local draft.':'Revealed maps remain available independently of the Party Display.'}</p>{(error||readError)&&<p role="alert">{error||readError}</p>}{message&&<p role="status">{message}</p>}<button onClick={()=>setRevision(value=>value+1)}>Refresh saved maps</button><div className="handout-grid">{items.map(value=><article key={value.id}><button onClick={()=>dm&&onOpen?onOpen(value.id):setSelected(value.id)}><strong>{value.title}</strong><span>{value.visibility==='revealed'?'Revealed':'Private'} Grid Map · {value.document.columns} × {value.document.rows} · version {value.version}</span></button>{dm&&<button disabled={busy} onClick={()=>void change(value)}>{value.visibility==='private'?'Reveal Grid Map to Party':'Withdraw Grid Map from Party'}</button>}{display&&<button onClick={()=>void display.presentMap(value)}>{value.visibility==='private'?'Reveal and present Grid Map':'Present saved Grid Map'}</button>}</article>)}</div>{loading&&<p role="status">Loading saved Grid Maps…</p>}{!loading&&!items.length&&!error&&!readError&&<p>No saved Grid Maps yet.</p>}
 {selected&&(!item?<p role="status">This Grid Map is no longer available in your Library.</p>:<section aria-label="Open Grid Map"><button onClick={()=>setSelected(undefined)}>Close Grid Map</button><h3>{item.title}</h3>{opened?.id===item.id&&opened.version===item.version?<div className="map-scroll"><svg aria-label="Revealed Grid Map" viewBox={`0 0 ${item.document.columns} ${item.document.rows}`} width={item.document.columns*32} height={item.document.rows*32}><MapDrawing document={item.document} background={item.background&&opened.url?{url:opened.url,placement:item.background}:undefined}/></svg></div>:<p>Opening current Grid Map…</p>}</section>)}
 </section>;
}

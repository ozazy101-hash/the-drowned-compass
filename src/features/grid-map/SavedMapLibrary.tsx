import {useEffect,useState} from 'react';
import type {PartyDisplay} from '../presentation/party-display';
import type {PartyContent,SavedGridMap} from '../../domain/party-content';
/** Reads only authorized accepted map workspace state; Handouts observe separately. */
export function SavedMapLibrary({content,onOpen,display,dm=true}:{content:PartyContent;onOpen?:(id:string)=>void;display?:PartyDisplay;dm?:boolean}) {
 const [items,setItems]=useState<SavedGridMap[]>([]),[error,setError]=useState(''),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true);
 useEffect(()=>{
  setItems([]);setLoading(true);
  if(!dm)return;
  return content.observeMapWorkspace(snapshot=>{
   if('error' in snapshot){setError(snapshot.error);setItems([]);}else{setItems(snapshot.workspace.families);setError('');}
   setLoading(false);
  });
 },[content,dm,revision]);
 if(!dm)return null;
 return <section aria-label="Saved Grid Maps"><h2>Saved Grid Maps</h2><p>DM-private saved maps. Open one to edit its local draft, or present it on the Party Display.</p>{error&&<p role="alert">{error}</p>}<button onClick={()=>setRevision(value=>value+1)}>Refresh saved maps</button><div className="handout-grid">{items.map(value=><article key={value.id}><button onClick={()=>onOpen?.(value.id)}><strong>{value.title}</strong><span>Private Grid Map · {value.document.columns} × {value.document.rows} · version {value.version}</span></button>{display&&<button onClick={()=>void display.presentMap(value)}>Present saved Grid Map</button>}</article>)}</div>{loading&&<p role="status">Loading saved Grid Maps…</p>}{!loading&&!items.length&&!error&&<p>No saved Grid Maps yet.</p>}</section>;
}

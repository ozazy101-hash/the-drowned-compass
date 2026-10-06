import {useEffect,useState} from 'react';
import type {PartyDisplay} from '../presentation/party-display';
import type {PartyContent,SavedGridMap} from '../../domain/party-content';
/** The Library lists accepted documents only; editor drafts never cross this seam. */
export function SavedMapLibrary({content,onOpen,display}:{content:PartyContent;onOpen:(id:string)=>void;display?:PartyDisplay}) {
 const [items,setItems]=useState<SavedGridMap[]>([]),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let current=true;void content.listMaps().then(value=>{if(current){setItems(value);setError('');}}).catch(failure=>{if(current)setError(failure.message);});return()=>{current=false;};},[content,revision]);
 return <section aria-label="Saved Grid Maps"><h2>Saved Grid Maps</h2><p>Saved maps. Open one to edit its local draft.</p>{error&&<p role="alert">{error}</p>}<button onClick={()=>setRevision(value=>value+1)}>Refresh saved maps</button><div className="handout-grid">{items.map(item=><article key={item.id}><button onClick={()=>onOpen(item.id)}><strong>{item.title}</strong><span>{item.visibility==='revealed'?'Revealed':'Private'} Grid Map · {item.document.columns} × {item.document.rows} · version {item.version}</span></button>{display&&item.visibility==='revealed'&&<button onClick={()=>void display.presentMap(item.id)}>Present saved Grid Map</button>}</article>)}</div>{!items.length&&!error&&<p>No saved Grid Maps yet.</p>}</section>;
}

import { useEffect, useRef, useState } from 'react';
import type { PartyDisplay, DisplayState } from './party-display';
import { MapDrawing } from '../grid-map/MapScene';
/** DM-only gesture capture; the display module owns accepted persistence/frame. */
export function MapRevealControls({display,state}:{display:PartyDisplay;state:DisplayState}) {
  const [brush,setBrush]=useState<1|2|4>(1),[mode,setMode]=useState<'uncover'|'hide'>('uncover'),[overlay,setOverlay]=useState(true);
  const pointer=useRef<number|undefined>(undefined);
  const [url,setUrl]=useState<string>();
  useEffect(()=>{const value=state.artwork?URL.createObjectURL(state.artwork):undefined;setUrl(value);return()=>{if(value)URL.revokeObjectURL(value);};},[state.artwork]);
  const snapshot=state.presentation, draft=state.reveal;
  if(!snapshot?.version||!snapshot.mask||!draft)return null;
  const uncovered=new Set(draft.uncovered);
  const document=snapshot.version.document, disabled=draft.status==='pending'||draft.status==='conflict';
  function sample(event:React.PointerEvent<SVGSVGElement>){
    const matrix=event.currentTarget.getScreenCTM();if(!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    display.reveal({type:'sample',point:{x:point.x,y:point.y}});
  }
  return <section aria-label="DM Reveal Mask controls"><h3>Uncover the Party Display</h3>
    <p>Private control preview. Only saved uncovered areas appear on the table.</p>
    <label>Reveal brush<select value={brush} onChange={e=>setBrush(Number(e.target.value) as 1|2|4)}>{[1,2,4].map(n=><option key={n} value={n}>{n} squares</option>)}</select></label>
    <button aria-pressed={mode==='uncover'} onClick={()=>setMode('uncover')}>Uncover areas</button><button aria-pressed={mode==='hide'} onClick={()=>setMode('hide')}>Hide areas</button>
    <label><input type="checkbox" checked={overlay} onChange={e=>setOverlay(e.target.checked)}/>DM hidden-region overlay</label>
    <svg aria-label="Private reveal brush canvas" viewBox={`0 0 ${document.columns} ${document.rows}`} style={{width:'100%',maxHeight:400,touchAction:'none',background:'#142630'}}
      onPointerDown={e=>{if(disabled||e.button!==0||pointer.current!==undefined)return;pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);display.reveal({type:'begin',mode,brush});sample(e);}}
      onPointerMove={e=>{if(pointer.current===e.pointerId&&display.getState().reveal?.strokeActive)sample(e);}}
      onPointerUp={e=>{if(pointer.current!==e.pointerId||!display.getState().reveal?.strokeActive)return;pointer.current=undefined;sample(e);display.reveal({type:'finish'});if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);void display.saveReveal();}}
      onPointerCancel={e=>{if(pointer.current===e.pointerId){pointer.current=undefined;display.reveal({type:'cancel'});}}} onLostPointerCapture={e=>{if(pointer.current===e.pointerId){pointer.current=undefined;display.reveal({type:'cancel'});}}}>
      <MapDrawing document={document} background={url&&snapshot.version.background?{url,placement:snapshot.version.background}:undefined}/>
      {overlay&&Array.from({length:document.columns*document.rows},(_,cell)=>!uncovered.has(cell)&&<rect key={cell} x={cell%document.columns} y={Math.floor(cell/document.columns)} width="1" height="1" fill="#b787e8" opacity=".35" pointerEvents="none"/>)}
    </svg>
    <button disabled={!draft.canUndo} onClick={()=>{display.reveal({type:'undo'});void display.saveReveal();}}>Undo uncover / hide</button>
    <button disabled={!draft.canRedo} onClick={()=>{display.reveal({type:'redo'});void display.saveReveal();}}>Redo uncover / hide</button>
    <button disabled={disabled} onClick={()=>{if(window.confirm('Hide the whole map on the Party Display?')){display.reveal({type:'hide-all'});void display.saveReveal();}}}>Hide whole map</button>
    <button disabled={disabled} onClick={()=>{if(window.confirm('Uncover the whole map? This may reveal story spoilers.')){display.reveal({type:'uncover-all',confirmed:true});void display.saveReveal();}}}>Uncover whole map</button>
    {draft.error&&<p role="alert">{draft.error}</p>}
    {(draft.status==='error'||draft.status==='conflict')&&<><button onClick={()=>{if(draft.status==='conflict')display.reveal({type:'retry'});void display.saveReveal();}}>Retry reveal save</button><button onClick={()=>display.reveal({type:'discard'})}>Discard reveal draft</button></>}
  </section>;
}

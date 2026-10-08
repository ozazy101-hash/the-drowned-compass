import { useSyncExternalStore } from 'react';
import type { Handout } from '../../domain/party-content';
import type { PartyDisplay } from './party-display';
export function DisplayControls({display,item}:{display:PartyDisplay;item?:Handout}) {
  const state=useSyncExternalStore(display.subscribe,display.getState);
  return <section aria-label="Party Display controls">
    <h2>Party Display</h2>
    <button onClick={display.openWindow}>{state.window==='open'?'Focus Party Display':'Open Party Display'}</button>
    <p role="status">{state.message}</p>
    <p>{state.mode==='ordinary'?'Ordinary viewing: zoom and Fit to screen may resize content.':'Physical projection: square size stays fixed while panning and changing maps.'}</p>
    <p>Move Party Display to your table projector first. Measure the test square on the table against your miniature base or ruler; display pixels are not physical inches. Recalibrate after moving the window, changing display scaling, projector distance or angle. Angled projection is not corrected automatically.</p>
    <button disabled={state.window!=='open'||state.busy} onClick={()=>display.calibration({kind:'start'})}>{state.mode==='ordinary'?'Calibrate physical projection':'Show square / recalibrate'}</button>
    {state.mode!=='ordinary'&&<>
      <label>Test square display pixels<input type="number" min="8" max="512" step="1" value={state.squarePixels} onChange={event=>display.calibration({kind:'start',squarePixels:Number(event.target.value)})}/></label>
      <button disabled={state.window!=='open'} onClick={()=>display.calibration({kind:'confirm'})}>Confirm measured square</button>
      <button onClick={()=>display.calibration({kind:'reset'})}>Reset calibration / ordinary viewing</button>
      {state.setupChanged&&<p role="alert">{state.registrationChanged?'Map registration changed. Square size is retained and position reset. Reposition the map, measure again, then confirm or recalibrate.':'Display viewport changed. Scale and pan are retained; measure again, then confirm or recalibrate.'}</p>}
    </>}
    {item&&<button disabled={state.busy||state.window!=='open'} onClick={()=>void display.present(item)}>{item.visibility==='private'?'Reveal and present':'Present on Party Display'}</button>}
    {(state.selected||state.mode!=='ordinary')&&<>
      {state.contentKind==='handout'&&<div className="handout-actions">
        <button disabled={state.page<=1} onClick={()=>display.page(state.page-1)}>Display previous page</button>
        <span>Display page {state.page} of {state.pages}</span>
        <button disabled={state.page>=state.pages} onClick={()=>display.page(state.page+1)}>Display next page</button>
      </div>}
      <label>Display zoom<input disabled={state.mode!=='ordinary'} type="range" min="0.25" max="8" step="0.25" value={state.zoom} onChange={event=>display.viewport({zoom:Number(event.target.value),x:state.x,y:state.y})}/></label>
      <div className="handout-actions">
        <button onClick={()=>display.viewport({zoom:state.zoom,x:state.x-50,y:state.y})}>Pan left</button>
        <button onClick={()=>display.viewport({zoom:state.zoom,x:state.x+50,y:state.y})}>Pan right</button>
        <button onClick={()=>display.viewport({zoom:state.zoom,x:state.x,y:state.y-50})}>Pan up</button>
        <button onClick={()=>display.viewport({zoom:state.zoom,x:state.x,y:state.y+50})}>Pan down</button>
        <button disabled={state.mode!=='ordinary'} onClick={display.fit}>Fit to screen</button>
      </div>
    </>}
    <button onClick={()=>display.clear()}>Clear display</button>
  </section>;
}

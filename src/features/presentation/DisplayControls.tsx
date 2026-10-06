import { useSyncExternalStore } from 'react';
import type { Handout } from '../../domain/party-content';
import type { PartyDisplay } from './party-display';
export function DisplayControls({display,item}:{display:PartyDisplay;item?:Handout}) {
  const state=useSyncExternalStore(display.subscribe,display.getState);
  return <section aria-label="Party Display controls">
    <h2>Party Display</h2>
    <button onClick={display.openWindow}>{state.window==='open'?'Focus Party Display':'Open Party Display'}</button>
    <p role="status">{state.message}</p>
    {item&&<button disabled={state.busy||state.window!=='open'} onClick={()=>void display.present(item)}>{item.visibility==='private'?'Reveal and present':'Present on Party Display'}</button>}
    {state.selected&&<>
      <div className="handout-actions">
        <button disabled={state.page<=1} onClick={()=>display.page(state.page-1)}>Display previous page</button>
        <span>Display page {state.page} of {state.pages}</span>
        <button disabled={state.page>=state.pages} onClick={()=>display.page(state.page+1)}>Display next page</button>
      </div>
      <label>Display zoom<input type="range" min="0.25" max="8" step="0.25" value={state.zoom} onChange={event=>display.viewport({zoom:Number(event.target.value),x:state.x,y:state.y})}/></label>
      <div className="handout-actions">
        <button onClick={()=>display.viewport({zoom:state.zoom,x:state.x-50,y:state.y})}>Pan left</button>
        <button onClick={()=>display.viewport({zoom:state.zoom,x:state.x+50,y:state.y})}>Pan right</button>
        <button onClick={()=>display.viewport({zoom:state.zoom,x:state.x,y:state.y-50})}>Pan up</button>
        <button onClick={()=>display.viewport({zoom:state.zoom,x:state.x,y:state.y+50})}>Pan down</button>
        <button onClick={display.fit}>Fit to screen</button>
      </div>
    </>}
    <button onClick={()=>display.clear()}>Clear display</button>
  </section>;
}

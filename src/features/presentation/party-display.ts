import type { RenderTask } from 'pdfjs-dist';
import { readHandoutPdf, type Handout, type HandoutChange, type PartyContent } from '../../domain/party-content';
import type { PartySession } from '../../domain/party';

export type DisplayState = { window: 'closed' | 'open' | 'blocked'; message: string; busy: boolean; selected?: string; page: number; pages: number; zoom: number; x: number; y: number };
// This module owns authority, reveal retries, protected reads, deterministic rendering
// and the same-origin extended-desktop window. Callers never handle media or messages.
export function createPartyDisplay(content: PartyContent, getSession: () => Promise<PartySession | null>) {
  let state: DisplayState = { window:'closed', message:'Open Party Display, then choose a Handout.', busy:false, page:1, pages:1, zoom:1, x:0, y:0 };
  const listeners = new Set<() => void>();
  let popup: Window | null = null;
  let ready = false;
  let active = true, epoch = 0, renderEpoch = 0;
  let selected: Handout | undefined;
  let blob: Blob | undefined;
  let retry: HandoutChange | undefined;
  let task: RenderTask | undefined;
  let pdf: Awaited<ReturnType<typeof readHandoutPdf>> | undefined;
  let frame: HTMLCanvasElement | undefined;
  let loadingVersion: number | undefined;
  const emit = (next: Partial<DisplayState>) => { state = {...state,...next}; listeners.forEach(listener=>listener()); };
  const blank = () => { if(popup&&!popup.closed) popup.document.body.replaceChildren(); frame=undefined; };
  function clear(message='Party Display cleared.') {
    epoch++; renderEpoch++; ready=false; selected=undefined; blob=undefined; retry=undefined; loadingVersion=undefined; task?.cancel(); void pdf?.dispose(); pdf=undefined; blank();
    emit({selected:undefined,busy:false,page:1,pages:1,zoom:1,x:0,y:0,message});
  }
  async function authorized() {
    const session=await getSession();
    if(!active)return false;
    if(session?.role!=='dungeon-master'){clear('Your session ended. Sign in again before presenting.');return false;}return true;
  }
  function transform() { if(frame)frame.style.transform=`translate(${state.x}px, ${state.y}px) scale(${state.zoom})`; }
  async function render(token: number) {
    if(!ready||!blob||!popup||popup.closed)return;
    const drawing=++renderEpoch;task?.cancel();
    const target=popup, currentBlob=blob, page=state.page;
    const canvas=target.document.createElement('canvas');canvas.setAttribute('aria-label',`Party Display page ${page}`);
    let document: Awaited<ReturnType<typeof readHandoutPdf>> | undefined;
    try {
      if(currentBlob.type==='application/pdf') {
        document=await readHandoutPdf(currentBlob);
        if(token!==epoch||drawing!==renderEpoch||!active)return;
        pdf=document;
        const sheet=await document.getPage(Math.min(page,document.numPages));
        const natural=sheet.getViewport({scale:1});
        const viewport=sheet.getViewport({scale:Math.min(target.innerWidth/natural.width,target.innerHeight/natural.height)});
        canvas.width=viewport.width;canvas.height=viewport.height;
        task=sheet.render({canvas,viewport});await task.promise;
        if(token===epoch&&drawing===renderEpoch)emit({pages:document.numPages,page:Math.min(page,document.numPages)});
      } else {
        const image=await createImageBitmap(currentBlob);
        const scale=Math.min(target.innerWidth/image.width,target.innerHeight/image.height);
        if(token===epoch&&drawing===renderEpoch)emit({pages:1,page:1});
        canvas.width=image.width*scale;canvas.height=image.height*scale;canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);image.close();
      }
      if(token!==epoch||drawing!==renderEpoch||!active||target.closed)return;
      if(!await authorized()||token!==epoch||drawing!==renderEpoch)return;
      target.document.body.replaceChildren(canvas); frame=canvas;transform();emit({message:'Presenting on Party Display.'});
    } catch { if(token===epoch&&drawing===renderEpoch&&active)emit({message:'Display could not render. Retry presenting this Handout.'}); }
    finally { await document?.dispose();if(pdf===document)pdf=undefined; }
  }
  async function load(item: Handout, token: number) {
    loadingVersion=item.contentVersion;
    try {
      if(!await authorized()||token!==epoch)return;
      const bytes=await content.open(item.id,item.contentVersion);
      const current=(await content.list()).find(value=>value.id===item.id);
      if(token!==epoch||!active)return;
      if(!current||current.visibility!=='revealed'){clear('This Handout was withdrawn. Choose another Handout.');return;}
      if(current.contentVersion!==item.contentVersion){loadingVersion=undefined;void load(current,++epoch);return;}
      selected=current;blob=bytes;ready=true;emit({selected:current.id});await render(token);
    } catch { if(token===epoch&&active)emit({message:'Connection interrupted or Handout unavailable. Existing display retained; retry when connected.'}); }
    finally {if(token===epoch){loadingVersion=undefined;emit({busy:false});}}
  }
  async function reconcile() {
    if(!active||!selected)return;
    try {
      if(!await authorized())return;
      const id=selected.id;const items=await content.list();if(!active||selected?.id!==id)return;
      const item=items.find(value=>value.id===id);
      if(!item||item.visibility!=='revealed'){clear('This Handout was withdrawn. Choose another Handout.');return;}
      await load(item,++epoch);
    } catch {emit({message:'Connection interrupted. Existing display retained; reconnect to reconcile Library access.'});}
  }
  function openWindow() {
    if(!active)return;
    if(popup&&!popup.closed){popup.focus();return;}
    ready=false;
    popup=window.open('about:blank','_blank','popup,width=1280,height=800');
    if(!popup){emit({window:'blocked',message:'Popup blocked. Allow popups for this site, then Open Party Display again.'});return;}
    popup.document.title='Party Display';
    const style=popup.document.createElement('style');style.textContent='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#080b10}body{display:flex;align-items:center;justify-content:center}canvas{flex:none;transform-origin:center}';popup.document.head.append(style);
    popup.addEventListener('resize',()=>{if(blob)void render(epoch);});
    emit({window:'open',message:'Party Display opened. Move this window to your extended screen.'});
    // Reopening never retransmits a retained frame before rechecking visibility.
    void reconcile();
  }
  async function present(item: Handout) {
    if(!active||state.busy)return;
    if(!popup||popup.closed){emit({message:'Open Party Display before presenting.'});return;}
    const token=++epoch;emit({busy:true,message:'Checking Library access…'});
    try {
      if(!await authorized()||token!==epoch)return;
      if(retry&&retry.id!==item.id)retry=undefined;
      if(item.visibility==='private'||retry) {
        retry??={id:item.id,expectedVersion:item.version,requestId:crypto.randomUUID(),command:{kind:'reveal'}};
        const result=await content.change(retry);
        if(token!==epoch)return;
        if(!result.ok){retry=undefined;emit({message:'This Handout changed elsewhere. Review it and retry Reveal and present.'});return;}
        retry=undefined;item=result.item;
      }
      const current=(await content.list()).find(value=>value.id===item.id);
      if(token!==epoch)return;
      if(!current||current.visibility!=='revealed'){emit({message:'Reveal was not confirmed. Nothing private was presented.'});return;}
      selected=current;blob=undefined;blank();emit({selected:current.id,page:1,pages:1,zoom:1,x:0,y:0});await load(current,token);
    } catch {if(token===epoch)emit({message:'Reveal or presentation failed. Nothing private was presented. Retry the same action when connected.'});}
    finally {if(token===epoch)emit({busy:false});}
  }
  const stop=content.subscribe(snapshot=>{
    if(!active)return;
    if('error' in snapshot){emit({message:'Connection interrupted. Existing display retained; reconnect to reconcile Library access.'});return;}
    if(!selected)return;
    const item=snapshot.items.find(value=>value.id===selected!.id);
    if(!item||item.visibility!=='revealed'){clear('This Handout was withdrawn. Choose another Handout.');return;}
    if((!ready||!blob||item.contentVersion!==selected.contentVersion)&&loadingVersion!==item.contentVersion)void load(item,++epoch);
  });
  const timer=setInterval(()=>{
    if(popup?.closed&&state.window==='open'){epoch++;emit({window:'closed',busy:false,message:'Party Display closed. Open Party Display to reopen it.'});}
    if(selected)void authorized().catch(()=>emit({message:'Connection interrupted. Existing display retained.'}));
  },1000);
  const onUnload=()=>dispose();window.addEventListener('pagehide',onUnload);window.addEventListener('online',reconcile);
  function dispose(){if(!active)return;clear();active=false;stop();clearInterval(timer);window.removeEventListener('pagehide',onUnload);window.removeEventListener('online',reconcile);listeners.clear();}
  return {
    getState:()=>state, subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
    openWindow,present,clear,dispose,
    page:(page:number)=>{if(!blob||!Number.isInteger(page)||page<1||page>state.pages)return;emit({page});task?.cancel();void render(epoch);},
    viewport:(view:{zoom:number;x:number;y:number})=>{if(!Object.values(view).every(Number.isFinite))return;emit({...view,zoom:Math.max(.25,Math.min(8,view.zoom))});transform();},
    fit:()=>{emit({zoom:1,x:0,y:0});if(blob)void render(epoch);},
  };
}
export type PartyDisplay = ReturnType<typeof createPartyDisplay>;

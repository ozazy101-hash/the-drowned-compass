import { rasterVisibleMap } from '../grid-map/MapScene';
import { validateMapPresentation, matchingMapGeometry, type MapPresentation, type MapArtworkVersion } from '../../domain/map-artwork';
import { createMapRevealMaskDraft, type MapRevealMaskCommand } from '../../domain/map-reveal-mask';
import type { RenderTask } from 'pdfjs-dist';
import { readHandoutPdf, type Handout, type HandoutChange, type PartyContent, type SavedGridMap } from '../../domain/party-content';
import { mapViewport } from './map-viewport';
import type { PartySession } from '../../domain/party';

export type DisplayState = { window: 'closed' | 'open' | 'blocked'; message: string; busy: boolean; selected?: string; page: number; pages: number; zoom: number; x: number; y: number; mode:'ordinary'|'calibrating'|'calibrated'; squarePixels:number; setupChanged:boolean; registrationChanged:boolean; contentKind?:'handout'|'map'; testSquare:boolean; presentation?:MapPresentation; artwork?:Blob; reveal?:ReturnType<ReturnType<typeof createMapRevealMaskDraft>['snapshot']> };
// This module owns authority, reveal retries, protected reads, deterministic rendering
// and the same-origin extended-desktop window. Only DM controls read private inspection media; popup delivery remains internal.
export function createPartyDisplay(content: PartyContent, getSession: () => Promise<PartySession | null>) {
  let state: DisplayState = { window:'closed', message:'Open Party Display, then choose a Handout.', busy:false, page:1, pages:1, zoom:1, x:0, y:0, mode:'ordinary',squarePixels:64,setupChanged:false,registrationChanged:false,testSquare:false };
  const listeners = new Set<() => void>();
  let popup: Window | null = null;
  let ready = false;
  let active = true, epoch = 0, renderEpoch = 0;
  let selected: Handout | undefined;
  let map: MapArtworkVersion | undefined;
  let accepted:MapPresentation|undefined, draft:ReturnType<typeof createMapRevealMaskDraft>|undefined;
  let choicePending=false;
  let cachedArtwork: {versionId:string;blob:Blob}|undefined;

  let blob: Blob | undefined;
  let retry: HandoutChange | undefined;
  let registrationReference:MapArtworkVersion|undefined;
  let task: RenderTask | undefined;
  let pdf: Awaited<ReturnType<typeof readHandoutPdf>> | undefined;
  let frame: HTMLCanvasElement | SVGSVGElement | undefined;
  let loadingVersion: number | undefined;
  const emit = (next: Partial<DisplayState>) => { state = {...state,...next}; listeners.forEach(listener=>listener()); };
  const blank = () => { if(popup&&!popup.closed) popup.document.body.replaceChildren(); frame=undefined; };
  function clear(message='Party Display cleared.') {
    epoch++; renderEpoch++; ready=false; selected=undefined; map=undefined; accepted=undefined;draft=undefined;cachedArtwork=undefined; blob=undefined; retry=undefined; registrationReference=undefined; loadingVersion=undefined; task?.cancel(); void pdf?.dispose(); pdf=undefined; blank();
    emit({selected:undefined,busy:false,page:1,pages:1,zoom:1,x:0,y:0,contentKind:undefined,presentation:undefined,reveal:undefined,artwork:undefined,testSquare:false,registrationChanged:false,message});
  }
  async function authorized() {
    const session=await getSession();
    if(!active)return false;
    if(session?.role!=='dungeon-master'){clear('Your session ended. Sign in again before presenting.');return false;}return true;
  }
  function transform() { if(frame&&state.contentKind!=='map'&&!state.testSquare)frame.style.transform=`translate(${state.x}px, ${state.y}px) scale(${state.zoom})`; }
  async function render(token: number) {
    if(state.testSquare){renderSquare();return;}
    if(map){try{await renderMap(token);}catch{if(token===epoch&&active)emit({message:'Connection interrupted or saved map unavailable. Existing display retained; retry when connected.'});}return;}
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
    if(!active)return;
    if(map){await reconcileMap();return;}
    if(!selected)return;
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
    const style=popup.document.createElement('style');style.textContent='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}body{display:flex;align-items:center;justify-content:center}canvas,svg{flex:none;transform-origin:center}';popup.document.head.append(style);
    popup.addEventListener('resize',()=>{if(state.mode!=='ordinary')emit({setupChanged:true,message:'Display viewport changed. Measure the test square again and confirm or recalibrate; scale and pan are retained.'});if(blob||map||state.testSquare)void render(epoch);});
    emit({window:'open',message:'Party Display opened. Move this window to your extended screen.'});
    // Reopening never retransmits a retained frame before rechecking visibility.
    if(state.testSquare){const token=epoch;void authorized().then(ok=>{if(ok&&token===epoch&&state.testSquare)renderSquare();});}else void reconcile();
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
      selected=current;map=undefined;registrationReference=undefined;accepted=undefined;draft=undefined;blob=undefined;blank();emit({selected:current.id,contentKind:'handout',testSquare:false,page:1,pages:1,...(state.mode==='ordinary'?{zoom:1,x:0,y:0}:{})});await load(current,token);
    } catch {if(token===epoch)emit({message:'Reveal or presentation failed. Nothing private was presented. Retry the same action when connected.'});}
    finally {if(token===epoch)emit({busy:false});}
  }
  function svgFrame(label:string,width:number,height:number,columns:number,rows:number) {
    const svg=popup!.document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('aria-label',label);svg.setAttribute('viewBox',`0 0 ${columns} ${rows}`);
    svg.style.width=`${width}px`;svg.style.height=`${height}px`;svg.style.transform=`translate(${state.x}px, ${state.y}px)`;
    svg.style.background='#17212b';return svg;
  }
  function shape(svg:SVGSVGElement,name:string,attrs:Record<string,string|number>) {
    const node=svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));svg.append(node);return node;
  }
  function renderSquare() {
    renderEpoch++;task?.cancel();
    if(!popup||popup.closed)return;
    const svg=svgFrame('Physical calibration test square',state.squarePixels,state.squarePixels,1,1);
    shape(svg,'rect',{x:0,y:0,width:1,height:1,fill:'#fff',stroke:'#ffb54a','stroke-width':.025,'data-test-square':''});
    popup.document.body.replaceChildren(svg);frame=svg;
  }
  async function renderMap(token:number) {
    if(!ready||!accepted?.version||!popup||popup.closed)return;
    const snapshot=accepted,target=popup,drawing=++renderEpoch;
    const bytes=snapshot.version!.background?(cachedArtwork?.versionId===snapshot.version!.id?cachedArtwork.blob:await content.openMapVersion(snapshot.version!.id)):undefined;
    const visible=await rasterVisibleMap(snapshot,bytes);
    try {
    if(token!==epoch||drawing!==renderEpoch||!active||accepted?.revision!==snapshot.revision)return;
    if(!await authorized()||token!==epoch||drawing!==renderEpoch||target.closed||state.testSquare||accepted?.revision!==snapshot.revision)return;
    const geometry=mapViewport(snapshot.version!.document,{width:target.innerWidth,height:target.innerHeight},state);
    const canvas=target.document.createElement('canvas');canvas.width=visible.width;canvas.height=visible.height;
    canvas.getContext('2d')!.drawImage(visible,0,0);visible.width=visible.height=0;
    canvas.setAttribute('aria-label','Uncovered Grid Map on Party Display');
    canvas.dataset.squarePixels=String(geometry.squarePixels);canvas.dataset.presentationRevision=String(snapshot.revision);
    canvas.style.imageRendering='pixelated';canvas.style.width=`${geometry.width}px`;canvas.style.height=`${geometry.height}px`;canvas.style.transform=`translate(${state.x}px, ${state.y}px)`;
    cachedArtwork=bytes?{versionId:snapshot.version!.id,blob:bytes}:undefined;
    target.document.body.replaceChildren(canvas);frame=canvas;emit({artwork:bytes,message:'Presenting accepted uncovered Grid Map.'});
    } finally {visible.width=visible.height=0;}
  }
  function accept(snapshot:MapPresentation, preserveDraft=false) {
    snapshot=validateMapPresentation(snapshot);
    if(!snapshot.version||!snapshot.mask)throw new Error('Map presentation unavailable.');
    if(accepted&&snapshot.revision<accepted.revision)return;
    if(registrationReference&&!matchingMapGeometry(registrationReference,snapshot.version))emit({x:0,y:0,setupChanged:true,registrationChanged:true});
    if(accepted?.version?.id!==snapshot.version.id){cachedArtwork=undefined;emit({artwork:undefined});}
    registrationReference=snapshot.version;accepted=snapshot;map=snapshot.version;
    if(preserveDraft&&draft)draft.observe(snapshot);else draft=createMapRevealMaskDraft(snapshot);
    selected=undefined;blob=undefined;ready=true;
    emit({selected:map.familyId,contentKind:'map',presentation:snapshot,reveal:draft?.snapshot(),page:1,pages:1});
  }
  async function reconcileMap() {
    if(choicePending||!map||!active)return;
    const token=epoch;
    try {
      if(!await authorized()||token!==epoch)return;
      const snapshot=validateMapPresentation((await content.readMapWorkspace()).presentation);
      if(token!==epoch||!active||!map)return;
      if(!snapshot.version){clear('Map presentation unavailable.');return;}
      if(!ready||snapshot.revision!==accepted?.revision){accept(snapshot,!!draft&&(draft.snapshot().status!=='accepted'||draft.snapshot().strokeActive));await render(token);}
    }catch{if(token===epoch&&active)emit({message:'Map access unavailable. Retry when connected.'});}
  }
  async function presentMap(value:string|SavedGridMap|MapArtworkVersion,newMap=false) {
    if(!active||state.busy)return;
    // This synchronous gesture opens the popup before any protected async work.
    if(!popup||popup.closed)openWindow();
    if(!popup||popup.closed)return;
    const token=++epoch;choicePending=true;emit({busy:true,message:'Checking saved map presentation…'});
    try {
      if(!await authorized()||token!==epoch)return;
      const workspace=await content.readMapWorkspace();
      if(token!==epoch||!active)return;
      const version=typeof value==='string'?(workspace.versions.find(v=>v.id===value)??workspace.versions.filter(v=>v.familyId===value).at(-1)):'familyId' in value?value:workspace.versions.filter(v=>v.familyId===value.id).at(-1);
      if(!version)throw new Error('Choose a saved version.');
      const result=await content.chooseMapPresentation({versionId:version.id,expectedRevision:workspace.presentation.revision,requestId:crypto.randomUUID(),newMap});
      if(token!==epoch||!active)return;
      if(!result.ok){if(result.reason==='incompatible'&&window.confirm('Set up this different map? It starts fully hidden. Recheck physical calibration before placing miniatures.')){choicePending=false;emit({busy:false});void presentMap(version,true);return;}emit({message:result.reason==='incompatible'?'Different map geometry. Confirm new map setup to start hidden.':'Presentation changed elsewhere. Retry your choice.'});return;}
      accept(result.presentation);emit({testSquare:false});await render(token);
    }catch{if(token===epoch&&active)emit({message:'Map choice failed. Accepted display retained; retry.'});}
    finally{choicePending=false;if(token===epoch)emit({busy:false});}
  }
  function reveal(command:MapRevealMaskCommand) {
    if(!draft)return;
    try{draft.command(command);emit({reveal:draft.snapshot()});}catch(error){emit({message:error instanceof Error?error.message:'Reveal command unavailable.'});}
  }
  async function saveReveal() {
    if(!draft||choicePending)return;
    const current=draft,token=epoch,requestId=crypto.randomUUID();
    try {
      if(!await authorized()||token!==epoch)return;
      const intent=current.prepareCommit(requestId);emit({reveal:current.snapshot()});
      const result=await content.commitMapRevealMask(intent);
      if(token!==epoch||draft!==current||!active)return;
      current.receive(requestId,result);
      if(current.snapshot().accepted.revision>=(accepted?.revision??0)){accept(current.snapshot().accepted,true);await render(token);}
      emit({reveal:current.snapshot(),message:result.ok?'Reveal progress saved.':current.snapshot().error??'Reveal conflict. Retry or discard draft.'});
    }catch(error){if(token!==epoch||draft!==current)return;current.receive(requestId,{ok:false,reason:'error',error:error instanceof Error?error.message:'Reveal save failed.'});emit({reveal:current.snapshot(),message:'Reveal save failed. Accepted display and draft retained.'});}
  }
  function calibration(command:{kind:'start'|'confirm'|'reset';squarePixels?:number}) {
    if(!active||!popup||popup.closed)return;
    if(command.squarePixels!==undefined&&(!Number.isFinite(command.squarePixels)||command.squarePixels<8||command.squarePixels>512)){emit({message:'Choose a test square between 8 and 512 display pixels.'});return;}
    renderEpoch++;task?.cancel();
    if(command.kind==='reset'){emit({mode:'ordinary',testSquare:false,setupChanged:false,registrationChanged:false,zoom:1,x:0,y:0,message:'Calibration reset. Ordinary viewing uses zoom and Fit to screen.'});blank();if(map&&!ready)void reconcileMap();else void render(epoch);return;}
    if(command.kind==='confirm'){emit({mode:'calibrated',testSquare:!map&&!blob,setupChanged:false,registrationChanged:false,message:'Measured square confirmed for this physical setup. Scale is locked; pan remains available.'});if(map&&!ready)void reconcileMap();else void render(epoch);return;}
    emit({mode:'calibrating',testSquare:true,squarePixels:command.squarePixels??state.squarePixels,zoom:1,message:'Measure the square on the table. Adjust until it matches your desired miniature square, then confirm.'});
    const token=epoch;void authorized().then(ok=>{if(ok&&token===epoch&&state.testSquare)renderSquare();});
  }
  const stop=content.subscribe(snapshot=>{
    if(!active)return;
    if('error' in snapshot){emit({message:'Connection interrupted. Existing display retained; reconnect to reconcile Library access.'});return;}
    if(map){void reconcileMap();return;}
    if(!selected)return;
    const item=snapshot.items.find(value=>value.id===selected!.id);
    if(!item||item.visibility!=='revealed'){clear('This Handout was withdrawn. Choose another Handout.');return;}
    if((!ready||!blob||item.contentVersion!==selected.contentVersion)&&loadingVersion!==item.contentVersion)void load(item,++epoch);
  });
  const stopMaps=content.observeMapWorkspace(()=>{if(map)void reconcileMap();});
  const timer=setInterval(()=>{
    if(popup?.closed&&state.window==='open'){epoch++;emit({window:'closed',busy:false,message:'Party Display closed. Open Party Display to reopen it.'});}
    if(selected||map||state.testSquare)void authorized().catch(()=>emit({message:'Connection interrupted. Existing display retained.'}));
  },1000);
  const onUnload=()=>dispose();window.addEventListener('pagehide',onUnload);window.addEventListener('online',reconcile);
  function dispose(){if(!active)return;clear();active=false;stop();stopMaps();clearInterval(timer);window.removeEventListener('pagehide',onUnload);window.removeEventListener('online',reconcile);listeners.clear();}
  return {
    getState:()=>state, subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
    openWindow,present,presentMap,reveal,saveReveal,calibration,clear,dispose,
    page:(page:number)=>{if(!blob||!Number.isInteger(page)||page<1||page>state.pages)return;emit({page});task?.cancel();void render(epoch);},
    viewport:(view:{zoom:number;x:number;y:number})=>{if(!Object.values(view).every(Number.isFinite))return;
      if(state.mode!=='ordinary'&&view.zoom!==state.zoom){emit({message:'Projection scale is locked. Reset calibration to use ordinary zoom.'});return;}emit({...view,zoom:Math.max(.25,Math.min(8,view.zoom))});if(map||state.testSquare)void render(epoch);else transform();},
    fit:()=>{if(state.mode!=='ordinary'){emit({message:'Projection scale is locked. Reset calibration to use Fit to screen.'});return;}emit({zoom:1,x:0,y:0});if(blob||map)void render(epoch);},
  };
}
export type PartyDisplay = ReturnType<typeof createPartyDisplay>;

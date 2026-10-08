import type { RenderTask } from 'pdfjs-dist';
import { readHandoutPdf, type Handout, type HandoutChange, type PartyContent, type SavedGridMap, type GridMapChange } from '../../domain/party-content';
import { mapViewport, matchingMapRegistration } from './map-viewport';
import type { PartySession } from '../../domain/party';

export type DisplayState = { window: 'closed' | 'open' | 'blocked'; message: string; busy: boolean; selected?: string; page: number; pages: number; zoom: number; x: number; y: number; mode:'ordinary'|'calibrating'|'calibrated'; squarePixels:number; setupChanged:boolean; registrationChanged:boolean; contentKind?:'handout'|'map'; testSquare:boolean };
// This module owns authority, reveal retries, protected reads, deterministic rendering
// and the same-origin extended-desktop window. Callers never handle media or messages.
export function createPartyDisplay(content: PartyContent, getSession: () => Promise<PartySession | null>) {
  let state: DisplayState = { window:'closed', message:'Open Party Display, then choose a Handout.', busy:false, page:1, pages:1, zoom:1, x:0, y:0, mode:'ordinary',squarePixels:64,setupChanged:false,registrationChanged:false,testSquare:false };
  const listeners = new Set<() => void>();
  let popup: Window | null = null;
  let ready = false;
  let active = true, epoch = 0, renderEpoch = 0;
  let selected: Handout | undefined;
  let map: SavedGridMap | undefined, mapImage:string|undefined;
  let reconcilingMap=false, mapAgain=false, pendingMap=false;
  let blob: Blob | undefined;
  let retry: HandoutChange | undefined;
  let mapRetry:GridMapChange|undefined;
  let registrationReference:SavedGridMap|undefined;
  let task: RenderTask | undefined;
  let pdf: Awaited<ReturnType<typeof readHandoutPdf>> | undefined;
  let frame: HTMLCanvasElement | SVGSVGElement | undefined;
  let loadingVersion: number | undefined;
  const emit = (next: Partial<DisplayState>) => { state = {...state,...next}; listeners.forEach(listener=>listener()); };
  const blank = () => { if(popup&&!popup.closed) popup.document.body.replaceChildren(); frame=undefined; };
  function clear(message='Party Display cleared.') {
    epoch++; renderEpoch++; ready=false; selected=undefined; map=undefined; mapImage=undefined; blob=undefined; retry=undefined; mapRetry=undefined; registrationReference=undefined; loadingVersion=undefined; task?.cancel(); void pdf?.dispose(); pdf=undefined; blank();
    emit({selected:undefined,busy:false,page:1,pages:1,zoom:1,x:0,y:0,contentKind:undefined,testSquare:false,registrationChanged:false,message});
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
    const style=popup.document.createElement('style');style.textContent='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#080b10}body{display:flex;align-items:center;justify-content:center}canvas,svg{flex:none;transform-origin:center}';popup.document.head.append(style);
    popup.addEventListener('resize',()=>{if(state.mode!=='ordinary')emit({setupChanged:true,message:'Display viewport changed. Measure the test square again and confirm or recalibrate; scale and pan are retained.'});if(blob||map||state.testSquare)void render(epoch);});
    emit({window:'open',message:'Party Display opened. Move this window to your extended screen.'});
    // Reopening never retransmits a retained frame before rechecking visibility.
    if(state.testSquare)void authorized().then(ok=>{if(ok)renderSquare();});else void reconcile();
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
      selected=current;map=undefined;registrationReference=undefined;mapImage=undefined;blob=undefined;blank();emit({selected:current.id,contentKind:'handout',testSquare:false,page:1,pages:1,...(state.mode==='ordinary'?{zoom:1,x:0,y:0}:{})});await load(current,token);
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
    if(!ready||!map||!popup||popup.closed)return;
    const item=map,target=popup,drawing=++renderEpoch;
    const geometry=mapViewport(item.document,{width:target.innerWidth,height:target.innerHeight},state);
    const svg=svgFrame('Saved Grid Map on Party Display',geometry.width,geometry.height,item.document.columns,item.document.rows);
    svg.setAttribute('data-square-pixels',String(geometry.squarePixels));svg.setAttribute('data-map-version',String(item.version));
    if(item.background&&mapImage)shape(svg,'image',{href:mapImage,x:item.background.x,y:item.background.y,width:item.background.width,height:item.background.height});
    for(const cell of item.document.terrain)shape(svg,'rect',{x:cell.x,y:cell.y,width:1,height:1,fill:cell.kind==='water'?'#3188ac':cell.kind==='difficult'?'#95704c':'#566b62','fill-opacity':.7,'data-terrain':cell.kind});
    for(let x=0;x<=item.document.columns;x++)shape(svg,'path',{d:`M${x} 0V${item.document.rows}`,stroke:'#94a3b8','stroke-width':.015,fill:'none'});
    for(let y=0;y<=item.document.rows;y++)shape(svg,'path',{d:`M0 ${y}H${item.document.columns}`,stroke:'#94a3b8','stroke-width':.015,fill:'none'});
    for(const edge of item.document.edges)shape(svg,'path',{d:`M${edge.x} ${edge.y}${edge.direction==='horizontal'?'h1':'v1'}`,stroke:edge.kind==='door'?'#ffb54a':'#fff','stroke-width':.12,'data-edge':edge.kind});
    const current=await content.loadMap(item.id);
    if(token!==epoch||drawing!==renderEpoch||!active)return;
    if(current.visibility!=='revealed'){clear('This Grid Map was withdrawn. Party Display cleared.');return;}
    if(current.version!==item.version){void reconcileMap();return;}
    if(!await authorized()||token!==epoch||drawing!==renderEpoch||target.closed||state.testSquare)return;
    target.document.body.replaceChildren(svg);frame=svg;emit({message:state.registrationChanged?(state.mode==='ordinary'?'Map registration changed. Ordinary view refitted and position reset. Calibrate before placing miniatures.':'Map registration changed. Square size is retained and position reset. Reposition, measure the test square and confirm calibration before placing miniatures.'):state.setupChanged?'Display setup changed. Measure the test square and confirm calibration before placing miniatures.':'Presenting saved Grid Map. Projection settings retained.'});
  }
  async function readMap(id:string,token:number,attempt=0) {
    const item=await content.loadMap(id);
    if(token!==epoch||!active)return;
    if(item.visibility!=='revealed'){clear('This Grid Map is private or withdrawn. Nothing private was presented.');return;}
    const bytes=item.background?await content.openMapBackground(id,item.version):undefined;
    const image=bytes?await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(bytes);}):undefined;
    const current=await content.loadMap(id);
    if(token!==epoch||!active)return;
    if(current.visibility!=='revealed'){clear('This Grid Map was withdrawn. Nothing private was presented.');return;}
    if(current.version!==item.version){if(attempt>=2)throw new Error('Saved map is changing. Retry.');await readMap(id,token,attempt+1);return;}
    if(!await authorized()||token!==epoch)return;
    if(registrationReference&&!matchingMapRegistration(registrationReference,current))emit({x:0,y:0,setupChanged:true,registrationChanged:true});
    selected=undefined;blob=undefined;task?.cancel();
    registrationReference=current;map=current;mapImage=image;ready=true;emit({selected:id,contentKind:'map',page:1,pages:1});await render(token);
  }
  async function reconcileMap() {
    if(pendingMap){
      mapAgain=true;const retained=map,token=epoch;
      // A slow next-stage read must never delay withdrawal of the retained frame.
      if(retained)try{const current=await content.loadMap(retained.id);if(token===epoch&&map?.id===retained.id&&current.visibility!=='revealed')clear('This Grid Map was withdrawn. Party Display cleared.');}catch{/* Uncertain reads retain the verified frame; authority is checked independently. */}
      return;
    }
    if(reconcilingMap){mapAgain=true;return;}
    reconcilingMap=true;
    try {
      do {
        mapAgain=false;const item=map;if(!item||!active)break;
        const token=epoch;
        if(!await authorized()||token!==epoch)break;
        const items=await content.listMaps();if(token!==epoch||map?.id!==item.id)break;
        const current=items.find(value=>value.id===item.id);
        if(!current||current.visibility!=='revealed'){clear('This Grid Map is private or withdrawn. Party Display cleared.');break;}
        if(!ready||current.version!==item.version)await readMap(item.id,token);
      } while(mapAgain&&active&&map);
    }catch{if(active)emit({message:'Connection interrupted or saved map unavailable. Existing display retained; retry when connected.'});}
    finally{reconcilingMap=false;}
  }
  async function presentMap(value:string|SavedGridMap) {
    if(!active||state.busy)return;
    if(!popup||popup.closed){emit({message:'Open Party Display before presenting.'});return;}
    const token=++epoch;pendingMap=true;emit({busy:true,message:'Checking saved Grid Map access…'});
    try {
      if(!await authorized()||token!==epoch)return;
      let item=typeof value==='string'?await content.loadMap(value):value;
      if(mapRetry&&mapRetry.id!==item.id)mapRetry=undefined;
      if(item.visibility==='private'||mapRetry){
        mapRetry??={id:item.id,expectedVersion:item.version,requestId:crypto.randomUUID(),command:{kind:'reveal'}};
        const result=await content.changeMap(mapRetry);
        if(token!==epoch)return;
        if(!result.ok){mapRetry=undefined;emit({message:'This Grid Map changed elsewhere. Review the saved map and retry Reveal and present.'});return;}
        mapRetry=undefined;item=result.item;
      }
      if(token!==epoch)return;
      emit({testSquare:false});await readMap(item.id,token);
    }catch{if(token===epoch)emit({message:'Saved Grid Map could not be confirmed. Existing display retained; retry the same action when connected.'});}
    finally{pendingMap=false;if(token===epoch){emit({busy:false});if(mapAgain&&map)void reconcileMap();}}
  }
  function calibration(command:{kind:'start'|'confirm'|'reset';squarePixels?:number}) {
    if(!active||!popup||popup.closed)return;
    if(command.squarePixels!==undefined&&(!Number.isFinite(command.squarePixels)||command.squarePixels<8||command.squarePixels>512)){emit({message:'Choose a test square between 8 and 512 display pixels.'});return;}
    renderEpoch++;task?.cancel();
    if(command.kind==='reset'){emit({mode:'ordinary',testSquare:false,setupChanged:false,registrationChanged:false,zoom:1,x:0,y:0,message:'Calibration reset. Ordinary viewing uses zoom and Fit to screen.'});blank();if(map&&!ready)void reconcileMap();else void render(epoch);return;}
    if(command.kind==='confirm'){emit({mode:'calibrated',testSquare:!map&&!blob,setupChanged:false,registrationChanged:false,message:'Measured square confirmed for this physical setup. Scale is locked; pan remains available.'});if(map&&!ready)void reconcileMap();else void render(epoch);return;}
    emit({mode:'calibrating',testSquare:true,squarePixels:command.squarePixels??state.squarePixels,zoom:1,message:'Measure the square on the table. Adjust until it matches your desired miniature square, then confirm.'});
    void authorized().then(ok=>{if(ok&&state.testSquare)renderSquare();});
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
  const timer=setInterval(()=>{
    if(popup?.closed&&state.window==='open'){epoch++;emit({window:'closed',busy:false,message:'Party Display closed. Open Party Display to reopen it.'});}
    if(selected||map||state.testSquare)void authorized().catch(()=>emit({message:'Connection interrupted. Existing display retained.'}));
  },1000);
  const onUnload=()=>dispose();window.addEventListener('pagehide',onUnload);window.addEventListener('online',reconcile);
  function dispose(){if(!active)return;clear();active=false;stop();clearInterval(timer);window.removeEventListener('pagehide',onUnload);window.removeEventListener('online',reconcile);listeners.clear();}
  return {
    getState:()=>state, subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
    openWindow,present,presentMap,calibration,clear,dispose,
    page:(page:number)=>{if(!blob||!Number.isInteger(page)||page<1||page>state.pages)return;emit({page});task?.cancel();void render(epoch);},
    viewport:(view:{zoom:number;x:number;y:number})=>{if(!Object.values(view).every(Number.isFinite))return;
      if(state.mode!=='ordinary'&&view.zoom!==state.zoom){emit({message:'Projection scale is locked. Reset calibration to use ordinary zoom.'});return;}emit({...view,zoom:Math.max(.25,Math.min(8,view.zoom))});if(map||state.testSquare)void render(epoch);else transform();},
    fit:()=>{if(state.mode!=='ordinary'){emit({message:'Projection scale is locked. Reset calibration to use Fit to screen.'});return;}emit({zoom:1,x:0,y:0});if(blob||map)void render(epoch);},
  };
}
export type PartyDisplay = ReturnType<typeof createPartyDisplay>;

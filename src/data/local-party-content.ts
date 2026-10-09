import { commitMapRevealMask, mapRevealGeometry, prepareMapRevealMaskIntent } from '../domain/map-reveal-mask';
import { attachmentDocument, chooseMapPresentation, emptyMapPresentation, validateMapVersion, validateMapPresentation, validateMapWorkspace, type MapArtworkVersion, type MapPresentation } from '../domain/map-artwork';
import { validateGridMap, validateMapBackground } from '../domain/grid-map';
import { filterGridMaps, prepareGridMapSave, prepareGridMapChange, transitionGridMap, filterHandouts, prepareHandoutChange, transitionHandout, validateHandout, type Handout, type PartyContent, type SavedGridMap } from '../domain/party-content';
import { localContentTransaction } from './local-party-store';
import { contentSubscription, snapshotSubscription } from './content-subscription';
type RetainedVersion={version:MapArtworkVersion;blob:Blob|null;referenceBlob:Blob|null};
type LocalMap = SavedGridMap & {kind:'grid-map';blob:Blob|null;versions?:RetainedVersion[];requests:Record<string,{signature:string;item:SavedGridMap}>};
type MaskProgress={familyId:string;geometry:ReturnType<typeof mapRevealGeometry>;mask:NonNullable<MapPresentation['mask']>};
type PresentationRecord={masks?:MaskProgress[];id:'map-presentation';kind:'map-presentation';presentation:MapPresentation;requests:Record<string,{signature:string;presentation:MapPresentation}>};
function retained(item:LocalMap):RetainedVersion[] {
 return item.versions??[{version:{id:`legacy:${item.id}:${item.version}`,familyId:item.id,parentVersionId:null,createdAt:item.createdAt,requestId:`legacy:${item.id}:${item.version}`,title:item.title,document:validateGridMap(item.document),background:item.background?{...item.background,registration:`legacy:${item.background.registration??item.id}`}:null,origin:'legacy',instructions:'',reference:null,jobId:null},blob:item.blob,referenceBlob:null}];
}
function savedVersion(item:SavedGridMap,requestId:string,parentVersionId:string|null,origin:MapArtworkVersion['origin']):MapArtworkVersion {return {id:requestId,familyId:item.id,parentVersionId,createdAt:new Date().toISOString(),requestId,title:item.title,document:item.document,background:item.background,origin,instructions:'',reference:null,jobId:null};}
const mapMetadata=({kind:_kind,blob:_blob,requests:_requests,versions:_versions,...item}:LocalMap):SavedGridMap=>{const document=validateGridMap(item.document);if(item.background)validateMapBackground(document,item.background);return {...item,visibility:'private',document,background:item.background?{...item.background,registration:_versions?item.background.registration:`legacy:${item.background.registration??item.id}`}:null};};
type SavedHandout = Handout & { blob: Blob; digest: string; lastRequestId?: string; lastSignature?: string };
const metadata = ({ blob: _blob, digest: _digest, lastRequestId: _request, lastSignature: _signature, ...item }: SavedHandout): Handout => ({...item,version:item.version??1,contentVersion:item.contentVersion??1});
const event='drowned-compass-content-changed';
function changed() { window.dispatchEvent(new Event(event));const channel=new BroadcastChannel(event);channel.postMessage(null);channel.close(); }
export function localPartyContent(token: () => string | null): PartyContent {
  const content: PartyContent={
    readMapWorkspace:()=>localContentTransaction(token(),false,(store,complete,role)=>{
      if(role!=='dungeon-master'){store.transaction.abort();return;}
      const request=store.getAll();request.onsuccess=()=>{const records=request.result as (LocalMap|PresentationRecord)[];const maps=records.filter((r):r is LocalMap=>r.kind==='grid-map');try{complete(validateMapWorkspace({families:maps.map(mapMetadata),versions:maps.flatMap(r=>retained(r).map(v=>validateMapVersion(v.version))),presentation:records.find((r):r is PresentationRecord=>r.kind==='map-presentation')?.presentation??emptyMapPresentation()}));}catch{store.transaction.abort();}};
    }),
    async readMapVersion(id){const workspace=await content.readMapWorkspace();const version=workspace.versions.find(v=>v.id===id);if(!version)throw new Error('This saved Map Artwork Version is unavailable.');return version;},
    openMapVersion:(id,source='artwork')=>localContentTransaction(token(),false,(store,complete,role)=>{
      if(role!=='dungeon-master'){store.transaction.abort();return;}
      const request=store.getAll();request.onsuccess=()=>{const entry=(request.result as LocalMap[]).filter(r=>r.kind==='grid-map').flatMap(retained).find(v=>v.version.id===id);const blob=source==='reference'?entry?.referenceBlob:entry?.blob;if(!blob){store.transaction.abort();return;}complete(blob);};
    }),
    async attachMapVersion(input){
      const parent=input.parentVersionId?await content.readMapVersion(input.parentVersionId):undefined;
      const document=attachmentDocument(input,parent);
      const prepared=await prepareGridMapSave({id:input.familyId,requestId:input.requestId,expectedVersion:input.expectedVersion,title:input.title,document,background:input.artwork});
      const reference=input.reference?await prepareGridMapSave({id:input.familyId,requestId:input.requestId,expectedVersion:input.expectedVersion,title:input.title,document,background:input.reference}):undefined;
      const signature=JSON.stringify({save:prepared.signature,parent:input.parentVersionId??null,reference:reference?.replacement??null,instructions:input.instructions??''});
      const outcome=await localContentTransaction<Awaited<ReturnType<PartyContent['attachMapVersion']>>>(token(),true,(store,complete)=>{
        const request=store.getAll();request.onsuccess=()=>{try{
          const records=request.result as LocalMap[];const maps=records.filter(r=>r.kind==='grid-map');const saved=maps.find(r=>r.id===input.familyId);
          const retry=maps.flatMap(retained).find(v=>v.version.requestId===input.requestId);
          if(retry){if(saved?.requests[input.requestId]?.signature!==signature)throw new Error('This request was already used for different content.');complete({ok:true,version:retry.version});return;}
          if(records.some(r=>r.id===input.familyId&&r.kind!=='grid-map'))throw new Error('This content identity is already used.');
          if(saved&&saved.version!==input.expectedVersion){complete({ok:false,reason:'conflict',item:mapMetadata(saved)});return;}
          if(!saved&&input.expectedVersion!==0)throw new Error('This map is unavailable.');
          const history=saved?retained(saved):[];const source=history.find(v=>v.version.id===input.parentVersionId);
          if(input.parentVersionId&&!source)throw new Error('This saved source is unavailable.');
          let background=source?.version.background??null,blob=source?.blob??null;
          if(prepared.replacement){background={...prepared.replacement,registration:`upload:${input.requestId}`};blob=input.artwork!;}
          const item:SavedGridMap={id:input.familyId,title:prepared.title,visibility:'private',createdAt:saved?.createdAt??new Date().toISOString(),version:(saved?.version??0)+1,document,background};
          const version:MapArtworkVersion={...savedVersion(item,input.requestId,input.parentVersionId??null,input.artwork?'uploaded':'drawing'),instructions:input.instructions??'',reference:reference?.replacement?{...reference.replacement,registration:`upload:${input.requestId}`}:null};
          store.put({...item,kind:'grid-map',blob,versions:[...history,{version,blob,referenceBlob:input.reference??null}],requests:{...saved?.requests,[input.requestId]:{signature,item}}});complete({ok:true,version});
        }catch{store.transaction.abort();}};
      });changed();return outcome;
    },
    async chooseMapPresentation(input){
      const outcome=await localContentTransaction<Awaited<ReturnType<PartyContent['chooseMapPresentation']>>>(token(),true,(store,complete)=>{
        const request=store.getAll();request.onsuccess=()=>{try{
          const records=request.result as (LocalMap|PresentationRecord)[];const saved=records.find((r):r is PresentationRecord=>r.kind==='map-presentation');const signature=JSON.stringify({versionId:input.versionId,expectedRevision:input.expectedRevision,newMap:input.newMap??false});const retry=saved?.requests[input.requestId];
          if(retry){if(retry.signature!==signature)throw new Error('This presentation request was already used.');complete({ok:true,presentation:retry.presentation});return;}
          const version=records.filter((r):r is LocalMap=>r.kind==='grid-map').flatMap(retained).find(v=>v.version.id===input.versionId)?.version;if(!version)throw new Error('Choose a saved Map Artwork Version.');
          const result=chooseMapPresentation(saved?.presentation??emptyMapPresentation(),version,input);
          if(result.ok){
            const masks=[...(saved?.masks??[])];
            if(saved?.presentation.version&&saved.presentation.mask){const source=saved.presentation.version,geometry=mapRevealGeometry(source);const key=JSON.stringify(geometry);const index=masks.findIndex(m=>m.familyId===source.familyId&&JSON.stringify(m.geometry)===key);const entry={familyId:source.familyId,geometry,mask:saved.presentation.mask};if(index<0)masks.push(entry);else masks[index]=entry;}
            const geometry=mapRevealGeometry(version),progress=masks.find(m=>m.familyId===version.familyId&&JSON.stringify(m.geometry)===JSON.stringify(geometry));
            if(progress)result.presentation={...result.presentation,mask:progress.mask};
            const presentation=validateMapPresentation(result.presentation);
            store.put({id:'map-presentation',kind:'map-presentation',presentation,masks,requests:{...saved?.requests,[input.requestId]:{signature,presentation}}});complete({ok:true,presentation});
          }else complete(result);
        }catch{store.transaction.abort();}};
      });changed();return outcome;
    },
    async commitMapRevealMask(input){
      const prepared=prepareMapRevealMaskIntent(input),signature=JSON.stringify(prepared.signature);
      const outcome=await localContentTransaction<Awaited<ReturnType<PartyContent['commitMapRevealMask']>>>(token(),true,(store,complete)=>{
        const request=store.get('map-presentation');request.onsuccess=()=>{try{
          const saved=request.result as PresentationRecord|undefined,retry=saved?.requests[input.requestId];
          if(retry){if(retry.signature!==signature)throw new Error('This presentation request was already used.');complete({ok:true,presentation:validateMapPresentation(retry.presentation)});return;}
          const result=commitMapRevealMask(saved?.presentation??emptyMapPresentation(),input);
          if(result.ok){
            const masks=[...(saved?.masks??[])],key=JSON.stringify(prepared.geometry);
            const index=masks.findIndex(m=>m.familyId===input.familyId&&JSON.stringify(m.geometry)===key);
            const progress={familyId:input.familyId,geometry:prepared.geometry,mask:result.presentation.mask!};
            if(index<0)masks.push(progress);else masks[index]=progress;
            store.put({id:'map-presentation',kind:'map-presentation',presentation:result.presentation,masks,requests:{...saved?.requests,[input.requestId]:{signature,presentation:result.presentation}}});
          }complete(result);
        }catch{store.transaction.abort();}};
      });changed();return outcome;
    },
    observeMapWorkspace:listener=>snapshotSubscription(async()=>({workspace:await content.readMapWorkspace()}),invalidate=>{
      const channel=new BroadcastChannel(event);channel.onmessage=invalidate;window.addEventListener(event,invalidate);return ()=>{channel.close();window.removeEventListener(event,invalidate);};
    },listener),

    listMaps: query=>localContentTransaction(token(),false,(store,complete,role)=>{
      const request=store.getAll();request.onsuccess=()=>complete(filterGridMaps((request.result as LocalMap[]).filter(item=>item.kind==='grid-map'&&role==='dungeon-master').map(mapMetadata),query));
    }),
    loadMap: id=>localContentTransaction(token(),false,(store,complete,role)=>{
      const request=store.get(id);request.onsuccess=()=>{const item=request.result as LocalMap|undefined;if(!item||item.kind!=='grid-map'||role!=='dungeon-master'){store.transaction.abort();return;}complete(mapMetadata(item));};
    }),
    async saveMap(input){
      const prepared=await prepareGridMapSave(input);
      const result=await localContentTransaction<Awaited<ReturnType<PartyContent['saveMap']>>>(token(),true,(store,complete)=>{
        const request=store.getAll();request.onsuccess=()=>{
          const records=request.result as (LocalMap|SavedHandout)[];
          const saved=records.find(item=>item.id===input.id) as LocalMap|undefined;
          try {
            if(records.some(item=>'kind' in item&&item.kind==='grid-map'&&item.id!==input.id&&item.requests[input.requestId]))throw new Error('This save request was already used for different content.');
            if(saved&&saved.kind!=='grid-map')throw new Error('This content identity is already used.');
            const retry=saved?.requests[input.requestId];
            if(retry){if(retry.signature!==prepared.signature)throw new Error('This save request was already used for different content.');complete({ok:true,item:{...retry.item,visibility:'private',document:validateGridMap(retry.item.document)}});return;}
            if(saved&&saved.version!==input.expectedVersion){complete({ok:false,reason:'conflict',item:mapMetadata(saved)});return;}
            if(!saved&&input.expectedVersion!==0)throw new Error('This map is unavailable.');
            let background=saved?mapMetadata(saved).background:null, blob=saved?.blob??null;
            if(prepared.mode==='remove'){background=null;blob=null;}
            if(prepared.replacement){const {digest:_digest,...metadata}=prepared.replacement;background={...metadata,digest:_digest,registration:`upload:${input.requestId}`};blob=input.background!;}
            if(background)validateMapBackground(prepared.document,background);
            const item:SavedGridMap={id:input.id,title:prepared.title,visibility:'private',createdAt:saved?.createdAt??new Date().toISOString(),version:(saved?.version??0)+1,document:prepared.document,background};
            const history=saved?retained(saved):[];
            const version=savedVersion(item,input.requestId,history.at(-1)?.version.id??null,prepared.replacement?'uploaded':'drawing');
            const next:LocalMap={...item,kind:'grid-map',blob,versions:[...history,{version,blob,referenceBlob:null}],requests:{...saved?.requests,[input.requestId]:{signature:prepared.signature,item}}};
            store.put(next);complete({ok:true,item});
          }catch{store.transaction.abort();}
        };
      });changed();return result;
    },
    async changeMap(input){
      const prepared=prepareGridMapChange(input);
      const result=await localContentTransaction<Awaited<ReturnType<PartyContent['changeMap']>>>(token(),true,(store,complete)=>{
        const request=store.getAll();request.onsuccess=()=>{
          const records=request.result as (LocalMap|SavedHandout)[];
          try {
            const receipt=records.filter((item):item is LocalMap=>'kind' in item&&item.kind==='grid-map').map(item=>item.requests[input.requestId]).find(Boolean);
            if(receipt){if(receipt.signature!==prepared.signature)throw new Error('This change request was already used for different content.');complete({ok:true,item:{...receipt.item,visibility:'private'}});return;}
            const saved=records.find(item=>item.id===input.id);
            if(!saved||!('kind' in saved)||saved.kind!=='grid-map')throw new Error('This Grid Map is unavailable.');
            const outcome=transitionGridMap(mapMetadata(saved),input,prepared,new Date().toISOString());
            if(!outcome.ok){complete(outcome);return;}
            const copyId=prepared.command.kind==='copy'?prepared.command.id:undefined;
            if(copyId&&records.some(item=>item.id===copyId))throw new Error('This content identity is already used.');
            const history=prepared.command.kind==='copy'?[]:retained(saved);
            const version=savedVersion(outcome.item,input.requestId,history.at(-1)?.version.id??null,prepared.command.kind==='copy'?'copy':'drawing');
            const next:LocalMap={...outcome.item,kind:'grid-map',blob:saved.blob,versions:[...history,{version,blob:saved.blob,referenceBlob:null}],requests:{...(prepared.command.kind==='copy'?{}:saved.requests),[input.requestId]:{signature:prepared.signature,item:outcome.item}}};
            store.put(next);complete(outcome);
          }catch{store.transaction.abort();}
        };
      });changed();return result;
    },
    openMapBackground: (id,expectedVersion)=>localContentTransaction(token(),false,(store,complete,role)=>{
      const request=store.get(id);request.onsuccess=()=>{const item=request.result as LocalMap|undefined;if(!item||item.kind!=='grid-map'||!item.blob||item.version!==expectedVersion||role!=='dungeon-master'){store.transaction.abort();return;}complete(item.blob);};
    }),
    list: query => localContentTransaction(token(), false, (store, complete,role) => {
      const request = store.getAll(); request.onsuccess = () => complete(filterHandouts((request.result as SavedHandout[]).filter(item=>!('kind' in item)&& (role==='dungeon-master'||item.visibility==='revealed')).map(metadata), query));
    }),
    async upload(input) {
      const validated = await validateHandout(input);
      const accepted=await localContentTransaction<Handout>(token(), true, (store, complete) => {
        const request = store.get(input.requestId);
        request.onsuccess = () => {
          const previous = request.result as SavedHandout | undefined;
          if (previous) {
            if ('kind' in previous) { store.transaction.abort(); return; }
            if (previous.digest !== validated.digest || previous.title !== validated.title) { store.transaction.abort(); return; }
            complete(metadata(previous)); return;
          }
          const saved: SavedHandout = { id: input.requestId, title: validated.title, visibility: 'private', mime: input.file.type, size: input.file.size, createdAt: new Date().toISOString(), version:1,contentVersion:1,digest: validated.digest, blob: input.file };
          try { store.add(saved); complete(metadata(saved)); } catch { store.transaction.abort(); }
        };
      });changed();return accepted;
    },
    async change(input) {
      const prepared=await prepareHandoutChange(input);
      const result=await localContentTransaction<Awaited<ReturnType<PartyContent['change']>>>(token(),true,(store,complete)=>{
        const request=store.get(input.id);request.onsuccess=()=>{
          const saved=request.result as SavedHandout|undefined;if(!saved||'kind' in saved){store.transaction.abort();return;}
          const item={...metadata(saved),lastRequestId:saved.lastRequestId,lastSignature:saved.lastSignature};
          try{
            const outcome=transitionHandout(item,input,prepared);
            if(!outcome.ok){complete({ok:false,reason:'conflict',item:metadata(saved)});return;}
            if(saved.lastRequestId===input.requestId){complete({ok:true,item:metadata(saved)});return;}
            const next: SavedHandout={...saved,...outcome.item,lastRequestId:input.requestId,lastSignature:prepared.signature};
            if(input.command.kind==='replace'){next.blob=input.command.file;next.digest=prepared.replacement!.digest;}
            store.put(next);complete({ok:true,item:metadata(next)});
          }catch{store.transaction.abort();}
        };
      });changed();return result;
    },
    open: (id,expectedContentVersion) => localContentTransaction(token(), false, (store, complete,role) => {
      const request = store.get(id); request.onsuccess = () => { const item=request.result as SavedHandout|undefined;if(!item||'kind' in item||(role!=='dungeon-master'&&item.visibility!=='revealed')||(expectedContentVersion!==undefined&&metadata(item).contentVersion!==expectedContentVersion)){store.transaction.abort();return;}complete(item.blob); };
    }),
    subscribe: listener=>contentSubscription(()=>content.list(),invalidate=>{
      const channel=new BroadcastChannel(event);channel.onmessage=invalidate;window.addEventListener(event,invalidate);
      return ()=>{channel.close();window.removeEventListener(event,invalidate);};
    },listener),
  };return content;
}

import { validateGridMap, validateMapBackground } from '../domain/grid-map';
import { filterGridMaps, prepareGridMapSave, filterHandouts, prepareHandoutChange, transitionHandout, validateHandout, type Handout, type PartyContent, type SavedGridMap } from '../domain/party-content';
import { localContentTransaction } from './local-party-store';
import { contentSubscription } from './content-subscription';
type LocalMap = SavedGridMap & {kind:'grid-map';blob:Blob|null;requests:Record<string,{signature:string;item:SavedGridMap}>};
const mapMetadata=({kind:_kind,blob:_blob,requests:_requests,...item}:LocalMap):SavedGridMap=>{const document=validateGridMap(item.document);if(item.background)validateMapBackground(document,item.background);return {...item,document};};
type SavedHandout = Handout & { blob: Blob; digest: string; lastRequestId?: string; lastSignature?: string };
const metadata = ({ blob: _blob, digest: _digest, lastRequestId: _request, lastSignature: _signature, ...item }: SavedHandout): Handout => ({...item,version:item.version??1,contentVersion:item.contentVersion??1});
const event='drowned-compass-content-changed';
function changed() { window.dispatchEvent(new Event(event));const channel=new BroadcastChannel(event);channel.postMessage(null);channel.close(); }
export function localPartyContent(token: () => string | null): PartyContent {
  const content: PartyContent={
    listMaps: query=>localContentTransaction(token(),false,(store,complete,role)=>{
      const request=store.getAll();request.onsuccess=()=>complete(filterGridMaps((request.result as LocalMap[]).filter(item=>item.kind==='grid-map'&&(role==='dungeon-master'||item.visibility==='revealed')).map(mapMetadata),query));
    }),
    loadMap: id=>localContentTransaction(token(),false,(store,complete,role)=>{
      const request=store.get(id);request.onsuccess=()=>{const item=request.result as LocalMap|undefined;if(!item||item.kind!=='grid-map'||(role!=='dungeon-master'&&item.visibility!=='revealed')){store.transaction.abort();return;}complete(mapMetadata(item));};
    }),
    async saveMap(input){
      const prepared=await prepareGridMapSave(input);
      const result=await localContentTransaction<Awaited<ReturnType<PartyContent['saveMap']>>>(token(),true,(store,complete)=>{
        const request=store.getAll();request.onsuccess=()=>{
          const records=request.result as (LocalMap|SavedHandout)[];
          const saved=records.find(item=>item.id===input.id) as LocalMap|undefined;
          try {
            if(records.some(item=>'kind' in item&&item.id!==input.id&&item.requests[input.requestId]))throw new Error('This save request was already used for different content.');
            if(saved&&saved.kind!=='grid-map')throw new Error('This content identity is already used.');
            const retry=saved?.requests[input.requestId];
            if(retry){if(retry.signature!==prepared.signature)throw new Error('This save request was already used for different content.');complete({ok:true,item:{...retry.item,document:validateGridMap(retry.item.document)}});return;}
            if(saved&&saved.version!==input.expectedVersion){complete({ok:false,reason:'conflict',item:mapMetadata(saved)});return;}
            if(!saved&&input.expectedVersion!==0)throw new Error('This map is unavailable.');
            let background=saved?.background??null, blob=saved?.blob??null;
            if(prepared.mode==='remove'){background=null;blob=null;}
            if(prepared.replacement){const {digest:_digest,...metadata}=prepared.replacement;background=metadata;blob=input.background!;}
            if(background)validateMapBackground(prepared.document,background);
            const item:SavedGridMap={id:input.id,title:prepared.title,visibility:saved?.visibility??'private',createdAt:saved?.createdAt??new Date().toISOString(),version:(saved?.version??0)+1,document:prepared.document,background};
            const next:LocalMap={...item,kind:'grid-map',blob,requests:{...saved?.requests,[input.requestId]:{signature:prepared.signature,item}}};
            store.put(next);complete({ok:true,item});
          }catch{store.transaction.abort();}
        };
      });changed();return result;
    },
    openMapBackground: (id,expectedVersion)=>localContentTransaction(token(),false,(store,complete,role)=>{
      const request=store.get(id);request.onsuccess=()=>{const item=request.result as LocalMap|undefined;if(!item||item.kind!=='grid-map'||!item.blob||item.version!==expectedVersion||(role!=='dungeon-master'&&item.visibility!=='revealed')){store.transaction.abort();return;}complete(item.blob);};
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

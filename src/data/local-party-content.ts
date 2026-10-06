import { filterHandouts, prepareHandoutChange, transitionHandout, validateHandout, type Handout, type PartyContent } from '../domain/party-content';
import { localContentTransaction } from './local-party-store';
import { contentSubscription } from './content-subscription';
type SavedHandout = Handout & { blob: Blob; digest: string; lastRequestId?: string; lastSignature?: string };
const metadata = ({ blob: _blob, digest: _digest, lastRequestId: _request, lastSignature: _signature, ...item }: SavedHandout): Handout => ({...item,version:item.version??1,contentVersion:item.contentVersion??1});
const event='drowned-compass-content-changed';
function changed() { window.dispatchEvent(new Event(event));const channel=new BroadcastChannel(event);channel.postMessage(null);channel.close(); }
export function localPartyContent(token: () => string | null): PartyContent {
  const content: PartyContent={
    list: query => localContentTransaction(token(), false, (store, complete,role) => {
      const request = store.getAll(); request.onsuccess = () => complete(filterHandouts((request.result as SavedHandout[]).filter(item=>role==='dungeon-master'||item.visibility==='revealed').map(metadata), query));
    }),
    async upload(input) {
      const validated = await validateHandout(input);
      const accepted=await localContentTransaction<Handout>(token(), true, (store, complete) => {
        const request = store.get(input.requestId);
        request.onsuccess = () => {
          const previous = request.result as SavedHandout | undefined;
          if (previous) {
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
          const saved=request.result as SavedHandout|undefined;if(!saved){store.transaction.abort();return;}
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
      const request = store.get(id); request.onsuccess = () => { const item=request.result as SavedHandout|undefined;if(!item||(role!=='dungeon-master'&&item.visibility!=='revealed')||(expectedContentVersion!==undefined&&metadata(item).contentVersion!==expectedContentVersion)){store.transaction.abort();return;}complete(item.blob); };
    }),
    subscribe: listener=>contentSubscription(()=>content.list(),invalidate=>{
      const channel=new BroadcastChannel(event);channel.onmessage=invalidate;window.addEventListener(event,invalidate);
      return ()=>{channel.close();window.removeEventListener(event,invalidate);};
    },listener),
  };return content;
}

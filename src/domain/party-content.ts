/// <reference types="vite/client" />
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { validateGridMap, fitMapBackground, type GridMapDocument, type MapBackgroundPlacement } from './grid-map';

export type Handout = { id: string; title: string; visibility: 'private' | 'revealed'; mime: string; size: number; createdAt: string; version: number; contentVersion: number };
export type HandoutUpload = { requestId: string; title: string; file: File };
export type HandoutChange = { id: string; expectedVersion: number; requestId: string; command: { kind: 'rename'; title: string } | { kind: 'reveal' | 'withdraw' } | { kind: 'replace'; file: File } };
export type HandoutChangeResult = { ok: true; item: Handout } | { ok: false; reason: 'conflict'; item: Handout };
export type ContentSnapshot = { items: Handout[] } | { error: string };
export interface PartyContent {
  listMaps(query?: {search?:string; visibility?:'private'|'revealed'}): Promise<SavedGridMap[]>;
  loadMap(id:string): Promise<SavedGridMap>;
  changeMap(input:GridMapChange): Promise<GridMapSaveResult>;
  saveMap(input:GridMapSave): Promise<GridMapSaveResult>;
  openMapBackground(id:string,expectedVersion:number): Promise<Blob>;
  list(query?: { search?: string; visibility?: 'private' | 'revealed' }): Promise<Handout[]>;
  upload(input: HandoutUpload): Promise<Handout>;
  change(input: HandoutChange): Promise<HandoutChangeResult>;
  subscribe(onChanged: (snapshot: ContentSnapshot) => void): () => void;
  open(id: string, expectedContentVersion?: number): Promise<Blob>;
}
export const handoutLimits = 'PNG, JPEG, WebP or PDF; up to 20 MiB. Images up to 16 million pixels; PDFs up to 100 pages. Password-protected PDFs are unsupported.';
export const handoutAccessError = 'Dungeon Master access is required. Sign in again to open your Library.';
export function handoutTitle(title: string): string {
  const value = title.trim();
  if (!value || value.length > 160) throw new Error('Enter a title between 1 and 160 characters.');
  return value;
}
export async function readHandoutPdf(blob: Blob) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = workerUrl;
  const task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  try { const pdf = await task.promise; return Object.assign(pdf, { dispose: () => task.destroy() }); } catch (error) { await task.destroy(); throw error; }
}
export async function validateHandout(input: HandoutUpload): Promise<{ title: string; digest: string }> {
  const title = handoutTitle(input.title);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) throw new Error('Invalid upload request. Choose the file again.');
  if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(input.file.type)) throw new Error('Unsupported file. Choose PNG, JPEG, WebP or PDF.');
  if (!input.file.size || input.file.size > 20 * 1024 * 1024) throw new Error('Choose a nonempty file no larger than 20 MiB.');
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (input.file.type === 'application/pdf') {
    if (!new TextDecoder().decode(bytes.slice(0, 8)).startsWith('%PDF-') || !new TextDecoder().decode(bytes.slice(-2048)).includes('%%EOF')) throw new Error('The PDF is incomplete or corrupt.');
    let pdf;
    try {
      pdf = await readHandoutPdf(input.file);
      if (pdf.numPages > 100) throw new Error('PDFs must contain at most 100 pages.');
      for (let page = 1; page <= pdf.numPages; page++) await (await pdf.getPage(page)).getOperatorList();
    } catch (error) {
      if (error instanceof Error && error.message.includes('100 pages')) throw error;
      throw new Error('The PDF is corrupt or password-protected. Choose an unprotected PDF.');
    } finally { await pdf?.dispose(); }
  } else {
    const matches = input.file.type === 'image/png' ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
      : input.file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216
      : new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
    if (!matches) throw new Error('The image contents do not match its file type.');
    let bitmap;
    try { bitmap = await createImageBitmap(input.file); } catch { throw new Error('The image is corrupt or unsupported.'); }
    const pixels = bitmap.width * bitmap.height; bitmap.close();
    if (pixels > 16_000_000) throw new Error('Images must contain at most 16 million pixels.');
  }
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return { title, digest: Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('') };
}
export function filterHandouts(items: Handout[], query: { search?: string; visibility?: 'private' | 'revealed' } = {}) {
  const search = (query.search ?? '').trim().toLowerCase();
  return items.filter(item => (!query.visibility || item.visibility === query.visibility) && item.title.toLowerCase().includes(search)).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export type PreparedHandoutChange = { signature: string; replacement?: { digest: string; mime: string; size: number }; title?: string };
export async function prepareHandoutChange(input: HandoutChange): Promise<PreparedHandoutChange> {
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new Error('Reload this Handout before making changes.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) throw new Error('Invalid change request. Please retry.');
  if (input.command.kind === 'rename') { const title=handoutTitle(input.command.title); return {title,signature:`rename|${title}`}; }
  if (input.command.kind === 'replace') {
    const validated=await validateHandout({requestId:input.requestId,title:'Replacement',file:input.command.file});
    const replacement={digest:validated.digest,mime:input.command.file.type,size:input.command.file.size};
    return {replacement,signature:`replace|${input.requestId}|${replacement.digest}|${replacement.size}|${replacement.mime}`};
  }
  if (input.command.kind !== 'reveal' && input.command.kind !== 'withdraw') throw new Error('Unsupported Handout change.');
  return {signature:input.command.kind};
}
// Both adapters implement this accepted-state/version contract. Persisted retry
// bookkeeping stays internal; the caller only receives the accepted Handout.
export function transitionHandout(item: Handout & {lastRequestId?: string; lastSignature?: string}, input: HandoutChange, prepared: PreparedHandoutChange): HandoutChangeResult {
  if (item.lastRequestId === input.requestId) {
    if (item.lastSignature !== prepared.signature) throw new Error('This change request was already used for different content.');
    return {ok:true,item};
  }
  if (item.version !== input.expectedVersion) return {ok:false,reason:'conflict',item};
  const next={...item,version:item.version+1};
  if (input.command.kind === 'rename') next.title=prepared.title!;
  if (input.command.kind === 'reveal') next.visibility='revealed';
  if (input.command.kind === 'withdraw') next.visibility='private';
  if (prepared.replacement) { next.mime=prepared.replacement.mime; next.size=prepared.replacement.size; next.contentVersion++; }
  return {ok:true,item:next};
}

export type MapBackground = MapBackgroundPlacement & {mime:string;size:number;registration?:string};
export type SavedGridMap = {id:string;title:string;visibility:'private'|'revealed';createdAt:string;version:number;document:GridMapDocument;background:MapBackground|null};
export type GridMapSave = {id:string;expectedVersion:number;requestId:string;title:string;document:GridMapDocument;background?:File|null};
export type GridMapSaveResult = {ok:true;item:SavedGridMap}|{ok:false;reason:'conflict';item:SavedGridMap};
export async function prepareGridMapSave(input:GridMapSave) {
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(input.id)||!uuid.test(input.requestId)||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0) throw new Error('Invalid map save request.');
  const title=handoutTitle(input.title), document=validateGridMap(input.document);
  let replacement: (MapBackground & {digest:string})|undefined;
  if (input.background) {
    if (!['image/png','image/jpeg','image/webp'].includes(input.background.type)) throw new Error('Choose a PNG, JPEG or WebP Map Background.');
    const validated=await validateHandout({requestId:input.requestId,title,file:input.background});
    const bitmap=await createImageBitmap(input.background);
    try { replacement={...fitMapBackground(document,bitmap.width,bitmap.height),mime:input.background.type,size:input.background.size,digest:validated.digest}; } finally { bitmap.close(); }
  }
  const mode=input.background===undefined?'keep':input.background===null?'remove':'replace';
  const signature=JSON.stringify({id:input.id,expectedVersion:input.expectedVersion,title,document,mode,replacement:replacement??null});
  return {title,document,mode,replacement,signature};
}
export function filterGridMaps(items:SavedGridMap[],query:{search?:string;visibility?:'private'|'revealed'}={}) {
  const search=(query.search??'').trim().toLowerCase();
  return items.filter(item=>(!query.visibility||item.visibility===query.visibility)&&item.title.toLowerCase().includes(search)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}

/** Commands operate exclusively on an accepted saved version; drafts never enter this interface. */
export type GridMapChange = {id:string;expectedVersion:number;requestId:string;command:{kind:'reveal'|'withdraw'}|{kind:'copy';id:string;title:string}};
export function prepareGridMapChange(input:GridMapChange) {
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(!uuid.test(input.id)||!uuid.test(input.requestId)||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)throw new Error('Reload this saved Grid Map before making changes.');
  let command:GridMapChange['command'];
  if(input.command.kind==='copy') {
    if(!uuid.test(input.command.id)||input.command.id===input.id)throw new Error('Choose an independent map identity.');
    command={...input.command,title:handoutTitle(input.command.title)};
  } else {
    if(input.command.kind!=='reveal'&&input.command.kind!=='withdraw')throw new Error('Unsupported Grid Map change.');
    command={kind:input.command.kind};
  }
  return {command,signature:JSON.stringify({id:input.id,expectedVersion:input.expectedVersion,command})};
}
export function transitionGridMap(item:SavedGridMap,input:GridMapChange,prepared:ReturnType<typeof prepareGridMapChange>,createdAt:string):GridMapSaveResult {
  if(item.version!==input.expectedVersion)return {ok:false,reason:'conflict',item};
  if(prepared.command.kind==='copy')return {ok:true,item:{...item,id:prepared.command.id,title:prepared.command.title,visibility:'private',version:1,createdAt,document:validateGridMap(item.document),background:item.background?{...item.background}:null}};
  return {ok:true,item:{...item,visibility:prepared.command.kind==='reveal'?'revealed':'private',version:item.version+1}};
}

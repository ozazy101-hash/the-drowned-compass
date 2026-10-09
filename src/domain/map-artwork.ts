import { validateGridMap, validateMapBackground, type GridMapDocument } from './grid-map';
import type { MapBackground } from './party-content';

export type MapArtworkVersion = Readonly<{
  id:string; familyId:string; parentVersionId:string|null; createdAt:string;
  requestId:string; title:string; document:GridMapDocument; background:MapBackground|null;
  origin:'drawing'|'uploaded'|'generated'|'revised'|'legacy'|'copy';
  instructions:string; reference:MapBackground|null; jobId:string|null;
}>;
export type MapPresentation = Readonly<{
  revision:number; version:MapArtworkVersion|null;
  mask:Readonly<{id:string;registration:string;columns:number;rows:number;uncovered:readonly number[]}>|null;
}>;
export type MapWorkspace = {families:import('./party-content').SavedGridMap[];versions:MapArtworkVersion[];presentation:MapPresentation;jobs?:import('./map-generation').MapGenerationJob[]};
export type MapWorkspaceSnapshot = {workspace:MapWorkspace}|{error:string};
/** Branching reads the retained parent, never a mutable editor draft. Generated
 * attachments belong to the authoritative server, not this browser upload intent. */
export type MapVersionAttachment = {
  familyId:string; parentVersionId?:string; expectedVersion:number;requestId:string;
  title:string;document?:GridMapDocument;artwork?:File;reference?:File;instructions?:string;placement?:{x:number;y:number;width:number;height:number};
};
export type MapVersionResult = {ok:true;version:MapArtworkVersion}|{ok:false;reason:'conflict';item:import('./party-content').SavedGridMap};
export type MapPresentationChoice = {versionId:string;expectedRevision:number;requestId:string;newMap?:boolean};
export type MapPresentationResult = {ok:true;presentation:MapPresentation}|{ok:false;reason:'conflict'|'incompatible';presentation:MapPresentation};
export const emptyMapPresentation = ():MapPresentation=>({revision:0,version:null,mask:null});
export function mapIdentity(value:string) {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new Error('Invalid map request identity.');
  return value;
}
export function matchingMapGeometry(a:{document:GridMapDocument;background:MapBackground|null},b:{document:GridMapDocument;background:MapBackground|null}) {
  if(a.document.columns!==b.document.columns||a.document.rows!==b.document.rows||a.document.feetPerSquare!==b.document.feetPerSquare)return false;
  if(!a.background||!b.background)return a.background===b.background;
  if(!a.background.registration||a.background.registration!==b.background.registration)return false;
  return (['x','y','width','height','pixelWidth','pixelHeight'] as const).every(key=>a.background![key]===b.background![key]);
}
function savedIdentity(value:string) {
  if(typeof value!=='string')throw new Error('Invalid saved map identity.');
  if(value.startsWith('legacy:')) {const [,family,revision]=value.split(':');mapIdentity(family);if(!/^[1-9][0-9]*$/.test(revision??''))throw new Error('Invalid legacy map identity.');}
  else mapIdentity(value);
}
function imageMetadata(document:GridMapDocument,image:MapBackground|null,legacy:boolean) {
  if(!image)return null;
  validateMapBackground(document,image);
  if(!['image/png','image/jpeg','image/webp'].includes(image.mime)||!Number.isSafeInteger(image.size)||image.size<1||image.size>20*1024*1024||typeof image.registration!=='string'||!image.registration||(!legacy&&!/^[0-9a-f]{64}$/.test(image.digest??'')))throw new Error('Invalid saved map image metadata.');
  return Object.freeze({...image});
}
export function validateMapVersion(version:MapArtworkVersion):MapArtworkVersion {
  if(!version)throw new Error('Invalid saved Map Artwork Version.');
  savedIdentity(version.id);mapIdentity(version.familyId);savedIdentity(version.requestId);
  if(version.parentVersionId!==null){savedIdentity(version.parentVersionId);if(version.parentVersionId===version.id)throw new Error('A saved version cannot parent itself.');}
  const document=validateGridMap(version.document);
  if(!['drawing','uploaded','generated','revised','legacy','copy'].includes(version.origin)||typeof version.instructions!=='string'||version.instructions.length>8000||typeof version.title!=='string'||!version.title.trim()||version.title.length>160||!Number.isFinite(Date.parse(version.createdAt))||version.jobId!==null&&typeof version.jobId!=='string')throw new Error('Invalid saved Map Artwork Version.');
  if(version.jobId!==null)mapIdentity(version.jobId);
  if((version.origin==='generated'||version.origin==='revised')&&!version.jobId)throw new Error('Missing map generation job identity.');
  const background=imageMetadata(document,version.background,version.origin==='legacy'||version.origin==='copy'||version.background?.registration?.startsWith('legacy:')===true);
  const reference=imageMetadata(document,version.reference,false);
  return Object.freeze({...version,document,background,reference});
}
export function validateMapPresentation(value:MapPresentation):MapPresentation {
  if(!value||!Number.isSafeInteger(value.revision)||value.revision<0)throw new Error('Map presentation is unavailable.');
  if(!value.version){if(value.revision!==0||value.mask!==null)throw new Error('Map presentation is unavailable.');return emptyMapPresentation();}
  const version=validateMapVersion(value.version),mask=value.mask;
  if(value.revision<1||!mask||typeof mask.id!=='string'||!mask.id||mask.registration!==(version.background?.registration??`drawing:${version.familyId}`)||mask.columns!==version.document.columns||mask.rows!==version.document.rows||!Array.isArray(mask.uncovered)||mask.uncovered.some(n=>!Number.isInteger(n)||n<0||n>=mask.columns*mask.rows)||new Set(mask.uncovered).size!==mask.uncovered.length)throw new Error('Map presentation is unavailable.');
  mapIdentity(mask.id);
  return Object.freeze({revision:value.revision,version,mask:Object.freeze({...mask,uncovered:Object.freeze([...mask.uncovered])})});
}
export function validateMapWorkspace(workspace:MapWorkspace):MapWorkspace {
  const versions=workspace.versions.map(validateMapVersion);const ids=new Set(versions.map(v=>v.id));
  if(ids.size!==versions.length)throw new Error('Duplicate saved Map Artwork Versions.');
  for(const version of versions)if(version.parentVersionId){const parent=versions.find(v=>v.id===version.parentVersionId);if(!parent||parent.familyId!==version.familyId)throw new Error('Invalid saved map parent relationship.');}
  const families=new Set(workspace.families.map(f=>f.id));
  for(const version of versions){if(!families.has(version.familyId))throw new Error('Saved map family is unavailable.');const seen=new Set<string>();let ancestor:MapArtworkVersion|undefined=version;while(ancestor){if(seen.has(ancestor.id))throw new Error('Invalid saved map ancestry.');seen.add(ancestor.id);ancestor=versions.find(v=>v.id===ancestor?.parentVersionId);}}
  const presentation=validateMapPresentation(workspace.presentation);
  if(presentation.version&&!ids.has(presentation.version.id))throw new Error('Map presentation source is unavailable.');
  return {...workspace,versions,presentation};
}
export function attachmentDocument(input:MapVersionAttachment,parent:MapArtworkVersion|undefined) {
  mapIdentity(input.familyId);mapIdentity(input.requestId);
  if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0)throw new Error('Reload this map before saving a version.');
  if((input.instructions??'').length>8000)throw new Error('Map instructions must contain at most 8000 characters.');
  if(input.parentVersionId) {
    if(!parent||parent.id!==input.parentVersionId||parent.familyId!==input.familyId)throw new Error('Choose a saved source from this Grid Map.');
    if(input.document)throw new Error('A branch uses its saved source drawing. Save draft changes separately.');
    return validateGridMap(parent.document);
  }
  if(!input.document)throw new Error('Choose the Map Grid before saving a first version.');
  return validateGridMap(input.document);
}
/** Atomic selection: incompatible geography cannot reinterpret accepted mask cells. */
export function chooseMapPresentation(current:MapPresentation,version:MapArtworkVersion,input:MapPresentationChoice):MapPresentationResult {
  current=validateMapPresentation(current);version=validateMapVersion(version);
  if(input.versionId!==version.id)throw new Error('Choose a saved Map Artwork Version.');
  mapIdentity(input.requestId);
  if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw new Error('Reload the map presentation before choosing a version.');
  if(current.revision!==input.expectedRevision)return {ok:false,reason:'conflict',presentation:current};
  const compatible=!!current.version&&current.version.familyId===version.familyId&&matchingMapGeometry(current.version,version);
  if(current.version&&!compatible&&!input.newMap)return {ok:false,reason:'incompatible',presentation:current};
  const registration=version.background?.registration??`drawing:${version.familyId}`;
  return {ok:true,presentation:{revision:current.revision+1,version,mask:compatible?current.mask:{id:input.requestId,registration,columns:version.document.columns,rows:version.document.rows,uncovered:[]}}};
}


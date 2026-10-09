import {test,expect} from '@playwright/test';
import {attachmentDocument,chooseMapPresentation,emptyMapPresentation,matchingMapGeometry,validateMapPresentation,validateMapWorkspace,type MapArtworkVersion} from '../src/domain/map-artwork';
import {createGridMapEditor,fitMapBackground} from '../src/domain/grid-map';
const family='44000000-0000-4000-8000-000000000001',id='44000000-0000-4000-8000-000000000002',request='44000000-0000-4000-8000-000000000003';
function source():MapArtworkVersion {const document=createGridMapEditor({columns:8,rows:6}).snapshot().document;return {id,familyId:family,parentVersionId:null,requestId:id,createdAt:'2026-10-09T00:00:00Z',title:'Source',document,background:{...fitMapBackground(document,800,400),mime:'image/png',size:100,digest:'a'.repeat(64),registration:'upload:'+id},origin:'uploaded',instructions:'',reference:null,jobId:null};}
test('branching accepts retained source geometry and rejects unsaved drawing or foreign parents',()=>{
 const parent=source(),input={familyId:family,parentVersionId:id,expectedVersion:3,requestId:request,title:'Branch'};
 expect(attachmentDocument(input,parent)).toEqual(parent.document);
 expect(()=>attachmentDocument({...input,document:createGridMapEditor().snapshot().document},parent)).toThrow('Save draft');
 expect(()=>attachmentDocument({...input,familyId:request},parent)).toThrow('saved source');
 expect(()=>attachmentDocument(input,undefined)).toThrow('saved source');
});
test('registration compares canonical geometry separately from content digest',()=>{
 const a=source(),b={...a,id:request,background:{...a.background!,digest:'b'.repeat(64)}};
 expect(matchingMapGeometry(a,b)).toBe(true);
 expect(matchingMapGeometry(a,{...b,background:{...b.background,registration:'upload:'+request}})).toBe(false);
 expect(matchingMapGeometry(a,{...b,document:{...b.document,feetPerSquare:10}})).toBe(false);
 expect(matchingMapGeometry(a,{...b,background:{...b.background,x:1}})).toBe(false);
 expect(matchingMapGeometry({...a,background:null},{...b,background:null})).toBe(true);
});
test('first explicit choice is fully hidden and incompatible choice retains accepted frame',()=>{
 const a=source();const first=chooseMapPresentation(emptyMapPresentation(),a,{versionId:a.id,expectedRevision:0,requestId:request});if(!first.ok)throw new Error('Unexpected conflict');
 expect(first.presentation.mask?.uncovered).toEqual([]);expect(first.presentation.version?.id).toBe(id);
 const b={...a,id:request,background:{...a.background!,registration:'upload:'+request}};
 const rejected=chooseMapPresentation(first.presentation,b,{versionId:b.id,expectedRevision:1,requestId:request});expect(rejected).toEqual({ok:false,reason:'incompatible',presentation:first.presentation});
 const replaced=chooseMapPresentation(first.presentation,b,{versionId:b.id,expectedRevision:1,requestId:request,newMap:true});expect(replaced.ok&&replaced.presentation.mask?.uncovered).toEqual([]);
});
test('compatible saved stages retain accepted mask while stale expected revision conflicts',()=>{
 const a=source();const mask={id:request,registration:a.background!.registration!,columns:8,rows:6,uncovered:[1,2]};const current={revision:4,version:a,mask};const b={...a,id:request,parentVersionId:id,origin:'revised' as const,jobId:request,background:{...a.background!,digest:'b'.repeat(64)}};
 const next=chooseMapPresentation(current,b,{versionId:b.id,expectedRevision:4,requestId:request});expect(next.ok&&next.presentation.mask).toEqual(mask);expect(next.presentation.revision).toBe(5);
 expect(chooseMapPresentation(current,b,{versionId:b.id,expectedRevision:3,requestId:request})).toMatchObject({ok:false,reason:'conflict',presentation:current});
});
test('untrusted presentation never exposes mismatched or invalid mask cells',()=>{
 const a=source(),mask={id:request,registration:a.background!.registration!,columns:8,rows:6,uncovered:[1]};
 for(const bad of [{...mask,registration:'other'},{...mask,columns:20},{...mask,uncovered:[48]},{...mask,uncovered:[1,1]}])expect(()=>validateMapPresentation({revision:1,version:a,mask:bad})).toThrow('unavailable');
 expect(()=>validateMapPresentation({revision:1,version:a,mask:null})).toThrow('unavailable');
 expect(()=>validateMapPresentation({revision:1,version:null,mask:null})).toThrow('unavailable');
});
test('workspace rejects missing/cross-family/self parents and missing presentation source',()=>{
 const a=source();const familyRecord={id:family,title:'Map',visibility:'private' as const,createdAt:a.createdAt,version:1,document:a.document,background:a.background};
 for(const versions of [[{...a,parentVersionId:request}],[{...a,parentVersionId:id}],[a,{...a,id:request,familyId:request,parentVersionId:id}]])expect(()=>validateMapWorkspace({families:[familyRecord],versions,presentation:emptyMapPresentation()})).toThrow();
 const present=chooseMapPresentation(emptyMapPresentation(),a,{versionId:a.id,expectedRevision:0,requestId:request});expect(()=>validateMapWorkspace({families:[],versions:[],presentation:present.presentation})).toThrow('source');
});
test('validated accepted records defensively copy and freeze mask and drawing',()=>{
 const a=source(),cells=[1],mask={id:request,registration:a.background!.registration!,columns:8,rows:6,uncovered:cells};
 const p=validateMapPresentation({revision:1,version:a,mask});cells.push(2);expect(p.mask?.uncovered).toEqual([1]);expect(Object.isFrozen(p.version?.document)).toBe(true);expect(Object.isFrozen(p.mask?.uncovered)).toBe(true);
});

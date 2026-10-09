import {test,expect} from '@playwright/test';
import type {SavedGridMap} from '../src/domain/party-content';
import {createGridMapEditor} from '../src/domain/grid-map';
import {matchingMapRegistration} from '../src/features/presentation/map-viewport';
const map:SavedGridMap={id:'80000000-0000-4000-8000-000000000001',title:'Stage 1',visibility:'private',createdAt:'yesterday',version:3,document:createGridMapEditor({columns:8,rows:6}).snapshot().document,background:{x:0,y:1,width:8,height:4,pixelWidth:800,pixelHeight:400,mime:'image/png',size:68,registration:'immutable-art'}};
test('registration ignores changed drawing but rejects different artwork, placement, grid or feet',()=>{
 const editor=createGridMapEditor(map.document);editor.draw('water',[{x:1.5,y:1.5}]);expect(matchingMapRegistration(map,{...map,document:editor.snapshot().document})).toBe(true);
 for(const changed of [{...map,background:null},{...map,background:{...map.background!,registration:'different-art'}},{...map,background:{...map.background!,x:1}},{...map,document:{...map.document,columns:9}},{...map,document:{...map.document,feetPerSquare:10}},{...map,background:{...map.background!,registration:undefined}}])expect(matchingMapRegistration(map,changed)).toBe(false);
 expect(matchingMapRegistration({...map,background:null},{...map,background:null})).toBe(true);
});

import {randomUUID} from 'node:crypto';
import {chooseMapPresentation,type MapArtworkVersion} from '../src/domain/map-artwork';
const version=():MapArtworkVersion=>({id:randomUUID(),familyId:randomUUID(),parentVersionId:null,createdAt:new Date().toISOString(),requestId:randomUUID(),title:'Aligned stage',document:map.document,background:{...map.background!,digest:'a'.repeat(64)},origin:'uploaded',instructions:'',reference:null,jobId:null});
test('trusted constrained revision retains mask despite changed content digest, while fresh same-family generation rejects',()=>{
 const source=version(),first=chooseMapPresentation({revision:0,version:null,mask:null},source,{versionId:source.id,expectedRevision:0,requestId:randomUUID()});if(!first.ok)throw Error('Initial choice failed');
 const current={...first.presentation,mask:{...first.presentation.mask!,uncovered:[1,5]}};
 const revision={...source,id:randomUUID(),parentVersionId:source.id,background:{...source.background!,digest:'b'.repeat(64)},origin:'revised' as const,jobId:randomUUID()};
 const chosen=chooseMapPresentation(current,revision,{versionId:revision.id,expectedRevision:1,requestId:randomUUID()});expect(chosen.ok).toBe(true);if(chosen.ok)expect(chosen.presentation.mask).toEqual(current.mask);
 const whole={...revision,id:randomUUID(),origin:'generated' as const,background:{...revision.background,registration:'fresh-generation'}};
 const rejected=chooseMapPresentation(current,whole,{versionId:whole.id,expectedRevision:1,requestId:randomUUID()});expect(rejected).toEqual({ok:false,reason:'incompatible',presentation:current});
 const setup=chooseMapPresentation(current,whole,{versionId:whole.id,expectedRevision:1,requestId:randomUUID(),newMap:true});expect(setup.ok).toBe(true);if(setup.ok)expect(setup.presentation.mask!.uncovered).toEqual([]);
});
test('same geometry without same family cannot reuse accepted reveal progress',()=>{
 const source=version(),first=chooseMapPresentation({revision:0,version:null,mask:null},source,{versionId:source.id,expectedRevision:0,requestId:randomUUID()});if(!first.ok)throw Error('Initial choice failed');
 const other={...source,id:randomUUID(),familyId:randomUUID()};expect(chooseMapPresentation(first.presentation,other,{versionId:other.id,expectedRevision:1,requestId:randomUUID()})).toEqual({ok:false,reason:'incompatible',presentation:first.presentation});
});

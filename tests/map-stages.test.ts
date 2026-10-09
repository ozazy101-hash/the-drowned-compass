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

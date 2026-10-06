import {test,expect} from '@playwright/test';
import {createGridMapEditor,validateGridMap,fitMapBackground,validateMapBackground} from '../src/domain/grid-map';
test('saved drawing rehydrates every tool with fresh isolated history',()=>{
 const map=createGridMapEditor({columns:8,rows:6,feetPerSquare:10});
 for(const tool of ['wall','door','floor','water','difficult'] as const)map.draw(tool,[{x:tool==='wall'?1.5:2.5,y:tool==='door'?1:2.5}]);
 const doc=JSON.parse(JSON.stringify(map.snapshot().document));const loaded=createGridMapEditor(doc);
 expect(loaded.snapshot()).toEqual({document:map.snapshot().document,canUndo:false,canRedo:false});
 loaded.draw('erase',[{x:2.5,y:2.5}]);loaded.undo();expect(loaded.snapshot().document).toEqual(map.snapshot().document);
 expect(Object.isFrozen(loaded.snapshot().document)).toBe(true);
});
test('untrusted saved documents reject missing fields, bounds, duplicate geometry and invalid tools',()=>{
 const d=createGridMapEditor().snapshot().document;
 for(const key of ['columns','rows','feetPerSquare','terrain','edges']){const bad={...d};delete bad[key as keyof typeof bad];expect(()=>validateGridMap(bad)).toThrow();}
 for(const bad of [{...d,columns:'20'},{...d,terrain:[{x:20,y:0,kind:'water'}]},{...d,edges:[{x:20,y:0,direction:'horizontal',kind:'wall'}]},{...d,edges:[{x:0,y:0,direction:'diagonal',kind:'wall'}]},{...d,terrain:[{x:0,y:0,kind:'lava'}]}])expect(()=>validateGridMap(bad)).toThrow();
 const terrain={x:0,y:0,kind:'floor'};expect(()=>validateGridMap({...d,terrain:[terrain,terrain]})).toThrow('duplicate');
 const edge={x:0,y:0,direction:'vertical',kind:'door'};expect(()=>validateGridMap({...d,edges:[edge,edge]})).toThrow('duplicate');
});
test('background image fits proportionally in logical squares without zoom dependence',()=>{
 const d=createGridMapEditor({columns:8,rows:6}).snapshot().document;
 const bg=fitMapBackground(d,800,400);expect(bg).toEqual({x:0,y:1,width:8,height:4,pixelWidth:800,pixelHeight:400});
 expect(()=>validateMapBackground(d,bg)).not.toThrow();
 for(const bad of [{...bg,width:7},{...bg,x:1},{...bg,pixelWidth:NaN},{...bg,height:0}])expect(()=>validateMapBackground(d,bad)).toThrow();
 expect(()=>fitMapBackground(d,8000,4000)).toThrow();
 const copied=JSON.parse(JSON.stringify(bg));expect(copied).toEqual(bg);
});

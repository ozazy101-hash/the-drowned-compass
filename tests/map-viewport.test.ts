import {test,expect} from '@playwright/test';
import {mapViewport} from '../src/features/presentation/map-viewport';
const view={zoom:2,x:50,y:-25,mode:'calibrated' as const,squarePixels:72};
test('fixed physical projection cells and position survive grid and viewport changes without changing documents',()=>{
 for(const columns of [2,20,80])for(const rows of [2,14,80])for(const width of [393,1280,1920]) {
  const document=Object.freeze({columns,rows,feetPerSquare:5});const before=JSON.stringify(document);
  expect(mapViewport(document,{width,height:800},view)).toEqual({squarePixels:72,width:columns*72,height:rows*72,x:50,y:-25});expect(JSON.stringify(document)).toBe(before);
 }
});
test('ordinary viewing fits grid proportions and zoom without changing calibration settings',()=>{
 expect(mapViewport({columns:20,rows:10},{width:1000,height:800},{...view,mode:'ordinary'})).toEqual({squarePixels:100,width:2000,height:1000,x:50,y:-25});expect(view.squarePixels).toBe(72);
});
test('display geometry rejects invalid size and nonfinite view settings',()=>{
 for(const squarePixels of [0,7,513,NaN,Infinity])expect(()=>mapViewport({columns:20,rows:10},{width:1000,height:800},{...view,squarePixels})).toThrow();
 for(const width of [0,-1,NaN])expect(()=>mapViewport({columns:20,rows:10},{width,height:800},view)).toThrow();
});

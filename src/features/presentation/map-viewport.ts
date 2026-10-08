import type { GridMapDocument } from '../../domain/grid-map';
export type MapView = { zoom:number; x:number; y:number; mode:'ordinary'|'calibrating'|'calibrated'; squarePixels:number };
/** Display-only transform: game coordinates and saved background placement stay intact. */
export function mapViewport(document:Pick<GridMapDocument,'columns'|'rows'>, viewport:{width:number;height:number}, view:MapView) {
  if (![document.columns,document.rows,viewport.width,viewport.height,view.zoom,view.x,view.y,view.squarePixels].every(Number.isFinite) || document.columns<=0 || document.rows<=0 || viewport.width<=0 || viewport.height<=0 || view.zoom<=0 || view.squarePixels<8 || view.squarePixels>512) throw new Error('Invalid display settings.');
  const squarePixels=view.mode==='ordinary'?Math.min(viewport.width/document.columns,viewport.height/document.rows)*view.zoom:view.squarePixels;
  return {squarePixels,width:document.columns*squarePixels,height:document.rows*squarePixels,x:view.x,y:view.y};
}

/** Equal canvas sizes alone cannot establish artwork registration. */
export function matchingMapRegistration(a:import('../../domain/party-content').SavedGridMap,b:import('../../domain/party-content').SavedGridMap) {
 if(a.document.columns!==b.document.columns||a.document.rows!==b.document.rows||a.document.feetPerSquare!==b.document.feetPerSquare)return false;
 if(!a.background||!b.background)return a.background===b.background;
 if(!a.background.registration||a.background.registration!==b.background.registration)return false;
 return (['x','y','width','height','pixelWidth','pixelHeight'] as const).every(key=>a.background![key]===b.background![key]);
}

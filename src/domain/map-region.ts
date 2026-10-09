import { validateMapBackground, type GridMapDocument, type GridPoint, type MapBackgroundPlacement } from './grid-map';

export type MapRegion = Readonly<{ x: number; y: number; width: number; height: number }>;
export type MapAreaSelection = Readonly<{ logical: MapRegion; pixels: MapRegion }>;

/** Saved placement is authoritative: drafts, zoom and scroll never change the source extent. */
export function selectMapArea(document: GridMapDocument, placement: MapBackgroundPlacement, start: GridPoint, end: GridPoint): MapAreaSelection {
  validateMapBackground(document, placement);
  for (const p of [start, end]) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < placement.x || p.y < placement.y || p.x > placement.x + placement.width || p.y > placement.y + placement.height)
      throw new Error('Select an area entirely inside the saved artwork.');
  }
  const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x), height = Math.abs(end.y - start.y);
  if (!width || !height) throw new Error('Select a rectangle with some area.');
  // Include every touched source pixel; rounding stays within the saved image.
  const left = Math.floor((x - placement.x) / placement.width * placement.pixelWidth);
  const top = Math.floor((y - placement.y) / placement.height * placement.pixelHeight);
  const right = Math.min(placement.pixelWidth, Math.ceil((x + width - placement.x) / placement.width * placement.pixelWidth));
  const bottom = Math.min(placement.pixelHeight, Math.ceil((y + height - placement.y) / placement.height * placement.pixelHeight));
  const pixels = Object.freeze({ x: left, y: top, width: right - left, height: bottom - top });
  if(pixels.x<0||pixels.y<0||pixels.width<1||pixels.height<1||pixels.x+pixels.width>placement.pixelWidth||pixels.y+pixels.height>placement.pixelHeight) throw new Error('Select a rectangle covering at least one source pixel.');
  const logical = Object.freeze({ x: placement.x + left / placement.pixelWidth * placement.width, y: placement.y + top / placement.pixelHeight * placement.height, width: pixels.width / placement.pixelWidth * placement.width, height: pixels.height / placement.pixelHeight * placement.height });
  return Object.freeze({ logical, pixels });
}

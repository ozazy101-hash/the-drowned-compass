/** Game-grid state; view pixels and physical calibration never enter documents. */
export type GridPoint = Readonly<{ x: number; y: number }>;
export type GridTool = 'wall' | 'door' | 'floor' | 'water' | 'difficult' | 'erase';
export type GridMapDocument = Readonly<{
  columns: number; rows: number; feetPerSquare: number;
  terrain: readonly Readonly<{ x: number; y: number; kind: 'floor' | 'water' | 'difficult' }>[];
  edges: readonly Readonly<{ x: number; y: number; direction: 'horizontal' | 'vertical'; kind: 'wall' | 'door' }>[];
}>;
export const gridMapLimits = 'Columns and rows must be whole numbers from 2 to 80. Game feet per square must be a whole number from 1 to 100.';
function freeze(document: GridMapDocument): GridMapDocument {
  document.terrain.forEach(Object.freeze); document.edges.forEach(Object.freeze);
  Object.freeze(document.terrain); Object.freeze(document.edges); return Object.freeze(document);
}
function validPoint(document: GridMapDocument, point: GridPoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.y >= 0 && point.x <= document.columns && point.y <= document.rows;
}
/** Outside pixels produce no sample; squarePixels is ordinary view zoom. */
export function viewPointToGrid(document: GridMapDocument, point: GridPoint, squarePixels: number): GridPoint | null {
  if (!Number.isFinite(squarePixels) || squarePixels <= 0) return null;
  const logical = { x: point.x / squarePixels, y: point.y / squarePixels };
  return validPoint(document, logical) ? logical : null;
}
function transition(document: GridMapDocument, tool: GridTool, points: readonly GridPoint[]): GridMapDocument {
  if (!['wall', 'door', 'floor', 'water', 'difficult', 'erase'].includes(tool)) throw new Error('Choose a drawing tool.');
  if (points.some(point => !validPoint(document, point))) throw new Error('Drawing must stay inside the Map Grid.');
  const terrain = new Map(document.terrain.map(cell => [`${cell.x},${cell.y}`, cell]));
  const edges = new Map(document.edges.map(edge => [`${edge.x},${edge.y},${edge.direction}`, edge]));
  function apply(point: GridPoint) {
    const x = Math.min(document.columns - 1, Math.floor(point.x)), y = Math.min(document.rows - 1, Math.floor(point.y));
    const vd = Math.abs(point.x - Math.round(point.x)), hd = Math.abs(point.y - Math.round(point.y));
    const edge = vd < hd ? { x: Math.round(point.x), y, direction: 'vertical' as const } : { x, y: Math.round(point.y), direction: 'horizontal' as const };
    const edgeKey = `${edge.x},${edge.y},${edge.direction}`;
    if (tool === 'wall' || tool === 'door') edges.set(edgeKey, { ...edge, kind: tool });
    else if (tool === 'erase') {
      // Near an edge, erase only that edge even if absent; square interiors erase terrain.
      if (Math.min(vd, hd) <= .2) edges.delete(edgeKey); else terrain.delete(`${x},${y}`);
    } else terrain.set(`${x},${y}`, { x, y, kind: tool });
  }
  if ((tool === 'wall' || tool === 'door') && points.length > 1) {
    let x = Math.round(points[0].x), y = Math.round(points[0].y);
    let moved = false;
    for (const point of points.slice(1)) {
      const endX = Math.round(point.x), endY = Math.round(point.y);
      while (x !== endX) { const nextX = x + Math.sign(endX - x); const edge = { x: Math.min(x, nextX), y, direction: 'horizontal' as const, kind: tool }; edges.set(`${edge.x},${edge.y},${edge.direction}`, edge); x = nextX; moved = true; }
      while (y !== endY) { const nextY = y + Math.sign(endY - y); const edge = { x, y: Math.min(y, nextY), direction: 'vertical' as const, kind: tool }; edges.set(`${edge.x},${edge.y},${edge.direction}`, edge); y = nextY; moved = true; }
    }
    if (!moved) apply(points[0]);
  } else points.forEach((point, index) => {
    const previous = points[index - 1] ?? point;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(point.x - previous.x), Math.abs(point.y - previous.y)) * 8));
    for (let step = 0; step <= steps; step++) apply({ x: previous.x + (point.x - previous.x) * step / steps, y: previous.y + (point.y - previous.y) * step / steps });
  });
  const next = { ...document, terrain: [...terrain.values()], edges: [...edges.values()] };
  return JSON.stringify(next) === JSON.stringify(document) ? document : freeze(next);
}
/** One draw is one meaningful gesture; private history never reaches renderers. */
export function createGridMapEditor(input: Partial<Pick<GridMapDocument,'columns'|'rows'|'feetPerSquare'>> | GridMapDocument = {}) {
  const {columns=20,rows=14,feetPerSquare=5}=input;
  if (!Number.isInteger(columns) || columns < 2 || columns > 80 || !Number.isInteger(rows) || rows < 2 || rows > 80 || !Number.isInteger(feetPerSquare) || feetPerSquare < 1 || feetPerSquare > 100) throw new Error(gridMapLimits);
  let document = 'terrain' in input || 'edges' in input ? validateGridMap(input) : freeze({ columns, rows, feetPerSquare, terrain: [], edges: [] });
  const past: GridMapDocument[] = [], future: GridMapDocument[] = [];
  return {
    snapshot: () => ({ document, canUndo: past.length > 0, canRedo: future.length > 0 }),
    preview: (tool: GridTool, points: readonly GridPoint[]) => transition(document, tool, points),
    draw(tool: GridTool, points: readonly GridPoint[]) { const next = transition(document, tool, points); if (next !== document) { past.push(document); document = next; future.length = 0; } },
    undo() { const previous = past.pop(); if (previous) { future.push(document); document = previous; } },
    redo() { const next = future.pop(); if (next) { past.push(document); document = next; } },
  };
}

/** Validate untrusted saved documents before editing or accepting a save. */
export function validateGridMap(value: unknown): GridMapDocument {
  const d = value as GridMapDocument;
  if (!d || !Number.isInteger(d.columns) || d.columns < 2 || d.columns > 80 || !Number.isInteger(d.rows) || d.rows < 2 || d.rows > 80 || !Number.isInteger(d.feetPerSquare) || d.feetPerSquare < 1 || d.feetPerSquare > 100 || !Array.isArray(d.terrain) || !Array.isArray(d.edges)) throw new Error(gridMapLimits);
  const cells = new Set<string>(), edges = new Set<string>();
  for (const cell of d.terrain) {
    const key = `${cell?.x},${cell?.y}`;
    if (!cell || !Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0 || cell.x >= d.columns || cell.y >= d.rows || !['floor','water','difficult'].includes(cell.kind) || cells.has(key)) throw new Error('Invalid or duplicate map terrain.');
    cells.add(key);
  }
  for (const edge of d.edges) {
    const key = `${edge?.x},${edge?.y},${edge?.direction}`;
    if (!edge || !Number.isInteger(edge.x) || !Number.isInteger(edge.y) || edge.x < 0 || edge.y < 0 || !['wall','door'].includes(edge.kind) || !['horizontal','vertical'].includes(edge.direction) || edge.x > d.columns - (edge.direction === 'horizontal' ? 1 : 0) || edge.y > d.rows - (edge.direction === 'vertical' ? 1 : 0) || edges.has(key)) throw new Error('Invalid or duplicate map edge.');
    edges.add(key);
  }
  return freeze({columns:d.columns,rows:d.rows,feetPerSquare:d.feetPerSquare,terrain:d.terrain.map(({x,y,kind})=>({x,y,kind})),edges:d.edges.map(({x,y,direction,kind})=>({x,y,direction,kind}))});
}
export type MapBackgroundPlacement = Readonly<{x:number;y:number;width:number;height:number;pixelWidth:number;pixelHeight:number}>;
export function fitMapBackground(document: GridMapDocument, pixelWidth: number, pixelHeight: number): MapBackgroundPlacement {
  if (!Number.isInteger(pixelWidth) || !Number.isInteger(pixelHeight) || pixelWidth < 1 || pixelHeight < 1 || pixelWidth * pixelHeight > 16_000_000) throw new Error('Invalid background image dimensions.');
  const scale = Math.min(document.columns / pixelWidth, document.rows / pixelHeight);
  const width = pixelWidth * scale, height = pixelHeight * scale;
  return {x:(document.columns-width)/2,y:(document.rows-height)/2,width,height,pixelWidth,pixelHeight};
}
export function validateMapBackground(document: GridMapDocument, background: MapBackgroundPlacement) {
  const {x,y,width,height,pixelWidth,pixelHeight} = background;
  fitMapBackground(document,pixelWidth,pixelHeight);
  if (![x,y,width,height].every(Number.isFinite) || x<0 || y<0 || width<=0 || height<=0 || x+width>document.columns+1e-8 || y+height>document.rows+1e-8 || Math.abs(width/height-pixelWidth/pixelHeight)>1e-8) throw new Error('The background placement does not fit this Map Grid.');
}

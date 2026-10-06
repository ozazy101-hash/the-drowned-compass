import { test, expect } from '@playwright/test';
import { createGridMapEditor, viewPointToGrid } from '../src/domain/grid-map';
test('bounded dimensions/default distances and clear invalid inputs', () => {
  expect(createGridMapEditor().snapshot().document.feetPerSquare).toBe(5);
  for (const columns of [0, 1, 81, 2.5, NaN, Infinity]) expect(() => createGridMapEditor({ columns })).toThrow('Columns and rows');
  for (const rows of [1, 81, 2.5]) expect(() => createGridMapEditor({ rows })).toThrow();
  for (const feetPerSquare of [0, 101, 1.5]) expect(() => createGridMapEditor({ feetPerSquare })).toThrow();
  expect(createGridMapEditor({ columns: 80, rows: 80, feetPerSquare: 100 }).snapshot().document.columns).toBe(80);
});
test('room walls and replacement door use canonical unit edges without corner spurs', () => {
  const map = createGridMapEditor();
  map.draw('wall', [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }, { x: 1, y: 4 }, { x: 1, y: 1 }]);
  expect(map.snapshot().document.edges).toHaveLength(12);
  map.draw('door', [{ x: 2.5, y: 1 }]);
  expect(map.snapshot().document.edges).toHaveLength(12);
  expect(map.snapshot().document.edges.filter(edge => edge.kind === 'door')).toEqual([{ x: 2, y: 1, direction: 'horizontal', kind: 'door' }]);
});
test('fast terrain strokes interpolate, repaint, deterministic edge/interior erase', () => {
  const map = createGridMapEditor(); map.draw('floor', [{ x: .5, y: .5 }, { x: 4.5, y: .5 }]);
  expect(map.snapshot().document.terrain).toHaveLength(5);
  map.draw('water', [{ x: 2.5, y: .5 }]); map.draw('difficult', [{ x: 3.5, y: .5 }]);
  map.draw('wall', [{ x: 2.5, y: 0 }]); map.draw('erase', [{ x: 2.5, y: 0 }]);
  expect(map.snapshot().document.edges).toHaveLength(0); expect(map.snapshot().document.terrain).toHaveLength(5);
  map.draw('erase', [{ x: 2.5, y: 0 }]); expect(map.snapshot().document.terrain).toHaveLength(5);
  map.draw('erase', [{ x: 2.5, y: .5 }]); expect(map.snapshot().document.terrain).toHaveLength(4);
});
test('one gesture is one undo, previews have no history, noops preserve redo, new edits clear it', () => {
  const map = createGridMapEditor(), points = [{ x: .5, y: .5 }, { x: 8.5, y: .5 }];
  const preview = map.preview('water', points); expect(map.snapshot().canUndo).toBe(false);
  map.draw('water', points); expect(map.snapshot().document).toEqual(preview);
  map.undo(); expect(map.snapshot().document.terrain).toHaveLength(0); expect(map.snapshot().canRedo).toBe(true);
  map.draw('erase', [{ x: .5, y: .5 }]); expect(map.snapshot().canRedo).toBe(true);
  map.redo(); expect(map.snapshot().document.terrain).toHaveLength(9);
  map.undo(); map.draw('floor', [{ x: .5, y: .5 }]); expect(map.snapshot().canRedo).toBe(false);
});
test('invalid strokes reject atomically, maximum boundary cells/edges remain within grid', () => {
  const map = createGridMapEditor({ columns: 2, rows: 2 });
  for (const point of [{ x: -1, y: 0 }, { x: 3, y: 0 }, { x: 0, y: NaN }]) expect(() => map.draw('wall', [{ x: 0, y: 0 }, point])).toThrow('inside');
  expect(map.snapshot().canUndo).toBe(false);
  map.draw('floor', [{ x: 2, y: 2 }]); expect(map.snapshot().document.terrain).toEqual([{ x: 1, y: 1, kind: 'floor' }]);
  map.draw('wall', [{ x: 0, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 0 }]); expect(map.snapshot().document.edges).toHaveLength(4);
});
test('zoom conversion consistent, rejects outside/invalid pixels and documents stay immutable', () => {
  const map = createGridMapEditor(); const doc = map.snapshot().document;
  for (const size of [20, 40, 60, 80]) expect(viewPointToGrid(doc, { x: 2.5 * size, y: 1.5 * size }, size)).toEqual({ x: 2.5, y: 1.5 });
  expect(viewPointToGrid(doc, { x: -1, y: 0 }, 40)).toBeNull(); expect(viewPointToGrid(doc, { x: 0, y: 0 }, 0)).toBeNull();
  map.draw('wall', [{ x: 1.5, y: 1 }]); expect(Object.isFrozen(map.snapshot().document.edges[0])).toBe(true);
  map.undo(); expect(map.snapshot().document).toBe(doc); expect(Object.isFrozen(doc.terrain)).toBe(true);
});

import { test, expect } from "@playwright/test";
import {
  closeMapOutline,
  createGridMapEditor,
  fitMapBackground,
  placeMapBackground,
  validateMapBackground,
} from "../src/domain/grid-map";
test("closed outline is immutable, bounded and rejects zero-area gestures without changing input", () => {
  const document = createGridMapEditor({ columns: 80, rows: 2 }).snapshot()
    .document;
  const points = [
    { x: 1, y: 0.2 },
    { x: 79, y: 0.2 },
    { x: 79, y: 1.8 },
    { x: 1, y: 1.8 },
  ];
  const closed = closeMapOutline(document, points);
  expect(closed).toHaveLength(5);
  expect(closed.at(-1)).toEqual(points[0]);
  expect(points).toHaveLength(4);
  expect(Object.isFrozen(closed[0])).toBe(true);
  for (const bad of [
    [{ x: 1, y: 1 }],
    [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: -1, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ],
  ])
    expect(() => closeMapOutline(document, bad)).toThrow();
});
test("alignment clamps position, preserves proportional pixels and resets using fit at maximum supported grid", () => {
  const document = createGridMapEditor({ columns: 80, rows: 80 }).snapshot()
      .document,
    fit = fitMapBackground(document, 4000, 4000);
  const placed = placeMapBackground(document, fit, 0.5, 100, -10);
  expect(placed).toMatchObject({
    x: 40,
    y: 0,
    width: 40,
    height: 40,
    pixelWidth: 4000,
    pixelHeight: 4000,
  });
  expect(() => validateMapBackground(document, placed)).not.toThrow();
  expect(fit).toMatchObject({ width: 80, height: 80, x: 0, y: 0 });
  for (const scale of [NaN, 0, -1, 1.01])
    expect(() => placeMapBackground(document, fit, scale, 0, 0)).toThrow();
  expect(() =>
    validateMapBackground(document, { ...placed, height: 30 }),
  ).toThrow("placement");
});

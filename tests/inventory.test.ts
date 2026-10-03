import { test, expect } from '@playwright/test';
import { setInventory, mergeInventory, validateInventory, type InventoryEntry } from '../src/domain/inventory';
test('independent items and currency reject stale writes, preserve tombstones and validate amounts', () => {
  const entries: InventoryEntry[] = [];
  const item = { id: 'item.11111111-1111-4111-8111-111111111111', kind: 'equipment' as const, title: 'Rope', body: '50 feet', rank: 0, deleted: false };
  expect(setInventory(entries, item, 0)).toBe(true);
  expect(setInventory(entries, { id: 'currency.gp', kind: 'gp', title: '', body: '42', rank: 0, deleted: false }, 0)).toBe(true);
  expect(setInventory(entries, { ...item, body: 'Stale' }, 0)).toBe(false);
  expect(setInventory(entries, { ...item, deleted: true }, 1)).toBe(true);
  expect(mergeInventory(entries, [{ ...item, version: 1 }]).find(e => e.id === item.id)).toMatchObject({ deleted: true, version: 2 });
  for (const body of ['-1', '1.5', '1e3', '1000000000']) expect(() => validateInventory({ id: 'currency.cp', kind: 'cp', title: '', body, rank: 0, deleted: false })).toThrow();
});

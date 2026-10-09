import { test, expect } from '@playwright/test';
import { chooseMapPresentation, emptyMapPresentation, type MapArtworkVersion, type MapPresentation } from '../src/domain/map-artwork';
import { createGridMapEditor, fitMapBackground } from '../src/domain/grid-map';
import { commitMapRevealMask, createMapRevealMaskDraft } from '../src/domain/map-reveal-mask';
const family = '99000000-0000-4000-8000-000000000001', versionId = '99000000-0000-4000-8000-000000000002', maskId = '99000000-0000-4000-8000-000000000003', request = '99000000-0000-4000-8000-000000000004';
function presentation(columns = 8, rows = 6): MapPresentation {
  const document = createGridMapEditor({ columns, rows }).snapshot().document;
  const version: MapArtworkVersion = { id: versionId, familyId: family, parentVersionId: null, requestId: versionId, createdAt: '2026-10-09T00:00:00Z', title: 'Map', document, background: { ...fitMapBackground(document, 800, 400), mime: 'image/png', size: 100, digest: 'a'.repeat(64), registration: 'upload:' + versionId }, origin: 'uploaded', instructions: '', reference: null, jobId: null };
  const result = chooseMapPresentation(emptyMapPresentation(), version, { versionId, expectedRevision: 0, requestId: maskId });
  if (!result.ok) throw new Error('Unexpected choice failure');
  return result.presentation;
}
function stroke(draft: ReturnType<typeof createMapRevealMaskDraft>, points = [{ x: 1, y: 1 }], brush: 1 | 2 | 4 = 1, mode: 'uncover' | 'hide' = 'uncover') {
  draft.command({ type: 'begin', mode, brush });
  for (const point of points) draft.command({ type: 'sample', point });
  draft.command({ type: 'finish' });
}
test('missing and invalid accepted masks fail closed; first presentation is hidden', () => {
  expect(createMapRevealMaskDraft(presentation()).snapshot()).toMatchObject({ uncovered: [], status: 'accepted' });
  for (const value of [null, emptyMapPresentation(), { ...presentation(), mask: null }, { ...presentation(), mask: { ...presentation().mask!, uncovered: [48] } }]) {
    const draft = createMapRevealMaskDraft(value);
    expect(draft.snapshot()).toMatchObject({ uncovered: [], status: 'unavailable' });
    expect(() => stroke(draft)).toThrow('unavailable');
    expect(() => draft.prepareCommit(request)).toThrow('unavailable');
  }
});
test('brush footprints clip at edges and never accept outside or non-finite samples', () => {
  for (const brush of [1, 2, 4] as const) {
    const draft = createMapRevealMaskDraft(presentation());
    stroke(draft, [{ x: 0, y: 0 }], brush);
    expect(draft.snapshot().uncovered.length).toBe(brush * brush);
    draft.command({ type: 'hide-all' });
    stroke(draft, [{ x: 7.9, y: 5.9 }, { x: 8, y: 6 }, { x: -1, y: 0 }, { x: NaN, y: Infinity }], brush);
    expect(draft.snapshot().uncovered).toEqual([47]);
  }
});
test('a complete interpolated gesture is one undo action; cancelled and no-op strokes add no history', () => {
  const draft = createMapRevealMaskDraft(presentation());
  draft.command({ type: 'begin', mode: 'uncover', brush: 1 });
  draft.command({ type: 'sample', point: { x: 0, y: 1 } });
  draft.command({ type: 'sample', point: { x: 7, y: 1 } });
  expect(draft.snapshot()).toMatchObject({ canUndo: false, strokeActive: true });
  expect(draft.snapshot().accepted.mask?.uncovered).toEqual([]);
  expect(() => draft.prepareCommit(request)).toThrow('Finish');
  draft.command({ type: 'finish' });
  expect(draft.snapshot().uncovered).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
  stroke(draft, [{ x: 0, y: 1 }]);
  draft.command({ type: 'undo' });
  expect(draft.snapshot().uncovered).toEqual([]);
  expect(draft.snapshot().canUndo).toBe(false);
  draft.command({ type: 'redo' });
  draft.command({ type: 'begin', mode: 'hide', brush: 4 });
  draft.command({ type: 'sample', point: { x: 0, y: 1 } });
  draft.command({ type: 'cancel' });
  expect(draft.snapshot().uncovered.length).toBe(8);
  stroke(draft, [{ x: 0, y: 1 }], 1, 'hide');
  expect(draft.snapshot().uncovered).not.toContain(8);
  draft.command({ type: 'undo' });
  expect(draft.snapshot().uncovered).toContain(8);
});
test('whole map commands require confirmation and participate in undo/redo', () => {
  const draft = createMapRevealMaskDraft(presentation());
  // Runtime callers cannot bypass the deliberate-confirmation invariant.
  expect(() => draft.command(JSON.parse('{"type":"uncover-all","confirmed":false}'))).toThrow('Confirm');
  draft.command({ type: 'uncover-all', confirmed: true });
  expect(draft.snapshot().uncovered).toHaveLength(48);
  draft.command({ type: 'hide-all' }); expect(draft.snapshot().uncovered).toEqual([]);
  draft.command({ type: 'undo' }); expect(draft.snapshot().uncovered).toHaveLength(48);
  draft.command({ type: 'undo' }); expect(draft.snapshot().uncovered).toEqual([]);
  draft.command({ type: 'redo' }); expect(draft.snapshot().uncovered).toHaveLength(48);
  stroke(draft, [{ x: 0, y: 0 }], 1, 'hide'); expect(draft.snapshot().canRedo).toBe(false);
});
test('save is one immutable expected-revision intent; pending samples cannot mutate accepted visibility', () => {
  const initial = presentation(), draft = createMapRevealMaskDraft(initial);
  stroke(draft);
  const intent = draft.prepareCommit(request);
  expect(intent).toMatchObject({ expectedRevision: 1, familyId: family, maskId, uncovered: [9] });
  expect(Object.isFrozen(intent.uncovered)).toBe(true);
  expect(draft.prepareCommit(request)).toBe(intent);
  expect(() => draft.prepareCommit(maskId)).toThrow('pending');
  expect(() => stroke(draft)).toThrow('Wait');
  draft.receive(maskId, commitMapRevealMask(initial, intent));
  expect(draft.snapshot().status).toBe('pending');
  const result = commitMapRevealMask(initial, intent);
  draft.receive(request, result);
  expect(draft.snapshot()).toMatchObject({ status: 'accepted', accepted: { revision: 2, mask: { uncovered: [9] } } });
  expect(createMapRevealMaskDraft(draft.snapshot().accepted).snapshot().uncovered).toEqual([9]);
  draft.command({ type: 'undo' });
  expect(draft.snapshot().accepted.mask?.uncovered).toEqual([9]);
  expect(draft.snapshot().uncovered).toEqual([]);
});
test('failed save and invalid response retain accepted state and recoverable stroke', () => {
  const initial = presentation(), draft = createMapRevealMaskDraft(initial);
  stroke(draft); draft.prepareCommit(request);
  draft.receive(request, { ok: false, reason: 'error', error: 'Offline' });
  expect(draft.snapshot()).toMatchObject({ status: 'error', uncovered: [9], error: 'Offline', accepted: { revision: 1, mask: { uncovered: [] } } });
  const intent = draft.prepareCommit(request), valid = commitMapRevealMask(initial, intent);
  draft.receive(request, { ok: true, presentation: { ...valid.presentation, mask: { ...valid.presentation.mask!, uncovered: [10] } } });
  expect(draft.snapshot()).toMatchObject({ status: 'error', uncovered: [9], accepted: { revision: 1, mask: { uncovered: [] } } });
  draft.prepareCommit(request); draft.receive(request, valid);
  expect(draft.snapshot().status).toBe('accepted');
});
test('two controller conflict preserves local stroke and latest accepted mask; retry is deliberate', () => {
  const initial = presentation(), local = createMapRevealMaskDraft(initial), other = createMapRevealMaskDraft(initial);
  stroke(local); stroke(other, [{ x: 2, y: 2 }]);
  const otherResult = commitMapRevealMask(initial, other.prepareCommit(maskId));
  const intent = local.prepareCommit(request), conflict = commitMapRevealMask(otherResult.presentation, intent);
  expect(conflict).toMatchObject({ ok: false, reason: 'conflict' });
  local.receive(request, conflict);
  expect(local.snapshot()).toMatchObject({ status: 'conflict', uncovered: [9], accepted: { revision: 2, mask: { uncovered: [18] } } });
  expect(() => local.prepareCommit(request)).toThrow('Retry or discard');
  local.command({ type: 'retry' });
  expect(local.prepareCommit(request).expectedRevision).toBe(2);
  local.receive(request, { ok: false, reason: 'error', error: 'Offline' });
  local.command({ type: 'discard' });
  expect(local.snapshot()).toMatchObject({ status: 'accepted', uncovered: [18], canUndo: false });
});
test('geometry guard ignores digest/version but rejects unrelated registration, placement, grid, family or mask identity', () => {
  const current = presentation(), draft = createMapRevealMaskDraft(current); stroke(draft);
  const intent = draft.prepareCommit(request), version = current.version!;
  const stage = { ...current, version: { ...version, id: request, background: { ...version.background!, digest: 'b'.repeat(64) } } };
  expect(commitMapRevealMask(stage, intent).ok).toBe(true);
  const mismatches = [
    { ...stage, version: { ...stage.version, familyId: request } },
    { ...stage, mask: { ...stage.mask!, id: request } },
    { ...stage, version: { ...stage.version, document: { ...version.document, feetPerSquare: 10 } } },
    { ...stage, version: { ...stage.version, background: { ...version.background!, y: 1.5 } } },
    { ...stage, mask: { ...stage.mask!, registration: 'other' }, version: { ...stage.version, background: { ...version.background!, registration: 'other' } } },
  ];
  for (const mismatch of mismatches) expect(commitMapRevealMask(mismatch, intent)).toMatchObject({ ok: false, reason: 'incompatible' });
  for (const uncovered of [[-1], [48], [1, 1], [1.5]]) expect(() => commitMapRevealMask(current, { ...intent, uncovered })).toThrow('unavailable');
  draft.receive(request, { ok: false, reason: 'incompatible', presentation: mismatches[0] });
  expect(() => draft.command({ type: 'retry' })).toThrow('unrelated');
  expect(draft.snapshot().uncovered).toEqual([9]);
  draft.command({ type: 'discard' }); expect(draft.snapshot().uncovered).toEqual([]);
});
test('largest supported grid has bounded cells through whole-map and edge strokes', () => {
  const draft = createMapRevealMaskDraft(presentation(80, 80));
  draft.command({ type: 'uncover-all', confirmed: true }); expect(draft.snapshot().uncovered).toHaveLength(6400);
  stroke(draft, [{ x: 79, y: 79 }], 4, 'hide');
  expect(draft.snapshot().uncovered).toHaveLength(6399);
  draft.command({ type: 'undo' }); expect(draft.snapshot().uncovered).toHaveLength(6400);
});

test('save response cannot move accepted visibility into an unrelated family', () => {
  const initial = presentation(), draft = createMapRevealMaskDraft(initial);
  stroke(draft);
  const intent = draft.prepareCommit(request), result = commitMapRevealMask(initial, intent);
  draft.receive(request, { ok: true, presentation: { ...result.presentation, version: { ...result.presentation.version!, familyId: request } } });
  expect(draft.snapshot()).toMatchObject({ status: 'error', uncovered: [9], accepted: { revision: 1, version: { familyId: family }, mask: { uncovered: [] } } });
  expect(draft.snapshot().canUndo).toBe(true);
  const retry = draft.prepareCommit(request);
  expect(retry.familyId).toBe(family);
  expect(retry.expectedRevision).toBe(1);
  draft.receive(request, commitMapRevealMask(initial, retry));
  expect(draft.snapshot()).toMatchObject({ status: 'accepted', accepted: { revision: 2, version: { familyId: family }, mask: { uncovered: [9] } } });
});

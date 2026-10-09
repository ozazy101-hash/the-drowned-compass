import { emptyMapPresentation, mapIdentity, matchingMapGeometry, validateMapPresentation, type MapArtworkVersion, type MapPresentation, type MapPresentationResult } from './map-artwork';
import { validateGridMap, validateMapBackground, type GridPoint } from './grid-map';

export type MapRevealMaskIntent = Readonly<{
  requestId: string; expectedRevision: number; familyId: string; maskId: string;
  geometry: Readonly<Pick<MapArtworkVersion, 'document' | 'background'>>;
  uncovered: readonly number[];
}>;
export type MapRevealMaskCommand =
  | { type: 'begin'; mode: 'uncover' | 'hide'; brush: 1 | 2 | 4 }
  | { type: 'sample'; point: GridPoint }
  | { type: 'finish' | 'cancel' | 'undo' | 'redo' | 'hide-all' | 'retry' | 'discard' }
  | { type: 'uncover-all'; confirmed: true };
export type MapRevealMaskSaveResult = MapPresentationResult | { ok: false; reason: 'error'; error: string };

/** Semantic atomic mask change. Adapters enforce authority and persist this result.
 * Registration and canonical geometry, rather than digest or version ID, guard cells. */
export function commitMapRevealMask(current: MapPresentation, intent: MapRevealMaskIntent): MapPresentationResult {
  current = validateMapPresentation(current);
  mapIdentity(intent.requestId); mapIdentity(intent.familyId); mapIdentity(intent.maskId);
  if (!Number.isSafeInteger(intent.expectedRevision) || intent.expectedRevision < 1) throw new Error('Reload the map presentation before saving reveal progress.');
  if (current.revision !== intent.expectedRevision) return { ok: false, reason: 'conflict', presentation: current };
  if (!current.version || !current.mask || current.version.familyId !== intent.familyId || current.mask.id !== intent.maskId || !intent.geometry || !matchingMapGeometry(current.version, intent.geometry)) return { ok: false, reason: 'incompatible', presentation: current };
  const next = validateMapPresentation({ ...current, revision: current.revision + 1, mask: { ...current.mask, uncovered: intent.uncovered } });
  return { ok: true, presentation: next };
}

/** Canonical persistence key. Artwork bytes, terrain details and calibration do
 * not identify cell geography. Equality decisions still use matchingMapGeometry. */
export function mapRevealGeometry(source: Pick<MapArtworkVersion, 'document' | 'background'>) {
  const document = validateGridMap(source.document), background = source.background;
  if (background) {
    validateMapBackground(document, background);
    if (typeof background.registration !== 'string' || !background.registration) throw new Error('Map registration is unavailable.');
  }
  return { columns: document.columns, rows: document.rows, feetPerSquare: document.feetPerSquare,
    background: background ? { registration: background.registration!, x: background.x, y: background.y, width: background.width, height: background.height, pixelWidth: background.pixelWidth, pixelHeight: background.pixelHeight } : null };
}
export function prepareMapRevealMaskIntent(intent: MapRevealMaskIntent) {
  mapIdentity(intent.requestId); mapIdentity(intent.familyId); mapIdentity(intent.maskId);
  if (!Number.isSafeInteger(intent.expectedRevision) || intent.expectedRevision < 1) throw new Error('Reload the map presentation before saving reveal progress.');
  const geometry = mapRevealGeometry(intent.geometry);
  if (!Array.isArray(intent.uncovered) || intent.uncovered.some(cell => !Number.isInteger(cell) || cell < 0 || cell >= geometry.columns * geometry.rows) || new Set(intent.uncovered).size !== intent.uncovered.length) throw new Error('Map presentation is unavailable.');
  const signature = { kind: 'mask', familyId: intent.familyId, maskId: intent.maskId, expectedRevision: intent.expectedRevision, geometry, uncovered: [...intent.uncovered].sort((a, b) => a - b) };
  return { geometry, signature };
}

const cells = (values: readonly number[]) => Object.freeze([...values].sort((a, b) => a - b));
const equal = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((cell, index) => cell === b[index]);

/** Local gesture/history module. No sample performs persistence. While saving,
 * editing is locked; failed/conflicting saves retain a recoverable local draft.
 * Points are game-grid coordinates, brush footprints extend right/down from the
 * containing cell and clip at the map edge. Outside/non-finite samples are ignored. */
export function createMapRevealMaskDraft(input: MapPresentation | null) {
  let accepted: MapPresentation | null = null;
  let error: string | null = null;
  try { if (!input) throw new Error('Map presentation is unavailable.'); accepted = validateMapPresentation(input); }
  catch { error = 'Map presentation is unavailable.'; }
  let baseline = accepted;
  let draft = cells(accepted?.mask?.uncovered ?? []);
  let status: 'accepted' | 'draft' | 'pending' | 'error' | 'conflict' | 'unavailable' = accepted?.mask ? 'accepted' : 'unavailable';
  const past: (readonly number[])[] = [], future: (readonly number[])[] = [];
  let stroke: { mode: 'uncover' | 'hide'; brush: 1 | 2 | 4; before: readonly number[]; last: GridPoint | null } | null = null;
  let pending: MapRevealMaskIntent | null = null;
  let deferred: MapPresentation | null = null;
  function compatible() {
    return !!accepted?.version && !!baseline?.version && accepted.version.familyId === baseline.version.familyId && accepted.mask?.id === baseline.mask?.id && matchingMapGeometry(accepted.version, baseline.version);
  }
  function editable() {
    if (!baseline?.mask || status === 'unavailable') throw new Error('Map presentation is unavailable.');
    if (status === 'pending') throw new Error('Wait for reveal progress to finish saving.');
    if (status === 'conflict') throw new Error('Retry or discard the recoverable reveal draft first.');
  }
  function change(next: readonly number[]) {
    if (equal(next, draft)) return;
    past.push(draft); draft = next; future.length = 0; status = 'draft'; error = null;
  }
  function stamp(point: GridPoint) {
    if (!stroke || !baseline?.mask) return;
    const { columns, rows } = baseline.mask;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0 || point.x >= columns || point.y >= rows) { stroke.last = null; return; }
    const previous = stroke.last ?? point;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(point.x - previous.x), Math.abs(point.y - previous.y)) * 2));
    const selected = new Set(draft);
    for (let step = 0; step <= steps; step++) {
      const x = Math.floor(previous.x + (point.x - previous.x) * step / steps);
      const y = Math.floor(previous.y + (point.y - previous.y) * step / steps);
      for (let dy = 0; dy < stroke.brush && y + dy < rows; dy++) for (let dx = 0; dx < stroke.brush && x + dx < columns; dx++) {
        const cell = (y + dy) * columns + x + dx;
        if (stroke.mode === 'uncover') selected.add(cell); else selected.delete(cell);
      }
    }
    draft = cells([...selected]); stroke.last = { ...point };
  }
  function observe(input: MapPresentation) {
    const next = validateMapPresentation(input);
    if (next.revision <= (accepted?.revision ?? -1)) return;
    if (pending) { if (!deferred || next.revision > deferred.revision) deferred = next; return; }
    accepted = next;
    if ((status === 'accepted' && !stroke) || status === 'unavailable') {
      baseline = next; draft = cells(next.mask?.uncovered ?? []); past.length = future.length = 0;
      status = next.mask ? 'accepted' : 'unavailable'; error = null;
    } else {
      stroke = null; status = 'conflict';
      error = compatible() ? 'Reveal progress changed elsewhere. Retry or discard this draft.' : 'Map geometry changed. Discard this draft before editing.';
    }
  }
  function flushObserved() { const next = deferred; deferred = null; if (next) observe(next); }
  return {
    observe,
    snapshot() {
      return Object.freeze({ accepted: accepted ?? emptyMapPresentation(), uncovered: draft, status, error, strokeActive: !!stroke, canUndo: status !== 'pending' && status !== 'conflict' && !stroke && past.length > 0, canRedo: status !== 'pending' && status !== 'conflict' && !stroke && future.length > 0 });
    },
    command(command: MapRevealMaskCommand) {
      if (command.type === 'discard') {
        if (status === 'pending') throw new Error('Wait for reveal progress to finish saving.');
        baseline = accepted; draft = cells(accepted?.mask?.uncovered ?? []); past.length = future.length = 0; stroke = null; error = null; status = accepted?.mask ? 'accepted' : 'unavailable'; return;
      }
      if (command.type === 'retry') {
        if (status !== 'conflict' || !compatible()) throw new Error('Discard this draft before editing unrelated map geometry.');
        baseline = accepted; status = 'draft'; error = null; return;
      }
      editable();
      if (command.type === 'begin') {
        if (stroke || ![1, 2, 4].includes(command.brush) || !['uncover', 'hide'].includes(command.mode)) throw new Error('Choose a reveal brush before starting a stroke.');
        stroke = { mode: command.mode, brush: command.brush, before: draft, last: null }; return;
      }
      if (command.type === 'sample') { if (!stroke) throw new Error('Start a reveal stroke first.'); stamp(command.point); return; }
      if (command.type === 'cancel') { if (stroke) draft = stroke.before; stroke = null; return; }
      if (command.type === 'finish') {
        if (stroke && !equal(draft, stroke.before)) { past.push(stroke.before); future.length = 0; status = 'draft'; error = null; }
        stroke = null; return;
      }
      if (stroke) throw new Error('Finish the reveal stroke first.');
      if (command.type === 'undo') { const previous = past.pop(); if (previous) { future.push(draft); draft = previous; status = 'draft'; error = null; } }
      else if (command.type === 'redo') { const next = future.pop(); if (next) { past.push(draft); draft = next; status = 'draft'; error = null; } }
      else if (command.type === 'hide-all') change(cells([]));
      else if (command.type === 'uncover-all') {
        if (command.confirmed !== true) throw new Error('Confirm uncovering the whole map.');
        change(cells(Array.from({ length: baseline!.mask!.columns * baseline!.mask!.rows }, (_, index) => index)));
      }
    },
    prepareCommit(requestId: string): MapRevealMaskIntent {
      if (pending) { if (pending.requestId !== requestId) throw new Error('This reveal save is already pending.'); return pending; }
      editable();
      if (stroke) throw new Error('Finish the reveal stroke before saving.');
      if (!compatible()) throw new Error('Reload the map presentation before saving reveal progress.');
      mapIdentity(requestId);
      const version = baseline!.version!;
      pending = Object.freeze({ requestId, expectedRevision: baseline!.revision, familyId: version.familyId, maskId: baseline!.mask!.id, geometry: Object.freeze({ document: version.document, background: version.background }), uncovered: draft });
      status = 'pending'; error = null; return pending;
    },
    receive(requestId: string, result: MapRevealMaskSaveResult) {
      if (!pending || pending.requestId !== requestId) return;
      if (!result.ok && result.reason === 'error') { pending = null; status = 'error'; error = result.error; flushObserved(); return; }
      let observed: MapPresentation;
      try {
        observed = validateMapPresentation(result.presentation);
        if (observed.revision < accepted!.revision) throw new Error('Stale reveal save response.');
        if (result.ok) {
          const expected = commitMapRevealMask(baseline!, pending);
          if (!expected.ok || observed.revision !== expected.presentation.revision || !observed.version || !baseline!.version || observed.version.id !== baseline!.version.id || observed.version.familyId !== pending.familyId || observed.mask?.id !== pending.maskId || !matchingMapGeometry(observed.version, baseline!.version) || !equal(cells(observed.mask?.uncovered ?? []), pending.uncovered)) throw new Error('Invalid reveal save response.');
        }
      } catch { pending = null; status = 'error'; error = 'Map reveal save response is unavailable. Retry the recoverable draft.'; flushObserved(); return; }
      accepted = observed; pending = null;
      if (result.ok) { baseline = observed; status = 'accepted'; error = null; }
      else { status = 'conflict'; error = result.reason === 'incompatible' ? 'Map geometry changed. Discard this draft before editing.' : 'Reveal progress changed elsewhere. Retry or discard this draft.'; }
      flushObserved();
    },
  };
}

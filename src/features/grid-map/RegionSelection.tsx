import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { GridMapDocument, GridPoint, MapBackgroundPlacement } from '../../domain/grid-map';
import { selectMapArea, type MapAreaSelection } from '../../domain/map-region';
import { MapDrawing } from './MapScene';

/** Private gestures and viewport transforms stay local; only validated areas leave this view. */
export function RegionSelection({ document, background, selection, onSelect, disabled }: {
  document: GridMapDocument; background: { url: string; placement: MapBackgroundPlacement };
  selection?: MapAreaSelection; onSelect: (selection?: MapAreaSelection) => void; disabled: boolean;
}) {
  const [zoom, setZoom] = useState(1), [preview, setPreview] = useState<MapAreaSelection>(), [error, setError] = useState('');
  const gesture = useRef<{ start: GridPoint; pointerId: number; svg: SVGSVGElement } | undefined>(undefined);
  function cancelGesture() { const current = gesture.current; gesture.current = undefined; setPreview(undefined); if(current?.svg.hasPointerCapture(current.pointerId)) current.svg.releasePointerCapture(current.pointerId); }
  useEffect(() => { if(disabled) cancelGesture(); }, [disabled]);
  useEffect(() => () => { const current = gesture.current; if(current?.svg.hasPointerCapture(current.pointerId)) current.svg.releasePointerCapture(current.pointerId); gesture.current = undefined; }, []);
  const point = (e: PointerEvent<SVGSVGElement>) => {
    const transform = e.currentTarget.getScreenCTM();
    if (!transform) throw new Error('Map coordinates are unavailable.');
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(transform.inverse());
    return { x: p.x, y: p.y };
  };
  const area = preview ?? selection;
  function finish(e: PointerEvent<SVGSVGElement>) {
    if (!gesture.current || gesture.current.pointerId !== e.pointerId) return;
    try { onSelect(selectMapArea(document, background.placement, gesture.current.start, point(e))); setError(''); }
    catch (e) { onSelect(undefined); setError((e as Error).message); }
    finally { cancelGesture(); }
  }
  return <section aria-label="Selected-area revision">
    <p>Drag a rectangle on the saved artwork. Scroll to pan when zoomed. Revisions keep this map extent.</p>
    <label>Selection zoom<input type="range" min=".5" max="3" step=".25" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
    <button disabled={disabled || !selection} onClick={() => { onSelect(undefined); setPreview(undefined); setError(''); }}>Clear selected area</button>
    <div className="map-scroll">
      <svg className="map-canvas" role="img" aria-label="Area selection surface" viewBox={`0 0 ${document.columns} ${document.rows}`} width={document.columns * 32 * zoom} height={document.rows * 32 * zoom}
        onPointerDown={e => { if (disabled || e.button !== 0 || gesture.current) return; onSelect(undefined); setPreview(undefined); try { const p = point(e); if(p.x<background.placement.x||p.y<background.placement.y||p.x>background.placement.x+background.placement.width||p.y>background.placement.y+background.placement.height)throw new Error('Select inside the saved artwork.'); gesture.current = { start: p, pointerId: e.pointerId, svg: e.currentTarget }; setError(''); e.currentTarget.setPointerCapture(e.pointerId); } catch (e) { setError((e as Error).message); } }}
        onPointerMove={e => { if (!gesture.current || gesture.current.pointerId !== e.pointerId) return; try { setPreview(selectMapArea(document, background.placement, gesture.current.start, point(e))); } catch { setPreview(undefined); } }}
        onPointerUp={finish}
        onPointerCancel={e => { if(gesture.current?.pointerId === e.pointerId) cancelGesture(); }}
        onLostPointerCapture={e => { if(gesture.current?.pointerId === e.pointerId) cancelGesture(); }}>
        <MapDrawing document={document} background={background} />
        {area && <rect aria-label="Selected revision area" {...area.logical} fill="#e9b871" fillOpacity=".22" stroke="#e9b871" strokeWidth=".08" pointerEvents="none" />}
      </svg>
    </div>
    {selection && <p role="status">Selected {selection.pixels.width} × {selection.pixels.height} pixels at {selection.pixels.x}, {selection.pixels.y}.</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

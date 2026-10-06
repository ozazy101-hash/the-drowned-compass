import { useEffect, useRef, useState } from 'react';
import { createGridMapEditor, gridMapLimits, viewPointToGrid, type GridMapDocument, type GridPoint, type GridTool } from '../../domain/grid-map';
import { prepareGridMapSave, type PartyContent, type SavedGridMap, type GridMapSave, type MapBackground } from '../../domain/party-content';
import './grid-map.css';
const tools: GridTool[] = ['wall', 'door', 'floor', 'water', 'difficult', 'erase'];
function MapDrawing({ document, background }: { document: GridMapDocument; background?:{url:string;placement:MapBackground} }) {
  return <>
    <defs><pattern id="map-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#788b91" strokeWidth="0.025" /></pattern></defs>
    <rect width={document.columns} height={document.rows} fill="#142630" />
    {background&&<image aria-label="Map Background artwork" href={background.url} x={background.placement.x} y={background.placement.y} width={background.placement.width} height={background.placement.height} preserveAspectRatio="xMidYMid meet" />}
    {document.terrain.map(cell => <rect key={`${cell.x},${cell.y}`} data-terrain={cell.kind} x={cell.x} y={cell.y} width="1" height="1" fill={{ floor: '#82725a', water: '#246880', difficult: '#865646' }[cell.kind]} />)}
    <rect width={document.columns} height={document.rows} fill="url(#map-grid)" />
    {document.edges.map(edge => <line key={`${edge.x},${edge.y},${edge.direction}`} data-edge={edge.kind} x1={edge.x} y1={edge.y} x2={edge.x + (edge.direction === 'horizontal' ? 1 : 0)} y2={edge.y + (edge.direction === 'vertical' ? 1 : 0)} stroke={edge.kind === 'door' ? '#e9b871' : '#eef0dd'} strokeWidth={edge.kind === 'door' ? '.16' : '.11'} strokeDasharray={edge.kind === 'door' ? '.3 .12' : undefined} />)}
  </>;
}
export function GridMapEditor({ active, onBack, content, mapId, loadRevision, onLibrary }: { active: boolean; onBack: () => void; content:PartyContent;mapId?:string;loadRevision:number;onLibrary:()=>void }) {
  const [saved,setSaved]=useState<SavedGridMap>();
  const [title,setTitle]=useState('Untitled Grid Map');
  const [busy,setBusy]=useState(false);
  const [conflict,setConflict]=useState(false);
  const [message,setMessage]=useState('');
  const [backgroundIntent,setBackgroundIntent]=useState<File|null>();
  const [backgroundBlob,setBackgroundBlob]=useState<Blob>();
  const [background,setBackground]=useState<MapBackground|null>(null);
  const [backgroundUrl,setBackgroundUrl]=useState('');
  const identity=useRef<string>(crypto.randomUUID());
  const retry=useRef<GridMapSave|undefined>(undefined);
  const loadGeneration=useRef(0);
  const [editor, setEditor] = useState(() => createGridMapEditor());
  const [snapshot, setSnapshot] = useState(editor.snapshot);
  const [preview, setPreview] = useState<GridMapDocument>();
  const [tool, setTool] = useState<GridTool>('wall');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(false);
  const [columns, setColumns] = useState('20'), [rows, setRows] = useState('14'), [feet, setFeet] = useState('5');
  const [error, setError] = useState('');
  const [failedLoadId,setFailedLoadId]=useState<string>();
  const [cursor, setCursor] = useState<GridPoint>({ x: .5, y: .5 });
  const gesture = useRef<{ tool: GridTool; pointerId: number; points: GridPoint[] } | null>(null);
  const document = preview ?? snapshot.document;
  const squarePixels = 40 * zoom;
  useEffect(()=>{if(!backgroundBlob){setBackgroundUrl('');return;}const url=URL.createObjectURL(backgroundBlob);setBackgroundUrl(url);return()=>URL.revokeObjectURL(url);},[backgroundBlob]);
  async function load(id:string) {
    const generation=++loadGeneration.current;setBusy(true);setError('');setFailedLoadId(undefined);cancel();
    try {
      const item=await content.loadMap(id);
      const blob=item.background?await content.openMapBackground(id,item.version):undefined;
      if(generation!==loadGeneration.current)return;
      const next=createGridMapEditor(item.document);
      setEditor(next);setSnapshot(next.snapshot());setPreview(undefined);setCursor({x:.5,y:.5});setSaved(item);identity.current=id;setTitle(item.title);setColumns(String(item.document.columns));setRows(String(item.document.rows));setFeet(String(item.document.feetPerSquare));setBackground(item.background);setBackgroundBlob(blob);setBackgroundIntent(undefined);setConflict(false);retry.current=undefined;setMessage('Loaded saved map.');
    }catch(failure){if(generation===loadGeneration.current){setFailedLoadId(id);setError(`${(failure as Error).message} Your draft is retained. Retry opening this Grid Map.`);}}
    finally{if(generation===loadGeneration.current)setBusy(false);}
  }
  useEffect(()=>{if(mapId)void load(mapId);return()=>{loadGeneration.current++;};},[mapId,content,loadRevision]);
  async function save() {
    if(busy||conflict)return;const generation=++loadGeneration.current;cancel();setBusy(true);setError('');setMessage('');
    retry.current??={id:identity.current,expectedVersion:saved?.version??0,requestId:crypto.randomUUID(),title,document:snapshot.document,background:backgroundIntent};
    try {
      const result=await content.saveMap(retry.current);
      if(generation!==loadGeneration.current)return;
      if(!result.ok){retry.current=undefined;setConflict(true);setError('This Grid Map changed elsewhere. Your draft is retained. Reload the saved map to resolve the conflict.');return;}
      // Receipts may describe an earlier save. Read current state before claiming
      // saved, keeping the draft and retry identity intact if that read fails.
      const current=await content.loadMap(result.item.id);
      const blob=current.background?await content.openMapBackground(current.id,current.version):undefined;
      if(generation!==loadGeneration.current)return;
      if(JSON.stringify(current.document)!==JSON.stringify(snapshot.document)){const next=createGridMapEditor(current.document);setEditor(next);setSnapshot(next.snapshot());}
      setCursor({x:.5,y:.5});setColumns(String(current.document.columns));setRows(String(current.document.rows));setFeet(String(current.document.feetPerSquare));setSaved(current);setTitle(current.title);setBackground(current.background);setBackgroundBlob(blob);setBackgroundIntent(undefined);retry.current=undefined;setMessage(current.visibility==='revealed'?'Saved for everyone.':'Saved privately.');
    }catch(failure){if(generation===loadGeneration.current)setError(`${(failure as Error).message} Your draft is retained. Retry save to confirm its current state.`);}
    finally{if(generation===loadGeneration.current)setBusy(false);}
  }
  function edited(){retry.current=undefined;setMessage('');}
  async function chooseBackground(file?:File){
    if(!file)return;const generation=++loadGeneration.current;setBusy(true);setError('');setFailedLoadId(undefined);cancel();
    try{const prepared=await prepareGridMapSave({id:identity.current,expectedVersion:saved?.version??0,requestId:crypto.randomUUID(),title:'Background preview',document:snapshot.document,background:file});if(generation!==loadGeneration.current)return;const {digest:_digest,...placement}=prepared.replacement!;setBackground(placement);setBackgroundBlob(file);setBackgroundIntent(file);edited();}
    catch(failure){if(generation===loadGeneration.current)setError((failure as Error).message);}finally{if(generation===loadGeneration.current)setBusy(false);}
  }
  function cancel() { gesture.current = null; setPreview(undefined); }
  useEffect(() => { if (!active) cancel(); }, [active]);
  useEffect(() => { window.addEventListener('blur', cancel); return () => window.removeEventListener('blur', cancel); }, []);
  function refresh() { edited(); setSnapshot(editor.snapshot()); setPreview(undefined); }
  function sample(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return viewPointToGrid(snapshot.document, { x: event.clientX - rect.left, y: event.clientY - rect.top }, squarePixels);
  }
  function extend(event: React.PointerEvent<SVGSVGElement>) {
    const current = gesture.current, point = sample(event);
    if (!current || current.pointerId !== event.pointerId || !point) return;
    current.points.push(point); setPreview(editor.preview(current.tool, current.points));
  }
  function commit() { const current = gesture.current; gesture.current = null; if (current) editor.draw(current.tool, current.points); refresh(); }
  function newMap(event: React.SubmitEvent) {
    event.preventDefault();
    try {
      const next = createGridMapEditor({ columns: Number(columns), rows: Number(rows), feetPerSquare: Number(feet) });
      cancel();identity.current=crypto.randomUUID();retry.current=undefined;setSaved(undefined);setConflict(false);setFailedLoadId(undefined);setTitle('Untitled Grid Map');setBackground(null);setBackgroundBlob(undefined);setBackgroundIntent(undefined);setMessage(''); setEditor(next); setSnapshot(next.snapshot()); setCursor({ x: .5, y: .5 }); setError('');
    } catch (failure) { setError((failure as Error).message); }
  }
  return <main className="grid-map-editor" hidden={!active}>
    <fieldset disabled={busy} className="map-controls">
    <button onClick={() => { cancel(); onBack(); }}>Back to Party</button><button onClick={()=>{cancel();onLibrary();}}>Open Dungeon Master Library</button><h1>Grid Map editor</h1>
    <p>DM draft. Save explicitly to keep a private Grid Map in your Library. Unsaved edits stay on this device and are discarded on reload or sign out.</p>
    <div className="map-toolbar"><label>Map title<input value={title} maxLength={160} onChange={event=>{setTitle(event.target.value);edited();}} /></label><button disabled={busy||conflict} onClick={()=>void save()}>{busy?'Saving…':error&&retry.current?'Retry save':saved?.visibility==='revealed'?'Save for everyone':'Save private Grid Map'}</button>{(saved||mapId||conflict)&&<button onClick={()=>void load(conflict?identity.current:saved?.id??mapId!)}>Reload saved map (discard draft)</button>}</div>
    <p role="status">{busy?'Working…':message||(saved&&JSON.stringify(saved.document)===JSON.stringify(snapshot.document)&&saved.title===title&&backgroundIntent===undefined?'Saved':'Unsaved changes')}{saved&&` · version ${saved.version} · ${saved.visibility==='revealed'?'Revealed':'Private'}`}</p>
    <div className="map-toolbar"><label>Map Background<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{void chooseBackground(event.target.files?.[0]);event.target.value='';}} /></label><button disabled={!background} onClick={()=>{cancel();setBackground(null);setBackgroundBlob(undefined);setBackgroundIntent(null);edited();}}>Remove background</button></div>
    <p>PNG, JPEG or WebP, up to 20 MiB and 16 million pixels. Artwork fits proportionally inside the Map Grid; grid, terrain and walls overlay it. Drawing undo/redo does not change the selected image.</p>
    <form onSubmit={newMap} noValidate aria-label="New blank Grid Map"><h2>New blank map</h2><p>{gridMapLimits} Creating a blank map discards this draft and its undo history.</p>
      <div className="map-fields"><label>Columns<input type="number" min="2" max="80" value={columns} onChange={event => setColumns(event.target.value)} /></label><label>Rows<input type="number" min="2" max="80" value={rows} onChange={event => setRows(event.target.value)} /></label><label>Game feet per square<input type="number" min="1" max="100" value={feet} onChange={event => setFeet(event.target.value)} /></label><button>Create blank map</button></div>
    </form>
    {error && <p role="alert">{error}</p>}{failedLoadId&&<button onClick={()=>void load(failedLoadId)}>Retry opening Grid Map</button>}
    <div className="map-toolbar" role="group" aria-label="Drawing tools">{tools.map(value => <button key={value} aria-pressed={!pan && tool === value} onClick={() => { cancel(); setPan(false); setTool(value); }}>{value === 'difficult' ? 'Difficult terrain' : value[0].toUpperCase() + value.slice(1)}</button>)}<button aria-pressed={pan} onClick={() => { cancel(); setPan(value => !value); }}>Pan view</button><button disabled={!snapshot.canUndo} onClick={() => { cancel(); editor.undo(); refresh(); }}>Undo</button><button disabled={!snapshot.canRedo} onClick={() => { cancel(); editor.redo(); refresh(); }}>Redo</button><label>View zoom<select value={zoom} onChange={event => { cancel(); setZoom(Number(event.target.value)); }}><option value=".5">50%</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></label></div>
    <p id="map-help">Drag to draw. Walls and doors snap to the nearest grid edge. Erase near an edge removes only that edge; erase inside a square removes terrain. Use Pan view to swipe or scroll to the rest of the map. Choose a drawing tool to resume drawing. Keyboard: focus the grid, arrows move the cursor, Enter or Space applies the tool.</p>
    <p role="status">{document.columns} × {document.rows} squares · {document.feetPerSquare} game feet per square · {document.edges.length} edges · {document.terrain.length} painted squares</p>
    <div className="map-scroll"><svg className={pan ? "map-canvas is-panning" : "map-canvas"} tabIndex={busy?-1:0} role="application" aria-label="Grid Map drawing surface" aria-describedby="map-help" viewBox={`0 0 ${document.columns} ${document.rows}`} width={document.columns * squarePixels} height={document.rows * squarePixels}
      onPointerDown={event => { if (busy || pan || event.button !== 0 || gesture.current) return; const point = sample(event); if (!point) return; event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); gesture.current = { tool, pointerId: event.pointerId, points: [point] }; setPreview(editor.preview(tool, [point])); }}
      onPointerMove={event=>{if(!busy)extend(event);}} onPointerUp={event => { if (busy || gesture.current?.pointerId !== event.pointerId) return; extend(event); commit(); }} onPointerCancel={cancel} onLostPointerCapture={cancel}
      onKeyDown={event => {
        if(busy)return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault(); cancel();
          const next = { x: cursor.x + (event.key === 'ArrowRight' ? .5 : event.key === 'ArrowLeft' ? -.5 : 0), y: cursor.y + (event.key === 'ArrowDown' ? .5 : event.key === 'ArrowUp' ? -.5 : 0) };
          const valid = viewPointToGrid(document, next, 1); if (valid) {
            setCursor(valid);
            const viewport = event.currentTarget.parentElement!;
            const x = valid.x * squarePixels, y = valid.y * squarePixels;
            if (x < viewport.scrollLeft + 10 || x > viewport.scrollLeft + viewport.clientWidth - 10 || y < viewport.scrollTop + 10 || y > viewport.scrollTop + viewport.clientHeight - 10) viewport.scrollTo({ left: x - viewport.clientWidth / 2, top: y - viewport.clientHeight / 2 });
          }
        } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (pan) return; cancel(); editor.draw(tool, [cursor]); refresh(); }
        else if (event.key === 'Escape') cancel();
      }}>
      <MapDrawing document={document} background={background&&backgroundUrl?{url:backgroundUrl,placement:background}:undefined} /><circle className="map-cursor" cx={cursor.x} cy={cursor.y} r=".17" fill="none" stroke="#fff" strokeWidth=".05" pointerEvents="none" />
    </svg></div>
    </fieldset>
  </main>;
}

import { useId } from "react";
import {
  type GridMapDocument,
  type GridPoint,
  type MapBackgroundPlacement,
} from "../../domain/grid-map";
export function MapDrawing({
  document,
  background,
}: {
  document: GridMapDocument;
  background?: { url: string; placement: MapBackgroundPlacement };
}) {
  const gridId = useId();
  return (
    <>
      <defs>
        <pattern id={gridId} width="1" height="1" patternUnits="userSpaceOnUse">
          <path
            d="M 1 0 L 0 0 0 1"
            fill="none"
            stroke="#788b91"
            strokeWidth="0.025"
          />
        </pattern>
      </defs>
      <rect width={document.columns} height={document.rows} fill="#142630" />
      {background && (
        <image
          aria-label="Map Background artwork"
          href={background.url}
          x={background.placement.x}
          y={background.placement.y}
          width={background.placement.width}
          height={background.placement.height}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {document.terrain.map((cell) => (
        <rect
          key={`${cell.x},${cell.y}`}
          data-terrain={cell.kind}
          x={cell.x}
          y={cell.y}
          width="1"
          height="1"
          fillOpacity={background ? 0.22 : 1}
          fill={
            { floor: "#82725a", water: "#246880", difficult: "#865646" }[
              cell.kind
            ]
          }
        />
      ))}
      <rect
        width={document.columns}
        height={document.rows}
        fill={`url(#${gridId})`}
      />
      {document.edges.map((edge) => (
        <line
          key={`${edge.x},${edge.y},${edge.direction}`}
          data-edge={edge.kind}
          x1={edge.x}
          y1={edge.y}
          x2={edge.x + (edge.direction === "horizontal" ? 1 : 0)}
          y2={edge.y + (edge.direction === "vertical" ? 1 : 0)}
          stroke={edge.kind === "door" ? "#e9b871" : "#eef0dd"}
          strokeWidth={edge.kind === "door" ? ".16" : ".11"}
          strokeDasharray={edge.kind === "door" ? ".3 .12" : undefined}
        />
      ))}
    </>
  );
}

/** One shared scene supplies both reference rasterization and private preview. */
export async function rasterMapReference(
  document: GridMapDocument,
  outlines: readonly (readonly GridPoint[])[],
): Promise<File> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const markup = renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1024"
      height="1024"
      viewBox={`0 0 ${document.columns} ${document.rows}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <MapDrawing document={document} />
      {outlines.map((line, i) => (
        <polyline
          key={i}
          points={line.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#e9b871"
          strokeWidth=".12"
        />
      ))}
    </svg>,
  );
  const canvas = window.document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sketch rendering is unavailable.");
  const url = URL.createObjectURL(
    new Blob([markup], { type: "image/svg+xml" }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.drawImage(image, 0, 0);
  } finally {
    URL.revokeObjectURL(url);
  }
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Sketch encoding failed."))),
      "image/png",
    ),
  );
  return new File([blob], "sketch.png", { type: "image/png" });
}

/** Private controller rendering. Only the returned opaque visible pixels may be
 * copied to the Party Display; source SVG and artwork never leave this document. */
export async function rasterVisibleMap(
  presentation: import('../../domain/map-artwork').MapPresentation,
  artwork?: Blob,
): Promise<HTMLCanvasElement> {
  const { validateMapPresentation } = await import('../../domain/map-artwork');
  const accepted = validateMapPresentation(presentation);
  if (!accepted.version || !accepted.mask) throw new Error('Map presentation unavailable.');
  const source = accepted.version, map = source.document;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const url = artwork ? await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Artwork read failed.')); reader.readAsDataURL(artwork);
  }) : undefined;
  const cellPixels = Math.max(1, Math.min(64, Math.floor(4096 / Math.max(map.columns, map.rows))));
  const width = map.columns * cellPixels, height = map.rows * cellPixels;
  const markup = renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${map.columns} ${map.rows}`}>
    <MapDrawing document={map} background={url && source.background ? { url, placement: source.background } : undefined}/>
  </svg>);
  const object = URL.createObjectURL(new Blob([markup], { type:'image/svg+xml' }));
  const canvas = window.document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Map rendering unavailable.');
  try {
    const image = new Image(); image.src = object; await image.decode();
    context.fillStyle = '#000'; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
    // Clip the visible scene by copying whole cells onto an independently black
    // frame. Integer pixel partitions prevent antialiased hidden-cell leaks.
    const visible = window.document.createElement('canvas'); visible.width = width; visible.height = height;
    const output = visible.getContext('2d')!; output.fillStyle = '#000'; output.fillRect(0, 0, width, height);
    for (const cell of accepted.mask.uncovered) {
      const x = cell % map.columns, y = Math.floor(cell / map.columns);
      const left = Math.floor(x * width / map.columns), top = Math.floor(y * height / map.rows);
      const right = Math.floor((x + 1) * width / map.columns), bottom = Math.floor((y + 1) * height / map.rows);
      output.drawImage(canvas, left, top, right-left, bottom-top, left, top, right-left, bottom-top);
    }
    canvas.width = canvas.height = 0;
    return visible;
  } finally { canvas.width = canvas.height = 0; URL.revokeObjectURL(object); }
}

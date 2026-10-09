import { useEffect, useRef, useState } from "react";
import type { PartyContent } from "../../domain/party-content";
import type {
  MapArtworkVersion,
  MapVersionAttachment,
  MapWorkspace,
} from "../../domain/map-artwork";
import type {
  MapGenerationIntent,
  MapGenerationJob,
} from "../../domain/map-generation";
import {
  closeMapOutline,
  createGridMapEditor,
  fitMapBackground,
  placeMapBackground,
  viewPointToGrid,
  type GridPoint,
  type MapBackgroundPlacement,
} from "../../domain/grid-map";
import { MapDrawing, rasterMapReference } from "./MapScene";
import { RegionSelection } from "./RegionSelection";
import { assembleMapGeneration } from "./map-region-assembly";
import type { MapAreaSelection } from "../../domain/map-region";
import { GridMapEditor } from "./GridMapEditor";
import "./grid-map.css";
const empty: MapWorkspace = {
  families: [],
  versions: [],
  presentation: { revision: 0, version: null, mask: null },
};
function useImage(
  content: PartyContent,
  version: MapArtworkVersion | undefined,
  source: "artwork" | "reference" = "artwork",
) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let current = true,
      owned = "";
    setUrl("");
    setError("");
    if (version?.[source === "artwork" ? "background" : "reference"])
      void content
        .openMapVersion(version.id, source)
        .then((blob) => {
          if (current) {
            owned = URL.createObjectURL(blob);
            setUrl(owned);
          }
        })
        .catch((e) => {
          if (current) setError(e.message);
        });
    return () => {
      current = false;
      if (owned) URL.revokeObjectURL(owned);
    };
  }, [content, version?.id, source]);
  return { url, error };
}
/** Creation/inspection is private; presentation requires a separate explicit intent. */
export function GridMapWorkshop({
  active,
  content,
  mapId,
  onBack,
  onLibrary,
  onUseMap,
}: {
  active: boolean;
  content: PartyContent;
  mapId?: string;
  onBack: () => void;
  onLibrary: () => void;
  onUseMap?: (version: MapArtworkVersion) => void;
}) {
  const [workspace, setWorkspace] = useState(empty),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"invent" | "sketch">("invent"),
    [drawing, setDrawing] = useState(false),
    [title, setTitle] = useState("Untitled Grid Map"),
    [brief, setBrief] = useState(""),
    [appearance, setAppearance] = useState("");
  const [columns, setColumns] = useState("20"),
    [rows, setRows] = useState("14"),
    [feet, setFeet] = useState("5"),
    [outlines, setOutlines] = useState<readonly (readonly GridPoint[])[]>([]),
    [reference, setReference] = useState<File>(),
    [referenceChoice, setReferenceChoice] = useState("");
  const [selection, setSelection] = useState<MapAreaSelection>(), [areaInstructions, setAreaInstructions] = useState("");
  const assemblyAbort = useRef<AbortController | undefined>(undefined), assemblyJobId = useRef<string | undefined>(undefined);
  const [family, setFamily] = useState<string>(),
    [selectedId, setSelectedId] = useState(""),
    [compareId, setCompareId] = useState(""),
    [overlay, setOverlay] = useState(false),
    [job, setJob] = useState<MapGenerationJob>(),
    [placement, setPlacement] = useState<MapBackgroundPlacement>();
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const generation = useRef(0),
    gesture = useRef<GridPoint[]>([]),
    lastIntent = useRef<MapGenerationIntent | undefined>(undefined),
    pendingUpload = useRef<MapVersionAttachment | undefined>(undefined);
  const workCount = useRef(0);
  const jobIntents = useRef(new Map<string, MapGenerationIntent>());
  const selected = workspace.versions.find((v) => v.id === selectedId),
    comparison = workspace.versions.find((v) => v.id === compareId),
    image = useImage(content, selected),
    other = useImage(content, comparison),
    referenceVersion = selected?.reference
      ? selected
      : workspace.versions.find((v) => v.id === selected?.parentVersionId),
    referenceSource = referenceVersion?.reference ? "reference" : "artwork",
    savedReference = useImage(content, referenceVersion, referenceSource);
  const versions = workspace.versions.filter(
    (v) => v.familyId === (family ?? mapId),
  );
  useEffect(() => {
    setWorkspace(empty);
    setJob(undefined);
    setFamily(mapId);
    setSelectedId("");
    setBusy(false);
    workCount.current = 0;
    lastIntent.current = undefined;
    jobIntents.current.clear();
    pendingUpload.current = undefined;
    const scope = ++generation.current;
    const stop = content.observeMapWorkspace((snapshot) => {
      if (scope !== generation.current) return;
      if ("error" in snapshot) {
        setError(snapshot.error);
        if (/access|sign in|Dungeon Master/i.test(snapshot.error)) {
          assemblyAbort.current?.abort();
          setWorkspace(empty);
        }
      } else {
        setWorkspace(snapshot.workspace);
      }
    });
    return () => {
      generation.current++;
      assemblyAbort.current?.abort();
      stop();
    };
  }, [content]);
  useEffect(() => {
    if (mapId) {
      setFamily(mapId);
      setSelectedId("");
    }
  }, [mapId]);
  useEffect(() => {
    if (!selectedId && versions.length)
      setSelectedId(versions[versions.length - 1].id);
  }, [versions, selectedId]);
  useEffect(() => {
    setPlacement(selected?.background ?? undefined);
    setSelection(undefined);
  }, [selected?.id]);
  useEffect(() => {
    if(selected?.origin !== "generated" && selected?.origin !== "revised") return;
    lastIntent.current = undefined;
    let current = true;
    const scope = generation.current;
    const unavailable = () => {
      if(current && scope === generation.current) setError("Original creation instructions could not be restored. Refresh progress on this saved version's creation job to retry.");
    };
    void content.changeMapGeneration({ kind: "read", requestId: selected.requestId }).then(response => {
      if(!current || scope !== generation.current) return;
      if(response.ok && rememberOriginal(response.job, selected.id)) setJob(response.job);
      else unavailable();
    }).catch(unavailable);
    return () => { current = false; };
  }, [selected?.id, content]);
  useEffect(
    () => () => {
      generation.current++;
      assemblyAbort.current?.abort();
    },
    [],
  );
  const draftDocument = (() => {
    try {
      return createGridMapEditor({
        columns: Number(columns),
        rows: Number(rows),
        feetPerSquare: Number(feet),
      }).snapshot().document;
    } catch {
      return createGridMapEditor().snapshot().document;
    }
  })();
  const document = selected?.document ?? draftDocument;
  const instructions = () =>
    [
      brief,
      appearance,
      "Orthographic overhead map. No baked grid, labels or tokens. Include people only when explicitly requested as decoration. Preserve reference layout and entrances.",
    ]
      .filter(Boolean)
      .join("\n");
  const expected = (id: string) =>
    workspace.families.find((f) => f.id === id)?.version ?? 0;
  function assertCurrent(scope: number) {
    if (scope !== generation.current) throw new Error("Stale workshop action.");
  }
  async function perform(action: (scope: number) => Promise<void>) {
    const scope = generation.current;
    workCount.current++;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action(scope);
    } catch (e) {
      if (scope === generation.current)
        setError(
          `${(e as Error).message} Your inputs and saved versions are retained.`,
        );
    } finally {
      if (scope === generation.current) {
        workCount.current--;
        setBusy(workCount.current > 0);
      }
    }
  }
  async function refresh(scope: number) {
    const next = await content.readMapWorkspace();
    assertCurrent(scope);
    setWorkspace(next);
    return next;
  }
  function rememberOriginal(job: MapGenerationJob, inspectionId: string) {
    const version = workspace.versions.find(v => v.id === inspectionId), intent = job.originalIntent;
    if(inspectionId !== selectedIdRef.current || !version || job.id !== version.requestId || !intent || intent.requestId !== job.id || intent.familyId !== version.familyId || (intent.parentVersionId ?? null) !== version.parentVersionId) return false;
    lastIntent.current = intent;
    jobIntents.current.set(job.id, intent);
    return true;
  }
  async function result(intent: MapGenerationIntent, scope: number) {
    assertCurrent(scope);
    lastIntent.current = intent;
    jobIntents.current.set(intent.requestId, intent);
    const response = await content.changeMapGeneration({
      kind: "submit",
      intent,
    });
    assertCurrent(scope);
    if (!response.ok) throw new Error(response.code);
    setJob(response.job);
    await refresh(scope);
    if (response.job.state === "failed")
      throw new Error(
        `Creation failed. ${response.job.code ?? "Refresh progress and retry."}`,
      );
  }
  async function referenceFile(savedDrawing?: MapArtworkVersion) {
    if (reference && !savedDrawing) return reference;
    if (!outlines.length && !savedDrawing) return undefined;
    return rasterMapReference(
      savedDrawing?.document ?? draftDocument,
      savedDrawing ? [] : outlines,
    );
  }
  async function create(another = false) {
    await perform(async (scope) => {
      if (another && lastIntent.current) {
        const base = lastIntent.current;
        await result(
          {
            ...base,
            requestId: crypto.randomUUID(),
            expectedVersion: expected(base.familyId),
          },
          scope,
        );
        return;
      }
      if (!brief.trim())
        throw new Error("Describe the map before creating it.");
      const grid = createGridMapEditor({
        columns: Number(columns),
        rows: Number(rows),
        feetPerSquare: Number(feet),
      }).snapshot().document;
      let id = family ?? crypto.randomUUID(),
        parent: MapArtworkVersion | undefined;
      if (mode === "sketch") {
        parent = workspace.versions.find((v) => v.id === referenceChoice);
        if (parent) {
          id = parent.familyId;
          if (!parent.background && !parent.reference) {
            const file = await referenceFile(parent);
            assertCurrent(scope);
            const saved = await content.attachMapVersion({
              familyId: id,
              parentVersionId: parent.id,
              expectedVersion: expected(id),
              requestId: crypto.randomUUID(),
              title,
              reference: file,
              instructions: instructions(),
            });
            assertCurrent(scope);
            if (!saved.ok)
              throw new Error(
                "This drawing changed elsewhere. Reload before creating.",
              );
            parent = saved.version;
            await refresh(scope);
          }
        } else {
          const file = await referenceFile();
          assertCurrent(scope);
          if (!file)
            throw new Error(
              "Draw an outline, upload a reference or choose a saved drawing.",
            );
          const attachment = {
            familyId: id,
            expectedVersion: expected(id),
            requestId: crypto.randomUUID(),
            title,
            document: grid,
            reference: file,
            instructions: instructions(),
          };
          const saved = await content.attachMapVersion(attachment);
          assertCurrent(scope);
          if (!saved.ok)
            throw new Error(
              "This map changed elsewhere. Reload before creating.",
            );
          parent = saved.version;
          await refresh(scope);
        }
      }
      setFamily(id);
      await result(
        {
          requestId: crypto.randomUUID(),
          familyId: id,
          expectedVersion:
            mode === "sketch"
              ? (await refresh(scope)).families.find((f) => f.id === id)!
                  .version
              : expected(id),
          parentVersionId: parent?.id,
          kind: mode === "sketch" ? "reference" : "generate",
          source: parent
            ? parent.reference
              ? "reference"
              : "artwork"
            : undefined,
          title,
          instructions: instructions(),
          document: parent ? undefined : grid,
        },
        scope,
      );
    });
  }
  async function reviseArea() {
    await perform(async scope => {
      if(!selected?.background || !selection) throw new Error("Select an area on saved artwork first.");
      if(!areaInstructions.trim()) throw new Error("Describe the selected-area change first.");
      if(selected.background.mime !== "image/png" || selected.background.pixelWidth !== 1024 || selected.background.pixelHeight !== 1024) throw new Error("AI revisions require 1024 × 1024 RGB/RGBA8 non-interlaced PNG up to 20 MiB. Manual uploads remain available.");
      await result({ requestId: crypto.randomUUID(), familyId: selected.familyId, parentVersionId: selected.id, expectedVersion: expected(selected.familyId), kind: "revise", source: "artwork", region: selection.pixels, title: selected.title, instructions: areaInstructions.trim() }, scope);
    });
  }
  async function reconcile(id: string, kind: "read" | "cancel" = "read") {
    if(kind === "cancel" && assemblyJobId.current === id) assemblyAbort.current?.abort();
    await perform(async (scope) => {
      const response = await content.changeMapGeneration({
        kind,
        requestId: id,
      });
      assertCurrent(scope);
      if (!response.ok) throw new Error(response.code);
      setJob(response.job);
      rememberOriginal(response.job, selectedId);
      await refresh(scope);
      if (response.job.state === "failed")
        throw new Error(
          `Creation failed. ${response.job.code ?? "Refresh progress and retry."}`,
        );
    });
  }
  async function retryCreation(requestId: string) {
    await perform(async (scope) => {
      const response = await content.changeMapGeneration({
        kind: "read",
        requestId,
      });
      assertCurrent(scope);
      if (!response.ok) throw new Error(response.code);
      setJob(response.job);
      const current = await refresh(scope);
      if (!["failed", "cancelled"].includes(response.job.state))
        throw new Error(
          "Refresh progress before retrying. This creation has not failed or been cancelled.",
        );
      const base =
        response.job.originalIntent ?? jobIntents.current.get(requestId);
      if (
        !base ||
        base.requestId !== requestId ||
        base.familyId !== response.job.familyId
      )
        throw new Error(
          "The original creation instructions are unavailable. Your saved work is retained.",
        );
      await result(
        {
          ...base,
          requestId: crypto.randomUUID(),
          expectedVersion:
            current.families.find((f) => f.id === base.familyId)?.version ?? 0,
        },
        scope,
      );
    });
  }
  async function accept(id: string) {
    await perform(async (scope) => {
      assemblyAbort.current?.abort();
      const controller = new AbortController();
      assemblyAbort.current = controller;
      assemblyJobId.current = id;
      const input = await content.openMapGenerationInput(id);
      assertCurrent(scope);
      const output = await assembleMapGeneration(input, controller.signal);
      assertCurrent(scope);
      const response = await content.changeMapGeneration({
        kind: "output",
        requestId: id,
        file: output,
      });
      if (scope !== generation.current) return;
      if (!response.ok) throw new Error(response.code);
      setJob(response.job);
      const next = await refresh(scope);
      if (response.job.state !== "completed" || !response.job.versionId)
        throw new Error(
          `Artwork was not saved. ${response.job.code ?? response.job.state}`,
        );
      const version = next.versions.find(
        (v) => v.id === response.job.versionId,
      );
      if (!version)
        throw new Error(
          "Saved artwork could not be confirmed. Refresh saved versions to reconcile your Library.",
        );
      setFamily(version.familyId);
      setSelectedId(version.id);
      if(version.origin === "revised" && version.parentVersionId) setCompareId(version.parentVersionId);
      setMessage("Saved privately. Compare alignment before use.");
    });
  }
  async function upload(file?: File, alignment = false) {
    if (!file && !alignment) return;
    await perform(async (scope) => {
      let artwork = file;
      if (alignment) {
        if (!selected?.background || !placement)
          throw new Error("Choose saved artwork.");
        artwork = new File(
          [await content.openMapVersion(selected.id)],
          "aligned-map",
          { type: selected.background.mime },
        );
        assertCurrent(scope);
      }
      const id = selected?.familyId ?? family ?? crypto.randomUUID();
      pendingUpload.current ??= {
        familyId: id,
        parentVersionId: selected?.id,
        expectedVersion: expected(id),
        requestId: crypto.randomUUID(),
        title,
        document: selected
          ? undefined
          : createGridMapEditor({
              columns: Number(columns),
              rows: Number(rows),
              feetPerSquare: Number(feet),
            }).snapshot().document,
        artwork,
        placement:
          alignment && placement
            ? {
                x: placement.x,
                y: placement.y,
                width: placement.width,
                height: placement.height,
              }
            : undefined,
        instructions: instructions(),
      };
      const response = await content.attachMapVersion(pendingUpload.current);
      assertCurrent(scope);
      if (!response.ok) {
        pendingUpload.current = undefined;
        await refresh(scope);
        throw new Error(
          "This map changed elsewhere. Retry from its accepted state.",
        );
      }
      pendingUpload.current = undefined;
      setFamily(id);
      await refresh(scope);
      setSelectedId(response.version.id);
      setMessage("Artwork saved privately.");
    });
  }
  if (drawing)
    return (
      <GridMapEditor
        active={active}
        content={content}
        mapId={workspace.families.some((f) => f.id === family) ? family : mapId}
        loadRevision={0}
        onBack={() => setDrawing(false)}
        onLibrary={onLibrary}
      />
    );
  return (
    <main className="grid-map-editor map-workshop" hidden={!active}>
      <button onClick={onBack}>Back to Party</button>{" "}
      <button onClick={onLibrary}>Open Dungeon Master Library</button>
      <h1>Map creation workshop</h1>
      <p>
        Private DM artwork. Creating, uploading and inspecting leave the Party
        Display unchanged.
      </p>
      <button onClick={() => setDrawing(true)}>Open drawing tools</button>
      <p>
        Drawing tools open the latest saved drawing in the chosen map family.
      </p>
      <fieldset disabled={busy} className="map-controls">
        <h2>Create a map</h2>
        <div className="map-toolbar">
          <button
            aria-pressed={mode === "invent"}
            onClick={() => setMode("invent")}
          >
            Invent a map
          </button>
          <button
            aria-pressed={mode === "sketch"}
            onClick={() => setMode("sketch")}
          >
            Use my sketch
          </button>
          <button
            onClick={() => {
              setFamily(undefined);
              setSelectedId("");
              setCompareId("");
              lastIntent.current = undefined;
              setOutlines([]);
              setReference(undefined);
              setReferenceChoice("");
              setJob(undefined);
            }}
          >
            New map
          </button>
        </div>
        <label>
          Map title
          <input
            value={title}
            maxLength={160}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="map-fields">
          {[
            ["Columns", columns, setColumns, 80],
            ["Rows", rows, setRows, 80],
            ["Game feet per square", feet, setFeet, 100],
          ].map(([label, value, change, max]) => (
            <label key={String(label)}>
              {String(label)}
              <input
                type="number"
                min={label === "Game feet per square" ? 1 : 2}
                max={Number(max)}
                value={String(value)}
                onChange={(e) =>
                  (change as (s: string) => void)(e.target.value)
                }
              />
            </label>
          ))}
        </div>
        <label>
          Map description
          <textarea
            value={brief}
            maxLength={7000}
            onChange={(e) => setBrief(e.target.value)}
          />
        </label>
        <label>
          Appearance instructions
          <textarea
            value={appearance}
            maxLength={800}
            onChange={(e) => setAppearance(e.target.value)}
          />
        </label>
        {mode === "sketch" && (
          <section>
            <p>
              Draw closed room outlines. Drag with a pointer or touch; each
              release closes one outline. Upload a reference for complex
              layouts. AI references must be 1024 square RGB/RGBA8
              non-interlaced PNG, up to 20 MiB.
            </p>
            <button
              onClick={() => setOutlines((value) => value.slice(0, -1))}
              disabled={!outlines.length}
            >
              Undo outline
            </button>{" "}
            <button onClick={() => setOutlines([])} disabled={!outlines.length}>
              Clear sketch
            </button>
            <div className="map-scroll">
              <svg
                className="map-canvas"
                role="img"
                aria-label="Sketch drawing surface"
                viewBox={`0 0 ${draftDocument.columns} ${draftDocument.rows}`}
                width={draftDocument.columns * 24}
                height={draftDocument.rows * 24}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  gesture.current = [];
                  const rect = e.currentTarget.getBoundingClientRect(),
                    p = viewPointToGrid(
                      draftDocument,
                      {
                        x:
                          ((e.clientX - rect.left) * draftDocument.columns) /
                          rect.width,
                        y:
                          ((e.clientY - rect.top) * draftDocument.rows) /
                          rect.height,
                      },
                      1,
                    );
                  if (p) gesture.current.push(p);
                }}
                onPointerMove={(e) => {
                  if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                  const rect = e.currentTarget.getBoundingClientRect(),
                    p = viewPointToGrid(
                      draftDocument,
                      {
                        x:
                          ((e.clientX - rect.left) * draftDocument.columns) /
                          rect.width,
                        y:
                          ((e.clientY - rect.top) * draftDocument.rows) /
                          rect.height,
                      },
                      1,
                    );
                  if (p) gesture.current.push(p);
                }}
                onPointerUp={() => {
                  try {
                    const outline = closeMapOutline(
                      draftDocument,
                      gesture.current,
                    );
                    setOutlines((value) => [...value, outline]);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                  gesture.current = [];
                }}
                onPointerCancel={() => {
                  gesture.current = [];
                }}
              >
                <MapDrawing document={draftDocument} />
                {outlines.map((line, i) => (
                  <polyline
                    key={i}
                    points={line.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="#e9b871"
                    strokeWidth=".12"
                  />
                ))}
              </svg>
            </div>
            <label>
              Uploaded reference
              <input
                type="file"
                accept="image/png"
                onChange={(e) => {
                  setReference(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {reference && <p>{reference.name}</p>}
            <p>
              Saved drawing references retain their original grid dimensions.
            </p>
            <label>
              Existing saved map drawing
              <select
                value={referenceChoice}
                onChange={(e) => setReferenceChoice(e.target.value)}
              >
                <option value="">Use sketch or uploaded reference</option>
                {workspace.versions.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.title} · {v.origin}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}
        <div className="map-toolbar">
          <button onClick={() => void create()}>Create map</button>
          <button
            disabled={!lastIntent.current}
            onClick={() => void create(true)}
          >
            Try another version
          </button>
          <label>
            Upload finished artwork
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                pendingUpload.current = undefined;
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p>
          Finished artwork: PNG, JPEG or WebP, up to 20 MiB and 16 million
          pixels. Fits proportionally; letterboxing may remain.
        </p>
        {pendingUpload.current && (
          <button onClick={() => void upload(pendingUpload.current?.artwork)}>
            Retry artwork save
          </button>
        )}
      </fieldset>
      <p role="status">{busy ? "Working…" : message}</p>
      {error && <p role="alert">{error}</p>}
      {image.error && <p role="alert">{image.error}</p>}
      <section aria-label="Creation jobs">
        <h2>Creation jobs</h2>
        <p>
          Cancellation prevents attachment of late artwork; provider billing may
          still apply. Refresh progress to reconcile uncertain work.
        </p>
        {[
          ...(workspace.jobs ?? []),
          ...(job && !(workspace.jobs ?? []).some((j) => j.id === job.id)
            ? [job]
            : []),
        ]
          .filter((j) => !family || j.familyId === family)
          .map((j) => (
            <article key={j.id} data-job-id={j.id}>
              <p>
                {j.mode === "fixture"
                  ? "Deterministic provider fixture — no live call"
                  : "Live provider"}{" "}
                · {j.state}
                {j.code && ` · ${j.code}`}
              </p>
              <button disabled={busy} onClick={() => void reconcile(j.id)}>
                Refresh progress
              </button>
              {!["completed", "failed", "cancelled"].includes(j.state) && (
                <button onClick={() => void reconcile(j.id, "cancel")}>
                  Cancel creation
                </button>
              )}
              {j.state === "awaiting-client-output" && (
                <button disabled={busy} onClick={() => void accept(j.id)}>
                  Save completed artwork
                </button>
              )}
              {["failed", "cancelled"].includes(j.state) && (
                <button
                  disabled={busy}
                  onClick={() => void retryCreation(j.id)}
                >
                  Retry creation
                </button>
              )}
            </article>
          ))}
      </section>
      <section aria-label="Map artwork versions">
        <h2>Saved versions</h2>
        <button
          disabled={busy}
          onClick={() =>
            void perform(async (scope) => {
              await refresh(scope);
            })
          }
        >
          Refresh saved versions
        </button>
        <label>
          Map family
          <select
            disabled={busy}
            value={family ?? ""}
            onChange={(e) => {
              setFamily(e.target.value);
              setSelectedId("");
              setCompareId("");
              lastIntent.current = undefined;
            }}
          >
            <option value="">New map</option>
            {workspace.families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
            {[...new Set((workspace.jobs ?? []).map((j) => j.familyId))]
              .filter((id) => !workspace.families.some((f) => f.id === id))
              .map((id) => (
                <option key={id} value={id}>
                  Creation in progress
                </option>
              ))}
          </select>
        </label>
        <div className="map-toolbar">
          {versions.map((v, i) => (
            <button
              disabled={busy}
              key={v.id}
              aria-pressed={selectedId === v.id}
              onClick={() => setSelectedId(v.id)}
            >
              Inspect version {i + 1} · {v.origin}
            </button>
          ))}
        </div>
        {!versions.length && (
          <p>No saved artwork yet. Create a map or upload finished artwork.</p>
        )}
        {selected && (
          <>
            <p>{selected.instructions}</p>
            <p>
              {selected.document.columns} × {selected.document.rows} squares ·{" "}
              {selected.document.feetPerSquare} game feet per square
            </p>
            <label>
              Compare versions
              <select
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
              >
                <option value="">No comparison</option>
                {versions
                  .filter((v) => v.id !== selected.id)
                  .map((v, i) => (
                    <option key={v.id} value={v.id}>
                      {v.title} · {v.origin} · {i + 1}
                    </option>
                  ))}
              </select>
            </label>
            <label className="map-toggle">
              <input
                type="checkbox"
                checked={overlay}
                onChange={(e) => setOverlay(e.target.checked)}
              />
              Compare reference outline and grid
            </label>
            <div className="map-comparison">
              <div className="map-scroll">
                <svg
                  role="img"
                  className="map-inspection"
                  aria-label="Inspected map artwork"
                  viewBox={`0 0 ${document.columns} ${document.rows}`}
                  width={document.columns * 32}
                  height={document.rows * 32}
                >
                  <MapDrawing
                    document={document}
                    background={
                      image.url && placement
                        ? { url: image.url, placement }
                        : undefined
                    }
                  />
                  {overlay &&
                    savedReference.url &&
                    (referenceVersion?.reference ||
                      referenceVersion?.background) && (
                      <image
                        href={savedReference.url}
                        x={
                          (referenceVersion!.reference ??
                            referenceVersion!.background)!.x
                        }
                        y={
                          (referenceVersion!.reference ??
                            referenceVersion!.background)!.y
                        }
                        width={
                          (referenceVersion!.reference ??
                            referenceVersion!.background)!.width
                        }
                        height={
                          (referenceVersion!.reference ??
                            referenceVersion!.background)!.height
                        }
                        opacity=".35"
                      />
                    )}
                </svg>
              </div>
              {comparison && (
                <div className="map-scroll">
                  <svg
                    role="img"
                    className="map-inspection"
                    aria-label="Comparison map artwork"
                    viewBox={`0 0 ${comparison.document.columns} ${comparison.document.rows}`}
                    width={comparison.document.columns * 32}
                    height={comparison.document.rows * 32}
                  >
                    <MapDrawing
                      document={comparison.document}
                      background={
                        other.url && comparison.background
                          ? { url: other.url, placement: comparison.background }
                          : undefined
                      }
                    />
                  </svg>
                  {other.error && <p role="alert">{other.error}</p>}
                </div>
              )}
            </div>
            {placement && (
              <fieldset disabled={busy}>
                <legend>Artwork alignment</legend>
                <p>
                  Save alignment keeps a new private version. Earlier artwork
                  and the display stay intact.
                </p>
                <label>
                  Artwork scale
                  <input
                    type="range"
                    min=".01"
                    max="1"
                    step=".01"
                    value={
                      placement.width /
                      fitMapBackground(
                        document,
                        placement.pixelWidth,
                        placement.pixelHeight,
                      ).width
                    }
                    onChange={(e) =>
                      setPlacement(
                        placeMapBackground(
                          document,
                          placement,
                          Number(e.target.value),
                          placement.x,
                          placement.y,
                        ),
                      )
                    }
                  />
                </label>
                {(["x", "y"] as const).map((axis) => (
                  <label key={axis}>
                    Artwork {axis === "x" ? "horizontal" : "vertical"} position
                    <input
                      type="number"
                      step=".1"
                      min="0"
                      max={axis === "x" ? document.columns : document.rows}
                      value={placement[axis]}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isFinite(value))
                          setPlacement(
                            placeMapBackground(
                              document,
                              placement,
                              placement.width /
                                fitMapBackground(
                                  document,
                                  placement.pixelWidth,
                                  placement.pixelHeight,
                                ).width,
                              axis === "x" ? value : placement.x,
                              axis === "y" ? value : placement.y,
                            ),
                          );
                      }}
                    />
                  </label>
                ))}
                <button
                  onClick={() =>
                    setPlacement(
                      fitMapBackground(
                        document,
                        placement.pixelWidth,
                        placement.pixelHeight,
                      ),
                    )
                  }
                >
                  Reset to fit
                </button>{" "}
                <button onClick={() => void upload(undefined, true)}>
                  Save alignment as version
                </button>
              </fieldset>
            )}
            {selected.background && image.url && (
              <fieldset disabled={busy} className="map-region-controls">
                <legend>Revise a selected area</legend>
                <p>Choose saved artwork as the parent. Unsaved alignment does not affect this selection. Compare the saved result before use; features inside the selected area may move.</p>
                {(selected.background.mime !== "image/png" || selected.background.pixelWidth !== 1024 || selected.background.pixelHeight !== 1024) && <p>AI revisions require 1024 × 1024 RGB/RGBA8 non-interlaced PNG up to 20 MiB. This saved artwork can still be inspected and used.</p>}
                <RegionSelection key={selected.id} document={selected.document} background={{ url: image.url, placement: selected.background }} selection={selection} onSelect={setSelection} disabled={busy || selected.background.mime !== "image/png" || selected.background.pixelWidth !== 1024 || selected.background.pixelHeight !== 1024} />
                <label>Selected-area instructions<textarea value={areaInstructions} maxLength={8000} onChange={e => setAreaInstructions(e.target.value)} /></label>
                <button disabled={!selection || !areaInstructions.trim() || selected.background.mime !== "image/png" || selected.background.pixelWidth !== 1024 || selected.background.pixelHeight !== 1024} onClick={() => void reviseArea()}>Create selected-area revision</button>
                <p>Add a chamber or change scenery within this map extent. Earlier versions and the Party Display stay intact.</p>
              </fieldset>
            )}
            <p>Check grid alignment and scale before use.</p>
            <button
              disabled={!onUseMap || busy}
              onClick={() => onUseMap?.(selected)}
            >
              Use this map
            </button>
            {!onUseMap && <p>Display controls are not available yet.</p>}
          </>
        )}
      </section>
    </main>
  );
}

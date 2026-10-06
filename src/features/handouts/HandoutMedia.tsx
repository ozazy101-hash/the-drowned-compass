import type { RenderTask } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';
import { readHandoutPdf } from '../../domain/party-content';
export function HandoutMedia({ blob, thumbnail = false }: { blob: Blob; thumbnail?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    if (blob.type === 'application/pdf') return;
    const url = URL.createObjectURL(blob); setImage(url); return () => URL.revokeObjectURL(url);
  }, [blob]);
  useEffect(() => {
    if (blob.type !== 'application/pdf') return;
    let cancelled = false;
    let pdf: Awaited<ReturnType<typeof readHandoutPdf>> | undefined;
    let task: RenderTask | undefined;
    void (async () => {
      try {
        pdf = await readHandoutPdf(blob); if (cancelled) return;
        setPages(pdf.numPages);
        const sheet = await pdf.getPage(page); if (cancelled || !canvas.current) return;
        const natural = sheet.getViewport({ scale: 1 });
        const viewport = sheet.getViewport({ scale: Math.min((thumbnail ? 240 : 1200) / natural.width, 2) });
        canvas.current.width = viewport.width; canvas.current.height = viewport.height;
        task = sheet.render({ canvas: canvas.current, viewport }); await task.promise;
      } catch { if (!cancelled) setError('This PDF could not be displayed. Please reopen it.'); }
      finally { await pdf?.dispose(); }
    })();
    return () => { cancelled = true; task?.cancel(); void pdf?.dispose(); };
  }, [blob, page, thumbnail]);
  return <div className="handout-media">
    {error && <p role="alert">{error}</p>}
    {blob.type === 'application/pdf' ? <>
      {!thumbnail && <div className="handout-pages"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous page</button><span>Page {page} of {pages || '…'}</span><button disabled={!pages || page >= pages} onClick={() => setPage(value => value + 1)}>Next page</button></div>}
      <canvas ref={canvas} aria-label={thumbnail ? 'PDF first page preview' : `PDF page ${page}`} />
    </> : image && <img src={image} alt={thumbnail ? 'Handout preview' : 'Handout content'} />}
  </div>;
}

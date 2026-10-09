import type { MapGenerationInput } from '../../domain/map-generation';

/** Browser owns only lossless assembly; the existing generation application verifies and attaches. */
export function assembleMapGeneration(input: MapGenerationInput, signal: AbortSignal): Promise<Blob> {
  if(signal.aborted) return Promise.reject(new Error('Revision assembly cancelled.'));
  if (!input.source) return Promise.resolve(input.candidate);
  const assembly = input.job.assembly;
  if (!assembly || !assembly.requiresSource || assembly.pixelWidth !== 1024 || assembly.pixelHeight !== 1024) return Promise.reject(new Error('Revision output is unavailable. Refresh progress.'));
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Revision assembly cancelled.')); return; }
    const worker = new Worker(new URL('./map-region-worker.ts', import.meta.url), { type: 'module' });
    const dispose = () => { clearTimeout(timeout); signal.removeEventListener('abort', cancel); worker.terminate(); };
    const cancel = () => { dispose(); reject(new Error('Revision assembly cancelled.')); };
    const timeout = setTimeout(() => { dispose(); reject(new Error('Revision assembly timed out. Retry saving the completed artwork.')); }, 30000);
    signal.addEventListener('abort', cancel, { once: true });
    worker.onmessage = (event: MessageEvent<{ output?: Blob; error?: string }>) => { dispose(); if (event.data.output instanceof Blob) resolve(event.data.output); else reject(new Error(event.data.error ?? 'Revision assembly failed.')); };
    worker.onmessageerror = () => { dispose(); reject(new Error('Revision assembly response could not be read.')); };
    worker.onerror = () => { dispose(); reject(new Error('Revision assembly is unavailable.')); };
    try { worker.postMessage({ source: input.source, candidate: input.candidate, region: assembly.region }); }
    catch { dispose(); reject(new Error('Revision assembly could not start.')); }
  });
}

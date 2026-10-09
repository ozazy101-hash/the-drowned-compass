import { assembleRegionPng } from './map-region-png';
import type { MapRegion } from '../../domain/map-region';
self.onmessage = async (event: MessageEvent<{ source: Blob; candidate: Blob; region: MapRegion }>) => {
  try { self.postMessage({ output: await assembleRegionPng(event.data.source, event.data.candidate, event.data.region) }); }
  catch (error) { self.postMessage({ error: (error as Error).message }); }
};

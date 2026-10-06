import type { ContentSnapshot, Handout } from '../domain/party-content';
// One authoritative read at a time; invalidations cancel delivery, not transport.
// RLS-hidden withdrawal events require polling of the complete visible library.
export function contentSubscription(read: () => Promise<Handout[]>, attach: (changed: () => void) => () => void, onChanged: (snapshot: ContentSnapshot) => void): () => void {
  let active=true, reading=false, epoch=0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function refresh() {
    if (!active) return;
    clearTimeout(timer);epoch++;
    if (reading) return;
    reading=true;
    while (active) {
      const request=epoch;
      let snapshot: ContentSnapshot;
      try { snapshot={items:await read()}; } catch(error) { snapshot={error:error instanceof Error?error.message:'The Library could not be refreshed.'}; }
      if (!active) break;
      if (request!==epoch) continue;
      onChanged(snapshot);break;
    }
    reading=false;
    if(active) timer=setTimeout(() => void refresh(),2000);
  }
  const detach=attach(() => void refresh());void refresh();
  return () => { active=false;epoch++;clearTimeout(timer);detach(); };
}

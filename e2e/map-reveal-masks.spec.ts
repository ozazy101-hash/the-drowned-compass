import { test, expect, type Page } from '@playwright/test';
async function harness(page: Page, adapter: 'local' | 'supabase', create: boolean) {
  return page.evaluate(async ({ adapter, create, url, key, dmJwt, prefix }) => {
    let content;
    if (adapter === 'local') {
      const data = (await import('/the-drowned-compass/src/data/in-memory-party-data.ts')).createInMemoryPartyData();
      await data.signIn('dungeon-master', 'dm-password'); content = data.content;
    } else {
      const sdk = await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');
      content = (await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(sdk.createClient(url, key, { accessToken: async () => dmJwt }));
    }
    const domain = await import('/the-drowned-compass/src/domain/map-reveal-mask.ts');
    if (create) {
      const document = (await import('/the-drowned-compass/src/domain/grid-map.ts')).createGridMapEditor({ columns: 8, rows: 6 }).snapshot().document;
      const versionId = crypto.randomUUID(), familyId = crypto.randomUUID();
      const saved = await content.attachMapVersion({ familyId, requestId: versionId, expectedVersion: 0, title: prefix + ' mask ' + adapter, document });
      if (!saved.ok) throw new Error('Fixture creation conflict');
      const chosen = await content.chooseMapPresentation({ versionId, expectedRevision: (await content.readMapWorkspace()).presentation.revision, requestId: crypto.randomUUID(), newMap: true });
      if (!chosen.ok) throw new Error('Fixture choice conflict');
    }
    const controller = domain.createMapRevealMaskDraft((await content.readMapWorkspace()).presentation);
    document.body.innerHTML = `<main style="font:16px system-ui;background:#121b24;color:#fff;padding:16px;max-width:400px"><h1>Ticket09 verification harness</h1><p>Private mask controls using the accepted content seam.</p><label>Brush <select aria-label="Brush"><option>1</option><option>2</option><option>4</option></select></label> <label>Mode <select aria-label="Mode"><option>uncover</option><option>hide</option></select></label><p><canvas aria-label="Map Grid" width="240" height="180" style="touch-action:none;background:#000"></canvas></p><button>Save</button> <button>Undo</button> <button>Redo</button> <button>Retry</button> <button>Discard</button><p role="status" aria-label="Save status"></p><output aria-label="Accepted cells"></output><p><output aria-label="Draft cells"></output></p></main>`;
    const canvas = document.querySelector('canvas')!, ctx = canvas.getContext('2d')!;
    function render() {
      const state = controller.snapshot();
      document.querySelector('[role=status]')!.textContent = state.status + (state.error ? ': ' + state.error : '');
      document.querySelector('[aria-label="Accepted cells"]')!.textContent = String(state.accepted.mask?.uncovered.length ?? 0);
      document.querySelector('[aria-label="Draft cells"]')!.textContent = String(state.uncovered.length);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 240, 180);
      ctx.fillStyle = '#52b9ab'; for (const cell of state.uncovered) ctx.fillRect(cell % 8 * 30 + 1, Math.floor(cell / 8) * 30 + 1, 28, 28);
    }
    function sample(event: PointerEvent) { const rect = canvas.getBoundingClientRect(); controller.command({ type: 'sample', point: { x: (event.clientX - rect.left) / rect.width * 8, y: (event.clientY - rect.top) / rect.height * 6 } }); render(); }
    canvas.onpointerdown = event => { canvas.setPointerCapture(event.pointerId); controller.command({ type: 'begin', mode: (document.querySelector('[aria-label=Mode]') as HTMLSelectElement).value as 'uncover' | 'hide', brush: Number((document.querySelector('[aria-label=Brush]') as HTMLSelectElement).value) as 1 | 2 | 4 }); sample(event); };
    canvas.onpointermove = event => { if (controller.snapshot().strokeActive) sample(event); };
    canvas.onpointerup = () => { controller.command({ type: 'finish' }); render(); };
    canvas.onpointercancel = () => { controller.command({ type: 'cancel' }); render(); };
    for (const button of document.querySelectorAll('button')) button.onclick = async () => {
      if (button.textContent === 'Save') {
        const requestId = crypto.randomUUID(), intent = controller.prepareCommit(requestId); render();
        try { controller.receive(requestId, await content.commitMapRevealMask(intent)); }
        catch { controller.receive(requestId, { ok: false, reason: 'error', error: 'Save unavailable; draft retained.' }); }
      } else controller.command({ type: button.textContent!.toLowerCase() as 'undo' | 'redo' | 'retry' | 'discard' });
      render();
    };
    (window as any).maskHarness = { content, controller, domain, render };
    render(); return controller.snapshot().accepted;
  }, { adapter, create, url: process.env.MAP_LIVE_URL ?? '', key: process.env.MAP_LIVE_KEY ?? '', dmJwt: process.env.MAP_LIVE_DM_JWT ?? '', prefix: process.env.MAP_FIXTURE_PREFIX ?? 'Ticket09' });
}
for (const adapter of ['local', 'supabase'] as const) {
  test(`${adapter}: pointer/touch stroke undo, accepted reload, family restore, concurrent conflict and recoverable save`, async ({ page, isMobile }) => {
    test.skip(adapter === 'supabase' && !process.env.MAP_LIVE_URL, 'Requires genuine local Supabase fixture');
    await page.goto('./'); await page.bringToFront(); const initial = await harness(page, adapter, true);
    let writes = 0, ai = 0;
    page.on('request', request => { if (request.url().includes('/rpc/commit_map_reveal_mask')) writes++; if (/generation|openai|imagegen/.test(request.url())) ai++; });
    await page.getByLabel('Brush', { exact: true }).selectOption('2');
    const bounds = await page.getByLabel('Map Grid').boundingBox(); if (!bounds) throw new Error('Missing grid');
    if (isMobile) await page.touchscreen.tap(bounds.x + 45, bounds.y + 45);
    else { await page.mouse.move(bounds.x + 45, bounds.y + 45); await page.mouse.down(); await page.mouse.move(bounds.x + 135, bounds.y + 45, { steps: 8 }); await page.mouse.up(); }
    const draftCount = Number(await page.getByLabel('Draft cells').textContent()); expect(draftCount).toBeGreaterThanOrEqual(4);
    expect(writes).toBe(0); await expect(page.getByLabel('Accepted cells')).toHaveText('0');
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(page.getByLabel('Draft cells')).toHaveText('0');
    await page.getByRole('button', { name: 'Redo', exact: true }).click(); await expect(page.getByLabel('Draft cells')).toHaveText(String(draftCount));
    await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByRole('status', { name: 'Save status' })).toHaveText('accepted');
    expect(writes).toBe(adapter === 'supabase' ? 1 : 0); expect(ai).toBe(0);
    await page.reload(); await harness(page, adapter, false); await expect(page.getByLabel('Accepted cells')).toHaveText(String(draftCount));
    const checks = await page.evaluate(async ({ prefix }) => {
      const { content, controller, domain } = (window as any).maskHarness;
      const a = controller.snapshot().accepted;
      const doc = a.version.document, bId = crypto.randomUUID(), bVersion = crypto.randomUUID();
      await content.attachMapVersion({ familyId: bId, requestId: bVersion, expectedVersion: 0, title: prefix + ' mask family B', document: doc });
      const b = await content.chooseMapPresentation({ versionId: bVersion, expectedRevision: a.revision, requestId: crypto.randomUUID(), newMap: true });
      const restored = await content.chooseMapPresentation({ versionId: a.version.id, expectedRevision: b.presentation.revision, requestId: crypto.randomUUID(), newMap: true });
      const first = domain.createMapRevealMaskDraft(restored.presentation), second = domain.createMapRevealMaskDraft(restored.presentation);
      for (const [draft, x] of [[first, 0], [second, 7]] as const) { draft.command({ type: 'begin', mode: 'uncover', brush: 1 }); draft.command({ type: 'sample', point: { x, y: 5 } }); draft.command({ type: 'finish' }); }
      const i1 = first.prepareCommit(crypto.randomUUID()), i2 = second.prepareCommit(crypto.randomUUID());
      const observed = new Promise<boolean>(resolve => { let stop = () => {}; const timer = setTimeout(() => { stop(); resolve(false); }, 5000); stop = content.observeMapWorkspace(snapshot => { if ('workspace' in snapshot && snapshot.workspace.presentation.revision === restored.presentation.revision + 1) { clearTimeout(timer); stop(); resolve(true); } }); });
      const results = await Promise.all([content.commitMapRevealMask(i1), content.commitMapRevealMask(i2)]);
      results.forEach((result, index) => [first, second][index].receive([i1, i2][index].requestId, result));
      const winner = results.find(result => result.ok), loser = results.find(result => !result.ok);
      const winIntent = winner === results[0] ? i1 : i2;
      const exactRetry = await content.commitMapRevealMask({ ...winIntent, uncovered: [...winIntent.uncovered].reverse(), geometry: { background: winIntent.geometry.background, document: { edges: winIntent.geometry.document.edges, terrain: winIntent.geometry.document.terrain, feetPerSquare: winIntent.geometry.document.feetPerSquare, rows: winIntent.geometry.document.rows, columns: winIntent.geometry.document.columns } } });
      let crossDenied = false; try { await content.chooseMapPresentation({ versionId: a.version.id, requestId: winIntent.requestId, expectedRevision: winIntent.expectedRevision }); } catch { crossDenied = true; }
      let reuseDenied = false; try { await content.commitMapRevealMask({ ...(winner === results[0] ? i1 : i2), uncovered: [] }); } catch { reuseDenied = true; }
      const workspace = await content.readMapWorkspace();
      return { observed: await observed, hiddenB: b.presentation.mask.uncovered.length === 0, restored: JSON.stringify(restored.presentation.mask) === JSON.stringify(a.mask), winner: !!winner, conflict: loser?.reason === 'conflict', revision: workspace.presentation.revision === restored.presentation.revision + 1, retry: exactRetry.ok && exactRetry.presentation.revision === winner.presentation.revision, reuseDenied, crossDenied, recoverable: [first, second].some(draft => draft.snapshot().status === 'conflict' && draft.snapshot().uncovered.length > 0) };
    }, { prefix: process.env.MAP_FIXTURE_PREFIX ?? 'Ticket09' });
    expect(checks).toEqual({ observed: true, hiddenB: true, restored: true, winner: true, conflict: true, revision: true, retry: true, reuseDenied: true, crossDenied: true, recoverable: true });
    await page.reload(); await harness(page, adapter, false);
    const prior = await page.getByLabel('Accepted cells').textContent();
    await page.getByLabel('Brush', { exact: true }).selectOption('1'); await page.getByLabel('Mode', { exact: true }).selectOption('hide');
    const nextBounds = await page.getByLabel('Map Grid').boundingBox(); if (!nextBounds) throw new Error('Missing grid');
    if (isMobile) await page.touchscreen.tap(nextBounds.x + 45, nextBounds.y + 45); else await page.mouse.click(nextBounds.x + 45, nextBounds.y + 45);
    if (adapter === 'supabase') await page.route('**/rest/v1/rpc/commit_map_reveal_mask', route => route.abort('failed'));
    else await page.evaluate(() => { (window as any).maskHarness.content.commitMapRevealMask = async () => { throw new Error('Owned save failure'); }; });
    await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByRole('status', { name: 'Save status' })).toContainText('error');
    await expect(page.getByLabel('Accepted cells')).toHaveText(prior!);
    expect(Number(await page.getByLabel('Draft cells').textContent())).toBe(Number(prior) - 1);
    await page.screenshot({ path: test.info().outputPath('recoverable-mask.png'), fullPage: true });
    expect(initial.mask?.uncovered).toEqual([]);
  });
}
test('supabase: known mask/receipt reads and commit remain DM-only for player and anonymous sessions', async ({ page }) => {
  test.skip(!process.env.MAP_LIVE_URL, 'Requires genuine local Supabase fixture');
  await page.goto('./'); const current = await harness(page, 'supabase', true);
  await page.evaluate(async () => { const { content, controller } = (window as any).maskHarness; await content.commitMapRevealMask(controller.prepareCommit(crypto.randomUUID())); });
  const result = await page.evaluate(async ({ url, key, playerJwt, current }) => {
    const sdk = await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');
    const domain = await import('/the-drowned-compass/src/domain/map-reveal-mask.ts');
    const draft = domain.createMapRevealMaskDraft(current), intent = draft.prepareCommit(crypto.randomUUID());
    const checks = [];
    for (const jwt of [playerJwt, key]) {
      const client = sdk.createClient(url, key, { accessToken: async () => jwt });
      const content = (await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(client);
      const rows = await client.from('party_map_reveal_masks').select('*').eq('family_id', current.version.familyId);
      const receipts = await client.from('party_map_presentation_requests').select('*');
      let denied = false; try { await content.commitMapRevealMask(intent); } catch { denied = true; }
      let workspaceDenied = false; try { await content.readMapWorkspace(); } catch { workspaceDenied = true; }
      checks.push({ rowsHidden: !!rows.error || rows.data.length === 0, receiptsHidden: !!receipts.error || receipts.data.length === 0, denied, workspaceDenied });
    }
    return checks;
  }, { url: process.env.MAP_LIVE_URL!, key: process.env.MAP_LIVE_KEY!, playerJwt: process.env.MAP_LIVE_PLAYER_JWT!, current });
  expect(result).toEqual(Array(2).fill({ rowsHidden: true, receiptsHidden: true, denied: true, workspaceDenied: true }));
});

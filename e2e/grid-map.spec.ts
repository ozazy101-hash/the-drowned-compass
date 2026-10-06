import { test, expect, type Page } from '@playwright/test';
async function enter(page: Page, role = 'Dungeon Master') {
  await page.goto('./'); await page.getByRole('button', { name: new RegExp(`^${role} `) }).click();
  await page.getByLabel('Shared password').fill(role === 'Dungeon Master' ? 'dm-password' : 'player-password');
  await page.getByRole('button', { name: 'Enter the Party' }).click();
}
async function open(page: Page) {
  await enter(page); await page.getByRole('button', { name: 'Grid Map editor', exact: true }).click();
  await page.getByLabel('Columns', { exact: true }).fill('6'); await page.getByLabel('Rows', { exact: true }).fill('6');
  await page.getByRole('button', { name: 'Create blank map' }).click();
}
async function stroke(page: Page, points: [number, number][], square = 40) {
  const svg = page.getByRole('application', { name: 'Grid Map drawing surface' });
  await svg.locator('..').scrollIntoViewIfNeeded();
  await svg.locator('..').evaluate(element => { element.scrollTop = 0; element.scrollLeft = 0; });
  const box = (await svg.boundingBox())!;
  await page.mouse.move(box.x + points[0][0] * square, box.y + points[0][1] * square); await page.mouse.down();
  for (const [x, y] of points.slice(1)) await page.mouse.move(box.x + x * square, box.y + y * square, { steps: 5 });
  await page.mouse.up();
}
test('draw room, doors and terrain, erase, gesture undo/redo and zoom on laptop/phone', async ({ page }, info) => {
  await open(page);
  await stroke(page, [[1, 1], [4, 1], [4, 4], [1, 4], [1, 1]]);
  await expect(page.locator('[data-edge="wall"]')).toHaveCount(12);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(page.locator('[data-edge]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click(); await expect(page.locator('[data-edge]')).toHaveCount(12);
  await page.getByRole('button', { name: 'Door', exact: true }).click(); await stroke(page, [[2.5, 1]]); await expect(page.locator('[data-edge="door"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Floor', exact: true }).click(); await stroke(page, [[1.5, 1.5], [3.5, 1.5]]); await expect(page.locator('[data-terrain="floor"]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Water', exact: true }).click(); await page.getByLabel('View zoom').selectOption('.5');
  await stroke(page, [[1.5, 2.5], [3.5, 2.5]], 20); await expect(page.locator('[data-terrain="water"]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Difficult terrain', exact: true }).click(); await page.getByLabel('View zoom').selectOption('1.5');
  await stroke(page, [[2.5, 2.5]], 60); await expect(page.locator('[data-terrain="difficult"]')).toHaveCount(1);
  await page.getByLabel('View zoom').selectOption('1'); await page.getByRole('button', { name: 'Erase', exact: true }).click();
  await stroke(page, [[2.5, 1]]); await expect(page.locator('[data-edge="door"]')).toHaveCount(0); await expect(page.locator('[data-terrain="floor"]')).toHaveCount(3);
  await stroke(page, [[2.5, 2.5]]); await expect(page.locator('[data-terrain="difficult"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(page.locator('[data-terrain="difficult"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Floor', exact: true }).click(); await stroke(page, [[4.5, 4.5]]); await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `/private/tmp/ticket05-${info.project.name}-editor.png`, fullPage: true });
});
test('validation, keyboard editing, navigation retention, DM-only local draft isolation', async ({ page }) => {
  await open(page); await page.getByLabel('Columns', { exact: true }).fill('81'); await page.getByRole('button', { name: 'Create blank map' }).click();
  await expect(page.getByRole('alert')).toContainText('2 to 80'); await expect(page.locator('.grid-map-editor').getByRole('status').filter({hasText:'game feet per square'})).toContainText('6 × 6');
  await page.getByRole('button', { name: 'Water', exact: true }).click();
  const svg = page.getByRole('application'); await svg.focus(); await svg.press('ArrowRight'); await svg.press('ArrowDown'); await svg.press('Enter');
  await expect(page.locator('[data-terrain="water"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Back to Party', exact: true }).click(); await expect(page.getByRole('heading', { name: 'The Party', exact: true })).toBeVisible();
  await expect(page.getByRole('application')).toHaveCount(0); await page.getByRole('button', { name: 'Grid Map editor', exact: true }).click(); await expect(page.locator('[data-terrain="water"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Dungeon Master Library', exact: true }).click(); await expect(page.getByText('No Handouts match this view.')).toBeVisible();
  await page.getByRole('button', { name: 'Grid Map editor', exact: true }).click(); await expect(page.locator('[data-terrain="water"]')).toHaveCount(1);
  expect(await page.evaluate(() => Object.entries(localStorage).some(([key, value]) => /grid.?map/i.test(key + value)))).toBe(false);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await expect(page.getByLabel('Shared password')).toBeVisible(); await enter(page, 'Player');
  await expect(page.getByRole('button', { name: 'Grid Map editor', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Party Library', exact: true }).click(); await expect(page.getByText('No Handouts match this view.')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await expect(page.getByLabel('Shared password')).toBeVisible(); await enter(page);
  await page.getByRole('button', { name: 'Grid Map editor', exact: true }).click(); await expect(page.locator('.grid-map-editor').getByRole('status').filter({hasText:'game feet per square'})).toContainText('20 × 14'); await expect(page.locator('[data-terrain]')).toHaveCount(0);
});
test('cancelled and blurred gestures discard preview without history; touch gesture paints', async ({ page }, info) => {
  await open(page); await page.getByRole('button', { name: 'Water', exact: true }).click();
  const svg = page.getByRole('application'); await svg.locator('..').scrollIntoViewIfNeeded(); const box = (await svg.boundingBox())!;
  await page.mouse.move(box.x + 60, box.y + 60); await page.mouse.down(); await page.mouse.move(box.x + 140, box.y + 60);
  await expect(page.locator('[data-terrain]')).toHaveCount(3); await svg.dispatchEvent('pointercancel'); await page.mouse.up();
  await expect(page.locator('[data-terrain]')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.mouse.move(box.x + 60, box.y + 60); await page.mouse.down(); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.mouse.up();
  await expect(page.locator('[data-terrain]')).toHaveCount(0);
  if (info.project.name.startsWith('phone')) { await page.touchscreen.tap(box.x + 60, box.y + 60); await expect(page.locator('[data-terrain="water"]')).toHaveCount(1); }
});

test('Pan view reaches large map areas without painting; keyboard cursor follows viewport', async ({ page }, info) => {
  await open(page); await page.getByLabel('Columns', { exact: true }).fill('40'); await page.getByLabel('Rows', { exact: true }).fill('40'); await page.getByRole('button', { name: 'Create blank map' }).click();
  await page.getByRole('button', { name: 'Pan view', exact: true }).click();
  const viewport = page.locator('.map-scroll'); await viewport.scrollIntoViewIfNeeded();
  if (info.project.name.startsWith('phone')) {
    const box = (await viewport.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 150, y: box.y + 200 }] });
    for (let step = 1; step <= 6; step++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 150, y: box.y + 200 - step * 20 }] }); await page.waitForTimeout(20); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(30);
    await cdp.detach();
  } else { await viewport.hover(); await page.mouse.wheel(350, 350); await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(30); }
  await expect(page.locator('[data-terrain], [data-edge]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Floor', exact: true }).click();
  const svg = page.getByRole('application'); await svg.focus();
  await viewport.evaluate(element => { element.scrollTop = 0; element.scrollLeft = 0; });
  for (let step = 0; step < 60; step++) await svg.press('ArrowRight');
  await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeGreaterThan(100);
  await svg.press('Enter'); await expect(page.locator('[data-terrain="floor"]')).toHaveCount(1);
});

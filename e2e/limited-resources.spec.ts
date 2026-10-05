import { expect, test, type Locator, type Page } from '@playwright/test';
import { claimCharacter, enterAs, isolatedPartyUrl, prepareTwoBrowsers } from './overview-helpers';
async function combat(page: Page) { await page.getByRole('button', { name: 'Combat', exact: true }).click(); }
const row = (page: Page, name: string) => page.getByRole('form', { name: `Resource ${name}`, exact: true });
async function add(page: Page, name: string, recovery = 'Short Rest') {
  const form = page.getByRole('form', { name: 'New limited resource' });
  await form.getByLabel('Name', { exact: true }).fill(name);
  await form.getByLabel('Maximum').fill('3');
  await form.getByLabel('Current').fill('3');
  await form.getByLabel('Recovery').selectOption(recovery);
  await form.getByRole('button', { name: 'Add resource' }).click();
  await expect(row(page, name)).toBeVisible();
}
async function saved(form: Locator) { await expect(form.getByRole('status')).toHaveText('Saved'); }

test('limited resources add, correct, order, use, designate and remove persist', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page); await combat(page);
  await add(page, 'Second Wind'); await add(page, 'Luck', 'Dawn');
  const wind = row(page, 'Second Wind'); const luck = row(page, 'Luck');
  await wind.getByRole('button', { name: 'Spend 1' }).focus(); await page.keyboard.press('Enter'); await saved(wind);
  await expect(wind.getByLabel('Current')).toHaveValue('2');
  await wind.getByRole('button', { name: 'Restore 1' }).click(); await saved(wind);
  await expect(wind.getByLabel('Current')).toHaveValue('3');
  await expect(wind.getByRole('button', { name: 'Restore 1' })).toBeDisabled();
  await wind.getByLabel('Current').fill('0'); await wind.getByRole('button', { name: 'Save resource' }).click(); await saved(wind);
  await expect(wind.getByRole('button', { name: 'Spend 1' })).toBeDisabled();
  await wind.getByLabel('Current').fill('4'); await wind.getByRole('button', { name: 'Save resource' }).click();
  await expect(wind.getByLabel('Current')).toHaveValue('4');
  await expect(wind.getByRole('alert')).toContainText('whole-number uses');
  await wind.getByLabel('Current').fill('1'); await wind.getByLabel('Recovery').selectOption('Long Rest');
  await wind.getByRole('button', { name: 'Save resource' }).click(); await saved(wind);
  await wind.getByRole('button', { name: 'Make important' }).click(); await saved(wind);
  await luck.getByRole('button', { name: 'Make important' }).click(); await saved(luck);
  await expect(wind.getByRole('button', { name: 'Make important' })).toHaveAttribute('aria-pressed', 'false');
  await luck.getByRole('button', { name: 'Move up' }).click(); await saved(luck);
  await expect(page.getByRole('form').nth(0)).toHaveAttribute('aria-label', 'Resource Luck');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('combat-resources.png'), fullPage: true });
  await page.getByRole('button', { name: 'Back to the Party' }).click();
  await expect(page.getByText('Luck: 3 / 3', { exact: true })).toBeVisible();
  await page.reload(); await page.getByRole('article', { name: 'Neris Vale, played by Mara' }).getByRole('button').click(); await combat(page);
  await expect(row(page, 'Luck').getByLabel('Recovery')).toHaveValue('Dawn');
  await expect(wind.getByLabel('Recovery')).toHaveValue('Long Rest');
  await luck.getByRole('button', { name: 'Remove resource' }).click(); await expect(luck).toHaveCount(0);
  await page.reload(); await page.getByRole('article', { name: 'Neris Vale, played by Mara' }).getByRole('button').click(); await combat(page);
  await expect(luck).toHaveCount(0); await expect(wind.getByLabel('Current')).toHaveValue('1');
});

test('Combat entries and limited resources persist together in the Party summary', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info));
  await enterAs(page, 'Player');
  await claimCharacter(page);
  await combat(page);
  await add(page, 'Second Wind');
  await row(page, 'Second Wind').getByRole('button', { name: 'Make important' }).click();
  await saved(row(page, 'Second Wind'));

  await page.getByRole('button', { name: 'Add attack', exact: true }).click();
  const attack = page.getByRole('article', { name: 'New attack', exact: true });
  await attack.getByLabel('Name', { exact: true }).fill('Cutlass');
  await attack.getByRole('button', { name: 'Save attack', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Cutlass', exact: true }).getByRole('status')).toHaveText('Saved');
  await page.getByRole('checkbox', { name: 'Cutlass', exact: true }).check();
  await expect(page.getByRole('region', { name: 'Attacks & Actions' }).getByRole('status').first()).toHaveText('Saved');

  await page.getByRole('button', { name: 'Back to the Party' }).click();
  const card = page.getByRole('article', { name: 'Neris Vale, played by Mara' });
  await expect(card).toContainText('Other: Cutlass');
  await expect(card).toContainText('Second Wind: 3 / 3');
  await page.reload();
  await expect(card).toContainText('Other: Cutlass');
  await expect(card).toContainText('Second Wind: 3 / 3');
});

test('a failed save retains resource values and explicit Retry persists them', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info, '&failResourceSaves=once')); await enterAs(page, 'Player'); await claimCharacter(page); await combat(page);
  const form = page.getByRole('form', { name: 'New limited resource' });
  await form.getByLabel('Name', { exact: true }).fill('Channel Divinity'); await form.getByLabel('Recovery').selectOption('Manual');
  await form.getByRole('button', { name: 'Add resource' }).click();
  await expect(form.getByRole('alert')).toHaveText('Save failed. Your changes are unsaved.');
  await expect(form.getByLabel('Name', { exact: true })).toHaveValue('Channel Divinity');
  await form.getByRole('button', { name: 'Retry' }).click(); await expect(row(page, 'Channel Divinity')).toBeVisible();
  await page.reload(); await page.getByRole('article', { name: 'Neris Vale, played by Mara' }).getByRole('button').click(); await combat(page);
  await expect(row(page, 'Channel Divinity').getByLabel('Recovery')).toHaveValue('Manual');
});

test('independent records synchronize, same-resource drafts conflict and Retry adopts the latest version', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, info);
  try {
    await combat(page); await combat(otherPage); await add(page, 'Second Wind'); await add(page, 'Luck');
    await expect(row(otherPage, 'Luck')).toBeVisible();
    const wind = row(page, 'Second Wind'); const otherWind = row(otherPage, 'Second Wind');
    await wind.getByLabel('Name', { exact: true }).fill('Last Breath');
    await otherWind.getByRole('button', { name: 'Spend 1' }).click(); await saved(otherWind);
    await row(otherPage, 'Luck').getByRole('button', { name: 'Spend 1' }).click(); await saved(row(otherPage, 'Luck'));
    await expect(row(page, 'Luck').getByLabel('Current')).toHaveValue('2');
    await expect(wind.getByLabel('Name', { exact: true })).toHaveValue('Last Breath');
    await wind.getByRole('button', { name: 'Save resource' }).click();
    await expect(wind.getByRole('alert')).toContainText('Another session changed this resource');
    await expect(otherWind.getByLabel('Current')).toHaveValue('2');
    await wind.getByRole('button', { name: 'Retry' }).click();
    await expect(row(page, 'Last Breath').getByRole('status')).toHaveText('Saved');
    await expect(row(otherPage, 'Last Breath').getByLabel('Current')).toHaveValue('3');
    await expect(row(otherPage, 'Luck').getByLabel('Current')).toHaveValue('2');
    // Both operations carry the same accepted record version; only one can win.
    let waiting = 0; let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const holdWrite = async (route: import('@playwright/test').Route) => {
      if (route.request().method() === 'PATCH') {
        waiting++; if (waiting === 2) release(); await gate;
      }
      await route.continue();
    };
    await page.route('**/__drowned_compass_test_party?**', holdWrite);
    await otherPage.route('**/__drowned_compass_test_party?**', holdWrite);
    await Promise.all([
      row(page, 'Last Breath').getByRole('button', { name: 'Spend 1' }).click(),
      row(otherPage, 'Last Breath').getByRole('button', { name: 'Spend 1' }).click(),
    ]);
    await expect(row(page, 'Last Breath').getByLabel('Current')).toHaveValue('2');
    await expect(row(otherPage, 'Last Breath').getByLabel('Current')).toHaveValue('2');
    await expect.poll(async () => await row(page, 'Last Breath').getByRole('button', { name: 'Retry' }).count() + await row(otherPage, 'Last Breath').getByRole('button', { name: 'Retry' }).count()).toBe(1);
    const failedPage = await row(page, 'Last Breath').getByRole('button', { name: 'Retry' }).count() ? page : otherPage;
    await row(failedPage, 'Last Breath').getByRole('button', { name: 'Retry' }).click();
    await expect(row(page, 'Last Breath').getByLabel('Current')).toHaveValue('1');
    await expect(row(otherPage, 'Last Breath').getByLabel('Current')).toHaveValue('1');
  } finally { await otherContext.close(); }
});

test('newer typing survives an older successful resource acknowledgement', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page); await combat(page); await add(page, 'Second Wind');
  let release!: () => void;
  let requested!: () => void;
  const submitted = new Promise<void>(resolve => { requested = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/__drowned_compass_test_party?**', async route => {
    if (route.request().method() === 'PATCH' && route.request().postDataJSON().resource) {
      const response = await route.fetch(); requested(); await gate; await route.fulfill({ response });
    } else await route.continue();
  });
  const wind = page.getByRole('form').first();
  await wind.getByLabel('Name', { exact: true }).fill('Last Breath');
  await wind.getByRole('button', { name: 'Save resource' }).click(); await submitted;
  await wind.getByLabel('Name', { exact: true }).fill('Newer typing'); release();
  await expect(row(page, 'Last Breath').getByLabel('Name', { exact: true })).toHaveValue('Newer typing');
  await expect(row(page, 'Last Breath').getByRole('status')).toHaveText('Unsaved changes');
  await page.unroute('**/__drowned_compass_test_party?**');
  await row(page, 'Last Breath').getByRole('button', { name: 'Save resource' }).click();
  await expect(row(page, 'Last Breath').getByRole('alert')).toContainText('Another session changed this resource');
  await row(page, 'Last Breath').getByRole('button', { name: 'Retry' }).click();
  await expect(row(page, 'Newer typing').getByRole('status')).toHaveText('Saved');
});

test('delayed Party snapshots cannot reverse newer resource edits or resurrect removal', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page); await combat(page); await add(page, 'Second Wind');
  let release!: () => void; let requested!: () => void;
  const submitted = new Promise<void>(resolve => { requested = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  let delayed = false;
  await page.route('**/__drowned_compass_test_party?**', async route => {
    if (route.request().method() === 'GET' && !delayed) {
      delayed = true; const response = await route.fetch(); requested(); await gate; await route.fulfill({ response });
    } else await route.continue();
  });
  await submitted;
  const wind = row(page, 'Second Wind');
  await wind.getByRole('button', { name: 'Spend 1' }).click(); await saved(wind);
  await wind.getByRole('button', { name: 'Remove resource' }).click(); await expect(wind).toHaveCount(0);
  release(); await expect(page.getByText('No limited resources yet.')).toBeVisible();
  // Allow the delayed snapshot and the next polling interval to be observed.
  await expect.poll(async () => page.getByRole('form', { name: 'Resource Second Wind', exact: true }).count()).toBe(0);
});

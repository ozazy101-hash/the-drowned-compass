import { expect } from '@playwright/test';
import { test } from './browser-fixtures';
import { prepareTextPage, prepareTextBrowsers } from './character-text-helpers';
import { openClaimedCharacter } from './overview-helpers';
const area = async (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Character Record sections' }).getByRole('button', { name: 'Inventory', exact: true }).click();
test('equipment and magic items persist, reorder and remove without changing defenses', async ({ page }, info) => {
  await prepareTextPage(page, info); await area(page);
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  const equipment = page.getByRole('article', { name: 'Equipment', exact: true });
  await equipment.getByLabel('Item name').fill('Rope'); await equipment.getByLabel('Notes').fill('50 feet');
  await equipment.getByLabel('Display order').fill('5'); await equipment.getByRole('button', { name: 'Save item' }).click();
  await expect(equipment.getByRole('status')).toHaveText('Saved');
  await page.getByLabel('Item category').selectOption('magic'); await page.getByRole('button', { name: 'Add item', exact: true }).click();
  const magic = page.getByRole('article', { name: 'Notable magic item', exact: true });
  await magic.getByLabel('Item name').fill('Drowned compass'); await magic.getByLabel('Display order').fill('0');
  await magic.getByRole('button', { name: 'Save item' }).click(); await expect(magic.getByRole('status')).toHaveText('Saved');
  await expect(page.getByRole('article').filter({ has: page.getByLabel('Item name') }).first().getByLabel('Item name')).toHaveValue('Drowned compass');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload(); await openClaimedCharacter(page); await area(page);
  await expect(equipment.getByLabel('Notes')).toHaveValue('50 feet');
  await magic.getByRole('button', { name: 'Remove item' }).click(); await expect(magic).toHaveCount(0);
  await page.reload(); await openClaimedCharacter(page); await area(page); await expect(magic).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Character Record sections' }).getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.getByLabel('Armor Class', { exact: true })).toHaveValue('10');
});
test('independent currencies synchronize, stale corrections conflict and retry', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTextBrowsers(browser, page, info);
  try {
    await area(page); await area(otherPage);
    const cp = page.getByRole('article', { name: 'Copper pieces (CP)', exact: true });
    const sp = otherPage.getByRole('article', { name: 'Silver pieces (SP)', exact: true });
    await cp.getByLabel('Copper pieces (CP)', { exact: true }).fill('12');
    await sp.getByLabel('Silver pieces (SP)', { exact: true }).fill('9');
    await Promise.all([cp.getByRole('button', { name: 'Save Copper pieces (CP)' }).click(), sp.getByRole('button', { name: 'Save Silver pieces (SP)' }).click()]);
    await expect(cp.getByRole('status')).toHaveText('Saved');
    await expect(sp.getByRole('status')).toHaveText('Saved');
    await expect(page.getByRole('textbox', { name: 'Silver pieces (SP)', exact: true })).toHaveValue('9');
    await expect(otherPage.getByRole('textbox', { name: 'Copper pieces (CP)', exact: true })).toHaveValue('12');
    const gp = page.getByRole('article', { name: 'Gold pieces (GP)', exact: true });
    const peerGp = otherPage.getByRole('article', { name: 'Gold pieces (GP)', exact: true });
    await gp.getByLabel('Gold pieces (GP)', { exact: true }).fill('42');
    await peerGp.getByLabel('Gold pieces (GP)', { exact: true }).fill('7'); await peerGp.getByRole('button', { name: 'Save Gold pieces (GP)' }).click();
    await expect(peerGp.getByRole('status')).toHaveText('Saved');
    await gp.getByRole('button', { name: 'Save Gold pieces (GP)' }).click(); await expect(gp.getByRole('alert')).toContainText('Changed elsewhere');
    await gp.getByRole('button', { name: 'Retry' }).click(); await expect(gp.getByRole('status')).toHaveText('Saved');
    await expect(peerGp.getByLabel('Gold pieces (GP)', { exact: true })).toHaveValue('42');
    await page.reload(); await openClaimedCharacter(page); await area(page); await expect(gp.getByLabel('Gold pieces (GP)', { exact: true })).toHaveValue('42');
  } finally { await otherContext.close(); }
});
test('failed saves preserve inventory drafts across navigation and retry', async ({ page }, info) => {
  await prepareTextPage(page, info, '&failInventorySaves=once'); await area(page);
  const cp = page.getByRole('article', { name: 'Copper pieces (CP)', exact: true });
  await cp.getByLabel('Copper pieces (CP)', { exact: true }).fill('10'); await cp.getByRole('button', { name: 'Save Copper pieces (CP)' }).click();
  await expect(cp.getByRole('alert')).toContainText('Not saved');
  await page.getByRole('navigation', { name: 'Character Record sections' }).getByRole('button', { name: 'Overview', exact: true }).click(); await area(page);
  await expect(cp.getByLabel('Copper pieces (CP)', { exact: true })).toHaveValue('10'); await cp.getByRole('button', { name: 'Retry' }).click(); await expect(cp.getByRole('status')).toHaveText('Saved');
});

test('invalid currency stays unsaved with useful feedback', async ({ page }, info) => {
  await prepareTextPage(page, info); await area(page);
  const gp = page.getByRole('article', { name: 'Gold pieces (GP)', exact: true });
  await gp.getByLabel('Gold pieces (GP)', { exact: true }).fill('-1');
  await gp.getByRole('button', { name: 'Save Gold pieces (GP)' }).click();
  await expect(gp.getByRole('alert')).toContainText('whole currency amount');
  await gp.getByLabel('Gold pieces (GP)', { exact: true }).fill('0');
  await gp.getByRole('button', { name: 'Save Gold pieces (GP)' }).click();
  await expect(gp.getByRole('status')).toHaveText('Saved');
});


test('currency labels explain every denomination and independently saved amounts', async ({ page }, info) => {
  await prepareTextPage(page, info); await area(page);
  const labels = ['Copper pieces (CP)', 'Silver pieces (SP)', 'Electrum pieces (EP)', 'Gold pieces (GP)', 'Platinum pieces (PP)'];
  for (const [index, label] of labels.entries()) {
    const coin = page.getByRole('article', { name: label, exact: true });
    await expect(coin.getByRole('heading', { name: label, exact: true })).toBeVisible();
    const amount = coin.getByRole('textbox', { name: label, exact: true });
    await expect(amount).toBeVisible();
    await expect(coin.locator('label')).toHaveText(label);
    await amount.fill(String(index + 1));
    await coin.getByRole('button', { name: `Save ${label}`, exact: true }).click();
    await expect(coin.getByRole('status')).toHaveText('Saved');
    await amount.focus();
    await expect(amount).toBeFocused();
    const fits = await coin.evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth && element.scrollWidth <= element.clientWidth;
    });
    expect(fits).toBe(true);
  }
  await expect(page.getByText('Enter each amount directly. No automatic conversion.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload(); await openClaimedCharacter(page); await area(page);
  for (const [index, label] of labels.entries()) {
    await expect(page.getByRole('textbox', { name: label, exact: true })).toHaveValue(String(index + 1));
  }
});

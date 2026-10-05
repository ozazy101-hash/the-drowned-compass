import { test } from './browser-fixtures';
import { expect } from '@playwright/test';
import { enterAs, claimCharacter, isolatedPartyUrl, openClaimedCharacter, prepareTwoBrowsers } from './overview-helpers';

test('weapon template is reviewed, customized, saved, featured and retained after reload', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page);
  await page.getByRole('button', { name: 'Combat', exact: true }).click();
  await page.getByRole('button', { name: 'Browse Combat Catalog' }).click();
  await page.getByLabel('Combat entry type', { exact: true }).selectOption('weapon');
  await expect(page.getByRole('status').filter({ hasText: '38 matching combat entries' })).toBeVisible();
  await page.getByLabel('Search combat entries').fill('dagger');
  await page.getByRole('list', { name: 'Matching combat entries' }).getByRole('button').click();
  const detail = page.getByRole('article', { name: 'Dagger combat details' });
  await expect(detail).toContainText('Nick');
  await expect(detail.getByRole('link', { name: /Full SRD/ })).toHaveAttribute('href', /#page=91$/);
  await detail.getByRole('button', { name: 'Use Dagger template' }).focus(); await page.keyboard.press('Enter');
  const draft = page.getByRole('article', { name: 'New attack', exact: true });
  await expect(draft.getByLabel('Name', { exact: true })).toHaveValue('Dagger');
  await expect(draft.getByLabel('Attack bonus', { exact: true })).toHaveValue('');
  await expect(draft.getByLabel('Damage', { exact: true })).toHaveValue('1d4');
  await draft.getByLabel('Name', { exact: true }).fill('Boarding dagger');
  await draft.getByLabel('Attack bonus', { exact: true }).fill('5');
  await draft.getByLabel('Damage', { exact: true }).fill('1d4 + 3');
  await draft.getByRole('button', { name: 'Save attack', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Boarding dagger', exact: true }).getByRole('status')).toHaveText('Saved');
  await page.getByRole('checkbox', { name: 'Boarding dagger', exact: true }).check();
  await expect(page.getByRole('region', { name: 'Attacks & Actions' }).getByRole('status').first()).toHaveText('Saved');
  await page.getByRole('button', { name: 'Back to the Party' }).click();
  await expect(page.getByRole('article', { name: 'Neris Vale, played by Mara' })).toContainText('Melee: Boarding dagger · +5 to hit · 1d4 + 3 Piercing');
  await page.reload(); await openClaimedCharacter(page); await page.getByRole('button', { name: 'Combat', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Boarding dagger', exact: true }).getByLabel('Notes')).toHaveValue(/SRD 5.2.1/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('class filters, offline inspection and cancellation leave character combat unchanged', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page);
  await page.getByRole('button', { name: 'Combat', exact: true }).click();
  await page.getByRole('button', { name: 'Browse Combat Catalog' }).click();
  await page.getByLabel('Combat entry type', { exact: true }).selectOption('ability');
  await page.getByLabel('Combat class', { exact: true }).selectOption('Fighter');
  await page.getByLabel('Available by class level').selectOption('1');
  await page.getByLabel('Search combat entries').fill('surge');
  await expect(page.getByText('No combat entries match. Clear or adjust the filters.')).toBeVisible();
  await page.getByLabel('Available by class level').selectOption('2');
  await page.getByRole('list', { name: 'Matching combat entries' }).getByRole('button').click();
  await expect(page.getByRole('article', { name: 'Action Surge combat details' })).toContainText('except the Magic action');
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Clear combat filters' }).click();
  await page.getByLabel('Combat class', { exact: true }).selectOption('Rogue');
  await page.getByLabel('Available by class level').selectOption('3');
  await expect(page.getByRole('list', { name: 'Matching combat entries' }).getByRole('button')).toHaveCount(4);
  await page.getByLabel('Search combat entries').fill('Sneak Attack');
  await page.getByRole('list', { name: 'Matching combat entries' }).getByRole('button').click();
  const detail = page.getByRole('article', { name: 'Sneak Attack combat details' });
  await expect(detail).toContainText('Attack modifier');
  await expect(detail).toContainText('Once per turn');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await detail.getByRole('button', { name: 'Use Sneak Attack template' }).click();
  await expect(page.getByRole('article', { name: 'New action', exact: true }).getByLabel('Notes')).toHaveValue(/qualifying hit rather than making another attack/);
  await page.getByRole('button', { name: 'Browse Combat Catalog' }).click();
  await page.getByRole('list', { name: 'Matching combat entries' }).getByRole('button').click();
  await expect(page.getByRole('button', { name: 'Use Sneak Attack template' })).toBeDisabled();
  await page.getByRole('button', { name: 'Close Combat Catalog' }).click();
  await page.getByRole('button', { name: 'Cancel new action' }).click();
  await expect(page.getByText('No attacks or actions recorded yet.')).toBeVisible();
  await page.context().setOffline(false); await page.reload(); await openClaimedCharacter(page);
  await page.getByRole('button', { name: 'Combat', exact: true }).click();
  await expect(page.getByText('No attacks or actions recorded yet.')).toBeVisible();
});

test('catalog class reference saves through the existing shared Combat path without executing effects', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, info);
  try {
    await page.getByRole('button', { name: 'Combat', exact: true }).click();
    await otherPage.getByRole('button', { name: 'Combat', exact: true }).click();
    await page.getByRole('button', { name: 'Browse Combat Catalog' }).click();
    await page.getByLabel('Search combat entries').fill('Second Wind');
    await page.getByRole('list', { name: 'Matching combat entries' }).getByRole('button').click();
    await page.getByRole('button', { name: 'Use Second Wind template' }).click();
    const draft = page.getByRole('article', { name: 'New action', exact: true });
    await draft.getByRole('button', { name: 'Save action', exact: true }).click();
    await expect(otherPage.getByRole('article', { name: 'Second Wind', exact: true }).getByLabel('Notes')).toHaveValue(/Fighter level 1; Bonus Action/);
    await expect(page.getByRole('region', { name: 'Health', exact: true })).toContainText('Unknown');
    await expect(page.getByRole('checkbox', { name: 'Second Wind', exact: true })).toHaveCount(0);
    await otherPage.getByRole('article', { name: 'Second Wind', exact: true }).getByLabel('Notes').fill('My own reminder');
    await otherPage.getByRole('article', { name: 'Second Wind', exact: true }).getByRole('button', { name: 'Save action', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Second Wind', exact: true }).getByLabel('Notes')).toHaveValue('My own reminder');
  } finally { await otherContext.close(); }
});

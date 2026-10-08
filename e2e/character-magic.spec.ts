import { test } from './browser-fixtures';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { claimCharacter, enterAs, isolatedPartyUrl, prepareTwoBrowsers } from './overview-helpers';
async function prepare(page: Page, info: TestInfo, extra = '') {
  await page.goto(isolatedPartyUrl(info, extra)); await enterAs(page, 'Player'); await claimCharacter(page);
  await page.getByRole('button', { name: 'Magic', exact: true }).click();
}
async function addCatalog(page: Page, name = 'Acid Splash') {
  await page.getByLabel('Search spells by name').fill(name);
  await page.getByRole('button', { name: new RegExp(`^${name} (Cantrip|Level)`) }).click();
  await page.getByRole('button', { name: 'Add to Character Spells', exact: true }).click();
}
const spell = (page: Page, name = 'Acid Splash') => page.getByRole('article', { name: `${name} Character Spell`, exact: true });
const slots = (page: Page, level = 1) => page.getByRole('article', { name: `Level ${level} spell slots`, exact: true });
async function configure(page: Page, level: number, maximum: string, remaining: string) {
  const record = slots(page, level); await record.getByLabel('Maximum slots', { exact: true }).fill(maximum);
  await record.getByLabel('Remaining slots', { exact: true }).fill(remaining); await record.getByRole('button', { name: 'Save slot counts', exact: true }).click();
  await expect(record.getByRole('status')).toHaveText('Saved');
}
test('catalog association, warning, availability, complete rules and Custom Spell CRUD persist', async ({ page }, info) => {
  await prepare(page, info);
  await page.getByLabel('Spell class', { exact: true }).selectOption('Wizard');
  await page.getByLabel('Search spells by name').fill('Acid Splash'); await page.getByRole('button', { name: /^Acid Splash/ }).click();
  await expect(page.getByText(/This spell is unusual/)).toBeVisible();
  await page.getByRole('button', { name: 'Add to Character Spells', exact: true }).click();
  const acid = spell(page); await expect(acid).toBeVisible(); await expect(page.getByRole('button', { name: 'Already added to Character' })).toBeDisabled();
  await acid.getByLabel('Availability', { exact: true }).selectOption('Prepared'); await acid.getByLabel('Player notes').fill('Aim away from crew');
  await acid.getByRole('button', { name: 'Save spell', exact: true }).click(); await expect(acid.getByRole('status')).toHaveText('Saved');
  await acid.getByLabel('Availability', { exact: true }).selectOption('Always Prepared'); await acid.getByRole('button', { name: 'Save spell', exact: true }).click(); await expect(acid.getByRole('status')).toHaveText('Saved');
  await acid.getByLabel('Availability', { exact: true }).selectOption('Item granted'); await acid.getByRole('button', { name: 'Save spell', exact: true }).click();
  await expect(acid.getByRole('status')).toHaveText(/Enter the item or feature/);
  await acid.getByLabel('Granted source (item or feature)').fill('Wand of Brine'); await acid.getByRole('button', { name: 'Save spell', exact: true }).click(); await expect(acid.getByRole('status')).toHaveText('Saved');
  await acid.getByLabel('Availability', { exact: true }).selectOption('Feature granted'); await acid.getByLabel('Granted source (item or feature)').fill('Sea gift');
  await acid.getByRole('button', { name: 'Save spell', exact: true }).click(); await expect(acid.getByRole('status')).toHaveText('Saved');
  await acid.getByText('Read Acid Splash rules', { exact: true }).click(); await expect(acid.getByRole('heading', { name: 'Description', exact: true })).toBeVisible();
  await expect(acid.getByRole('link', { name: /SRD 5.2.1 · page/ })).toHaveAttribute('href', /SRD_CC_v5.2.1.pdf#page=/);
  await page.getByLabel('New Custom Spell name', { exact: true }).fill('Sea Lantern'); await page.getByLabel('New Custom Spell level').selectOption('2'); await page.getByRole('button', { name: 'Create Custom Spell', exact: true }).click();
  const custom = spell(page, 'Sea Lantern'); await expect(custom).toBeVisible(); await custom.getByLabel('Custom Spell name', { exact: true }).fill('Tide Lantern');
  await custom.getByLabel('Custom Spell level', { exact: true }).fill('3'); await custom.getByLabel('Player notes').fill('A player-defined light.'); await custom.getByRole('button', { name: 'Save spell', exact: true }).click();
  const tide = spell(page, 'Tide Lantern'); await expect(tide.getByRole('status')).toHaveText('Saved');
  await page.getByLabel('Search spells by name').fill('Tide Lantern'); await expect(page.getByText('0 matching spells', { exact: true })).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'Open Neris Vale Character Page', exact: true }).click(); await page.getByRole('button', { name: 'Magic', exact: true }).click();
  await expect(spell(page).getByLabel('Availability')).toHaveValue('Feature granted'); await expect(spell(page).getByLabel('Player notes')).toHaveValue('Aim away from crew');
  await expect(tide.getByLabel('Custom Spell level', { exact: true })).toHaveValue('3'); await tide.getByRole('button', { name: 'Remove spell', exact: true }).click(); await expect(tide).toHaveCount(0);
  await spell(page).getByRole('button', { name: 'Remove spell', exact: true }).click(); await expect(spell(page)).toHaveCount(0);
  await addCatalog(page); await expect(spell(page)).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => innerWidth));
});
test('manual slot counts, bounds, spend, restore and correction survive reload', async ({ page }, info) => {
  await prepare(page, info); await configure(page, 1, '3', '3'); const one = slots(page);
  await one.getByRole('button', { name: 'Spend slot', exact: true }).click(); await expect(one.getByRole('heading')).toHaveText('Level 1 slots · 2 / 3');
  await one.getByRole('button', { name: 'Restore slot', exact: true }).click(); await expect(one.getByRole('heading')).toHaveText('Level 1 slots · 3 / 3'); await expect(one.getByRole('button', { name: 'Restore slot', exact: true })).toBeDisabled();
  await configure(page, 2, '2', '1'); await configure(page, 1, '1', '0'); await expect(one.getByRole('button', { name: 'Spend slot', exact: true })).toBeDisabled();
  await one.getByLabel('Remaining slots').fill('2'); await one.getByRole('button', { name: 'Save slot counts', exact: true }).click(); await expect(one.getByRole('status')).toHaveText(/Remaining slots must be/);
  await one.getByLabel('Remaining slots').fill(''); await one.getByRole('button', { name: 'Save slot counts', exact: true }).click(); await expect(one.getByRole('status')).toHaveText(/Remaining slots must be/);
  await one.getByLabel('Remaining slots').fill('1'); await one.getByRole('button', { name: 'Save slot counts', exact: true }).click(); await expect(one.getByRole('status')).toHaveText('Saved');
  await page.reload(); await page.getByRole('button', { name: 'Open Neris Vale Character Page', exact: true }).click(); await page.getByRole('button', { name: 'Magic', exact: true }).click();
  await expect(one.getByRole('heading')).toHaveText('Level 1 slots · 1 / 1'); await expect(slots(page, 2).getByRole('heading')).toHaveText('Level 2 slots · 1 / 2');
  await one.getByRole('button', { name: 'Spend slot', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(one.getByRole('heading')).toHaveText('Level 1 slots · 0 / 1');
});
test('save errors and removal retry preserve accepted state', async ({ page }, info) => {
  await prepare(page, info, '&failMagicSaves=once'); await addCatalog(page);
  await expect(page.getByText('The save could not reach the Party.')).toBeVisible(); await expect(spell(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry adding spell', exact: true }).click(); await expect(spell(page)).toBeVisible();
  // Reset failure injection to test a removal, then a slot command.
  await page.evaluate(() => sessionStorage.removeItem('magic-save-failed'));
  await spell(page).getByRole('button', { name: 'Remove spell', exact: true }).click(); await expect(spell(page).getByRole('status')).toHaveText('The save could not reach the Party.');
  await spell(page).getByRole('button', { name: 'Retry spell save', exact: true }).click(); await expect(spell(page)).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem('magic-save-failed'));
  const one = slots(page); await one.getByLabel('Maximum slots').fill('2'); await one.getByLabel('Remaining slots').fill('2'); await one.getByRole('button', { name: 'Save slot counts', exact: true }).click();
  await expect(one.getByRole('heading')).toHaveText('Level 1 slots · 0 / 0'); await one.getByRole('button', { name: 'Retry slot save', exact: true }).click(); await expect(one.getByRole('heading')).toHaveText('Level 1 slots · 2 / 2');
});
test('two sessions preserve independent writes, same-record drafts and remote removals', async ({ browser, page }, info) => {
  const { otherContext, otherPage: dm } = await prepareTwoBrowsers(browser, page, info);
  await page.getByRole('button', { name: 'Magic', exact: true }).click(); await dm.getByRole('button', { name: 'Magic', exact: true }).click();
  await addCatalog(page); await expect(spell(dm)).toBeVisible();
  await Promise.all([configure(page, 1, '3', '3'), configure(dm, 2, '2', '2')]);
  await expect(slots(dm).getByRole('heading')).toHaveText('Level 1 slots · 3 / 3'); await expect(slots(page, 2).getByRole('heading')).toHaveText('Level 2 slots · 2 / 2');
  await spell(page).getByLabel('Player notes').fill('Local tactical draft'); await spell(dm).getByLabel('Player notes').fill('DM accepted note');
  await spell(dm).getByRole('button', { name: 'Save spell', exact: true }).click(); await expect(spell(dm).getByRole('status')).toHaveText('Saved');
  await expect(spell(page).getByText(/The saved spell is now/)).toContainText('DM accepted note'); await expect(spell(page).getByLabel('Player notes')).toHaveValue('Local tactical draft');
  await expect(spell(page).getByRole('button', { name: 'Save spell', exact: true })).toBeDisabled(); await spell(page).getByRole('button', { name: 'Replace saved spell with draft', exact: true }).click();
  await expect(spell(dm).getByLabel('Player notes')).toHaveValue('Local tactical draft');
  await spell(page).getByLabel('Player notes').fill('Retained after deletion'); await spell(dm).getByRole('button', { name: 'Remove spell', exact: true }).click();
  await expect(spell(page).getByText(/The saved spell is now/)).toContainText('removed'); await expect(spell(page).getByLabel('Player notes')).toHaveValue('Retained after deletion');
  await page.getByLabel('Search Character Spells').fill('no match'); await page.getByLabel('Search Character Spells').fill(''); await expect(spell(page).getByLabel('Player notes')).toHaveValue('Retained after deletion');
  await spell(page).getByRole('button', { name: 'Use saved spell', exact: true }).click(); await expect(spell(page)).toHaveCount(0);
  await slots(page).getByLabel('Remaining slots').fill('1'); await slots(dm).getByRole('button', { name: 'Spend slot', exact: true }).click(); await expect(slots(page).getByText(/Saved values:/)).toContainText('2 remaining');
  await expect(slots(page).getByLabel('Remaining slots')).toHaveValue('1'); await slots(page).getByRole('button', { name: 'Use saved slots', exact: true }).click(); await expect(slots(page).getByLabel('Remaining slots')).toHaveValue('2');
  await dm.getByRole('button', { name: 'Overview', exact: true }).click(); await dm.getByLabel('Armor Class', { exact: true }).fill('17'); await dm.getByLabel('Armor Class', { exact: true }).press('Enter');
  await addCatalog(page, 'Light'); await page.getByRole('button', { name: 'Overview', exact: true }).click(); await expect(page.getByLabel('Armor Class', { exact: true })).toHaveValue('17');
  await otherContext.close();
});
test('pending acknowledgement disables its editor and retains another spell draft', async ({ page }, info) => {
  await prepare(page, info); await addCatalog(page); await addCatalog(page, 'Light');
  await page.evaluate(() => { const url = new URL(location.href); url.searchParams.set('slowMagicSaves', 'once'); history.replaceState(null, '', url); });
  // Adapter parameters are read at creation: reload before exercising slow command.
  await page.reload(); await page.getByRole('button', { name: 'Open Neris Vale Character Page', exact: true }).click(); await page.getByRole('button', { name: 'Magic', exact: true }).click();
  await spell(page).getByLabel('Player notes').fill('Submitted draft'); await spell(page).getByRole('button', { name: 'Save spell', exact: true }).click();
  await expect(spell(page).getByLabel('Player notes')).toBeDisabled(); await spell(page, 'Light').getByLabel('Player notes').fill('Other spell draft');
  await expect(spell(page).getByRole('status')).toHaveText('Saved'); await expect(spell(page, 'Light').getByLabel('Player notes')).toHaveValue('Other spell draft');
});

test('a stale spend explicitly retries its delta against the accepted remaining slots', async ({ browser, page }, info) => {
  const { otherContext, otherPage: dm } = await prepareTwoBrowsers(browser, page, info);
  await page.getByRole('button', { name: 'Magic', exact: true }).click(); await dm.getByRole('button', { name: 'Magic', exact: true }).click();
  await configure(page, 1, '3', '3'); await expect(slots(dm).getByRole('heading')).toHaveText('Level 1 slots · 3 / 3');
  await page.route('**/__drowned_compass_test_party?*', route => route.request().method() === 'GET' ? route.abort() : route.continue());
  await slots(dm).getByRole('button', { name: 'Spend slot', exact: true }).click(); await expect(slots(dm).getByRole('heading')).toHaveText('Level 1 slots · 2 / 3');
  await slots(page).getByRole('button', { name: 'Spend slot', exact: true }).click();
  await expect(slots(page).getByText(/Saved values:/)).toContainText('2 remaining');
  await slots(page).getByRole('button', { name: 'Retry spend on saved slots', exact: true }).click();
  await expect(slots(page).getByRole('heading')).toHaveText('Level 1 slots · 1 / 3'); await expect(slots(dm).getByRole('heading')).toHaveText('Level 1 slots · 1 / 3');
  await otherContext.close();
});
test('multiclass guidance uses every class and Magic saves preserve Combat entries', async ({ page }, info) => {
  await prepare(page, info); await page.getByRole('button', { name: 'Overview', exact: true }).click(); await page.getByRole('button', { name: 'Add class', exact: true }).click();
  const entry = page.getByRole('region', { name: 'Classes', exact: true }).getByRole('article').filter({ hasText: 'Additional class' }).last();
  await entry.getByLabel('Class name', { exact: true }).fill('Wizard'); await entry.getByLabel('Class level', { exact: true }).fill('1'); await entry.getByRole('button', { name: 'Save class', exact: true }).click(); await expect(entry.getByRole('status')).toHaveText('Saved');
  await page.getByRole('button', { name: 'Combat', exact: true }).click(); await page.getByRole('button', { name: 'Browse Combat Catalog' }).click();
  await page.getByLabel('Search combat entries').fill('dagger'); await page.getByRole('list', { name: 'Matching combat entries' }).getByRole('button').click(); await page.getByRole('button', { name: 'Use Dagger template' }).click();
  const draft = page.getByRole('article', { name: 'New attack', exact: true }); await draft.getByRole('button', { name: 'Save attack', exact: true }).click(); await expect(page.getByRole('article', { name: 'Dagger', exact: true }).getByRole('status')).toHaveText('Saved');
  await page.getByRole('button', { name: 'Magic', exact: true }).click(); await addCatalog(page); await expect(page.getByText(/This spell is unusual/)).toHaveCount(0); await configure(page, 1, '4', '4');
  await page.getByRole('button', { name: 'Combat', exact: true }).click(); await expect(page.getByRole('article', { name: 'Dagger', exact: true }).getByLabel('Damage', { exact: true })).toHaveValue('1d4');
  await page.getByRole('button', { name: 'Magic', exact: true }).click(); await page.screenshot({ path: info.outputPath('character-magic.spec.png'), fullPage: true });
});

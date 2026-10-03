import { expect, type Page } from '@playwright/test';
import { test } from './browser-fixtures';
import { enterAs, isolatedPartyUrl, claimCharacter, openClaimedCharacter, prepareTwoBrowsers, saveInput } from './overview-helpers';

const classes = (page: Page) => page.getByRole('region', { name: 'Classes', exact: true });
const primary = (page: Page) => page.getByRole('article', { name: 'Primary class entry', exact: true });
const additional = (page: Page) => classes(page).getByRole('article').filter({ hasText: 'Additional class' });
async function addClass(page: Page, name = 'Cleric', level = '2') {
  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  const entry = additional(page).last();
  await entry.getByLabel('Class name', { exact: true }).fill(name);
  await entry.getByLabel('Class level', { exact: true }).fill(level);
  await entry.getByRole('button', { name: 'Save class', exact: true }).click();
  await expect(entry.getByRole('status')).toHaveText('Saved');
  return entry;
}

test('multiclass entries update totals, Derived Values, primary identity and Party summary after reload', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page);
  await page.getByLabel('Spellcasting Ability').selectOption('wisdom');
  await page.getByLabel('Perception', { exact: true }).selectOption('expertise');
  await page.getByLabel('Wisdom saving throw proficiency').selectOption('proficient');
  const entry = await addClass(page);
  await expect(classes(page)).toContainText('Total level: 5');
  await expect(page.getByLabel('Proficiency bonus value', { exact: true })).toHaveText('+3');
  await expect(page.getByLabel('Perception modifier value', { exact: true })).toHaveText('+7');
  await expect(page.getByLabel('Passive Perception value', { exact: true })).toHaveText('17');
  await expect(page.getByLabel('Wisdom saving throw modifier value', { exact: true })).toHaveText('+4');
  await expect(page.getByLabel('Spell save DC value', { exact: true })).toHaveText('12');
  await expect(page.getByLabel('Spell attack modifier value', { exact: true })).toHaveText('+4');
  await entry.getByLabel('Class level').fill('3');
  await entry.getByLabel('Class level').press('Enter');
  await expect(entry.getByRole('status')).toHaveText('Saved');
  await expect(classes(page)).toContainText('Total level: 6');
  await expect(primary(page).getByLabel('Primary class', { exact: true })).toHaveValue('Rogue');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/ticket14-${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Back to the Party' }).click();
  const card = page.getByRole('article', { name: 'Neris Vale, played by Mara' });
  await expect(card).toContainText('Level 6 · Rogue 3 (primary) / Cleric 3 · Thief');
  await page.reload(); await expect(card).toContainText('Level 6 · Rogue 3 (primary) / Cleric 3 · Thief');
  await openClaimedCharacter(page);
  await additional(page).getByRole('button', { name: 'Remove class' }).click();
  await expect(additional(page)).toHaveCount(0);
  await expect(classes(page)).toContainText('Total level: 3');
  await expect(page.getByLabel('Proficiency bonus value', { exact: true })).toHaveText('+2');
  await page.reload(); await openClaimedCharacter(page);
  await expect(additional(page)).toHaveCount(0);
});

test('invalid class levels and totals remain unsaved while the primary cannot be removed', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page);
  await expect(primary(page).getByRole('button', { name: 'Remove class' })).toHaveCount(0);
  for (const value of ['0', '-1', '1.5', '21', '']) {
    await primary(page).getByLabel('Level', { exact: true }).fill(value);
    await primary(page).getByRole('button', { name: 'Save class' }).click();
    await expect(primary(page).getByRole('alert')).toContainText('Class levels must be whole numbers');
    await expect(classes(page)).toContainText('Total level: 3');
  }
  await primary(page).getByRole('button', { name: 'Discard changes' }).click();
  await addClass(page, 'Cleric', '17');
  await primary(page).getByLabel('Level', { exact: true }).fill('4');
  await primary(page).getByRole('button', { name: 'Save class' }).click();
  await expect(primary(page).getByRole('alert')).toContainText('Not saved');
  await expect(classes(page)).toContainText('Total level: 20');
  await page.reload(); await openClaimedCharacter(page);
  await expect(primary(page).getByLabel('Level', { exact: true })).toHaveValue('3');
});

test('two sessions retain independent class and Overview edits and show the shared summary live', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, info);
  await addClass(page);
  await expect(additional(otherPage).getByLabel('Class level')).toHaveValue('2');
  await primary(page).getByLabel('Level', { exact: true }).fill('4');
  await additional(otherPage).getByLabel('Class level').fill('3');
  await Promise.all([
    primary(page).getByRole('button', { name: 'Save class' }).click(),
    additional(otherPage).getByRole('button', { name: 'Save class' }).click(),
  ]);
  await expect(primary(page).getByRole('status')).toHaveText('Saved');
  await expect(additional(otherPage).getByRole('status')).toHaveText('Saved');
  await expect(classes(page)).toContainText('Total level: 7');
  await expect(classes(otherPage)).toContainText('Total level: 7');
  await saveInput(otherPage, 'Armor Class', '18');
  await expect(page.getByLabel('Armor Class', { exact: true })).toHaveValue('18');
  await otherPage.getByRole('button', { name: 'Back to the Party' }).click();
  await primary(page).getByLabel('Primary class', { exact: true }).fill('Ranger');
  await primary(page).getByRole('button', { name: 'Save class' }).click();
  await expect(otherPage.getByRole('article', { name: 'Neris Vale, played by Mara' })).toContainText('Level 7 · Ranger 4 (primary) / Cleric 3 · Thief');
  await otherContext.close();
});

test('same-entry conflicts retain drafts and explicit retry converges without losing other fields', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, info);
  await primary(page).getByLabel('Level', { exact: true }).fill('5');
  await primary(otherPage).getByLabel('Level', { exact: true }).fill('4');
  await primary(otherPage).getByRole('button', { name: 'Save class' }).click();
  await expect(classes(page)).toContainText('Total level: 4');
  await saveInput(otherPage, 'Speed (feet)', '40');
  await primary(page).getByRole('button', { name: 'Save class' }).click();
  await expect(primary(page).getByRole('alert')).toContainText('Changed elsewhere');
  await expect(primary(page).getByLabel('Level', { exact: true })).toHaveValue('5');
  await expect(classes(otherPage)).toContainText('Total level: 4');
  await primary(page).getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(primary(page).getByRole('status')).toHaveText('Saved');
  await expect(classes(otherPage)).toContainText('Total level: 5');
  await expect(page.getByLabel('Speed (feet)')).toHaveValue('40');
  await otherContext.close();
});

test('remote removal keeps an unsaved draft visible without resurrecting its class', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, info);
  await addClass(page);
  await expect(additional(otherPage).getByLabel('Class level')).toHaveValue('2');
  await additional(page).getByLabel('Class level').fill('4');
  await additional(otherPage).getByRole('button', { name: 'Remove class' }).click();
  await expect(additional(page)).toContainText('Removed elsewhere');
  await expect(additional(page).getByLabel('Class level')).toHaveValue('4');
  await expect(classes(page)).toContainText('Total level: 3');
  await additional(page).getByRole('button', { name: 'Discard changes' }).click();
  await expect(additional(page)).toHaveCount(0);
  await otherContext.close();
});

test('failed class saves preserve drafts for retry and acknowledged reload', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page);
  let failed = false;
  await page.route('**/__drowned_compass_test_party?*', route => {
    if (route.request().method() === 'PATCH' && route.request().postDataJSON().classEdit && !failed) {
      failed = true; return route.fulfill({ status: 503, json: {} });
    }
    return route.continue();
  });
  await primary(page).getByLabel('Level', { exact: true }).fill('5');
  await primary(page).getByRole('button', { name: 'Save class' }).click();
  await expect(primary(page).getByRole('alert')).toContainText('Not saved');
  await expect(primary(page).getByLabel('Level', { exact: true })).toHaveValue('5');
  await expect(classes(page)).toContainText('Total level: 3');
  await primary(page).getByRole('button', { name: 'Retry' }).click();
  await expect(primary(page).getByRole('status')).toHaveText('Saved');
  await page.reload(); await openClaimedCharacter(page);
  await expect(classes(page)).toContainText('Total level: 5');
});

test('delayed save responses cannot replace newer accepted classes or unrelated fields', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, info);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let ready!: () => void; const responseReady = new Promise<void>(resolve => { ready = resolve; });
  await page.route('**/__drowned_compass_test_party?*', async route => {
    if (route.request().method() !== 'PATCH' || !route.request().postDataJSON().classEdit) return route.continue();
    const response = await route.fetch(); ready(); await gate; await route.fulfill({ response });
  });
  await primary(page).getByLabel('Level', { exact: true }).fill('4');
  await primary(page).getByRole('button', { name: 'Save class' }).click();
  await responseReady;
  await expect(primary(otherPage).getByLabel('Level', { exact: true })).toHaveValue('4');
  await primary(otherPage).getByLabel('Level', { exact: true }).fill('5');
  await primary(otherPage).getByRole('button', { name: 'Save class' }).click();
  await expect(primary(otherPage).getByRole('status')).toHaveText('Saved');
  await saveInput(otherPage, 'Armor Class', '19');
  await expect(page.getByLabel('Armor Class', { exact: true })).toHaveValue('19');
  release();
  await expect(primary(page).getByRole('status')).toHaveText('Saved');
  await expect(primary(page).getByLabel('Level', { exact: true })).toHaveValue('5');
  await expect(classes(page)).toContainText('Total level: 5');
  await otherContext.close();
});

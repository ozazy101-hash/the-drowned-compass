import { test } from './browser-fixtures';
import { expect, type Page } from '@playwright/test';
import { claimCharacter, enterAs, isolatedPartyUrl, prepareTwoBrowsers, saveInput } from './overview-helpers';
const panel = (page: Page) => page.getByRole('region', { name: 'Hit Points and survival' });
async function correction(page: Page, field: string, value: string) {
  await panel(page).getByLabel('Correct health field').selectOption(field);
  await panel(page).getByLabel('Corrected Hit Points').fill(value);
  await panel(page).getByRole('button', { name: 'Save HP correction' }).click();
  await expect(panel(page).getByRole('status')).toHaveText('Saved');
}
async function action(page: Page, name: string, amount: string) {
  await panel(page).getByLabel('Damage or healing amount').fill(amount);
  await panel(page).getByRole('button', { name, exact: true }).click();
  await expect(panel(page).getByRole('status')).toHaveText('Saved');
}
test('health actions, correction, undo, survival state and reload are usable at the table', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page,'Player'); await claimCharacter(page);
  await saveInput(page,'Maximum Hit Points','20');
  await correction(page,'current','20'); await correction(page,'temporary','5');
  await action(page,'Apply Damage','12'); await expect(panel(page)).toContainText('Current HP: 13 / 20');
  await expect(panel(page)).not.toContainText('Temporary HP:');
  await panel(page).getByRole('button',{name:'Undo recent HP action'}).click();
  await expect(panel(page)).toContainText('Current HP: 20 / 20 · Temporary HP: 5');
  await expect(panel(page).getByRole('button',{name:'Undo recent HP action'})).toBeDisabled();
  await action(page,'Apply Damage','99'); await expect(panel(page)).toContainText('Downed · Unconscious');
  await panel(page).getByLabel('Death-save successes').selectOption('3');
  await expect(panel(page).getByRole('status')).toHaveText('Saved');
  await panel(page).getByLabel('Death-save failures').selectOption('1');
  await expect(panel(page).getByRole('status')).toHaveText('Saved');
  await panel(page).getByLabel('Heroic Inspiration').check();
  await expect(panel(page).getByRole('status')).toHaveText('Saved');
  await page.getByRole('button',{name:'Back to the Party'}).click();
  const card = page.getByRole('article',{name:'Neris Vale, played by Mara'});
  await expect(card).toContainText('Downed · Stable'); await expect(card).toContainText('3 successes, 1 failures');
  await expect(card).toContainText('Heroic Inspiration'); await page.reload(); await expect(card).toContainText('0 / 20');
  await card.getByRole('button').click(); await action(page,'Heal','99'); await expect(panel(page)).toContainText('Current HP: 20 / 20');
  await correction(page,'current','27'); await expect(panel(page)).toContainText('Current HP: 27 / 20');
  await panel(page).getByLabel('Unconscious (manual)').check(); await expect(panel(page).getByRole('status')).toHaveText('Saved');
  await expect(panel(page)).toContainText('Unconscious');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel(page).scrollIntoViewIfNeeded();
  await panel(page).screenshot({path:`/tmp/ticket07-${info.project.name}.png`});
});
test('shared undo preserves unrelated edits and survives navigation; maximum changes invalidate undo', async ({ browser, page }, info) => {
  const {otherPage,otherContext} = await prepareTwoBrowsers(browser,page,info);
  await saveInput(page,'Maximum Hit Points','30'); await correction(page,'current','30');
  await expect(panel(otherPage)).toContainText('Current HP: 30 / 30');
  await action(page,'Apply Damage','7'); await expect(panel(otherPage)).toContainText('Current HP: 23 / 30');
  await saveInput(otherPage,'Armor Class','18');
  await panel(otherPage).getByRole('button',{name:'Undo recent HP action'}).click();
  await expect(panel(page)).toContainText('Current HP: 30 / 30'); await expect(page.getByLabel('Armor Class',{exact:true})).toHaveValue('18');
  await action(page,'Apply Damage','2'); await saveInput(otherPage,'Maximum Hit Points','22');
  await expect(panel(page).getByRole('button',{name:'Undo recent HP action'})).toBeDisabled();
  await page.reload(); await page.getByRole('article',{name:'Neris Vale, played by Mara'}).getByRole('button').click();
  await expect(panel(page)).toContainText('Current HP: 28 / 22');
  await otherContext.close();
});
test('failed saves retain correction draft and retry persists; empty and fractional input cannot change health', async ({page},info) => {
  await page.goto(isolatedPartyUrl(info,'&failSurvivalSaves=once')); await enterAs(page,'Player'); await claimCharacter(page);
  await panel(page).getByLabel('Corrected Hit Points').fill('17');
  await panel(page).getByRole('button',{name:'Save HP correction'}).click();
  await expect(panel(page).getByRole('status')).toContainText('could not reach');
  await expect(panel(page)).toContainText('Current HP: Unknown');
  await panel(page).getByRole('button',{name:'Save HP correction'}).click(); await expect(panel(page)).toContainText('Current HP: 17');
  await panel(page).getByLabel('Damage or healing amount').fill(''); await panel(page).getByRole('button',{name:'Apply Damage'}).click();
  await expect(panel(page).getByRole('status')).toContainText('whole number');
  await panel(page).getByLabel('Damage or healing amount').fill('1.5'); await panel(page).getByRole('button',{name:'Apply Damage'}).click();
  await expect(panel(page).getByRole('status')).toContainText('whole number'); await expect(panel(page)).toContainText('Current HP: 17');
});

test('a delayed shared undo cannot overwrite a newer HP action',async ({browser,page},info) => {
  const {otherPage,otherContext}=await prepareTwoBrowsers(browser,page,info);
  await correction(page,'current','20'); await action(page,'Apply Damage','5');
  await expect(panel(otherPage)).toContainText('Current HP: 15');
  let release!: () => void; let entered!: () => void;
  const held = new Promise<void>(resolve => {release=resolve;}); const ready = new Promise<void>(resolve => {entered=resolve;});
  await page.route('**/__drowned_compass_test_party?*',async route => {
    if(route.request().method()==='PATCH' && route.request().postDataJSON().survivalCommand?.kind==='undo') {entered(); await held;}
    await route.continue();
  });
  await panel(page).getByRole('button',{name:'Undo recent HP action'}).click(); await ready;
  await action(otherPage,'Apply Damage','3'); release();
  await expect(panel(page).getByRole('status')).toContainText('changed elsewhere');
  await expect(panel(page)).toContainText('Current HP: 12');
  await panel(page).getByRole('button',{name:'Undo recent HP action'}).click();
  await expect(panel(page).getByRole('status')).toHaveText('Saved'); await expect(panel(otherPage)).toContainText('Current HP: 15');
  await otherContext.close();
});

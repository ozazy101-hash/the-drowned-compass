import { test } from './browser-fixtures';
import { expect, type Page } from '@playwright/test';
import { claimCharacter, enterAs, isolatedPartyUrl, prepareTwoBrowsers, saveInput } from './overview-helpers';
const panel = (page: Page) => page.getByRole('region', { name: 'Health' });
async function correction(page: Page, value: string) {
  const details = panel(page).locator('details');
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
  await panel(page).getByLabel('Current Hit Points', {exact:true}).fill(value);
  await panel(page).getByRole('button', { name: 'Save Current Hit Points' }).click();
  await expect(panel(page).getByRole('status')).toHaveText('Saved');
}
async function action(page: Page, name: string, amount: string) {
  await panel(page).getByLabel('Amount',{exact:true}).fill(amount);
  await panel(page).getByRole('button', { name, exact: true }).click();
  await expect(panel(page).getByRole('status')).toHaveText('Saved');
}
test('health actions, correction, survival state and reload are usable at the table', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page,'Player'); await claimCharacter(page);
  await saveInput(page,'Maximum Hit Points','20');
  await expect(panel(page).getByRole('button',{name:'Subtract one Hit Point'})).toBeDisabled();
  await expect(panel(page).getByRole('button',{name:'Add one Hit Point'})).toBeDisabled();
  await correction(page,'20');
  await expect(panel(page).getByRole('button',{name:'Add one Hit Point'})).toBeDisabled();
  await panel(page).getByRole('button',{name:'Subtract one Hit Point'}).focus(); await page.keyboard.press('Enter'); await expect(panel(page)).toContainText('Current HP: 19 / 20');
  await panel(page).getByRole('button',{name:'Add one Hit Point'}).click(); await expect(panel(page)).toContainText('Current HP: 20 / 20');
  await action(page,'Subtract','12'); await expect(panel(page)).toContainText('Current HP: 8 / 20');
  await action(page,'Subtract','99'); await expect(panel(page)).toContainText('Downed · Unconscious');
  await expect(panel(page).getByRole('button',{name:'Subtract one Hit Point'})).toBeDisabled();
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
  await card.getByRole('button').click(); await action(page,'Add','99'); await expect(panel(page)).toContainText('Current HP: 20 / 20');
  await correction(page,'17'); await expect(panel(page)).toContainText('Current HP: 17 / 20');
  await panel(page).getByLabel('Unconscious (manual)').check(); await expect(panel(page).getByRole('status')).toHaveText('Saved');
  await expect(panel(page)).toContainText('Unconscious');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel(page).scrollIntoViewIfNeeded();
  await panel(page).screenshot({path: info.outputPath('survival.spec.png')});
});
test('failed saves retain correction draft and retry persists; empty and fractional input cannot change health', async ({page},info) => {
  await page.goto(isolatedPartyUrl(info,'&failSurvivalSaves=once')); await enterAs(page,'Player'); await claimCharacter(page);
  await panel(page).locator('summary').click();
  await saveInput(page,'Maximum Hit Points','20');
  await panel(page).getByLabel('Current Hit Points', {exact:true}).fill('17');
  await panel(page).getByRole('button',{name:'Save Current Hit Points'}).click();
  await expect(panel(page).getByRole('status')).toContainText('could not reach');
  await expect(panel(page)).toContainText('Current HP: Unknown');
  await panel(page).getByRole('button',{name:'Save Current Hit Points'}).click(); await expect(panel(page)).toContainText('Current HP: 17');
  await panel(page).getByLabel('Amount',{exact:true}).fill(''); await panel(page).getByRole('button',{name:'Subtract',exact:true}).click();
  await expect(panel(page).getByRole('status')).toContainText('whole number');
  await panel(page).getByLabel('Amount',{exact:true}).fill('1.5'); await panel(page).getByRole('button',{name:'Subtract',exact:true}).click();
  await expect(panel(page).getByRole('status')).toContainText('whole number'); await expect(panel(page)).toContainText('Current HP: 17');
});

test('a delayed shared subtraction cannot overwrite a newer HP action',async ({browser,page},info) => {
  const {otherPage,otherContext}=await prepareTwoBrowsers(browser,page,info);
  await saveInput(page,'Maximum Hit Points','20'); await correction(page,'20'); await action(page,'Subtract','5');
  await expect(panel(otherPage)).toContainText('Current HP: 15');
  let release!: () => void; let entered!: () => void;
  const held = new Promise<void>(resolve => {release=resolve;}); const ready = new Promise<void>(resolve => {entered=resolve;});
  await page.route('**/__drowned_compass_test_party?*',async route => {
    if(route.request().method()==='PATCH' && route.request().postDataJSON().survivalCommand?.kind==='subtract') {entered(); await held;}
    await route.continue();
  });
  await panel(page).getByRole('button',{name:'Subtract one Hit Point'}).click(); await ready;
  await action(otherPage,'Subtract','3'); release();
  await expect(panel(page).getByRole('status')).toContainText('changed elsewhere');
  await expect(panel(page)).toContainText('Current HP: 12');
  await panel(page).getByRole('button',{name:'Subtract one Hit Point'}).click();
  await expect(panel(page).getByRole('status')).toHaveText('Saved'); await expect(panel(otherPage)).toContainText('Current HP: 11');
  await otherContext.close();
});

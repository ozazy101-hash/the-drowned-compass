import { test, createPartyBrowserContext } from './browser-fixtures';
import { expect } from '@playwright/test';
import { enterAs, claimCharacter, isolatedPartyUrl } from './overview-helpers';

async function prepare(page: import('@playwright/test').Page, info: import('@playwright/test').TestInfo, extra = '') {
  await page.goto(isolatedPartyUrl(info, extra)); await enterAs(page, 'Player'); await claimCharacter(page);
  await page.getByText('Add standard Conditions', { exact: true }).click();
}
test('search, duplicate prevention, custom naming, removal and reload remain Character-scoped', async ({ page }, info) => {
  await prepare(page, info);
  await page.getByLabel('Search standard Conditions').fill('con');
  await expect(page.getByRole('button', { name: 'Add Unconscious', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Blinded', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add Unconscious', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unconscious — active', exact: true })).toBeDisabled();
  await page.getByLabel('Custom Condition name').fill('Sea Curse'); await page.getByRole('button', { name: 'Add Custom Condition', exact: true }).click();
  await expect(page.getByText('Sea Curse (Custom)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rename Sea Curse Condition' }).click();
  await page.getByLabel('New name for Sea Curse').fill('Marked by the Deep'); await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByText('Marked by the Deep (Custom)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Back to the Party' }).click();
  const card = page.getByRole('article', { name: 'Neris Vale, played by Mara' });
  await expect(card.getByRole('button', { name: 'Unconscious rules' })).toBeVisible();
  await expect(card.getByText('Marked by the Deep (Custom)', { exact: true })).toBeVisible();
  await page.reload(); await expect(card.getByRole('button', { name: 'Unconscious rules' })).toBeVisible();
  await card.getByRole('button', { name: 'Open Neris Vale Character Page', exact: true }).click();
  await page.getByText('Add standard Conditions', { exact: true }).click();
  await page.getByRole('button', { name: 'Remove Unconscious Condition' }).click();
  await expect(page.getByRole('button', { name: 'Unconscious rules' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove Marked by the Deep Condition' }).click();
  await expect(page.getByText('No active Conditions', { exact: true })).toBeVisible();
  await page.getByLabel('Search standard Conditions').fill('uncon'); await page.getByRole('button', { name: 'Add Unconscious', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unconscious rules' })).toBeVisible();
  await page.getByLabel('Search standard Conditions').fill('marked'); await expect(page.getByText('No standard Conditions match.')).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => innerWidth));
});

test('Rules Tooltips support focus, nested keyboard navigation, dismissal and focus return', async ({ page }, info) => {
  await prepare(page, info); await page.getByRole('button', { name: 'Add Unconscious', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Unconscious rules' });
  await trigger.focus();
  const dialog = page.getByRole('dialog', { name: 'Unconscious', exact: true });
  await expect(dialog).toBeVisible(); await trigger.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close rules', exact: true })).toBeFocused();
  const nested = dialog.getByRole('button', { name: 'Incapacitated', exact: true });
  await nested.focus(); await nested.press('Enter');
  const child = page.getByRole('dialog', { name: 'Incapacitated', exact: true });
  await expect(child).toBeVisible(); await expect(child.getByRole('button', { name: 'Back to previous rule' })).toBeFocused();
  await page.screenshot({ path: `/tmp/ticket08-${info.project.name}-rules.png` });
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible(); await expect(nested).toBeFocused();
  const repeated = dialog.getByRole('button', { name: 'Prone', exact: true }).nth(1);
  await repeated.click(); await expect(page.getByRole('dialog', { name: 'Prone', exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(repeated).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(trigger).toBeFocused();
  await trigger.press('Tab'); await page.getByRole('button', { name: 'Remove Unconscious Condition' }).press('Shift+Tab');
  await expect(dialog).toBeVisible();
  await trigger.press('Enter'); await dialog.getByRole('button', { name: 'Dismiss all rules' }).click();
  await expect(trigger).toBeFocused(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await trigger.press('Enter'); await dialog.getByRole('button', { name: 'Dismiss all rules' }).focus(); await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Remove Unconscious Condition' })).toBeFocused();
});

test('hover or mobile tap follows nested terms and outside dismissal on Character Page and Party Dashboard', async ({ page }, info) => {
  await prepare(page, info); await page.getByRole('button', { name: 'Add Paralyzed', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Paralyzed rules' });
  if (info.project.use.hasTouch) await trigger.tap(); else await trigger.hover();
  const dialog = page.getByRole('dialog', { name: 'Paralyzed', exact: true }); await expect(dialog).toBeVisible();
  if (!info.project.use.hasTouch) {
    await page.mouse.move(0, 0); await expect(page.getByRole('dialog')).toHaveCount(0);
    await trigger.hover(); await expect(dialog).toBeVisible();
  }
  if (info.project.use.hasTouch) await dialog.getByRole('button', { name: 'Incapacitated', exact: true }).tap();
  else await dialog.getByRole('button', { name: 'Incapacitated', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Incapacitated', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to previous rule' }).click(); await expect(dialog).toBeVisible();
  await page.getByRole('heading', { level: 1, name: 'Neris Vale' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '← Back to the Party' }).click();
  await page.getByRole('button', { name: 'Paralyzed rules' }).click(); await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Neris Vale Character Page', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close rules', exact: true }).click(); await expect(page.getByRole('button', { name: 'Paralyzed rules' })).toBeFocused();
});

test('Conditions synchronize in two browsers without overwriting independent Overview edits', async ({ browser, page }, info) => {
  const other = await createPartyBrowserContext(browser, info); const dm = await other.newPage();
  await prepare(page, info); await dm.goto(isolatedPartyUrl(info)); await enterAs(dm, 'Dungeon Master');
  await page.getByRole('button', { name: 'Add Poisoned', exact: true }).click();
  await expect(dm.getByRole('button', { name: 'Poisoned rules' })).toBeVisible();
  await dm.getByRole('button', { name: 'Open Neris Vale Character Page', exact: true }).click();
  await Promise.all([page.getByRole('button', { name: 'Add Prone', exact: true }).click(), dm.getByLabel('Armor Class', { exact: true }).fill('17')]);
  await dm.getByLabel('Armor Class', { exact: true }).press('Enter'); await expect(page.getByLabel('Armor Class', { exact: true })).toHaveValue('17');
  await dm.getByRole('button', { name: 'Remove Poisoned Condition' }).click(); await expect(page.getByRole('button', { name: 'Poisoned rules' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prone rules' })).toBeVisible(); await other.close();
});

test('a failed save is visible and retry persists the intended Condition', async ({ page }, info) => {
  await prepare(page, info, '&failConditionSaves=once'); await page.getByRole('button', { name: 'Add Blinded', exact: true }).click();
  await expect(page.getByText('The save could not reach the Party.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Blinded rules' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry Condition save' }).click(); await expect(page.getByRole('button', { name: 'Blinded rules' })).toBeVisible();
  await page.getByRole('button', { name: '← Back to the Party' }).click(); await page.reload(); await expect(page.getByRole('button', { name: 'Blinded rules' })).toBeVisible();
});


test('typing the next Custom Condition during a pending save preserves the newer draft', async ({ page }, info) => {
  await prepare(page, info, '&slowConditionSaves=once');
  const input = page.getByLabel('Custom Condition name');
  await input.fill('Sea Curse'); await page.getByRole('button', { name: 'Add Custom Condition', exact: true }).click();
  await input.fill('Marked by the Deep');
  await expect(page.getByText('Sea Curse (Custom)', { exact: true })).toBeVisible();
  await expect(input).toHaveValue('Marked by the Deep');
  await page.getByRole('button', { name: 'Add Custom Condition', exact: true }).click();
  await expect(page.getByText('Marked by the Deep (Custom)', { exact: true })).toBeVisible();
});

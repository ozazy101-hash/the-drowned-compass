import { test } from "./browser-fixtures";
import { expect, type Page } from '@playwright/test';
import { enterAs, isolatedPartyUrl, claimCharacter, openClaimedCharacter, saveInput, expectSaveFeedback, prepareTwoBrowsers } from './overview-helpers';

function value(page: Page, label: string) { return page.getByLabel(`${label} value`, { exact:true }); }
function group(page: Page, label: string) { return page.getByRole('group', { name:label, exact:true }); }
async function overrideValue(page: Page, label: string, next: string) {
  const editor = group(page,label);
  const input = page.getByLabel(`${label} override`, { exact:true });
  if (!(await input.count())) {
    const button = editor.getByRole('button', { name:`Override ${label}`, exact:true });
    await button.focus(); await button.press('Enter');
  }
  await saveInput(page,`${label} override`,next);
  await expect(editor.locator('.derived-field__source')).toContainText('Override · calculated:');
}

test('Derived Values follow accepted Ability, level, proficiency and spellcasting inputs', async ({ page }, testInfo) => {
  await page.goto(isolatedPartyUrl(testInfo)); await enterAs(page,'Player'); await claimCharacter(page);
  await expect(value(page,'Strength modifier')).toHaveText('-1');
  await expect(value(page,'Dexterity modifier')).toHaveText('+3');
  await expect(value(page,'Proficiency bonus')).toHaveText('+2');
  await expect(value(page,'Initiative')).toHaveText('+3');
  await page.getByLabel('Perception', { exact:true }).selectOption('expertise');
  await expect(value(page,'Perception modifier')).toHaveText('+5');
  await expect(value(page,'Passive Perception')).toHaveText('15');
  await saveInput(page,'Level','5');
  await expect(value(page,'Proficiency bonus')).toHaveText('+3');
  await expect(value(page,'Perception modifier')).toHaveText('+7');
  const save = page.getByLabel('Wisdom saving throw proficiency');
  await save.selectOption('expertise'); await expectSaveFeedback(page,save,'Saved');
  await expect(value(page,'Wisdom saving throw modifier')).toHaveText('+7');
  await page.getByLabel('Spellcasting Ability').selectOption('wisdom');
  await expect(value(page,'Spell attack modifier')).toHaveText('+4');
  await expect(value(page,'Spell save DC')).toHaveText('12');
  await saveInput(page,'Wisdom','8');
  await expect(value(page,'Perception modifier')).toHaveText('+5');
  await expect(value(page,'Passive Perception')).toHaveText('15');
  await expect(value(page,'Spell attack modifier')).toHaveText('+2');
  await expect(value(page,'Spell save DC')).toHaveText('10');
  await page.screenshot({ path:`/tmp/drowned-compass-derived-${testInfo.project.name}.png`,fullPage:true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('every displayed Derived Value supports a keyboard zero override and reset', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.goto(isolatedPartyUrl(testInfo)); await enterAs(page,'Player'); await claimCharacter(page);
  const labels = await page.locator('.derived-field').evaluateAll(editors => editors.map(editor => editor.getAttribute('aria-label')!));
  expect(labels).toHaveLength(35);
  for (const label of labels) {
    const calculated = await value(page,label).textContent();
    await overrideValue(page,label,'0');
    await expect(value(page,label)).toHaveText(label === 'Passive Perception' || label === 'Spell save DC' ? '0' : '+0');
    await group(page,label).getByRole('button', { name:`Reset ${label}`, exact:true }).click();
    await expect(group(page,label).locator('.save-feedback')).toHaveText('Saved');
    await expect(value(page,label)).toHaveText(calculated!);
    await expect(group(page,label).locator('.derived-field__source')).toHaveText('Calculated');
  }
});

test('overrides feed dependencies, persist on reload, and unset spell statistics stay honest', async ({ page }, testInfo) => {
  await page.goto(isolatedPartyUrl(testInfo)); await enterAs(page,'Player'); await claimCharacter(page);
  await expect(value(page,'Spell attack modifier')).toHaveText('Not set');
  await expect(value(page,'Spell save DC')).toHaveText('Not set');
  await overrideValue(page,'Spell attack modifier','0');
  await expect(value(page,'Spell save DC')).toHaveText('Not set');
  await overrideValue(page,'Wisdom modifier','4');
  await page.getByLabel('Perception', { exact:true }).selectOption('expertise');
  await expect(value(page,'Passive Perception')).toHaveText('18');
  await overrideValue(page,'Proficiency bonus','0');
  await expect(value(page,'Perception modifier')).toHaveText('+4');
  await overrideValue(page,'Perception modifier','0');
  await expect(value(page,'Passive Perception')).toHaveText('10');
  await page.reload(); await openClaimedCharacter(page);
  await expect(value(page,'Spell attack modifier')).toHaveText('+0');
  await expect(value(page,'Passive Perception')).toHaveText('10');
  await expect(page.getByLabel('Wisdom', { exact:true })).toHaveValue('12');
  await group(page,'Spell attack modifier').getByRole('button', { name:'Reset Spell attack modifier' }).click();
  await expect(value(page,'Spell attack modifier')).toHaveText('Not set');
});

test('a rejected override remains unsaved and reset shows its calculation before acknowledgement', async ({ page }, testInfo) => {
  await page.goto(isolatedPartyUrl(testInfo,'&failOverviewSaves=once')); await enterAs(page,'Player'); await claimCharacter(page);
  await group(page,'Initiative').getByRole('button', { name:'Override Initiative' }).click();
  const input = page.getByLabel('Initiative override');
  await input.fill('0'); await input.press('Enter');
  await expect(group(page,'Initiative').getByRole('alert')).toContainText('Not saved');
  await expect(input).toHaveValue('0');
  await group(page,'Initiative').getByRole('button', { name:'Retry' }).click();
  await expectSaveFeedback(page,input,'Saved');
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/__drowned_compass_test_party?*', async route => {
    if (route.request().method() !== 'PATCH') return route.continue();
    await gate; await route.continue();
  });
  await group(page,'Initiative').getByRole('button', { name:'Reset Initiative' }).click();
  await expect(value(page,'Initiative')).toHaveText('+3');
  await expect(group(page,'Initiative').locator('.save-feedback')).toHaveText('Saving…');
  release();
  await expect(group(page,'Initiative').locator('.save-feedback')).toHaveText('Saved');
  await page.reload(); await openClaimedCharacter(page);
  await expect(value(page,'Initiative')).toHaveText('+3');
});

test('two sessions preserve independent overrides and reject a stale same-override draft', async ({ browser,page },testInfo) => {
  const { otherPage, otherContext } = await prepareTwoBrowsers(browser,page,testInfo);
  await overrideValue(page,'Initiative','0');
  await overrideValue(otherPage,'Perception modifier','8');
  await expect(value(page,'Passive Perception')).toHaveText('18');
  await expect(value(otherPage,'Initiative')).toHaveText('+0');
  let release!: () => void; let ready!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requestReady = new Promise<void>(resolve => { ready = resolve; });
  let held = false;
  await page.route('**/__drowned_compass_test_party?*', async route => {
    if (route.request().method() !== 'PATCH' || held) return route.continue();
    held = true; ready(); await gate; await route.continue();
  });
  const control = page.getByLabel('Initiative override');
  await control.fill('9'); await control.press('Enter'); await requestReady;
  await overrideValue(otherPage,'Initiative','2');
  release();
  await expect(group(page,'Initiative').getByRole('alert')).toContainText('Changed elsewhere');
  await expect(control).toHaveValue('9');
  await group(page,'Initiative').getByRole('button', { name:'Retry' }).click();
  await expectSaveFeedback(page,control,'Saved');
  await expect(value(otherPage,'Initiative')).toHaveText('+9');
  await expect(value(otherPage,'Passive Perception')).toHaveText('18');
  await otherContext.close();
});

test('an older override save response preserves newer typing and independent realtime values', async ({ browser,page },testInfo) => {
  const { otherPage, otherContext } = await prepareTwoBrowsers(browser,page,testInfo);
  await overrideValue(page,'Initiative','0');
  let release!: () => void; let ready!: () => void;
  const gate = new Promise<void>(resolve => { release=resolve; });
  const responseReady = new Promise<void>(resolve => { ready=resolve; });
  let held=false;
  await page.route('**/__drowned_compass_test_party?*',async route => {
    if (route.request().method() !== 'PATCH' || held) return route.continue();
    held=true; const response=await route.fetch(); ready(); await gate; await route.fulfill({ response });
  });
  const input=page.getByLabel('Initiative override');
  await input.fill('1'); await input.press('Enter'); await responseReady;
  await input.fill('7');
  await overrideValue(otherPage,'Perception modifier','8');
  await expect(value(page,'Passive Perception')).toHaveText('18');
  await expect(value(otherPage,'Initiative')).toHaveText('+1');
  await overrideValue(otherPage,'Initiative','2');
  release();
  await expect(group(page,'Initiative').getByRole('alert')).toContainText('newer changes');
  await expect(input).toHaveValue('7');
  await expect(value(page,'Passive Perception')).toHaveText('18');
  await group(page,'Initiative').getByRole('button', { name:'Retry' }).click();
  await expectSaveFeedback(page,input,'Saved');
  await expect(value(otherPage,'Initiative')).toHaveText('+7');
  await otherContext.close();
});

test('legacy local Character Records preserve boolean proficiency choices on load', async ({ page }) => {
  await page.goto('./'); await enterAs(page,'Player'); await claimCharacter(page);
  await page.evaluate(() => {
    const party=JSON.parse(localStorage.getItem('drowned-compass-party')!);
    const character=party.slots[0].character;
    character.savingThrowProficiencies={ strength:false,dexterity:true,constitution:false,intelligence:false,wisdom:true,charisma:false };
    delete character.derivedOverrides;
    localStorage.setItem('drowned-compass-party',JSON.stringify(party));
  });
  await page.reload(); await openClaimedCharacter(page);
  await expect(page.getByLabel('Wisdom saving throw proficiency')).toHaveValue('proficient');
  await expect(page.getByLabel('Strength saving throw proficiency')).toHaveValue('none');
  await expect(value(page,'Wisdom saving throw modifier')).toHaveText('+3');
  await overrideValue(page,'Initiative','0');
  await page.reload(); await openClaimedCharacter(page);
  await expect(value(page,'Initiative')).toHaveText('+0');
});

test('invalid override drafts stay unsaved without replacing the calculated number', async ({ page },testInfo) => {
  await page.goto(isolatedPartyUrl(testInfo)); await enterAs(page,'Player'); await claimCharacter(page);
  await group(page,'Initiative').getByRole('button', { name:'Override Initiative' }).click();
  const control=page.getByLabel('Initiative override');
  await control.fill('1.5'); await control.press('Enter');
  await expect(group(page,'Initiative').getByRole('alert')).toContainText('whole number');
  await expect(value(page,'Initiative')).toHaveText('+3');
  await group(page,'Initiative').getByRole('button', { name:'Reset Initiative' }).click();
  await expect(group(page,'Initiative').locator('.save-feedback')).toHaveText('Saved');
  await expect(value(page,'Initiative')).toHaveText('+3');
});

test('a remote same-field update before local submission keeps the draft stale until explicit Retry', async ({ browser,page },testInfo) => {
  const { otherPage, otherContext } = await prepareTwoBrowsers(browser,page,testInfo);
  await overrideValue(page,'Initiative','0');
  // Both editors must start from the accepted version before this scenario makes one stale.
  await expect(value(otherPage,'Initiative')).toHaveText('+0');
  const control = page.getByLabel('Initiative override');
  await control.fill('9');
  await overrideValue(otherPage,'Initiative','2');
  // Seeing the later independent edit proves that the full remote snapshot,
  // including Initiative's new field version, arrived before local submission.
  await saveInput(otherPage,'Speed (feet)','40');
  await expect(page.getByLabel('Speed (feet)')).toHaveValue('40');
  await control.press('Enter');
  await expect(group(page,'Initiative').getByRole('alert')).toContainText('Changed elsewhere');
  await expect(control).toHaveValue('9');
  await expect(value(otherPage,'Initiative')).toHaveText('+2');
  await group(page,'Initiative').getByRole('button', { name:'Retry' }).click();
  await expectSaveFeedback(page,control,'Saved');
  await expect(value(otherPage,'Initiative')).toHaveText('+9');
  await otherContext.close();
});

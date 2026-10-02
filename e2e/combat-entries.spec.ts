import { expect, test, type Page } from '@playwright/test';
import { abilityScoreKeys, skillKeys } from '../src/domain/party';
import { enterAs, claimCharacter, isolatedPartyUrl, openClaimedCharacter } from './overview-helpers';

async function combat(page: Page) { await page.getByRole('button', { name:'Combat', exact:true }).click(); }

async function prepareCombat(page: Page, url: string) {
  await page.goto(url);
  const namespace = new URL(page.url()).searchParams.get('partyTestId');
  const seed = await page.request.post(`/__drowned_compass_test_party?namespace=${encodeURIComponent(namespace!)}`, { data:{ slotId:'character-slot-1', character:{
    playerName:'Mara',characterName:'Neris Vale',primaryClass:'Rogue',subclass:'Thief',species:'Human',background:'Sailor',level:3,
    abilityScores:Object.fromEntries(abilityScoreKeys.map(key => [key,10])),
    savingThrowProficiencies:Object.fromEntries(abilityScoreKeys.map(key => [key,'none'])),
    skillProficiencies:Object.fromEntries(skillKeys.map(key => [key,'none'])),
    armorClass:10,maxHitPoints:1,speed:30,spellcastingAbility:null,derivedOverrides:{},fieldVersions:{},
  } } });
  expect(seed.ok()).toBe(true);
  await enterAs(page,'Player'); await openClaimedCharacter(page); await combat(page);
}
async function add(page: Page, kind: 'attack' | 'action', name: string) {
  await page.getByRole('button', { name:`Add ${kind}`, exact:true }).click();
  const editor = page.getByRole('article', { name:`New ${kind}`, exact:true });
  await editor.getByLabel('Name', { exact:true }).fill(name);
  if (kind === 'attack') {
    await editor.getByLabel('Attack bonus', { exact:true }).fill('0');
    await editor.getByLabel('Range', { exact:true }).fill('5 feet');
    await editor.getByLabel('Damage', { exact:true }).fill('1d6 + 3');
    await editor.getByLabel('Damage type', { exact:true }).fill('Piercing');
  }
  await editor.getByLabel('Notes', { exact:true }).fill('Player-authored reminder');
  await editor.getByRole('button', { name:`Save ${kind}`, exact:true }).click();
  await expect(page.getByRole('article', { name, exact:true }).getByRole('status')).toHaveText('Saved');
}
async function edit(page: Page, name: string, notes: string) {
  const editor = page.getByRole('article', { name, exact:true });
  await editor.getByLabel('Notes', { exact:true }).fill(notes);
  await expect(editor.getByLabel('Notes', { exact:true })).toHaveValue(notes);
  await editor.getByRole('button', { name:/^Save (attack|action)$/ }).click();
  await expect(editor.getByRole('status')).toHaveText('Saved');
}

test('attacks and actions can be entered, edited, ordered, selected and removed with persistence and keyboard access', async ({ page }, testInfo) => {
  await page.goto(isolatedPartyUrl(testInfo)); await enterAs(page,'Player'); await claimCharacter(page); await combat(page);
  await add(page,'attack','Cutlass'); await add(page,'action','Help'); await add(page,'attack','Harpoon');
  await edit(page,'Help','Distract the foe');
  const harpoon = page.getByRole('article', { name:'Harpoon', exact:true });
  await harpoon.getByLabel('Relevant Ability').selectOption('strength');
  await harpoon.getByRole('button', { name:'Save attack', exact:true }).focus();
  await page.keyboard.press('Enter');
  await expect(harpoon.getByRole('status')).toHaveText('Saved');
  await expect(harpoon.getByLabel('Attack bonus')).toHaveCount(0);
  await harpoon.getByRole('button', { name:'Move up', exact:true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.combat-entry').getByRole('heading', { level:3 })).toHaveText(['Cutlass','Harpoon','Help']);
  await harpoon.getByRole('button', { name:'Move up', exact:true }).click();
  await expect(page.locator('.combat-entry').getByRole('heading', { level:3 })).toHaveText(['Harpoon','Cutlass','Help']);
  await harpoon.getByRole('button', { name:'Move down', exact:true }).click();
  await expect(page.locator('.combat-entry').getByRole('heading', { level:3 })).toHaveText(['Cutlass','Harpoon','Help']);
  await page.getByLabel('Primary attack', { exact:true }).selectOption({ label:'Cutlass' });
  await expect(page.locator('.combat-primary').locator('..').getByRole('status').first()).toHaveText('Saved');
  await page.getByRole('button', { name:'Back to the Party' }).click();
  await expect(page.getByRole('article', { name:'Neris Vale, played by Mara' })).toContainText('Primary attack: Cutlass · +0 to hit · 1d6 + 3 Piercing · 5 feet');
  await page.reload(); await openClaimedCharacter(page); await combat(page);
  await expect(page.getByLabel('Primary attack').locator('option:checked')).toHaveText('Cutlass');
  await expect(page.getByRole('article', { name:'Help', exact:true }).getByLabel('Notes')).toHaveValue('Distract the foe');
  await expect(page.locator('.combat-entry').getByRole('heading', { level:3 })).toHaveText(['Cutlass','Harpoon','Help']);
  await page.getByLabel('Primary attack').selectOption({ label:'Harpoon' });
  await page.getByRole('button', { name:'Back to the Party' }).click();
  await expect(page.getByRole('article', { name:'Neris Vale, played by Mara' })).toContainText('Primary attack: Harpoon · Strength');
  await openClaimedCharacter(page); await combat(page);
  await page.getByRole('article', { name:'Harpoon', exact:true }).getByRole('button', { name:'Remove attack', exact:true }).click();
  await expect(page.getByRole('article', { name:'Harpoon', exact:true })).toHaveCount(0);
  await expect(page.getByLabel('Primary attack')).toHaveValue('');
  await page.getByRole('article', { name:'Help', exact:true }).getByRole('button', { name:'Remove action', exact:true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('article', { name:'Help', exact:true })).toHaveCount(0);
  await page.reload(); await openClaimedCharacter(page); await combat(page);
  await expect(page.locator('.combat-entry').getByRole('heading', { level:3 })).toHaveText(['Cutlass']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('failed creation retains the draft and Retry saves it once', async ({ page }, testInfo) => {
  await prepareCombat(page,isolatedPartyUrl(testInfo,'&failCombatSaves=once'));
  await page.getByRole('button', { name:'Add attack', exact:true }).click();
  const editor = page.getByRole('article', { name:'New attack', exact:true });
  await editor.getByLabel('Name', { exact:true }).fill('Cutlass');
  await editor.getByRole('button', { name:'Save attack', exact:true }).click();
  await expect(editor.getByRole('alert')).toContainText('Not saved');
  await expect(editor.getByLabel('Name', { exact:true })).toHaveValue('Cutlass');
  await editor.getByRole('button', { name:'Retry', exact:true }).click();
  await expect(page.getByRole('article', { name:'Cutlass', exact:true })).toHaveCount(1);
  await page.reload(); await openClaimedCharacter(page); await combat(page);
  await expect(page.getByRole('article', { name:'Cutlass', exact:true })).toHaveCount(1);
});

test('two sessions preserve independent records and reject a stale same-record draft before explicit Retry', async ({ browser, page }, testInfo) => {
  const url = isolatedPartyUrl(testInfo);
  await prepareCombat(page,url);
  await add(page,'attack','Cutlass'); await add(page,'action','Help');
  const other = await browser.newContext({ baseURL:testInfo.project.use.baseURL, viewport:testInfo.project.use.viewport });
  const peer = await other.newPage();
  try {
    await peer.goto(url); await enterAs(peer,'Dungeon Master'); await openClaimedCharacter(peer); await combat(peer);
    await Promise.all([edit(page,'Cutlass','Mara edit'),edit(peer,'Help','DM edit')]);
    await expect(peer.getByRole('article', { name:'Cutlass', exact:true }).getByLabel('Notes')).toHaveValue('Mara edit');
    await expect(page.getByRole('article', { name:'Help', exact:true }).getByLabel('Notes')).toHaveValue('DM edit');
    const draft = page.getByRole('article', { name:'Cutlass', exact:true });
    await draft.getByLabel('Notes').fill('Local draft');
    await edit(peer,'Cutlass','Remote accepted');
    await expect(draft.getByLabel('Notes')).toHaveValue('Local draft');
    // Let the realtime snapshot reach the drafting session before submission.
    await page.getByLabel('Primary attack').selectOption({ label:'Cutlass' });
    await expect(peer.getByLabel('Primary attack')).not.toHaveValue('');
    await draft.getByRole('button', { name:'Save attack', exact:true }).click();
    await expect(draft.getByRole('alert')).toContainText('Changed elsewhere');
    await expect(peer.getByRole('article', { name:'Cutlass', exact:true }).getByLabel('Notes')).toHaveValue('Remote accepted');
    await draft.getByRole('button', { name:'Retry', exact:true }).click();
    await expect(draft.getByRole('status')).toHaveText('Saved');
    await expect(peer.getByRole('article', { name:'Cutlass', exact:true }).getByLabel('Notes')).toHaveValue('Local draft');
    await peer.getByRole('article', { name:'Help', exact:true }).getByRole('button', { name:'Move up', exact:true }).click();
    await expect(page.locator('.combat-entry').getByRole('heading', { level:3 })).toHaveText(['Help','Cutlass']);
    await peer.getByRole('article', { name:'Help', exact:true }).getByRole('button', { name:'Remove action', exact:true }).click();
    await expect(page.getByRole('article', { name:'Help', exact:true })).toHaveCount(0);
  } finally { await other.close(); }
});

test('new typing survives an older save acknowledgement and Retry sends the newer draft', async ({ page }, testInfo) => {
  await prepareCombat(page,isolatedPartyUrl(testInfo)); await add(page,'attack','Cutlass');
  let release!: () => void;
  const held = new Promise<void>(resolve => { release=resolve; });
  let intercepted = false;
  await page.route('**/__drowned_compass_test_party?**', async route => {
    if (route.request().method() !== 'PATCH' || intercepted) { await route.continue(); return; }
    intercepted=true;
    const response = await route.fetch();
    await held;
    await route.fulfill({ response });
  });
  const editor = page.getByRole('article', { name:'Cutlass', exact:true });
  try {
    await editor.getByLabel('Notes').fill('First save');
    await editor.getByRole('button', { name:'Save attack', exact:true }).click();
    await expect(editor.getByRole('status')).toHaveText('Saving…');
    await editor.getByLabel('Notes').fill('Newer typing');
    release();
    await expect(editor.getByRole('alert')).toContainText('Newer changes not saved');
    await expect(editor.getByLabel('Notes')).toHaveValue('Newer typing');
    await editor.getByRole('button', { name:'Retry', exact:true }).click();
    await expect(editor.getByRole('status')).toHaveText('Saved');
    await page.reload(); await openClaimedCharacter(page); await combat(page);
    await expect(page.getByRole('article', { name:'Cutlass', exact:true }).getByLabel('Notes')).toHaveValue('Newer typing');
  } finally { release(); }
});

test('a delayed Party snapshot cannot revive a removed primary attack', async ({ page }, testInfo) => {
  await prepareCombat(page,isolatedPartyUrl(testInfo)); await add(page,'attack','Cutlass');
  await page.getByLabel('Primary attack').selectOption({ label:'Cutlass' });
  await expect(page.getByLabel('Primary attack')).not.toHaveValue('');
  let release!: () => void;
  const held = new Promise<void>(resolve => { release=resolve; });
  let captured = false;
  let delivered = false;
  await page.route('**/__drowned_compass_test_party?**', async route => {
    if (route.request().method() !== 'GET' || captured) { await route.continue(); return; }
    const response=await route.fetch();
    captured=true;
    await held;
    await route.fulfill({ response });
    delivered=true;
  });
  try {
    await expect.poll(() => captured).toBe(true);
    await page.getByRole('article', { name:'Cutlass', exact:true }).getByRole('button', { name:'Remove attack', exact:true }).click();
    await expect(page.getByRole('article', { name:'Cutlass', exact:true })).toHaveCount(0);
    await expect(page.getByLabel('Primary attack')).toHaveValue('');
    release();
    await expect.poll(() => delivered).toBe(true);
    await expect(page.getByRole('article', { name:'Cutlass', exact:true })).toHaveCount(0);
    await expect(page.getByLabel('Primary attack')).toHaveValue('');
  } finally { release(); }
});

test('primary selection, ordering and removal failures expose Retry and keep unrelated records', async ({ page }, testInfo) => {
  await prepareCombat(page,isolatedPartyUrl(testInfo)); await add(page,'attack','Cutlass'); await add(page,'action','Help');
  let failNext = false;
  await page.route('**/__drowned_compass_test_party?**', async route => {
    if (route.request().method() === 'PATCH' && failNext) { failNext=false; await route.abort(); }
    else await route.continue();
  });
  failNext=true;
  await page.getByLabel('Primary attack').selectOption({ label:'Cutlass' });
  const section=page.getByRole('region', { name:'Attacks & Actions' });
  await expect(section.getByRole('alert')).toContainText('Not saved');
  await section.getByRole('button', { name:'Retry', exact:true }).click();
  await expect(page.getByLabel('Primary attack')).not.toHaveValue('');
  const editor=page.getByRole('article', { name:'Cutlass', exact:true });
  failNext=true;
  await editor.getByRole('button', { name:'Move down', exact:true }).click();
  await expect(editor.getByRole('alert')).toContainText('Not saved');
  await editor.getByRole('button', { name:'Retry', exact:true }).click();
  await expect(page.locator('.combat-entry').getByRole('heading', { level:3 })).toHaveText(['Help','Cutlass']);
  failNext=true;
  await editor.getByRole('button', { name:'Remove attack', exact:true }).click();
  await expect(editor.getByRole('alert')).toContainText('Not saved');
  await editor.getByRole('button', { name:'Retry', exact:true }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByLabel('Primary attack')).toHaveValue('');
  await expect(page.getByRole('article', { name:'Help', exact:true }).getByLabel('Notes')).toHaveValue('Player-authored reminder');
});

test('a remote removal preserves unsaved notes until the editor discards them', async ({ page }, testInfo) => {
  await prepareCombat(page,isolatedPartyUrl(testInfo)); await add(page,'attack','Cutlass');
  const editor=page.getByRole('article', { name:'Cutlass', exact:true });
  await editor.getByLabel('Notes').fill('Keep these unsaved notes');
  const namespace=new URL(page.url()).searchParams.get('partyTestId')!;
  const endpoint=`/__drowned_compass_test_party?namespace=${encodeURIComponent(namespace)}`;
  const party=await (await page.request.get(endpoint)).json();
  const id=party.slots[0].character.combatEntries.entries[0].id;
  const removal=await page.request.patch(endpoint,{ data:{ slotId:'character-slot-1',combatCommand:{ type:'remove',id,expectedVersion:1 } } });
  expect(removal.ok()).toBe(true);
  await expect(editor.getByRole('alert')).toContainText('Removed elsewhere');
  await expect(editor.getByLabel('Notes')).toHaveValue('Keep these unsaved notes');
  await expect(editor.getByRole('button', { name:'Save attack', exact:true })).toBeDisabled();
  await editor.getByRole('button', { name:'Discard draft', exact:true }).click();
  await expect(editor).toHaveCount(0);
});

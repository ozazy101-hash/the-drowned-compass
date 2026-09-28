import { expect, test, type Page } from '@playwright/test';
import { claimCharacter, enterAs, isolatedPartyUrl, openClaimedCharacter, prepareTwoBrowsers } from './overview-helpers';

async function area(page: Page, name: 'Features' | 'Story') {
  await page.getByRole('navigation', { name: 'Character Record sections' }).getByRole('button', { name, exact: true }).click();
}
async function saveStory(page: Page, label: string, text: string) {
  const editor = page.getByRole('article', { name: label, exact: true });
  await editor.getByLabel(label, { exact: true }).fill(text);
  await editor.getByRole('button', { name: `Save ${label}`, exact: true }).click();
  await expect(editor.getByRole('status')).toHaveText('Saved');
}

test('all Feature sources and Story fields persist long party-visible text with keyboard and responsive access', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page);
  const longText = ('Salt-stained coat, a compass from an old ally.\n' + 'abyss'.repeat(80) + '\n').repeat(12);
  await area(page, 'Features');
  for (const kind of ['Class', 'Species', 'Background', 'Feat']) {
    await page.getByLabel('Feature source').selectOption({ label: kind });
    await page.getByRole('button', { name: 'Add feature', exact: true }).click();
    const editor = page.getByRole('article', { name: `${kind} feature`, exact: true });
    await editor.getByLabel('Feature name').fill(`${kind} reminder`);
    await editor.getByLabel('Summary').fill(longText);
    await editor.getByLabel('Summary').press('Control+Enter');
    await expect(editor.getByRole('status')).toHaveText('Saved');
  }
  await area(page, 'Story');
  await expect(page.getByText('Visible to the whole Party.', { exact: false }).last()).toBeVisible();
  for (const label of ['Appearance', 'Personality', 'Backstory', 'Allies', 'General notes']) await saveStory(page, label, longText);
  await expect(page.getByRole('textbox', { name: /private|Dungeon Master/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('story-layout.png'), fullPage: true });
  await page.reload(); await openClaimedCharacter(page); await area(page, 'Story');
  for (const label of ['Appearance', 'Personality', 'Backstory', 'Allies', 'General notes']) await expect(page.getByLabel(label, { exact: true })).toHaveValue(longText);
  // Empty Story is a valid correction, rather than an unsaveable field.
  await saveStory(page, 'Allies', '');
  await area(page, 'Features');
  for (const kind of ['Class', 'Species', 'Background', 'Feat']) await expect(page.getByRole('article', { name: `${kind} feature` }).getByLabel('Summary')).toHaveValue(longText);
  await page.getByRole('article', { name: 'Feat feature' }).getByRole('button', { name: 'Remove feature' }).click();
  await expect(page.getByRole('article', { name: 'Feat feature' })).toHaveCount(0);
  await page.reload(); await openClaimedCharacter(page); await area(page, 'Features');
  await expect(page.getByRole('article', { name: 'Feat feature' })).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'Class feature' })).toBeVisible();
});

test('independent Feature and Story edits survive and stale same-field drafts conflict until explicit Retry', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, info);
  try {
    await area(page, 'Features');
    await page.getByRole('button', { name: 'Add feature', exact: true }).click();
    const feature = page.getByRole('article', { name: 'Class feature' });
    await feature.getByLabel('Feature name').fill('Second Wind');
    await feature.getByLabel('Summary').fill('A player-authored reminder, no rules automation.');
    await area(otherPage, 'Story');
    await Promise.all([feature.getByRole('button', { name: 'Save feature' }).click(), saveStory(otherPage, 'Backstory', 'Raised aboard the Gull.')]);
    await expect(feature.getByRole('status')).toHaveText('Saved');
    await area(page, 'Story');
    await expect(page.getByLabel('Backstory', { exact: true })).toHaveValue('Raised aboard the Gull.');
    const backstory = page.getByRole('article', { name: 'Backstory', exact: true });
    await backstory.getByLabel('Backstory').fill('My unfinished draft');
    await saveStory(otherPage, 'Backstory', 'Remote accepted story');
    // Wait for a separate realtime field to prove the snapshot has reached this session.
    await saveStory(otherPage, 'Appearance', 'Scarred cheek');
    await expect(page.getByLabel('Appearance', { exact: true })).toHaveValue('Scarred cheek');
    await expect(backstory.getByLabel('Backstory')).toHaveValue('My unfinished draft');
    await backstory.getByRole('button', { name: 'Save Backstory' }).click();
    await expect(backstory.getByRole('alert')).toContainText('Changed elsewhere');
    await expect(otherPage.getByLabel('Backstory', { exact: true })).toHaveValue('Remote accepted story');
    await backstory.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(backstory.getByRole('status')).toHaveText('Saved');
    await expect(otherPage.getByLabel('Backstory', { exact: true })).toHaveValue('My unfinished draft');
    await area(otherPage, 'Features');
    await expect(otherPage.getByLabel('Feature name')).toHaveValue('Second Wind');
    await area(page, 'Features');
    await feature.getByLabel('Summary').fill('Local feature draft');
    await otherPage.getByLabel('Summary').fill('Remote feature');
    await otherPage.getByRole('button', { name: 'Save feature' }).click();
    await expect(otherPage.getByRole('article', { name: 'Class feature' }).getByRole('status')).toHaveText('Saved');
    await feature.getByRole('button', { name: 'Save feature' }).click();
    await expect(feature.getByRole('alert')).toContainText('Changed elsewhere');
    await feature.getByRole('button', { name: 'Discard changes' }).click();
    await expect(feature.getByLabel('Summary')).toHaveValue('Remote feature');
  } finally { await otherContext.close(); }
});

test('failed Story saves retain text and section drafts while Retry persists it', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info, '&failTextSaves=once')); await enterAs(page, 'Player'); await claimCharacter(page); await area(page, 'Story');
  const editor = page.getByRole('article', { name: 'General notes' });
  await editor.getByLabel('General notes').fill('Remember the debt.\nAsk the crew.');
  await editor.getByRole('button', { name: 'Save General notes' }).click();
  await expect(editor.getByRole('alert')).toContainText('Not saved');
  await area(page, 'Features'); await area(page, 'Story');
  await expect(editor.getByLabel('General notes')).toHaveValue('Remember the debt.\nAsk the crew.');
  await editor.getByRole('button', { name: 'Retry' }).click(); await expect(editor.getByRole('status')).toHaveText('Saved');
  await page.reload(); await openClaimedCharacter(page); await area(page, 'Story');
  await expect(page.getByLabel('General notes', { exact: true })).toHaveValue('Remember the debt.\nAsk the crew.');
});

test('older save acknowledgements preserve newer typing and delayed snapshots preserve newer records', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, info);
  try {
    await area(page, 'Story'); await area(otherPage, 'Story');
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    let held = false;
    await page.route('**/__drowned_compass_test_party?*', async route => {
      if (route.request().method() !== 'PATCH' || held) return route.continue();
      held = true;
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    });
    const editor = page.getByRole('article', { name: 'Personality', exact: true });
    await editor.getByLabel('Personality').fill('First draft');
    await editor.getByRole('button', { name: 'Save Personality' }).click();
    await expect(editor.getByRole('status')).toHaveText('Saving…');
    await expect(otherPage.getByLabel('Personality', { exact: true })).toHaveValue('First draft');
    await editor.getByLabel('Personality').fill('Newer typing');
    await saveStory(otherPage, 'Personality', 'Newer remote record');
    release();
    await expect(editor.getByRole('alert')).toContainText('newer changes');
    await expect(editor.getByLabel('Personality')).toHaveValue('Newer typing');
    await editor.getByRole('button', { name: 'Discard changes' }).click();
    await expect(editor.getByLabel('Personality')).toHaveValue('Newer remote record');
  } finally { await otherContext.close(); }
});

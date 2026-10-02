import { expect, test, type Page } from '@playwright/test';
import { openClaimedCharacter } from './overview-helpers';
import { prepareTextBrowsers, prepareTextPage } from './character-text-helpers';

async function area(page: Page, name: 'Features' | 'Story') {
  await page.getByRole('navigation', { name: 'Character Record sections' }).getByRole('button', { name, exact: true }).click();
}
async function saveStory(page: Page, label: string, text: string) {
  const editor = page.getByRole('article', { name: label, exact: true });
  await editor.getByRole('textbox', { name: label, exact: true }).fill(text);
  await expect(editor.getByRole('textbox', { name: label, exact: true })).toHaveValue(text);
  await editor.getByRole('button', { name: `Save ${label}`, exact: true }).click();
  await expect(editor.getByRole('status')).toHaveText('Saved');
}

test('all Feature sources persist long text with keyboard and responsive access', async ({ page }, info) => {
  await prepareTextPage(page, info);
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
  await area(page, 'Features');
  for (const kind of ['Class', 'Species', 'Background', 'Feat']) await expect(page.getByRole('article', { name: `${kind} feature` }).getByLabel('Summary')).toHaveValue(longText);
  await page.getByRole('article', { name: 'Feat feature' }).getByRole('button', { name: 'Remove feature' }).click();
  await expect(page.getByRole('article', { name: 'Feat feature' })).toHaveCount(0);
  await page.reload(); await openClaimedCharacter(page); await area(page, 'Features');
  await expect(page.getByRole('article', { name: 'Feat feature' })).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'Class feature' })).toBeVisible();
});

test('all Story fields preserve long party-visible text', async ({ page }, info) => {
  await prepareTextPage(page, info);
  const longText = ('Salt-stained coat, a compass from an old ally.\n' + 'abyss'.repeat(80) + '\n').repeat(12);
  await area(page, 'Story');
  await expect(page.getByText('Visible to the whole Party.', { exact: false }).last()).toBeVisible();
  const submitted = new Map<string, string>();
  page.on('request', request => {
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON();
      if (body.textEntry) submitted.set(body.textEntry.id, body.textEntry.body);
    }
  });
  for (const [label, key] of [['Appearance', 'appearance'], ['Personality', 'personality'], ['Backstory', 'backstory'], ['Allies', 'allies'], ['General notes', 'notes']]) {
    await saveStory(page, label, longText);
    expect(submitted.get(`story.${key}`)).toBe(longText);
  }
  await expect(page.getByRole('textbox', { name: /private|Dungeon Master/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('story-layout.png'), fullPage: true });
  await page.reload(); await openClaimedCharacter(page); await area(page, 'Story');
  for (const label of ['Appearance', 'Personality', 'Backstory', 'Allies', 'General notes']) await expect(page.getByRole('textbox', { name: label, exact: true })).toHaveValue(longText);
});

test('independent Feature and Story edits survive and stale same-field drafts conflict until explicit Retry', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTextBrowsers(browser, page, info);
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
    await expect(page.getByRole('textbox', { name: 'Backstory', exact: true })).toHaveValue('Raised aboard the Gull.');
    const backstory = page.getByRole('article', { name: 'Backstory', exact: true });
    await backstory.getByRole('textbox', { name: 'Backstory', exact: true }).fill('My unfinished draft');
    await saveStory(otherPage, 'Backstory', 'Remote accepted story');
    // Wait for a separate realtime field to prove the snapshot has reached this session.
    await saveStory(otherPage, 'Appearance', 'Scarred cheek');
    await expect(page.getByRole('textbox', { name: 'Appearance', exact: true })).toHaveValue('Scarred cheek');
    await expect(backstory.getByRole('textbox', { name: 'Backstory', exact: true })).toHaveValue('My unfinished draft');
    await backstory.getByRole('button', { name: 'Save Backstory' }).click();
    await expect(backstory.getByRole('alert')).toContainText('Changed elsewhere');
    await expect(otherPage.getByRole('textbox', { name: 'Backstory', exact: true })).toHaveValue('Remote accepted story');
    await backstory.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(backstory.getByRole('status')).toHaveText('Saved');
    await expect(otherPage.getByRole('textbox', { name: 'Backstory', exact: true })).toHaveValue('My unfinished draft');
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
    await expect(feature.getByRole('status')).toBeEmpty();
  } finally { await otherContext.close(); }
});

test('failed Story saves retain text and section drafts while Retry persists it', async ({ page }, info) => {
  await prepareTextPage(page, info, '&failTextSaves=once'); await area(page, 'Story');
  const editor = page.getByRole('article', { name: 'General notes' });
  await editor.getByRole('textbox', { name: 'General notes', exact: true }).fill('Remember the debt.\nAsk the crew.');
  await editor.getByRole('button', { name: 'Save General notes' }).click();
  await expect(editor.getByRole('alert')).toContainText('Not saved');
  await area(page, 'Features'); await area(page, 'Story');
  await expect(editor.getByRole('textbox', { name: 'General notes', exact: true })).toHaveValue('Remember the debt.\nAsk the crew.');
  await editor.getByRole('button', { name: 'Retry' }).click(); await expect(editor.getByRole('status')).toHaveText('Saved');
  await page.reload(); await openClaimedCharacter(page); await area(page, 'Story');
  await expect(page.getByRole('textbox', { name: 'General notes', exact: true })).toHaveValue('Remember the debt.\nAsk the crew.');
  await saveStory(page, 'General notes', '');
  await page.reload(); await openClaimedCharacter(page); await area(page, 'Story');
  await expect(page.getByRole('textbox', { name: 'General notes', exact: true })).toHaveValue('');
});

test('older save acknowledgements preserve newer typing and delayed snapshots preserve newer records', async ({ browser, page }, info) => {
  const { otherContext, otherPage } = await prepareTextBrowsers(browser, page, info);
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
    await editor.getByRole('textbox', { name: 'Personality', exact: true }).fill('First draft');
    await editor.getByRole('button', { name: 'Save Personality' }).click();
    await expect(editor.getByRole('status')).toHaveText('Saving…');
    await expect(otherPage.getByRole('textbox', { name: 'Personality', exact: true })).toHaveValue('First draft');
    await editor.getByRole('textbox', { name: 'Personality', exact: true }).fill('Newer typing');
    await saveStory(otherPage, 'Personality', 'Newer remote record');
    release();
    await expect(editor.getByRole('alert')).toContainText('newer changes');
    await expect(editor.getByRole('textbox', { name: 'Personality', exact: true })).toHaveValue('Newer typing');
    await editor.getByRole('button', { name: 'Discard changes' }).click();
    await expect(editor.getByRole('textbox', { name: 'Personality', exact: true })).toHaveValue('Newer remote record');
  } finally { await otherContext.close(); }
});

test('typing during a delayed Feature removal makes Retry restore the newer draft', async ({ page }, info) => {
  await prepareTextPage(page, info); await area(page, 'Features');
  await page.getByRole('button', { name: 'Add feature', exact: true }).click();
  const feature = page.getByRole('article', { name: 'Class feature' });
  await feature.getByLabel('Feature name').fill('Second Wind');
  await feature.getByLabel('Summary').fill('Original reminder');
  await feature.getByRole('button', { name: 'Save feature', exact: true }).click();
  await expect(feature.getByRole('status')).toHaveText('Saved');
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/__drowned_compass_test_party?*', async route => {
    if (route.request().method() !== 'PATCH' || !route.request().postDataJSON().textEntry?.deleted) return route.continue();
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await feature.getByRole('button', { name: 'Remove feature' }).click();
  await feature.getByLabel('Summary').fill('Newer reminder to keep');
  release();
  await expect(feature.getByRole('alert')).toContainText('newer changes');
  await expect(feature.getByLabel('Summary')).toHaveValue('Newer reminder to keep');
  await feature.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(feature.getByRole('status')).toHaveText('Saved');
  await page.reload(); await openClaimedCharacter(page); await area(page, 'Features');
  await expect(page.getByLabel('Summary')).toHaveValue('Newer reminder to keep');
});

test('Combat and Features preserve drafts and accepted records across sections', async ({ page }, info) => {
  await prepareTextPage(page, info);
  await area(page, 'Features');
  await page.getByRole('button', { name: 'Add feature', exact: true }).click();
  const feature = page.getByRole('article', { name: 'Class feature' });
  await feature.getByLabel('Feature name').fill('Second Wind');
  await feature.getByLabel('Summary').fill('An unfinished reminder');

  const combat = page.getByRole('navigation', { name: 'Character Record sections' }).getByRole('button', { name: 'Combat', exact: true });
  await combat.click();
  await page.getByRole('button', { name: 'Add action', exact: true }).click();
  const action = page.getByRole('article', { name: 'New action', exact: true });
  await action.getByLabel('Name', { exact: true }).fill('Help');
  await action.getByRole('button', { name: 'Save action', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Help', exact: true }).getByRole('status')).toHaveText('Saved');

  await area(page, 'Features');
  await expect(feature.getByLabel('Summary')).toHaveValue('An unfinished reminder');
  await feature.getByRole('button', { name: 'Save feature' }).click();
  await expect(feature.getByRole('status')).toHaveText('Saved');
  await area(page, 'Story');
  await saveStory(page, 'Backstory', 'Raised aboard the Gull.');

  await page.reload();
  await openClaimedCharacter(page);
  await area(page, 'Features');
  await expect(page.getByRole('article', { name: 'Class feature' }).getByLabel('Summary')).toHaveValue('An unfinished reminder');
  await area(page, 'Story');
  await expect(page.getByRole('textbox', { name: 'Backstory', exact: true })).toHaveValue('Raised aboard the Gull.');
  await combat.click();
  await expect(page.getByRole('article', { name: 'Help', exact: true })).toBeVisible();
});

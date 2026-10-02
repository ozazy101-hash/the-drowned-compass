import { expect, test } from '@playwright/test';
import { openClaimedCharacter } from './overview-helpers';
import { prepareTextPage } from './character-text-helpers';

test('typing during a neighboring Story save survives and persists', async ({ page }, info) => {
  await prepareTextPage(page, info);
  await page.getByRole('navigation', { name: 'Character Record sections' }).getByRole('button', { name: 'Story', exact: true }).click();
  await page.getByRole('textbox', { name: 'Appearance', exact: true }).fill('Salt-stained coat');
  const text = 'New Personality typed as the neighboring save is accepted.';
  // Pin input between the accepted DOM render and its pending passive effects.
  // This drives the real change handler and makes the former draft-reset race reproducible.
  await page.evaluate(value => {
    const appearance = document.querySelector('article[aria-label="Appearance"]')!;
    const personality = document.querySelector('textarea#story-personality-body') as HTMLTextAreaElement;
    const observer = new MutationObserver(() => {
      if (appearance.querySelector('[role="status"]')?.textContent !== 'Saved') return;
      observer.disconnect();
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(personality, value);
      personality.dispatchEvent(new Event('input', { bubbles: true }));
    });
    observer.observe(appearance, { childList: true, subtree: true, characterData: true });
  }, text);
  await page.getByRole('button', { name: 'Save Appearance', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Appearance', exact: true }).getByRole('status')).toHaveText('Saved');
  await expect(page.getByRole('textbox', { name: 'Personality', exact: true })).toHaveValue(text);
  await page.getByRole('button', { name: 'Save Personality', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Personality', exact: true }).getByRole('status')).toHaveText('Saved');
  await page.reload(); await openClaimedCharacter(page);
  await page.getByRole('navigation', { name: 'Character Record sections' }).getByRole('button', { name: 'Story', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Personality', exact: true })).toHaveValue(text);
});

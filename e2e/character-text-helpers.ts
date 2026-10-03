import { expect, type Browser, type Page, type TestInfo } from '@playwright/test';
import { enterAs, isolatedPartyUrl, openClaimedCharacter } from './overview-helpers';

// Seed only the prerequisite claimed record; acceptance exercises editing through
// the browser. The Overview suite already covers the full two-step Claim flow.
export async function prepareTextPage(page: Page, info: TestInfo, extra = '') {
  const url = isolatedPartyUrl(info, extra);
  const target = new URL('/__drowned_compass_test_party', String(info.project.use.baseURL));
  target.searchParams.set('namespace', new URL(url, String(info.project.use.baseURL)).searchParams.get('partyTestId')!);
  const response = await page.request.post(target.toString(), { data: {
    slotId: 'character-slot-1', character: {
      playerName: 'Mara', characterName: 'Neris Vale', primaryClass: 'Rogue', subclass: 'Thief', species: 'Human', background: 'Sailor', level: 3,
      abilityScores: { strength: 9, dexterity: 17, constitution: 13, intelligence: 14, wisdom: 12, charisma: 11 },
      savingThrowProficiencies: { strength: 'none', dexterity: 'none', constitution: 'none', intelligence: 'none', wisdom: 'none', charisma: 'none' },
      skillProficiencies: Object.fromEntries(['acrobatics','animalHandling','arcana','athletics','deception','history','insight','intimidation','investigation','medicine','nature','perception','performance','persuasion','religion','sleightOfHand','stealth','survival'].map(key => [key, 'none'])),
      armorClass: 10, maxHitPoints: 1, speed: 30, spellcastingAbility: null, derivedOverrides: {}, fieldVersions: {}, textEntries: [],
    },
  } });
  expect(response.ok()).toBe(true);
  await page.goto(url); await enterAs(page, 'Player'); await openClaimedCharacter(page);
  return url;
}

export async function prepareTextBrowsers(browser: Browser, page: Page, info: TestInfo) {
  const url = await prepareTextPage(page, info);
  const otherContext = await browser.newContext({ baseURL: String(info.project.use.baseURL) });
  await otherContext.route("https://fonts.googleapis.com/**", route => route.fulfill({ contentType: "text/css", body: "" }));
  const otherPage = await otherContext.newPage();
  await otherPage.goto(url); await enterAs(otherPage, 'Dungeon Master'); await openClaimedCharacter(otherPage);
  return { otherContext, otherPage };
}

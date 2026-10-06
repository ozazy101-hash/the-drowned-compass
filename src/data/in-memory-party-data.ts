import { localPartyContent } from './local-party-content';
import { createPartyBackup } from '../domain/party-backup';
import { applyRestCommand, validateRestCommand } from '../domain/character-rests';
import { applyMagicCommand, emptyMagic, validateMagicCommand } from '../domain/character-magic';
import { initialSurvival, transitionSurvival } from "../domain/survival";
import { applyClassEdit, characterClasses } from "../domain/character-classes";
import { readLocalParty, writeLocalParty, readLocalSession, writeLocalSession, removeLocalSession } from "./local-party-store";
import { setInventory, validateInventory } from "../domain/inventory";
import { applyConditionCommand, validateCondition } from "../domain/conditions";
import { writeResource } from "../domain/limited-resources";
import { setCharacterText, validateCharacterText } from "../domain/character-text";
import { applyCombatEntryCommand, emptyCombatEntries } from '../domain/combat-entries';
import { setOverviewValue } from "../domain/overview-fields";
import {
  abilityScoreKeys,
  skillKeys,
  type AccessRole,
  type CharacterRecord,
  type CharacterSlot,
  type OverviewFieldKey,
  type OverviewFieldValue,
  type Party,
  type PartyData,
  type PartySession,
  type SignInResult,
} from "../domain/party";

const sessionStorageKey = "drowned-compass-session-role";
const partyStorageKey = "drowned-compass-party";
const partyChangedEvent = "drowned-compass-party-changed";

const prototypePasswords: Record<AccessRole, string> = {
  player: "player-password",
  "dungeon-master": "dm-password",
};

function createEmptyParty(): Party {
  return {
    name: "The Drowned Compass",
    slots: Array.from({ length: 6 }, (_, index) => ({
      id: `character-slot-${index + 1}`,
      position: index + 1,
      character: null,
    })),
  };
}

function readStoredSession(): PartySession | null {
  const role = window.localStorage.getItem(sessionStorageKey);
  return role === "player" || role === "dungeon-master" ? { role } : null;
}

function copyCharacter(character: CharacterRecord): CharacterRecord {
  return {
    ...character,
    survival: structuredClone(character.survival ?? initialSurvival()),
    classes: characterClasses(character).map(entry => ({ ...entry })),
    magic: structuredClone(character.magic ?? emptyMagic()),
    conditions: structuredClone(character.conditions ?? []),
    limitedResources: (character.limitedResources ?? []).map(resource => ({ ...resource })),
    combatEntries: structuredClone(character.combatEntries ?? emptyCombatEntries()),
    abilityScores: { ...character.abilityScores },
    savingThrowProficiencies: { ...character.savingThrowProficiencies },
    skillProficiencies: { ...character.skillProficiencies },
    derivedOverrides: { ...character.derivedOverrides },
    fieldVersions: { ...character.fieldVersions },
    inventory: (character.inventory ?? []).map(entry => ({ ...entry })),
    textEntries: (character.textEntries ?? []).map(entry => ({ ...entry })),
  };
}

function normalizeCharacter(character: CharacterRecord): CharacterRecord {
  return copyCharacter({
    ...character,
    savingThrowProficiencies: Object.fromEntries(abilityScoreKeys.map((key) => {
      const value: unknown = character.savingThrowProficiencies?.[key];
      return [key, value === true ? 'proficient' : value === false || value === undefined ? 'none' : value];
    })) as CharacterRecord["savingThrowProficiencies"],
    skillProficiencies: character.skillProficiencies ??
      Object.fromEntries(skillKeys.map((key) => [key, "none"])) as CharacterRecord["skillProficiencies"],
    armorClass: character.armorClass ?? 10,
    maxHitPoints: character.maxHitPoints ?? 1,
    speed: character.speed ?? 30,
    spellcastingAbility: character.spellcastingAbility ?? null,
    derivedOverrides: character.derivedOverrides ?? {},
    fieldVersions: character.fieldVersions ?? {},
  });
}

function normalizeParty(party: Party): Party {
  return {
    ...party,
    slots: party.slots.map((slot) => ({
      ...slot,
      character: slot.character ? normalizeCharacter(slot.character) : null,
    })),
  };
}

function readLegacyParty(): Party {
  const storedParty = window.localStorage.getItem(partyStorageKey);
  if (!storedParty) return createEmptyParty();
  try {
    return normalizeParty(JSON.parse(storedParty) as Party);
  } catch {
    return createEmptyParty();
  }
}

async function readParty(): Promise<Party> {
  return normalizeParty(await readLocalParty(readLegacyParty));
}

async function storeParty(party: Party) {
  await writeLocalParty(party);
  // Keep a legacy-readable mirror, but a full mirror must not invalidate an
  // already committed IndexedDB save or prevent its cross-tab notification.
  try { window.localStorage.setItem(partyStorageKey, JSON.stringify(party)); } catch { /* canonical data is committed */ }
  const channel = new BroadcastChannel(partyChangedEvent);
  channel.postMessage(null); channel.close();
  window.dispatchEvent(new CustomEvent(partyChangedEvent));
}

function testPartyUrl(namespace: string): string {
  const url = new URL("/__drowned_compass_test_party", window.location.origin);
  url.searchParams.set("namespace", namespace);
  return url.toString();
}

async function readSharedTestParty(namespace: string): Promise<Party> {
  const response = await fetch(testPartyUrl(namespace));
  if (!response.ok) throw new Error("The shared test Party could not be loaded.");
  return normalizeParty(await response.json() as Party);
}

function normalizeSlot(slot: CharacterSlot): CharacterSlot {
  return { ...slot, character: slot.character ? normalizeCharacter(slot.character) : null };
}

export function createInMemoryPartyData(): PartyData {
  const params = new URLSearchParams(window.location.search);
  const testNamespace = params.get("partyTestId");
  const tokenKey = `drowned-compass-session-token:${testNamespace ?? 'local'}`;
  const token = () => window.localStorage.getItem(tokenKey);
  const testAuthUrl = () => { const url = new URL('/__drowned_compass_test_session', location.origin); url.searchParams.set('namespace', testNamespace!); return url.toString(); };
  const authorization = () => ({ authorization: `Bearer ${token() ?? ''}` });

  return {
    content: localPartyContent(token),
    async getSession() {
      if (testNamespace) {
        const response = await fetch(testAuthUrl(), { headers: authorization() });
        return response.ok ? await response.json() as PartySession : null;
      }
      return token() ? await readLocalSession(token()) : readStoredSession();
    },

    async signIn(role, password): Promise<SignInResult> {
      if (prototypePasswords[role] !== password) return { ok: false };
      const sessionToken = crypto.randomUUID();
      if (testNamespace) {
        const response = await fetch(testAuthUrl(), { method: 'POST', headers: { 'content-type': 'application/json', ...authorization() }, body: JSON.stringify({ role, password }) });
        if (!response.ok) return { ok: false };
        const session = await response.json() as { token: string; role: AccessRole };
        window.localStorage.setItem(tokenKey, session.token);
      } else { await removeLocalSession(token()); await writeLocalSession(sessionToken, role); window.localStorage.setItem(tokenKey, sessionToken); }
      window.localStorage.setItem(sessionStorageKey, role);
      return { ok: true, session: { role } };
    },

    async signOut() {
      if (testNamespace) await fetch(testAuthUrl(), { method: 'DELETE', headers: authorization() });
      else await removeLocalSession(token());
      window.localStorage.removeItem(tokenKey); window.localStorage.removeItem(sessionStorageKey);
    },

    async exportPartyBackup() {
      if (params.get('failBackupDownloads') === 'once' && !sessionStorage.getItem('backup-download-failed')) {
        sessionStorage.setItem('backup-download-failed', 'true'); throw new Error('The Party Data Backup could not be prepared. Please retry.');
      }
      if (testNamespace) {
        const url = new URL('/__drowned_compass_test_backup', location.origin); url.searchParams.set('namespace', testNamespace);
        const response = await fetch(url, { headers: authorization() });
        if (response.status === 403) throw new Error('Dungeon Master access is required. Sign in again to download a Party Data Backup.');
        if (!response.ok) throw new Error('The Party Data Backup could not be prepared. Please retry.');
        return await response.json();
      }
      // Capture the committed Party under its existing write lock, and recheck
      // capability there; UI-supplied roles and unsaved drafts are never inputs.
      return navigator.locks.request('drowned-compass-party-write', async () => {
        if ((await readLocalSession(token()))?.role !== 'dungeon-master') throw new Error('Dungeon Master access is required. Sign in again to download a Party Data Backup.');
        return createPartyBackup(await readParty());
      });
    },

    async getParty() {
      return testNamespace ? readSharedTestParty(testNamespace) : readParty();
    },

    async claimCharacterSlot(slotId, character) {
      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slotId, character }),
        });
        if (!response.ok) throw new Error("That Character Slot is no longer available.");
        return normalizeSlot(await response.json() as CharacterSlot);
      }
      return navigator.locks.request("drowned-compass-party-write", async () => {
      const party = await readParty();
      const slot = party.slots.find((candidate) => candidate.id === slotId);
      if (!slot || slot.character) throw new Error("That Character Slot is no longer available.");
      slot.character = copyCharacter(character);
      await storeParty(party);
      return slot;
      });
    },

    async updateCharacterOverviewField(slotId, field, value, expectedVersion) {
      if (params.get("failOverviewSaves") === "once") {
        const failureKey = `drowned-compass-failed-save-${slotId}-${field}`;
        if (!window.sessionStorage.getItem(failureKey)) {
          window.sessionStorage.setItem(failureKey, "true");
          throw new Error("The save could not reach the Party.");
        }
      }

      if (params.get("slowOverviewSaves") === "once") {
        const slowKey = "drowned-compass-slowed-overview-save";
        if (!window.sessionStorage.getItem(slowKey)) {
          window.sessionStorage.setItem(slowKey, "true");
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
        }
      }

      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slotId, field, value, expectedVersion }),
        });
        const slot = normalizeSlot(await response.json() as CharacterSlot);
        if (response.status === 409) return { ok: false, reason: "conflict", slot };
        if (!response.ok) throw new Error("The Character Record could not be saved.");
        return { ok: true, slot };
      }

      return navigator.locks.request("drowned-compass-party-write", async () => {
      const party = await readParty();
      const slot = party.slots.find((candidate) => candidate.id === slotId);
      if (!slot?.character) throw new Error("That Character Record is unavailable.");
      const currentVersion = slot.character.fieldVersions[field] ?? 0;
      if (currentVersion !== expectedVersion) {
        return { ok: false, reason: "conflict", slot };
      }
      setOverviewValue(slot.character, field, value);
      slot.character.fieldVersions[field] = currentVersion + 1;
      await storeParty(party);
      return { ok: true, slot };
      });
    },

    async updateSurvival(slotId, command, expectedVersion, maximumVersion) {
      if (params.get('failSurvivalSaves') === 'once' && !window.sessionStorage.getItem('failed-survival')) {
        window.sessionStorage.setItem('failed-survival', 'true');
        throw new Error('The save could not reach the Party.');
      }
      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slotId, survivalCommand: command, expectedVersion, maximumVersion }),
        });
        if (!response.ok && response.status !== 409) throw new Error('Survival could not be saved.');
        const slot = normalizeSlot(await response.json() as CharacterSlot);
        return response.status === 409 ? { ok: false, reason: 'conflict', slot } : { ok: true, slot };
      }
      return navigator.locks.request('drowned-compass-party-write', async () => {
        const party = await readParty(); const slot = party.slots.find(s => s.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        const state = slot.character.survival ?? initialSurvival();
        if (state.version !== expectedVersion || (slot.character.fieldVersions.maxHitPoints ?? 0) !== maximumVersion) return { ok: false, reason: 'conflict', slot };
        const next = transitionSurvival(state, command, slot.character.maxHitPoints, maximumVersion);
        if (!next) return { ok: false, reason: 'conflict', slot };
        slot.character.survival = next; await storeParty(party);
        return { ok: true, slot };
      });
    },

    async editCharacterClass(slotId, edit, expectedVersion) {
      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slotId, classEdit: edit, expectedVersion }),
        });
        if (response.status !== 409 && !response.ok) throw new Error('The class could not be saved. Check total level and try again.');
        const slot = normalizeSlot(await response.json() as CharacterSlot);
        return response.status === 409 ? { ok: false, reason: 'conflict', slot } : { ok: true, slot };
      }
      return navigator.locks.request('drowned-compass-party-write', async () => {
        const party = await readParty();
        const slot = party.slots.find(candidate => candidate.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        if (!applyClassEdit(slot.character, edit, expectedVersion)) return { ok: false, reason: 'conflict', slot };
        await storeParty(party);
        return { ok: true, slot };
      });
    },

    async writeLimitedResource(slotId, resource, expectedVersion) {
      if (params.get("failResourceSaves") === "once" && !window.sessionStorage.getItem("failed-resource-save")) {
        window.sessionStorage.setItem("failed-resource-save", "true");
        throw new Error("The save could not reach the Party.");
      }
      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ slotId, resource, expectedVersion }),
        });
        if (!response.ok) throw new Error("The resource could not be saved.");
        return await response.json();
      }
      // Serialize commands around committed IndexedDB reads and writes, matching server CAS semantics.
      return navigator.locks.request("drowned-compass-party-write", async () => {
        const party = await readParty();
        const slot = party.slots.find(candidate => candidate.id === slotId);
        if (!slot?.character) throw new Error("That Character Record is unavailable.");
        const result = writeResource(slot.character.limitedResources ?? [], resource, expectedVersion);
        if (result.ok) { slot.character.limitedResources = result.resources; await storeParty(party); }
        return result;
      });
    },

    async saveInventoryEntry(slotId, entry, expectedVersion) {
      validateInventory(entry);
      if (params.get("failInventorySaves") === "once") {
        const key = `failed-inventory-${slotId}-${entry.id}`;
        if (!window.sessionStorage.getItem(key)) {
          window.sessionStorage.setItem(key, 'true');
          throw new Error('The save could not reach the Party.');
        }
      }
      if (params.get("slowInventorySaves") === "once" && !window.sessionStorage.getItem('slow-inventory')) {
        window.sessionStorage.setItem('slow-inventory', 'true');
        await new Promise(resolve => window.setTimeout(resolve, 1000));
      }
      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slotId, inventoryEntry: entry, expectedVersion }),
        });
        if (!response.ok && response.status !== 409) throw new Error('The Character Record could not be saved.');
        const slot = normalizeSlot(await response.json() as CharacterSlot);
        return response.status === 409 ? { ok: false, reason: 'conflict', slot } : { ok: true, slot };
      }
      return navigator.locks.request("drowned-compass-party-write", async () => {
        const party = await readParty();
        const slot = party.slots.find(candidate => candidate.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        const entries = slot.character.inventory ??= [];
        if (!setInventory(entries, entry, expectedVersion)) return { ok: false, reason: 'conflict', slot };
        await storeParty(party);
        return { ok: true, slot };
      });
    },

    async saveCharacterTextEntry(slotId, entry, expectedVersion) {
      validateCharacterText(entry);
      if (params.get("failTextSaves") === "once") {
        const key = `failed-text-${slotId}-${entry.id}`;
        if (!window.sessionStorage.getItem(key)) {
          window.sessionStorage.setItem(key, 'true');
          throw new Error('The save could not reach the Party.');
        }
      }
      if (params.get("slowTextSaves") === "once" && !window.sessionStorage.getItem('slow-text')) {
        window.sessionStorage.setItem('slow-text', 'true');
        await new Promise(resolve => window.setTimeout(resolve, 1000));
      }
      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slotId, textEntry: entry, expectedVersion }),
        });
        if (!response.ok && response.status !== 409) throw new Error('The Character Record could not be saved.');
        const slot = normalizeSlot(await response.json() as CharacterSlot);
        return response.status === 409 ? { ok: false, reason: 'conflict', slot } : { ok: true, slot };
      }
      return navigator.locks.request("drowned-compass-party-write", async () => {
        const party = await readParty();
        const slot = party.slots.find(candidate => candidate.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        const entries = slot.character.textEntries ??= [];
        if (!setCharacterText(entries, entry, expectedVersion)) return { ok: false, reason: 'conflict', slot };
        await storeParty(party);
        return { ok: true, slot };
      });
    },

    async updateCombatEntry(slotId, command) {
      if (params.get('failCombatSaves') === 'once' && !window.sessionStorage.getItem('combat-save-failed')) {
        window.sessionStorage.setItem('combat-save-failed', 'true');
        throw new Error('The save could not reach the Party.');
      }
      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slotId, combatCommand: command }),
        });
        if (response.status !== 409 && !response.ok) throw new Error('The attack or action could not be saved.');
        const slot = normalizeSlot(await response.json() as CharacterSlot);
        return response.status === 409 ? { ok: false, reason: 'conflict', slot } : { ok: true, slot };
      }
      return navigator.locks.request("drowned-compass-party-write", async () => {
        const party = await readParty();
        const slot = party.slots.find(s => s.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        const state = slot.character.combatEntries ??= emptyCombatEntries();
        if (!applyCombatEntryCommand(state, command)) return { ok: false, reason: 'conflict', slot };
        await storeParty(party);
        return { ok: true, slot };
      });
    },

    async resolveRest(slotId, command) {
      validateRestCommand(command);
      if (params.get('failRestSaves') === 'once' && !sessionStorage.getItem('rest-save-failed')) {
        sessionStorage.setItem('rest-save-failed', 'true'); throw new Error('The rest could not reach the Party. Retry the same selection.');
      }
      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slotId, restCommand: command }) });
        if (!response.ok && response.status !== 409) throw new Error('The rest could not be saved. Retry the same selection.');
        const slot = normalizeSlot(await response.json() as CharacterSlot);
        return response.status === 409 ? { ok: false, reason: 'conflict', slot } : { ok: true, slot };
      }
      return navigator.locks.request('drowned-compass-party-write', async () => {
        const party = await readParty(); const slot = party.slots.find(s => s.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        if (!applyRestCommand(slot.character, command)) return { ok: false, reason: 'conflict', slot };
        await storeParty(party); return { ok: true, slot };
      });
    },

    async updateMagic(slotId, command) {
      validateMagicCommand(command);
      if (params.get('failMagicSaves') === 'once' && !sessionStorage.getItem('magic-save-failed')) {
        sessionStorage.setItem('magic-save-failed', 'true');
        throw new Error('The save could not reach the Party.');
      }
      if (params.get('slowMagicSaves') === 'once' && !sessionStorage.getItem('magic-save-delayed')) {
        sessionStorage.setItem('magic-save-delayed', 'true');
        await new Promise(resolve => window.setTimeout(resolve, 1000));
      }
      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slotId, magicCommand: command }),
        });
        if (!response.ok && response.status !== 409) throw new Error('Magic could not be saved.');
        const slot = normalizeSlot(await response.json() as CharacterSlot);
        return response.status === 409 ? { ok: false, reason: 'conflict', slot } : { ok: true, slot };
      }
      return navigator.locks.request('drowned-compass-party-write', async () => {
        const party = await readParty();
        const slot = party.slots.find(s => s.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        if (!applyMagicCommand(slot.character.magic ??= emptyMagic(), command)) return { ok: false, reason: 'conflict', slot };
        await storeParty(party);
        return { ok: true, slot };
      });
    },

    async updateCondition(slotId, command) {
      validateCondition(command);
      if (params.get('slowConditionSaves') === 'once' && !sessionStorage.getItem('condition-save-delayed')) {
        sessionStorage.setItem('condition-save-delayed', 'true');
        await new Promise(resolve => window.setTimeout(resolve, 1000));
      }
      if (params.get('failConditionSaves') === 'once' && !sessionStorage.getItem('condition-save-failed')) {
        sessionStorage.setItem('condition-save-failed', 'true');
        throw new Error('The save could not reach the Party.');
      }
      if (testNamespace) {
        const response = await fetch(testPartyUrl(testNamespace), {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slotId, conditionCommand: command }),
        });
        if (!response.ok && response.status !== 409) throw new Error('The Condition could not be saved.');
        const slot = normalizeSlot(await response.json() as CharacterSlot);
        return response.status === 409 ? { ok: false, reason: 'conflict', slot } : { ok: true, slot };
      }
      return navigator.locks.request('drowned-compass-party-write', async () => {
        const party = await readParty();
        const slot = party.slots.find(s => s.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        if (!applyConditionCommand(slot.character.conditions ??= [], command)) return { ok: false, reason: 'conflict', slot };
        await storeParty(party);
        return { ok: true, slot };
      });
    },

    subscribeToParty(onPartyChanged) {
      if (testNamespace) {
        let previousParty = "";
        let isReading = false;
        const interval = window.setInterval(() => {
          if (isReading) return;
          isReading = true;
          void readSharedTestParty(testNamespace)
            .then((party) => {
              const serializedParty = JSON.stringify(party);
              if (serializedParty !== previousParty) {
                previousParty = serializedParty;
                onPartyChanged(party);
              }
            })
            .catch(() => {})
            .finally(() => { isReading = false; });
        }, 100);
        return () => window.clearInterval(interval);
      }

      const emitParty = () => { void readParty().then(onPartyChanged).catch(() => {}); };
      const channel = new BroadcastChannel(partyChangedEvent);
      channel.onmessage = emitParty;
      const handleStorage = (event: StorageEvent) => {
        if (event.key === partyStorageKey) emitParty();
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener(partyChangedEvent, emitParty);
      return () => {
        channel.close();
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(partyChangedEvent, emitParty);
      };
    },
  };
}

export const inMemoryPartyData = createInMemoryPartyData();

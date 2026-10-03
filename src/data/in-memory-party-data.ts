import { initialSurvival, transitionSurvival } from "../domain/survival";
import { applyClassEdit, characterClasses } from "../domain/character-classes";
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
    limitedResources: (character.limitedResources ?? []).map(resource => ({ ...resource })),
    combatEntries: structuredClone(character.combatEntries ?? emptyCombatEntries()),
    abilityScores: { ...character.abilityScores },
    savingThrowProficiencies: { ...character.savingThrowProficiencies },
    skillProficiencies: { ...character.skillProficiencies },
    derivedOverrides: { ...character.derivedOverrides },
    fieldVersions: { ...character.fieldVersions },
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

function readParty(): Party {
  const storedParty = window.localStorage.getItem(partyStorageKey);
  if (!storedParty) return createEmptyParty();
  try {
    return normalizeParty(JSON.parse(storedParty) as Party);
  } catch {
    return createEmptyParty();
  }
}

function storeParty(party: Party) {
  window.localStorage.setItem(partyStorageKey, JSON.stringify(party));
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

  return {
    async getSession() { return readStoredSession(); },

    async signIn(role, password): Promise<SignInResult> {
      if (prototypePasswords[role] !== password) return { ok: false };
      window.localStorage.setItem(sessionStorageKey, role);
      return { ok: true, session: { role } };
    },

    async signOut() { window.localStorage.removeItem(sessionStorageKey); },

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
      return navigator.locks.request("drowned-compass-party-write", () => {
      const party = readParty();
      const slot = party.slots.find((candidate) => candidate.id === slotId);
      if (!slot || slot.character) throw new Error("That Character Slot is no longer available.");
      slot.character = copyCharacter(character);
      storeParty(party);
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

      return navigator.locks.request("drowned-compass-party-write", () => {
      const party = readParty();
      const slot = party.slots.find((candidate) => candidate.id === slotId);
      if (!slot?.character) throw new Error("That Character Record is unavailable.");
      const currentVersion = slot.character.fieldVersions[field] ?? 0;
      if (currentVersion !== expectedVersion) {
        return { ok: false, reason: "conflict", slot };
      }
      setOverviewValue(slot.character, field, value);
      slot.character.fieldVersions[field] = currentVersion + 1;
      storeParty(party);
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
      return navigator.locks.request('drowned-compass-party-write', () => {
        const party = readParty(); const slot = party.slots.find(s => s.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        const state = slot.character.survival ?? initialSurvival();
        if (state.version !== expectedVersion || (slot.character.fieldVersions.maxHitPoints ?? 0) !== maximumVersion) return { ok: false, reason: 'conflict', slot };
        const next = transitionSurvival(state, command, slot.character.maxHitPoints, maximumVersion);
        if (!next) return { ok: false, reason: 'conflict', slot };
        slot.character.survival = next; storeParty(party);
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
      return navigator.locks.request('drowned-compass-party-write', () => {
        const party = readParty();
        const slot = party.slots.find(candidate => candidate.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        if (!applyClassEdit(slot.character, edit, expectedVersion)) return { ok: false, reason: 'conflict', slot };
        storeParty(party);
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
      // Web Locks serialize localStorage read/modify/write across tabs, matching server CAS semantics.
      return navigator.locks.request("drowned-compass-party-write", () => {
        const party = readParty();
        const slot = party.slots.find(candidate => candidate.id === slotId);
        if (!slot?.character) throw new Error("That Character Record is unavailable.");
        const result = writeResource(slot.character.limitedResources ?? [], resource, expectedVersion);
        if (result.ok) { slot.character.limitedResources = result.resources; storeParty(party); }
        return result;
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
      return navigator.locks.request("drowned-compass-party-write", () => {
        const party = readParty();
        const slot = party.slots.find(candidate => candidate.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        const entries = slot.character.textEntries ??= [];
        if (!setCharacterText(entries, entry, expectedVersion)) return { ok: false, reason: 'conflict', slot };
        storeParty(party);
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
      return navigator.locks.request("drowned-compass-party-write", () => {
        const party = readParty();
        const slot = party.slots.find(s => s.id === slotId);
        if (!slot?.character) throw new Error('That Character Record is unavailable.');
        const state = slot.character.combatEntries ??= emptyCombatEntries();
        if (!applyCombatEntryCommand(state, command)) return { ok: false, reason: 'conflict', slot };
        storeParty(party);
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

      const emitParty = () => onPartyChanged(readParty());
      const handleStorage = (event: StorageEvent) => {
        if (event.key === partyStorageKey) emitParty();
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener(partyChangedEvent, emitParty);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(partyChangedEvent, emitParty);
      };
    },
  };
}

export const inMemoryPartyData = createInMemoryPartyData();

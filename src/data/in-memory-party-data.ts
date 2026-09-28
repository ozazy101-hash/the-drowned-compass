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
    abilityScores: { ...character.abilityScores },
    savingThrowProficiencies: { ...character.savingThrowProficiencies },
    skillProficiencies: { ...character.skillProficiencies },
    derivedOverrides: { ...character.derivedOverrides },
    fieldVersions: { ...character.fieldVersions },
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
      const party = readParty();
      const slot = party.slots.find((candidate) => candidate.id === slotId);
      if (!slot || slot.character) throw new Error("That Character Slot is no longer available.");
      slot.character = copyCharacter(character);
      storeParty(party);
      return slot;
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

import type {
  AccessRole,
  CharacterRecord,
  Party,
  PartyData,
  PartySession,
  SignInResult,
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

function readParty(): Party {
  const storedParty = window.localStorage.getItem(partyStorageKey);
  if (!storedParty) return createEmptyParty();

  try {
    return JSON.parse(storedParty) as Party;
  } catch {
    return createEmptyParty();
  }
}

function storeParty(party: Party) {
  window.localStorage.setItem(partyStorageKey, JSON.stringify(party));
  window.dispatchEvent(new CustomEvent(partyChangedEvent));
}

function copyCharacter(character: CharacterRecord): CharacterRecord {
  return {
    ...character,
    abilityScores: { ...character.abilityScores },
  };
}

function testPartyUrl(namespace: string): string {
  const url = new URL("/__drowned_compass_test_party", window.location.origin);
  url.searchParams.set("namespace", namespace);
  return url.toString();
}

async function readSharedTestParty(namespace: string): Promise<Party> {
  const response = await fetch(testPartyUrl(namespace));
  if (!response.ok) throw new Error("The shared test Party could not be loaded.");
  return response.json() as Promise<Party>;
}

export function createInMemoryPartyData(): PartyData {
  const testNamespace = new URLSearchParams(window.location.search).get("partyTestId");

  return {
    async getSession() {
      return readStoredSession();
    },

    async signIn(role, password): Promise<SignInResult> {
      if (prototypePasswords[role] !== password) return { ok: false };

      window.localStorage.setItem(sessionStorageKey, role);
      return { ok: true, session: { role } };
    },

    async signOut() {
      window.localStorage.removeItem(sessionStorageKey);
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

        if (!response.ok) {
          throw new Error("That Character Slot is no longer available.");
        }

        return response.json();
      }

      const party = readParty();
      const slot = party.slots.find((candidate) => candidate.id === slotId);

      if (!slot || slot.character) {
        throw new Error("That Character Slot is no longer available.");
      }

      slot.character = copyCharacter(character);
      storeParty(party);
      return slot;
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
            .finally(() => {
              isReading = false;
            });
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

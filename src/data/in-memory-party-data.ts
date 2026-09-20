import type {
  AccessRole,
  Party,
  PartyData,
  PartySession,
  SignInResult,
} from "../domain/party";

const drownedCompassParty: Party = {
  name: "The Drowned Compass",
  slots: Array.from({ length: 6 }, (_, index) => ({
    id: `character-slot-${index + 1}`,
    position: index + 1,
    character: null,
  })),
};

const sessionStorageKey = "drowned-compass-session-role";

const prototypePasswords: Record<AccessRole, string> = {
  player: "player-password",
  "dungeon-master": "dm-password",
};

function readStoredSession(): PartySession | null {
  const role = window.localStorage.getItem(sessionStorageKey);
  return role === "player" || role === "dungeon-master" ? { role } : null;
}

export function createInMemoryPartyData(): PartyData {
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
      return drownedCompassParty;
    },
  };
}

export const inMemoryPartyData = createInMemoryPartyData();

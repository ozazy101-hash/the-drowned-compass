export const abilityScoreKeys = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export type AbilityScoreKey = (typeof abilityScoreKeys)[number];

export type AbilityScores = Record<AbilityScoreKey, number>;

export type CharacterRecord = {
  playerName: string;
  characterName: string;
  primaryClass: string;
  subclass: string;
  species: string;
  background: string;
  level: number;
  abilityScores: AbilityScores;
};

export type CharacterSlot = {
  id: string;
  position: number;
  character: CharacterRecord | null;
};

export type Party = {
  name: string;
  slots: CharacterSlot[];
};

export type AccessRole = "player" | "dungeon-master";

export type PartySession = {
  role: AccessRole;
};

export type SignInResult =
  | { ok: true; session: PartySession }
  | { ok: false };

export interface PartyData {
  getSession(): Promise<PartySession | null>;
  signIn(role: AccessRole, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  getParty(): Promise<Party>;
  claimCharacterSlot(
    slotId: string,
    character: CharacterRecord,
  ): Promise<CharacterSlot>;
  subscribeToParty(onPartyChanged: (party: Party) => void): () => void;
}

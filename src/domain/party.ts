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

export const skillKeys = [
  "acrobatics", "animalHandling", "arcana", "athletics", "deception",
  "history", "insight", "intimidation", "investigation", "medicine",
  "nature", "perception", "performance", "persuasion", "religion",
  "sleightOfHand", "stealth", "survival",
] as const;

export type SkillKey = (typeof skillKeys)[number];
export type SkillProficiency = "none" | "proficient" | "expertise";

export const identityFieldKeys = [
  "playerName", "characterName", "primaryClass", "subclass", "species",
  "background", "level",
] as const;

export type IdentityFieldKey = (typeof identityFieldKeys)[number];
export type OverviewFieldKey =
  | IdentityFieldKey
  | AbilityScoreKey
  | `save.${AbilityScoreKey}`
  | `skill.${SkillKey}`
  | "armorClass"
  | "maxHitPoints"
  | "speed"
  | "spellcastingAbility";

export type OverviewFieldValue = string | number | boolean | SkillProficiency | null;

export type CharacterRecord = {
  playerName: string;
  characterName: string;
  primaryClass: string;
  subclass: string;
  species: string;
  background: string;
  level: number;
  abilityScores: AbilityScores;
  savingThrowProficiencies: Record<AbilityScoreKey, boolean>;
  skillProficiencies: Record<SkillKey, SkillProficiency>;
  armorClass: number;
  maxHitPoints: number;
  speed: number;
  spellcastingAbility: AbilityScoreKey | null;
  fieldVersions: Partial<Record<OverviewFieldKey, number>>;
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

export type OverviewUpdateResult =
  | { ok: true; slot: CharacterSlot }
  | { ok: false; reason: "conflict"; slot: CharacterSlot };

export interface PartyData {
  getSession(): Promise<PartySession | null>;
  signIn(role: AccessRole, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  getParty(): Promise<Party>;
  claimCharacterSlot(
    slotId: string,
    character: CharacterRecord,
  ): Promise<CharacterSlot>;
  updateCharacterOverviewField(
    slotId: string,
    field: OverviewFieldKey,
    value: OverviewFieldValue,
    expectedVersion: number,
  ): Promise<OverviewUpdateResult>;
  subscribeToParty(onPartyChanged: (party: Party) => void): () => void;
}

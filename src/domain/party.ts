export type CharacterSlot = {
  id: string;
  position: number;
  character: null;
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
}

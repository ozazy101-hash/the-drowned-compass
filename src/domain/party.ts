export type CharacterSlot = {
  id: string;
  position: number;
  character: null;
};

export type Party = {
  name: string;
  slots: CharacterSlot[];
};

export interface PartyData {
  getParty(): Promise<Party>;
}

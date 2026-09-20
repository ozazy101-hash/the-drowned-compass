import type { Party, PartyData } from "../domain/party";

const drownedCompassParty: Party = {
  name: "The Drowned Compass",
  slots: Array.from({ length: 6 }, (_, index) => ({
    id: `character-slot-${index + 1}`,
    position: index + 1,
    character: null,
  })),
};

export const inMemoryPartyData: PartyData = {
  async getParty() {
    return drownedCompassParty;
  },
};

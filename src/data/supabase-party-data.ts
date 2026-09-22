import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AccessRole,
  CharacterRecord,
  CharacterSlot,
  Party,
  PartyData,
  PartySession,
  SignInResult,
} from "../domain/party";

const sharedIdentityByRole: Record<AccessRole, string> = {
  player: "players@drowned-compass.test",
  "dungeon-master": "dm@drowned-compass.test",
};

const characterSlotColumns = `
  id,
  position,
  claimed_at,
  player_name,
  character_name,
  primary_class,
  subclass,
  species,
  background,
  level,
  strength,
  dexterity,
  constitution,
  intelligence,
  wisdom,
  charisma
`;

type CharacterSlotRow = {
  id: string;
  position: number;
  claimed_at: string | null;
  player_name: string | null;
  character_name: string | null;
  primary_class: string | null;
  subclass: string | null;
  species: string | null;
  background: string | null;
  level: number | null;
  strength: number | null;
  dexterity: number | null;
  constitution: number | null;
  intelligence: number | null;
  wisdom: number | null;
  charisma: number | null;
};

function isAccessRole(value: unknown): value is AccessRole {
  return value === "player" || value === "dungeon-master";
}

function mapCharacterSlot(row: CharacterSlotRow): CharacterSlot {
  return {
    id: row.id,
    position: row.position,
    character:
      row.claimed_at === null
        ? null
        : {
            playerName: row.player_name!,
            characterName: row.character_name!,
            primaryClass: row.primary_class!,
            subclass: row.subclass!,
            species: row.species!,
            background: row.background!,
            level: row.level!,
            abilityScores: {
              strength: row.strength!,
              dexterity: row.dexterity!,
              constitution: row.constitution!,
              intelligence: row.intelligence!,
              wisdom: row.wisdom!,
              charisma: row.charisma!,
            },
          },
  };
}

async function readMembership(
  client: SupabaseClient,
  userId: string,
): Promise<PartySession | null> {
  const { data, error } = await client
    .from("party_members")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !isAccessRole(data?.role)) return null;
  return { role: data.role };
}

export function createSupabasePartyData(
  url: string,
  publishableKey: string,
): PartyData {
  const client = createClient(url, publishableKey);

  async function loadParty(): Promise<Party> {
    const { data: party, error: partyError } = await client
      .from("parties")
      .select("id, name")
      .single();

    if (partyError || !party) {
      throw partyError ?? new Error("The Party could not be loaded.");
    }

    const { data: slots, error: slotsError } = await client
      .from("character_slots")
      .select(characterSlotColumns)
      .eq("party_id", party.id)
      .order("position");

    if (slotsError) throw slotsError;

    return {
      name: party.name,
      slots: ((slots ?? []) as CharacterSlotRow[]).map(mapCharacterSlot),
    };
  }

  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) return null;
      return readMembership(client, data.session.user.id);
    },

    async signIn(role, password): Promise<SignInResult> {
      const { data, error } = await client.auth.signInWithPassword({
        email: sharedIdentityByRole[role],
        password,
      });

      if (error || !data.user) return { ok: false };

      const session = await readMembership(client, data.user.id);
      if (!session || session.role !== role) {
        await client.auth.signOut({ scope: "local" });
        return { ok: false };
      }

      return { ok: true, session };
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
    },

    getParty: loadParty,

    async claimCharacterSlot(slotId, character: CharacterRecord) {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) {
        throw authError ?? new Error("Your Party session has ended.");
      }

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("character_slots")
        .update({
          claimed_at: now,
          claimed_by: authData.user.id,
          player_name: character.playerName,
          character_name: character.characterName,
          primary_class: character.primaryClass,
          subclass: character.subclass,
          species: character.species,
          background: character.background,
          level: character.level,
          strength: character.abilityScores.strength,
          dexterity: character.abilityScores.dexterity,
          constitution: character.abilityScores.constitution,
          intelligence: character.abilityScores.intelligence,
          wisdom: character.abilityScores.wisdom,
          charisma: character.abilityScores.charisma,
          version: 1,
          updated_at: now,
        })
        .eq("id", slotId)
        .is("claimed_at", null)
        .select(characterSlotColumns)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("That Character Slot is no longer available.");
      return mapCharacterSlot(data as CharacterSlotRow);
    },

    subscribeToParty(onPartyChanged) {
      const channel = client
        .channel("party-character-slot-claims")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "character_slots" },
          () => {
            void loadParty().then(onPartyChanged);
          },
        )
        .subscribe();

      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}

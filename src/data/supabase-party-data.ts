import { readResources, mapResource, writeSupabaseResource } from "./supabase-limited-resources";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AccessRole,
  CharacterRecord,
  CharacterSlot,
  OverviewFieldKey,
  OverviewFieldValue,
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
  charisma,
  saving_throw_proficiencies,
  skill_proficiencies,
  armor_class,
  max_hit_points,
  speed,
  spellcasting_ability,
  overview_field_versions,
  derived_overrides
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
  saving_throw_proficiencies: CharacterRecord["savingThrowProficiencies"];
  skill_proficiencies: CharacterRecord["skillProficiencies"];
  armor_class: number;
  max_hit_points: number;
  speed: number;
  spellcasting_ability: CharacterRecord["spellcastingAbility"];
  derived_overrides: CharacterRecord["derivedOverrides"];
  overview_field_versions: CharacterRecord["fieldVersions"];
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
            savingThrowProficiencies: row.saving_throw_proficiencies,
            skillProficiencies: row.skill_proficiencies,
            armorClass: row.armor_class,
            maxHitPoints: row.max_hit_points,
            speed: row.speed,
            spellcastingAbility: row.spellcasting_ability,
            derivedOverrides: row.derived_overrides,
            fieldVersions: row.overview_field_versions,
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

    const resources = await readResources(client);
    return {
      name: party.name,
      slots: ((slots ?? []) as CharacterSlotRow[]).map(row => {
        const slot = mapCharacterSlot(row);
        if (slot.character) slot.character.limitedResources = resources.filter(resource => resource.slot_id === slot.id).map(mapResource);
        return slot;
      }),
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
          saving_throw_proficiencies: character.savingThrowProficiencies,
          skill_proficiencies: character.skillProficiencies,
          armor_class: character.armorClass,
          max_hit_points: character.maxHitPoints,
          speed: character.speed,
          spellcasting_ability: character.spellcastingAbility,
          derived_overrides: character.derivedOverrides,
          overview_field_versions: character.fieldVersions,
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

    async updateCharacterOverviewField(
      slotId: string,
      field: OverviewFieldKey,
      value: OverviewFieldValue,
      expectedVersion: number,
    ) {
      const { data, error } = await client.rpc("update_character_overview_field", {
        target_slot_id: slotId,
        target_field: field,
        next_value: value,
        expected_version: expectedVersion,
      });
      if (error) throw error;

      const party = await loadParty();
      const slot = party.slots.find((candidate) => candidate.id === slotId);
      if (!slot?.character) throw new Error("That Character Record is unavailable.");

      const result = Array.isArray(data) ? data[0] : data;
      return result?.accepted === true
        ? { ok: true as const, slot }
        : { ok: false as const, reason: "conflict" as const, slot };
    },

    writeLimitedResource: (slotId, resource, expectedVersion) => writeSupabaseResource(client, slotId, resource, expectedVersion),

    subscribeToParty(onPartyChanged) {
      let active = true;
      const reload = () => {
        void loadParty()
          .then((party) => { if (active) onPartyChanged(party); })
          // A later event or successful reconnect retries a transient read failure.
          .catch(() => {});
      };
      const channel = client
        .channel("party-character-slot-claims")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "character_slots" },
          reload,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "limited_resources" },
          reload,
        )
        .subscribe((status) => {
          // Realtime does not replay changes missed while disconnected.
          if (status === "SUBSCRIBED") reload();
        });

      return () => {
        active = false;
        void client.removeChannel(channel);
      };
    },
  };
}

import { validateRestCommand } from '../domain/character-rests';
import { emptyMagic, validateMagicCommand, type CharacterSpell, type SpellSlot } from '../domain/character-magic';
import { initialSurvival } from "../domain/survival";
import { validateClassEdit, projectClasses, type CharacterClass } from "../domain/character-classes";
import { validateInventory, type InventoryEntry } from "../domain/inventory";
import { validateCondition, type Condition } from "../domain/conditions";
import { readResources, mapResource, writeSupabaseResource } from "./supabase-limited-resources";
import { validateCharacterText, type CharacterTextEntry } from "../domain/character-text";
import { emptyCombatEntries, type CombatEntry, type CombatEntries } from '../domain/combat-entries';
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

    const [resources, inventoryResult, textResult, entriesResult, primaryResult, survivalResult, classesResult, conditionsResult, magicResult] = await Promise.all([
      readResources(client),
      client.from('character_inventory_entries').select('slot_id, entry_id, kind, title, body, rank, deleted, version'),
      client.from('character_text_entries').select('slot_id, entry_id, kind, title, body, deleted, version'),
      client.from('character_combat_entries').select('id, slot_id, details, rank, version, deleted').in('slot_id', (slots ?? []).map(slot => slot.id)),
      client.from('character_primary_attacks').select('slot_id, primary_id, featured_ids, version').in('slot_id', (slots ?? []).map(slot => slot.id)),
      client.from('character_survival').select('slot_id,state'),
      client.from('character_classes').select('slot_id, entry_id, name, level, version, deleted'),
      client.from('character_conditions').select('slot_id, id, standard, label, deleted, version'),
      client.from('character_magic').select('slot_id, id, kind, state, version'),
    ]);
    if (survivalResult.error) throw survivalResult.error;
    if (classesResult.error) throw classesResult.error;
    if (inventoryResult.error) throw inventoryResult.error;
    if (magicResult.error) throw magicResult.error;
    if (conditionsResult.error) throw conditionsResult.error;
    if (textResult.error) throw textResult.error;
    if (entriesResult.error) throw entriesResult.error;
    if (primaryResult.error) throw primaryResult.error;
    const texts = textResult.data ?? [];
    const entries = (entriesResult.data ?? []) as (CombatEntry & { slot_id: string })[];
    const primary = (primaryResult.data ?? []) as { slot_id: string; primary_id: string | null; featured_ids?: string[]; version: number }[];
    return {
      name: party.name,
      slots: ((slots ?? []) as CharacterSlotRow[]).map(row => {
        const slot = mapCharacterSlot(row);
        if (slot.character) {
          slot.character.survival = survivalResult.data?.find(s => s.slot_id === slot.id)?.state ?? initialSurvival();
          slot.character.classes = (classesResult.data ?? []).filter(entry => entry.slot_id === slot.id).map(entry => ({ id: entry.entry_id, name: entry.name, level: entry.level, version: Number(entry.version), deleted: entry.deleted }) as CharacterClass);
          if (!slot.character.classes.length) delete slot.character.classes;
          projectClasses(slot.character);
          const magic = emptyMagic();
          for (const row of magicResult.data ?? []) if (row.slot_id === slot.id) {
            if (row.kind === 'spell') magic.spells.push({ ...row.state, id: row.id, version: Number(row.version) } as CharacterSpell);
            else magic.slots.push({ ...row.state, id: row.id, version: Number(row.version) } as SpellSlot);
          }
          slot.character.magic = magic;
          slot.character.conditions = (conditionsResult.data ?? []).filter(c => c.slot_id === slot.id).map(({ id, standard, label, deleted, version }) => ({ id, standard, label, deleted, version: Number(version) }) as Condition);
          slot.character.limitedResources = resources.filter(resource => resource.slot_id === slot.id).map(mapResource);
          slot.character.inventory = (inventoryResult.data ?? []).filter(e => e.slot_id === slot.id).map(e => ({ id: e.entry_id, rank: e.rank, kind: e.kind, title: e.title, body: e.body, deleted: e.deleted, version: Number(e.version) }) as InventoryEntry);
          slot.character.textEntries = texts
            .filter(text => text.slot_id === slot.id)
            .map(text => ({ id: text.entry_id, kind: text.kind, title: text.title, body: text.body,
              deleted: text.deleted, version: Number(text.version) }) as CharacterTextEntry);
          const selection = primary.find(p => p.slot_id === slot.id);
          const state: CombatEntries = { ...emptyCombatEntries(), entries: entries.filter(e => e.slot_id === slot.id).map(({ id, details, rank, version, deleted }) => ({ id, details, rank, version, deleted })), primaryId: selection?.primary_id ?? null, featuredIds: selection?.featured_ids ?? (selection?.primary_id ? [selection.primary_id] : []), primaryVersion: selection?.version ?? 0 };
          slot.character.combatEntries = state;
        }
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

    async updateSurvival(slotId, command, expectedVersion, maximumVersion) {
      const { data, error } = await client.rpc('update_character_survival', {
        target_slot_id: slotId, command, expected_version: expectedVersion, maximum_version: maximumVersion,
      });
      if (error) throw error;
      const slot = (await loadParty()).slots.find(s => s.id === slotId);
      if (!slot?.character) throw new Error('That Character Record is unavailable.');
      return data === true ? { ok: true, slot } : { ok: false, reason: 'conflict', slot };
    },
    async editCharacterClass(slotId, edit, expectedVersion) {
      validateClassEdit(edit, expectedVersion);
      const { data: accepted, error } = await client.rpc('edit_character_class', {
        target_slot_id: slotId, target_entry_id: edit.id, next_name: edit.name.trim(),
        next_level: edit.level, next_deleted: edit.deleted, expected_version: expectedVersion,
      });
      if (error) throw error;
      const party = await loadParty();
      const slot = party.slots.find(candidate => candidate.id === slotId);
      if (!slot?.character) throw new Error('That Character Record is unavailable.');
      return accepted === true ? { ok: true, slot } : { ok: false, reason: 'conflict', slot };
    },
    writeLimitedResource: (slotId, resource, expectedVersion) => writeSupabaseResource(client, slotId, resource, expectedVersion),
    async saveInventoryEntry(slotId, entry, expectedVersion) {
      validateInventory(entry);
      const { data, error } = await client.rpc('save_inventory_entry', {
        target_slot_id: slotId, target_entry_id: entry.id, target_kind: entry.kind,
        next_rank: entry.rank, next_title: entry.title, next_body: entry.body, next_deleted: entry.deleted,
        expected_version: expectedVersion,
      });
      if (error) throw error;
      const party = await loadParty();
      const slot = party.slots.find(candidate => candidate.id === slotId);
      if (!slot?.character) throw new Error('That Character Record is unavailable.');
      const result = Array.isArray(data) ? data[0] : data;
      return result?.accepted === true ? { ok: true, slot } : { ok: false, reason: 'conflict', slot };
    },
    async saveCharacterTextEntry(slotId, entry, expectedVersion) {
      validateCharacterText(entry);
      const { data, error } = await client.rpc('save_character_text_entry', {
        target_slot_id: slotId, target_entry_id: entry.id, target_kind: entry.kind,
        next_title: entry.title, next_body: entry.body, next_deleted: entry.deleted,
        expected_version: expectedVersion,
      });
      if (error) throw error;
      const party = await loadParty();
      const slot = party.slots.find(candidate => candidate.id === slotId);
      if (!slot?.character) throw new Error('That Character Record is unavailable.');
      const result = Array.isArray(data) ? data[0] : data;
      return result?.accepted === true ? { ok: true, slot } : { ok: false, reason: 'conflict', slot };
    },
    async updateCombatEntry(slotId, command) {
      const { data: accepted, error } = await client.rpc('update_character_combat_entry', { target_slot_id: slotId, command });
      if (error) throw error;
      const party = await loadParty();
      const slot = party.slots.find(s => s.id === slotId);
      if (!slot?.character) throw new Error('That Character Record is unavailable.');
      return accepted === true ? { ok: true, slot } : { ok: false, reason: 'conflict', slot };
    },

    async resolveRest(slotId, command) {
      validateRestCommand(command);
      const { data: accepted, error } = await client.rpc('resolve_character_rest', { target_slot_id: slotId, command });
      if (error) throw new Error('The rest could not be saved. Retry the same selection.');
      const slot = (await loadParty()).slots.find(s => s.id === slotId);
      if (!slot?.character) throw new Error('That Character Record is unavailable.');
      return accepted === true ? { ok: true, slot } : { ok: false, reason: 'conflict', slot };
    },

    async updateMagic(slotId, command) {
      validateMagicCommand(command);
      const { data: accepted, error } = await client.rpc('update_character_magic', { target_slot_id: slotId, command });
      if (error) throw new Error('Magic could not be saved. Please retry.');
      const party = await loadParty();
      const slot = party.slots.find(s => s.id === slotId);
      if (!slot?.character) throw new Error('That Character Record is unavailable.');
      return accepted === true ? { ok: true, slot } : { ok: false, reason: 'conflict', slot };
    },

    async updateCondition(slotId, command) {
      validateCondition(command);
      const { data: accepted, error } = await client.rpc('update_character_condition', { target_slot_id: slotId, command });
      if (error?.code === '23505') throw new Error('That Custom Condition is already active.');
      if (error) throw new Error('The Condition could not be saved. Please retry.');
      const party = await loadParty();
      const slot = party.slots.find(s => s.id === slotId);
      if (!slot?.character) throw new Error('That Character Record is unavailable.');
      return accepted === true ? { ok: true, slot } : { ok: false, reason: 'conflict', slot };
    },

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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'character_survival' }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'character_inventory_entries' }, reload)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'character_text_entries' }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'character_combat_entries' }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'character_primary_attacks' }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'character_classes' }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'character_conditions' }, reload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'character_magic' }, reload)
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

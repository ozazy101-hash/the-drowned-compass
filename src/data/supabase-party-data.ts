import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AccessRole,
  Party,
  PartyData,
  PartySession,
  SignInResult,
} from "../domain/party";

const sharedIdentityByRole: Record<AccessRole, string> = {
  player: "players@drowned-compass.test",
  "dungeon-master": "dm@drowned-compass.test",
};

function isAccessRole(value: unknown): value is AccessRole {
  return value === "player" || value === "dungeon-master";
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

    async getParty(): Promise<Party> {
      const { data: party, error: partyError } = await client
        .from("parties")
        .select("id, name")
        .single();

      if (partyError || !party) {
        throw partyError ?? new Error("The Party could not be loaded.");
      }

      const { data: slots, error: slotsError } = await client
        .from("character_slots")
        .select("id, position")
        .eq("party_id", party.id)
        .order("position");

      if (slotsError) throw slotsError;

      return {
        name: party.name,
        slots: (slots ?? []).map((slot) => ({
          id: slot.id,
          position: slot.position,
          character: null,
        })),
      };
    },
  };
}

import type { PartyData } from "../domain/party";
import { inMemoryPartyData } from "./in-memory-party-data";
import { createSupabasePartyData } from "./supabase-party-data";

export function createPartyData(): PartyData {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (url && publishableKey) {
    return createSupabasePartyData(url, publishableKey);
  }

  if (import.meta.env.DEV) return inMemoryPartyData;

  throw new Error("Supabase configuration is required for a production build.");
}

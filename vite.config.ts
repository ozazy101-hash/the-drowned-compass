import { setInventory, type InventoryDraft } from './src/domain/inventory.ts';
import { writeResource, type ResourceWrite, type LimitedResource } from "./src/domain/limited-resources.ts";
import { setCharacterText, type CharacterTextDraft } from "./src/domain/character-text.ts";
import { applyCombatEntryCommand, emptyCombatEntries, type CombatEntryCommand } from './src/domain/combat-entries.ts';
import { setOverviewValue } from "./src/domain/overview-fields.ts";
import type { CharacterRecord, OverviewFieldKey, OverviewFieldValue } from "./src/domain/party.ts";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

type TestParty = {
  name: string;
  slots: Array<{
    id: string;
    position: number;
    character: Record<string, unknown> | null;
  }>;
};

function createEmptyTestParty(): TestParty {
  return {
    name: "The Drowned Compass",
    slots: Array.from({ length: 6 }, (_, index) => ({
      id: `character-slot-${index + 1}`,
      position: index + 1,
      character: null,
    })),
  };
}

function sharedInMemoryParty(): Plugin {
  const parties = new Map<string, TestParty>();

  return {
    name: "shared-in-memory-party",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const testRequest = request as unknown as {
          url?: string;
          method?: string;
          on(event: "data", listener: (chunk: unknown) => void): void;
          on(event: "end", listener: () => void): void;
        };
        const url = new URL(testRequest.url ?? "/", "http://localhost");
        if (url.pathname !== "/__drowned_compass_test_party") {
          next();
          return;
        }

        const namespace = url.searchParams.get("namespace");
        if (!namespace) {
          response.statusCode = 400;
          response.end();
          return;
        }

        const party = parties.get(namespace) ?? createEmptyTestParty();
        parties.set(namespace, party);

        if (testRequest.method === "GET") {
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify(party));
          return;
        }

        if (testRequest.method !== "POST" && testRequest.method !== "PATCH") {
          response.statusCode = 405;
          response.end();
          return;
        }

        let body = "";
        testRequest.on("data", (chunk) => { body += String(chunk); });
        testRequest.on("end", () => {
          const requestBody = JSON.parse(body) as Record<string, unknown>;
          const slot = party.slots.find((candidate) => candidate.id === requestBody.slotId);
          response.setHeader("content-type", "application/json");

          if (testRequest.method === "POST") {
            if (!slot || slot.character) {
              response.statusCode = 409;
              response.end(JSON.stringify(slot ?? {}));
              return;
            }
            slot.character = requestBody.character as Record<string, unknown>;
            response.end(JSON.stringify(slot));
            return;
          }

          if (!slot?.character) {
            response.statusCode = 404;
            response.end(JSON.stringify(slot ?? {}));
            return;
          }

          if (requestBody.resource) {
            try {
              const result = writeResource((slot.character.limitedResources ?? []) as LimitedResource[], requestBody.resource as ResourceWrite, Number(requestBody.expectedVersion));
              if (result.ok) slot.character.limitedResources = result.resources;
              response.end(JSON.stringify(result));
            } catch { response.statusCode = 400; response.end(JSON.stringify({ error: "Invalid resource" })); }
            return;
          }
          if (requestBody.inventoryEntry) {
            try {
              const character = slot.character as CharacterRecord;
              const accepted = setInventory(character.inventory ??= [], requestBody.inventoryEntry as InventoryDraft, Number(requestBody.expectedVersion));
              response.statusCode = accepted ? 200 : 409;
            } catch { response.statusCode = 400; }
            response.end(JSON.stringify(slot));
            return;
          }
          if (requestBody.textEntry) {
            try {
              const character = slot.character as CharacterRecord;
              const accepted = setCharacterText(character.textEntries ??= [], requestBody.textEntry as CharacterTextDraft, Number(requestBody.expectedVersion));
              response.statusCode = accepted ? 200 : 409;
            } catch { response.statusCode = 400; }
            response.end(JSON.stringify(slot));
            return;
          }

          if (requestBody.combatCommand) {
            try {
              const character = slot.character as CharacterRecord;
              const state = character.combatEntries ??= emptyCombatEntries();
              if (!applyCombatEntryCommand(state, requestBody.combatCommand as CombatEntryCommand)) response.statusCode = 409;
            } catch { response.statusCode = 400; }
            response.end(JSON.stringify(slot));
            return;
          }
          const field = String(requestBody.field);
          const versions = slot.character.fieldVersions as Record<string, number>;
          const currentVersion = versions[field] ?? 0;
          if (currentVersion !== requestBody.expectedVersion) {
            response.statusCode = 409;
            response.end(JSON.stringify(slot));
            return;
          }

          try {
            setOverviewValue(slot.character as CharacterRecord, field as OverviewFieldKey, requestBody.value as OverviewFieldValue);
          } catch {
            response.statusCode = 400;
            response.end(JSON.stringify(slot));
            return;
          }
          versions[field] = currentVersion + 1;
          response.end(JSON.stringify(slot));
        });
      });
    },
  };
}

export default defineConfig({
  base: "/the-drowned-compass/",
  plugins: [react(), sharedInMemoryParty()],
});

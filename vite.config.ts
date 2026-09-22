import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

type TestParty = {
  name: string;
  slots: Array<{
    id: string;
    position: number;
    character: unknown | null;
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

        if (testRequest.method !== "POST") {
          response.statusCode = 405;
          response.end();
          return;
        }

        let body = "";
        testRequest.on("data", (chunk) => { body += String(chunk); });
        testRequest.on("end", () => {
          const claim = JSON.parse(body) as {
            slotId: string;
            character: unknown;
          };
          const slot = party.slots.find((candidate) => candidate.id === claim.slotId);
          if (!slot || slot.character) {
            response.statusCode = 409;
            response.end();
            return;
          }

          slot.character = claim.character;
          response.setHeader("content-type", "application/json");
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

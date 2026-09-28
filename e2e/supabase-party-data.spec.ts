import { expect, test, type WebSocketRoute } from "@playwright/test";

test("the Supabase adapter catches up when a realtime connection returns", async ({ page }) => {
  let partyName = "Before reconnect";
  const sockets: WebSocketRoute[] = [];
  let joined = 0;
  await page.route("https://supabase-contract.invalid/rest/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      contentType: "application/json",
      json: path.endsWith("/parties") ? { id: "test-party", name: partyName } : [],
    });
  });
  await page.routeWebSocket(/supabase-contract\.invalid\/realtime\/v1\/websocket/, (socket) => {
    sockets.push(socket);
    socket.onMessage((message) => {
      const [joinRef, ref, topic, event, payload] = JSON.parse(String(message));
      if (event !== "phx_join" && event !== "heartbeat") return;
      const response = event === "phx_join" ? {
        postgres_changes: payload.config.postgres_changes.map(
          (filter: Record<string, unknown>, index: number) => ({ ...filter, id: index + 1 }),
        ),
      } : {};
      socket.send(JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response }]));
      if (event === "phx_join") joined += 1;
    });
  });

  await page.goto("./");
  await page.evaluate(async () => {
    const modulePath = "/the-drowned-compass/src/data/supabase-party-data.ts";
    const { createSupabasePartyData } = await import(modulePath);
    const adapter = createSupabasePartyData("https://supabase-contract.invalid", "test-publishable-key");
    const initialParty = await adapter.getParty();
    document.body.dataset.subscribedParty = initialParty.name;
    const unsubscribe = adapter.subscribeToParty((party: { name: string }) => {
      document.body.dataset.subscribedParty = party.name;
    });
    window.addEventListener("pagehide", unsubscribe, { once: true });
  });
  await expect.poll(() => joined).toBe(1);
  await expect(page.locator("body")).toHaveAttribute("data-subscribed-party", "Before reconnect");

  // The update happens while disconnected; there is no UPDATE event to replay.
  partyName = "After reconnect";
  sockets[0].close({ code: 1012, reason: "Reconnect contract test" });
  await expect.poll(() => joined).toBe(2);
  await expect(page.locator("body")).toHaveAttribute("data-subscribed-party", "After reconnect");
});

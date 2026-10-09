import { test, expect, type Page } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  page.on("console", (message) => {
    if (
      message.type() === "info" &&
      message.text().startsWith("MAP_HTTP_TIMING ")
    )
      console.log(message.text());
  });
});
const config = (index: number) => ({
  url: process.env.MAP_LIVE_URL!,
  key: process.env.MAP_LIVE_KEY!,
  jwt: JSON.parse(process.env.MAP_LIVE_DM_JWTS!)[index],
  server: "http://127.0.0.1:49177",
});
async function connect(page: Page, c: object) {
  await page.goto("tests/harness/map-workshop.html");
  await page.waitForFunction(
    () => typeof (window as any).configure === "function",
  );
  await page.evaluate((c) => (window as any).configure(c), c);
  await expect(
    page.getByRole("heading", { name: "Map creation workshop" }),
  ).toBeVisible();
}
async function png(
  page: Page,
  type = "image/png",
  width = 1024,
  height = 1024,
) {
  return await page.evaluate(
    async ({ type, width, height }) => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#226688";
      ctx.fillRect(0, 0, width, height);
      const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), type));
      return [...new Uint8Array(await blob.arrayBuffer())];
    },
    { type, width, height },
  );
}
async function upload(
  page: Page,
  type = "image/png",
  width = 1024,
  height = 1024,
) {
  const bytes = await png(page, type, width, height);
  await page.getByLabel("Upload finished artwork").setInputFiles({
    name: "finished." + type.split("/")[1],
    mimeType: type,
    buffer: Buffer.from(bytes),
  });
  await expect(page.getByRole("status")).toContainText(
    "Artwork saved privately",
    { timeout: 30000 },
  );
}
async function saveOutput(page: Page) {
  await expect(
    page.getByRole("button", { name: "Save completed artwork" }).last(),
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Save completed artwork" })
    .last()
    .click();
  await expect(page.getByRole("status")).toContainText("Saved privately", {
    timeout: 30000,
  });
}
async function acceptedReceipt(page: Page) {
  await expect
    .poll(
      async () => {
        const workspace = await page.evaluate(() =>
          (window as any).content.readMapWorkspace(),
        );
        return workspace.jobs.filter(
          (j: any) => j.state === "awaiting-client-output",
        ).length;
      },
      { timeout: 30000 },
    )
    .toBe(1);
  await expect(
    page.getByRole("button", { name: "Create map", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  const workspace = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  const job = workspace.jobs.find(
    (j: any) => j.state === "awaiting-client-output",
  );
  const card = page.locator(`[data-job-id="${job.id}"]`);
  await card.getByRole("button", { name: "Refresh progress" }).click();
  await expect(
    card.getByRole("button", { name: "Save completed artwork" }),
  ).toBeEnabled({ timeout: 30000 });
  return job;
}
for (const [name, width, height, index] of [
  ["laptop", 1440, 900, 0],
  ["phone", 390, 844, 2],
] as const) {
  test(`${name}: real fixture invent sibling comparison and upload alignment survive reload`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const c = config(index);
    await connect(page, c);
    await page.getByLabel("Columns", { exact: true }).fill("24");
    await page.getByLabel("Rows", { exact: true }).fill("18");
    await page.getByLabel("Map description").fill("A sea cave");
    await page.getByLabel("Appearance instructions").fill("Dark blue stone");
    await page.getByRole("button", { name: "Create map", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Save completed artwork" }),
    ).toBeVisible();
    const queued = await page.evaluate(() =>
      (window as any).content.readMapWorkspace(),
    );
    await connect(page, c);
    await page
      .getByLabel("Map family")
      .selectOption(queued.jobs.at(-1).familyId);
    await page.getByRole("button", { name: "Refresh progress" }).last().click();
    await saveOutput(page);
    const first = await page.evaluate(() =>
      (window as any).content.readMapWorkspace(),
    );
    expect(first.presentation.version).toBeNull();
    await page.getByLabel("Map description").fill("");
    await page.getByRole("button", { name: "Try another version" }).click();
    await saveOutput(page);
    const sibling = await page.evaluate(() =>
      (window as any).content.readMapWorkspace(),
    );
    expect(sibling.versions).toHaveLength(2);
    expect(sibling.versions[0].parentVersionId).toBe(
      sibling.versions[1].parentVersionId,
    );
    expect(sibling.versions[0].instructions).toBe(
      sibling.versions[1].instructions,
    );
    await page
      .getByRole("combobox", { name: "Compare versions", exact: true })
      .selectOption(sibling.versions[0].id);
    await expect(
      page.getByRole("img", { name: "Comparison map artwork" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Use this map", exact: true }),
    ).toBeDisabled();
    await upload(page);
    await page.getByLabel("Artwork scale", { exact: true }).fill("0.5");
    await page.getByLabel("Artwork horizontal position").fill("2");
    await page
      .getByRole("button", { name: "Save alignment as version" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Artwork saved privately",
      { timeout: 30000 },
    );
    const saved = await page.evaluate(() =>
      (window as any).content.readMapWorkspace(),
    );
    expect(saved.versions).toHaveLength(4);
    const aligned = saved.versions.find(
      (v: any) => v.parentVersionId === saved.versions[2].id,
    );
    expect(aligned.background.width).toBe(9);
    expect(aligned.background.x).toBe(2);
    expect(saved.presentation).toEqual(first.presentation);
    await page.reload();
    await page.waitForFunction(
      () => typeof (window as any).configure === "function",
    );
    await page.evaluate((c) => (window as any).configure(c), c);
    await page.getByLabel("Map family").selectOption(saved.families[0].id);
    await expect(
      page.getByRole("button", { name: /Inspect version/ }),
    ).toHaveCount(4);
    await page.getByRole("button", { name: /Inspect version 4/ }).click();
    await expect(page.getByLabel("Artwork horizontal position")).toHaveValue(
      "2",
    );
    await page.getByRole("button", { name: "Reset to fit" }).click();
    await expect(page.getByLabel("Artwork scale", { exact: true })).toHaveValue(
      "1",
    );
    await page.screenshot({
      path: `/private/tmp/ticket07-${name}.png`,
      fullPage: true,
    });
  });
  test(`${name}: touch sketch clear undo reference creation, cancellation and retry preserve originals`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await connect(page, config(index + 1));
    await page
      .getByRole("button", { name: "Use my sketch", exact: true })
      .click();
    await page.getByLabel("Map description").fill("A closed room");
    const svg = page.getByRole("img", { name: "Sketch drawing surface" });
    await svg.locator("..").scrollIntoViewIfNeeded();
    const box = (await svg.boundingBox())!;
    async function outline() {
      if (name === "phone") {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: box.x + 20, y: box.y + 20 }],
        });
        for (const [x, y] of [
          [150, 20],
          [150, 120],
          [20, 120],
        ])
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: box.x + x, y: box.y + y }],
          });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await cdp.detach();
      } else {
        await page.mouse.move(box.x + 20, box.y + 20);
        await page.mouse.down();
        for (const [x, y] of [
          [150, 20],
          [150, 120],
          [20, 120],
        ])
          await page.mouse.move(box.x + x, box.y + y);
        await page.mouse.up();
      }
    }
    await outline();
    await expect(svg.locator("polyline")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Undo outline", exact: true })
      .click();
    await expect(svg.locator("polyline")).toHaveCount(0);
    await outline();
    await page.getByRole("button", { name: "Clear sketch" }).click();
    await expect(svg.locator("polyline")).toHaveCount(0);
    await outline();
    await page.getByRole("button", { name: "Create map", exact: true }).click();
    await saveOutput(page);
    await page.getByRole("button", { name: "New map", exact: true }).click();
    const bytes = await png(page);
    await page.getByLabel("Uploaded reference", { exact: true }).setInputFiles({
      name: "reference.png",
      mimeType: "image/png",
      buffer: Buffer.from(bytes),
    });
    await page.getByRole("button", { name: "Create map", exact: true }).click();
    const receipt = await acceptedReceipt(page);
    await page
      .locator(`[data-job-id="${receipt.id}"]`)
      .getByRole("button", { name: "Cancel creation" })
      .click();
    await expect(page.getByLabel("Creation jobs")).toContainText("cancelled");
    const before = await page.evaluate(() =>
      (window as any).content.readMapWorkspace(),
    );
    await page
      .getByRole("button", { name: "Retry creation", exact: true })
      .click();
    await saveOutput(page);
    const after = await page.evaluate(() =>
      (window as any).content.readMapWorkspace(),
    );
    expect(after.versions.length).toBe(before.versions.length + 1);
    expect(after.presentation).toEqual(before.presentation);
    await page.getByLabel("Compare reference outline and grid").check();
    await expect(
      page.getByRole("img", { name: "Inspected map artwork" }).locator("image"),
    ).toHaveCount(2);
  });
}
test("local adapter manual formats, maximum image/grid, failed input and alignment reload", async ({
  page,
}) => {
  await connect(page, { local: true });
  await page.getByLabel("Columns", { exact: true }).fill("80");
  await page.getByLabel("Rows", { exact: true }).fill("80");
  await upload(page, "image/webp", 4000, 4000);
  await page.getByLabel("Artwork scale", { exact: true }).fill("0.25");
  await page.getByRole("button", { name: "Save alignment as version" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Artwork saved privately",
    { timeout: 30000 },
  );
  let saved = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  expect(saved.versions[1].background.width).toBe(20);
  await upload(page, "image/jpeg", 200, 100);
  const before = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  await page.getByLabel("Upload finished artwork").setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("bad"),
  });
  await expect(page.getByRole("alert")).toContainText("retained");
  saved = await page.evaluate(() => (window as any).content.readMapWorkspace());
  expect(saved.versions).toEqual(before.versions);
  await page.reload();
  await page.waitForFunction(
    () => typeof (window as any).configure === "function",
  );
  await page.evaluate(() => (window as any).configure({ local: true }));
  await page.getByLabel("Map family").selectOption(saved.families[0].id);
  await expect(
    page.getByRole("button", { name: /Inspect version/ }),
  ).toHaveCount(3);
  await page.screenshot({
    path: "/private/tmp/ticket07-local.png",
    fullPage: true,
  });
});
test("actual App retains drawing route and offers dedicated workshop navigation", async ({
  page,
}) => {
  await page.goto("");
  await page.getByRole("button", { name: /^Dungeon Master / }).click();
  await page.getByLabel("Shared password").fill("dm-password");
  await page.getByRole("button", { name: "Enter the Party" }).click();
  await page
    .getByRole("button", { name: "Grid Map editor", exact: true })
    .click();
  await expect(
    page.getByRole("application", { name: "Grid Map drawing surface" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to Party", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Map creation workshop", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Map creation workshop" }),
  ).toBeVisible();
});
test("reference-only saved drawing reaches creation through the existing keyboard editor", async ({
  page,
}) => {
  await connect(page, config(7));
  await page.getByRole("button", { name: "Open drawing tools" }).click();
  await page
    .getByRole("application", { name: "Grid Map drawing surface" })
    .focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Floor", exact: true }).click();
  await page
    .getByRole("application", { name: "Grid Map drawing surface" })
    .press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.getByLabel("Map title").fill("Keyboard reference drawing");
  await page
    .getByRole("button", { name: "Save private Grid Map", exact: true })
    .click();
  await expect(page.getByRole("status").first()).toContainText("Saved");
  await page
    .getByRole("button", { name: "Back to Party", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use my sketch", exact: true })
    .click();
  const before = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  const drawing = before.versions.find(
    (v: any) => v.title === "Keyboard reference drawing",
  );
  expect(drawing.background).toBeNull();
  await page.getByLabel("Existing saved map drawing").selectOption(drawing.id);
  await page
    .getByLabel("Map description")
    .fill("Illustrate this saved drawing");
  await page.getByRole("button", { name: "Create map", exact: true }).click();
  await saveOutput(page);
  const after = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  expect(after.versions.some((v: any) => v.id === drawing.id)).toBe(true);
  expect(
    after.versions.some(
      (v: any) => v.parentVersionId === drawing.id && v.reference,
    ),
  ).toBe(true);
  expect(after.presentation).toEqual(before.presentation);
});
test("provider timeout has honest error and explicit retry/cancel with private work retained", async ({
  page,
}) => {
  await connect(page, config(4));
  await upload(page);
  const before = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  await page.getByLabel("Map description").fill("A recoverable cave");
  await page.getByRole("button", { name: "Create map", exact: true }).click();
  await expect(
    page.locator("[data-job-id]").filter({ hasText: " · uncertain" }),
  ).toHaveCount(1);
  await expect
    .poll(
      async () =>
        (
          await page.evaluate(() => (window as any).content.readMapWorkspace())
        ).jobs.filter((j: any) => j.state === "uncertain").length,
    )
    .toBe(1);
  const running = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  await expect
    .poll(() => Date.now(), { intervals: [100], timeout: 5000 })
    .toBeGreaterThan(Date.parse(running.jobs[0].createdAt) + 1100);
  await page.getByRole("button", { name: "Refresh progress" }).click();
  await expect(page.getByLabel("Creation jobs")).toContainText(
    "provider-timeout",
  );
  await page
    .getByRole("button", { name: "Retry creation", exact: true })
    .click();
  await expect(
    page.locator("[data-job-id]").filter({ hasText: " · uncertain" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Cancel creation" }).last().click();
  await expect(page.getByLabel("Creation jobs")).toContainText("cancelled");
  const after = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  expect(after.versions).toEqual(before.versions);
  expect(after.presentation).toEqual(before.presentation);
  expect(new Set(after.jobs.map((j: any) => j.id)).size).toBe(2);
});
for (const [name, index] of [
  ["local", -1],
  ["Supabase", 8],
] as const) {
  test(`${name}: conflicting alignment retains immutable originals and recoverable placement`, async ({
    page,
  }) => {
    await connect(page, index < 0 ? { local: true } : config(index));
    await upload(page);
    const before = await page.evaluate(() =>
      (window as any).content.readMapWorkspace(),
    );
    const source = before.versions.at(-1);
    const malformed = await page.evaluate(async (source) => {
      const content = (window as any).content,
        blob = await content.openMapVersion(source.id);
      const errors = [];
      for (const placement of [
        {
          x: source.background.x,
          y: source.background.y,
          width: source.background.width,
          height: source.background.height,
          digest: "f".repeat(64),
        },
        {
          x: 0,
          y: 0,
          width: source.background.width,
          height: source.background.height / 2,
        },
      ]) {
        try {
          await (window as any).originalAttach({
            familyId: source.familyId,
            parentVersionId: source.id,
            expectedVersion: 1,
            requestId: crypto.randomUUID(),
            title: "Forged placement",
            artwork: new File([blob], "map.png", {
              type: source.background.mime,
            }),
            placement,
          });
          errors.push("accepted");
        } catch (error) {
          errors.push((error as Error).message);
        }
      }
      return errors;
    }, source);
    expect(malformed[0]).toContain("placement fields");
    expect(malformed[1]).toContain("placement");
    expect(
      (await page.evaluate(() => (window as any).content.readMapWorkspace()))
        .versions,
    ).toEqual(before.versions);

    await page.getByLabel("Artwork scale", { exact: true }).fill("0.5");
    await page.evaluate(() => {
      (window as any).holdNextAttachment = true;
    });
    await page
      .getByRole("button", { name: "Save alignment as version" })
      .click();
    await page.waitForFunction(
      () => typeof (window as any).releaseAttachment === "function",
    );
    await page.evaluate(
      async ({ source }) => {
        const content = (window as any).content;
        const blob = await content.openMapVersion(source.id);
        const workspace = await content.readMapWorkspace();
        await (window as any).originalAttach({
          familyId: source.familyId,
          parentVersionId: source.id,
          expectedVersion: workspace.families.find(
            (f: any) => f.id === source.familyId,
          ).version,
          requestId: crypto.randomUUID(),
          title: "Other DM version",
          artwork: new File([blob], "concurrent.png", {
            type: source.background.mime,
          }),
        });
        (window as any).releaseAttachment();
      },
      { source },
    );
    await expect(page.getByRole("alert")).toContainText("changed elsewhere");
    const after = await page.evaluate(() =>
      (window as any).content.readMapWorkspace(),
    );
    expect(
      after.versions.some(
        (v: any) =>
          v.id === source.id &&
          v.background.digest === source.background.digest,
      ),
    ).toBe(true);
    expect(after.presentation).toEqual(before.presentation);
    await expect(page.getByLabel("Artwork scale", { exact: true })).toHaveValue(
      "0.5",
    );
  });
}
test("selected artwork geometry does not override a new sketch draft or its retained PNG reference", async ({
  page,
}) => {
  await connect(page, { local: true });
  await upload(page);
  await page
    .getByRole("button", { name: "Use my sketch", exact: true })
    .click();
  await page.getByLabel("Columns", { exact: true }).fill("80");
  await page.getByLabel("Rows", { exact: true }).fill("80");
  await page
    .getByLabel("Map description")
    .fill("A small room near the corner of an eighty square map");
  const svg = page.getByRole("img", { name: "Sketch drawing surface" });
  await expect(svg).toHaveAttribute("viewBox", "0 0 80 80");
  await svg.locator("..").scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  await page.mouse.move(box.x + 24, box.y + 24);
  await page.mouse.down();
  for (const [x, y] of [
    [120, 24],
    [120, 120],
    [24, 120],
  ])
    await page.mouse.move(box.x + x, box.y + y);
  await page.mouse.up();
  await expect(svg.locator("polyline")).toHaveAttribute(
    "points",
    /^1,1 5,1 5,5 1,5 1,1$/,
  );
  await page.getByRole("button", { name: "Create map", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("generation-disabled");
  const retained = await page.evaluate(async () => {
    const workspace = await (window as any).content.readMapWorkspace();
    const source = workspace.versions.find((v: any) => v.reference);
    const blob = await (window as any).content.openMapVersion(
      source.id,
      "reference",
    );
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const data = ctx.getImageData(36, 11, 5, 5).data;
    let gold = false;
    for (let i = 0; i < data.length; i += 4)
      if (data[i] > 190 && data[i + 1] > 140 && data[i + 2] < 170) gold = true;
    return {
      document: source.document,
      reference: source.reference,
      gold,
      presentation: workspace.presentation,
    };
  });
  expect(retained.document).toMatchObject({ columns: 80, rows: 80 });
  expect(retained.reference).toMatchObject({
    pixelWidth: 1024,
    pixelHeight: 1024,
    width: 80,
    height: 80,
    x: 0,
    y: 0,
  });
  expect(retained.gold).toBe(true);
  expect(retained.presentation.version).toBeNull();
  await expect(
    page.getByRole("img", { name: "Inspected map artwork" }),
  ).toHaveAttribute("viewBox", "0 0 20 14");
});
test("each failed job retries its own original brief despite saved selection and reload", async ({
  page,
}) => {
  const c = config(5);
  await connect(page, c);
  await page.getByLabel("Map description").fill("Original brief A");
  await page.getByRole("button", { name: "Create map", exact: true }).click();
  await saveOutput(page);
  await page.getByLabel("Map description").fill("Different brief B");
  await page.getByRole("button", { name: "Create map", exact: true }).click();
  const b = await acceptedReceipt(page);
  let workspace = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  const bCard = page.locator(`[data-job-id="${b.id}"]`);
  await bCard.getByRole("button", { name: "Cancel creation" }).click();
  await page.getByRole("button", { name: /Inspect version 1/ }).click();
  await bCard.getByRole("button", { name: "Retry creation" }).click();
  await saveOutput(page);
  workspace = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  expect(workspace.versions.at(-1).instructions).toContain("Different brief B");
  expect(workspace.versions.at(-1).instructions).not.toContain(
    "Original brief A",
  );
  await page.getByRole("button", { name: "New map", exact: true }).click();
  await page.getByLabel("Map description").fill("First cancelled brief C");
  await page.getByRole("button", { name: "Create map", exact: true }).click();
  const first = await acceptedReceipt(page);
  await page
    .locator(`[data-job-id="${first.id}"]`)
    .getByRole("button", { name: "Cancel creation" })
    .click();
  await connect(page, c);
  await page.getByLabel("Map family").selectOption(first.familyId);
  await page
    .locator(`[data-job-id="${first.id}"]`)
    .getByRole("button", { name: "Retry creation" })
    .click();
  await saveOutput(page);
  const after = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  expect(
    after.versions.find((v: any) => v.familyId === first.familyId).instructions,
  ).toContain("First cancelled brief C");
  expect(after.jobs).toHaveLength(5);
  expect(after.presentation.version).toBeNull();
});
for (const outcome of ["failed", "missing-version"]) {
  test(`UI transport failure fixture: ${outcome} output never claims saved or replaces retained artwork`, async ({
    page,
  }) => {
    let providerRequests = 0;
    page.on("request", (request) => {
      if (request.url().startsWith("http://127.0.0.1:49177"))
        providerRequests++;
    });
    await connect(page, { local: true, feedbackFixture: outcome });
    await expect(page.locator("#fixture-label")).toContainText(
      "UI transport failure fixture",
    );
    await upload(page);
    const before = await page.evaluate(() =>
      (window as any).content.readMapWorkspace(),
    );
    await page.getByLabel("Map description").fill("Preserved map instructions");
    await page.getByRole("button", { name: "Create map", exact: true }).click();
    await page.getByRole("button", { name: "Save completed artwork" }).click();
    await expect(page.getByRole("alert")).toContainText(
      outcome === "failed"
        ? "Artwork was not saved"
        : "Saved artwork could not be confirmed",
    );
    await expect(page.getByRole("status")).not.toContainText(
      "Saved privately",
      { timeout: 30000 },
    );
    await expect(page.getByLabel("Map description")).toHaveValue(
      "Preserved map instructions",
    );
    const after = await page.evaluate(() =>
      (window as any).content.readMapWorkspace(),
    );
    expect(after.versions).toEqual(before.versions);
    expect(after.presentation).toEqual(before.presentation);
    expect(providerRequests).toBe(0);
    expect(await page.evaluate(() => (window as any).feedbackCommands)).toEqual(
      ["submit", "output"],
    );
  });
}
test("UI read projection fixture: reload retry reads original request, preserves intent and refreshes CAS without uncertain resubmission", async ({
  page,
}) => {
  let providerRequests = 0;
  page.on("request", (request) => {
    if (request.url().startsWith("http://127.0.0.1:49177")) providerRequests++;
  });
  const c = { local: true, projectionFixture: true };
  await connect(page, c);
  await expect(page.locator("#projection-label")).toContainText(
    "UI read projection fixture",
  );
  await upload(page);
  await page
    .getByLabel("Map description")
    .fill("Original retry instructions retained across reload");
  await page.getByLabel("Appearance instructions").fill("Copper ink");
  await page.getByRole("button", { name: "Create map", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("fixture-failure");
  const first = await page.evaluate(
    () => (window as any).projectionIntents()[0],
  );
  await page.getByRole("button", { name: "Save alignment as version" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Artwork saved privately",
    { timeout: 30000 },
  );
  await connect(page, c);
  const workspace = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  expect(workspace.jobs[0].originalIntent).toBeUndefined();
  await page.getByLabel("Map family").selectOption(first.familyId);
  await page
    .locator(`[data-job-id="${first.requestId}"]`)
    .getByRole("button", { name: "Retry creation" })
    .click();
  await expect(page.getByRole("alert")).toContainText("fixture-failure");
  const intents = await page.evaluate(() =>
    (window as any).projectionIntents(),
  );
  expect(intents).toHaveLength(2);
  expect(intents[1]).toEqual({
    ...first,
    requestId: intents[1].requestId,
    expectedVersion: 2,
  });
  expect(intents[1].requestId).not.toBe(first.requestId);
  expect(
    await page.evaluate(() =>
      (window as any).projectionCommands.map((c: any) => c.kind),
    ),
  ).toEqual(["read", "submit"]);
  await page.evaluate(() => {
    (window as any).projectionReadState = "uncertain";
  });
  await page
    .locator(`[data-job-id="${first.requestId}"]`)
    .getByRole("button", { name: "Retry creation" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "has not failed or been cancelled",
  );
  expect(
    await page.evaluate(() => (window as any).projectionIntents().length),
  ).toBe(2);
  expect(
    await page.evaluate(() =>
      (window as any).projectionCommands.map((c: any) => c.kind),
    ),
  ).toEqual(["read", "submit", "read"]);
  expect(providerRequests).toBe(0);
  expect(
    (await page.evaluate(() => (window as any).content.readMapWorkspace()))
      .presentation.version,
  ).toBeNull();
});
test("UI read projection fixture: authoritative original intent overrides the session draft copy", async ({
  page,
}) => {
  await connect(page, { local: true, projectionFixture: true });
  await upload(page);
  await page.evaluate(() => {
    (window as any).projectionCanonicalInstructions =
      "Authoritative stored original instructions";
  });
  await page.getByLabel("Map description").fill("Session draft copy");
  await page.getByRole("button", { name: "Create map", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("fixture-failure");
  const first = await page.evaluate(
    () => (window as any).projectionIntents()[0],
  );
  await page.evaluate(() => {
    delete (window as any).projectionCanonicalInstructions;
  });
  await page.getByLabel("Map description").fill("Unrelated edited draft");
  await page
    .locator(`[data-job-id="${first.requestId}"]`)
    .getByRole("button", { name: "Retry creation" })
    .click();
  await expect(page.getByRole("alert")).toContainText("fixture-failure");
  const intents = await page.evaluate(() =>
    (window as any).projectionIntents(),
  );
  expect(intents).toHaveLength(2);
  expect(intents[1].instructions).toBe(
    "Authoritative stored original instructions",
  );
  expect(intents[1].instructions).not.toContain("Session draft copy");
  expect(intents[1].instructions).not.toContain("Unrelated edited draft");
  expect(
    await page.evaluate(() =>
      (window as any).projectionCommands.map((c: any) => c.kind),
    ),
  ).toEqual(["submit", "read", "submit"]);
});
test("controlled controller transport interruption: real Edge receipt resumes the same job after reload without another submit", async ({
  page,
}) => {
  const c = config(6),
    partyId = JSON.parse(process.env.MAP_LIVE_PARTY_IDS!)[6];
  const { sql } = await import("../scripts/local-verification.mjs");
  let submits = 0,
    interrupted = false,
    requestId = "",
    beforeRecovery: any;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  function readReceipt() {
    if (!uuid.test(requestId) || !uuid.test(partyId))
      throw new Error("Invalid owned interruption fixture identity.");
    return JSON.parse(
      sql(
        `select jsonb_build_object('id',id,'state',state,'revision',revision,'provider_finished_at',provider_finished_at,'expires_at',coalesce((proof->>'expiresAt')::numeric,floor(extract(epoch from provider_finished_at)*1000)+86400000),'candidate_present',candidate is not null,'output_present',provisional is not null,'provider_submission_present',submission_token is not null,'owned_jobs',(select count(*) from public.party_map_generation_jobs where party_id='${partyId}'::uuid)) from public.party_map_generation_jobs where id='${requestId}'::uuid and party_id='${partyId}'::uuid;`,
      ),
    );
  }
  page.on("request", (request) => {
    if (request.url().startsWith("http://127.0.0.1:49177")) {
      try {
        if (request.postDataJSON()?.kind === "submit") submits++;
      } catch {
        /* output is encoded PNG; no body is logged */
      }
    }
  });
  await connect(page, c);
  await upload(page);
  const originals = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  const intercept = async (route: any) => {
    const command = route.request().postDataJSON();
    if (command?.kind !== "submit" || interrupted) {
      await route.continue();
      return;
    }
    interrupted = true;
    requestId = command.intent.requestId;
    const startedAt = Date.now();
    const response = await route.fetch({ timeout: 160000 });
    const body = await response.json();
    beforeRecovery = readReceipt();
    console.log(
      "MAP_JOB_RECOVERY " +
        JSON.stringify({
          phase: "before-controller-abort",
          id: requestId,
          status: response.status(),
          receivedState: body.job?.state ?? null,
          receivedCode: body.code ?? null,
          lifetimeMs: Date.now() - startedAt,
          receipt: beforeRecovery,
        }),
    );
    await route.abort("failed");
  };
  await page.route("http://127.0.0.1:49177/**", intercept);
  await page
    .getByLabel("Map description")
    .fill(
      "Retain this description through a controlled transport interruption",
    );
  await page.getByRole("button", { name: "Create map", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("unavailable", {
    timeout: 170000,
  });
  await expect(
    page.getByRole("button", { name: "Create map", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Map description")).toHaveValue(
    "Retain this description through a controlled transport interruption",
  );
  expect(beforeRecovery).toMatchObject({
    id: requestId,
    state: "awaiting-client-output",
    candidate_present: true,
    output_present: false,
    provider_submission_present: true,
    owned_jobs: 1,
  });
  expect(beforeRecovery.provider_finished_at).toBeTruthy();
  expect(beforeRecovery.expires_at).toBeGreaterThan(Date.now());
  expect(submits).toBe(1);
  const preserved = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  expect(preserved.versions).toEqual(originals.versions);
  expect(preserved.presentation).toEqual(originals.presentation);
  await page.unroute("http://127.0.0.1:49177/**", intercept);
  await connect(page, c);
  await page.getByLabel("Map family").selectOption(originals.families[0].id);
  const card = page.locator(`[data-job-id="${requestId}"]`);
  await card.getByRole("button", { name: "Refresh progress" }).click();
  await expect(
    card.getByRole("button", { name: "Save completed artwork" }),
  ).toBeEnabled();
  await card.getByRole("button", { name: "Save completed artwork" }).click();
  await expect(page.getByRole("status")).toContainText("Saved privately", {
    timeout: 30000,
  });
  const afterRecovery = readReceipt();
  console.log(
    "MAP_JOB_RECOVERY " +
      JSON.stringify({
        phase: "after-explicit-resume",
        receipt: afterRecovery,
      }),
  );
  expect(afterRecovery).toMatchObject({
    id: requestId,
    state: "completed",
    candidate_present: true,
    output_present: true,
    provider_submission_present: true,
    owned_jobs: 1,
  });
  expect(afterRecovery.provider_finished_at).toBe(
    beforeRecovery.provider_finished_at,
  );
  expect(afterRecovery.expires_at).toBe(beforeRecovery.expires_at);
  expect(submits).toBe(1);
  const finished = await page.evaluate(() =>
    (window as any).content.readMapWorkspace(),
  );
  expect(finished.jobs).toHaveLength(1);
  expect(finished.jobs[0].id).toBe(requestId);
  expect(finished.versions).toHaveLength(originals.versions.length + 1);
  expect(
    finished.versions.filter((v: any) => v.jobId === requestId),
  ).toHaveLength(1);
  expect(
    finished.versions.find((v: any) => v.id === originals.versions[0].id),
  ).toEqual(originals.versions[0]);
  expect(finished.presentation).toEqual(originals.presentation);
});

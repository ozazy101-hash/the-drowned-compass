import { test, expect, type Page } from "@playwright/test";
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
  );
}
async function saveOutput(page: Page) {
  await expect(
    page.getByRole("button", { name: "Save completed artwork" }).last(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save completed artwork" })
    .last()
    .click();
  await expect(page.getByRole("status")).toContainText("Saved privately");
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
      .getByLabel("Compare versions", { exact: true })
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
    await expect(
      page.getByRole("button", { name: "Cancel creation" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel creation" }).click();
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
  await connect(page, config(1));
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
  await expect(page.getByLabel("Creation jobs")).toContainText("uncertain");
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
  await expect(page.getByLabel("Creation jobs")).toContainText("uncertain");
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
  ["Supabase", 0],
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

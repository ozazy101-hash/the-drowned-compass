# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: map-workshop.spec.ts >> laptop: real fixture invent sibling comparison and upload alignment survive reload
- Location: e2e/map-workshop.spec.ts:110:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Save completed artwork' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Save completed artwork' }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Save completed artwork' })

```

```yaml
- main:
  - button "Back to Party"
  - button "Open Dungeon Master Library"
  - heading "Map creation workshop" [level=1]
  - paragraph: Private DM artwork. Creating, uploading and inspecting leave the Party Display unchanged.
  - button "Open drawing tools"
  - paragraph: Drawing tools open the latest saved drawing in the chosen map family.
  - group:
    - heading "Create a map" [level=2]
    - button "Invent a map" [disabled] [pressed]
    - button "Use my sketch" [disabled]
    - button "New map" [disabled]
    - text: Map title
    - textbox "Map title" [disabled]: Untitled Grid Map
    - text: Columns
    - spinbutton "Columns" [disabled]: "24"
    - text: Rows
    - spinbutton "Rows" [disabled]: "18"
    - text: Game feet per square
    - spinbutton "Game feet per square" [disabled]: "5"
    - text: Map description
    - textbox "Map description" [disabled]: A sea cave
    - text: Appearance instructions
    - textbox "Appearance instructions" [disabled]: Dark blue stone
    - button "Create map" [disabled]
    - button "Try another version" [disabled]
    - text: Upload finished artwork
    - button "Upload finished artwork" [disabled]
    - paragraph: "Finished artwork: PNG, JPEG or WebP, up to 20 MiB and 16 million pixels. Fits proportionally; letterboxing may remain."
  - status: Working…
  - region "Creation jobs":
    - heading "Creation jobs" [level=2]
    - paragraph: Cancellation prevents attachment of late artwork; provider billing may still apply. Refresh progress to reconcile uncertain work.
    - article:
      - paragraph: Deterministic provider fixture — no live call · running
      - button "Refresh progress" [disabled]
      - button "Cancel creation"
  - region "Map artwork versions":
    - heading "Saved versions" [level=2]
    - button "Refresh saved versions" [disabled]
    - text: Map family
    - combobox "Map family" [disabled]:
      - option "New map"
      - option "Creation in progress" [selected]
    - paragraph: No saved artwork yet. Create a map or upload finished artwork.
```

# Test source

```ts
  24  |     page.getByRole("heading", { name: "Map creation workshop" }),
  25  |   ).toBeVisible();
  26  | }
  27  | async function png(
  28  |   page: Page,
  29  |   type = "image/png",
  30  |   width = 1024,
  31  |   height = 1024,
  32  | ) {
  33  |   return await page.evaluate(
  34  |     async ({ type, width, height }) => {
  35  |       const c = document.createElement("canvas");
  36  |       c.width = width;
  37  |       c.height = height;
  38  |       const ctx = c.getContext("2d")!;
  39  |       ctx.fillStyle = "#226688";
  40  |       ctx.fillRect(0, 0, width, height);
  41  |       const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), type));
  42  |       return [...new Uint8Array(await blob.arrayBuffer())];
  43  |     },
  44  |     { type, width, height },
  45  |   );
  46  | }
  47  | async function upload(
  48  |   page: Page,
  49  |   type = "image/png",
  50  |   width = 1024,
  51  |   height = 1024,
  52  | ) {
  53  |   const bytes = await png(page, type, width, height);
  54  |   await page.getByLabel("Upload finished artwork").setInputFiles({
  55  |     name: "finished." + type.split("/")[1],
  56  |     mimeType: type,
  57  |     buffer: Buffer.from(bytes),
  58  |   });
  59  |   await expect(page.getByRole("status")).toContainText(
  60  |     "Artwork saved privately",
  61  |     { timeout: 30000 },
  62  |   );
  63  | }
  64  | async function saveOutput(page: Page) {
  65  |   await expect(
  66  |     page.getByRole("button", { name: "Save completed artwork" }).last(),
  67  |   ).toBeVisible({ timeout: 30000 });
  68  |   await page
  69  |     .getByRole("button", { name: "Save completed artwork" })
  70  |     .last()
  71  |     .click();
  72  |   await expect(page.getByRole("status")).toContainText("Saved privately", {
  73  |     timeout: 30000,
  74  |   });
  75  | }
  76  | async function acceptedReceipt(page: Page) {
  77  |   await expect
  78  |     .poll(
  79  |       async () => {
  80  |         const workspace = await page.evaluate(() =>
  81  |           (window as any).content.readMapWorkspace(),
  82  |         );
  83  |         return workspace.jobs.filter(
  84  |           (j: any) => j.state === "awaiting-client-output",
  85  |         ).length;
  86  |       },
  87  |       { timeout: 30000 },
  88  |     )
  89  |     .toBe(1);
  90  |   await expect(
  91  |     page.getByRole("button", { name: "Create map", exact: true }),
  92  |   ).toBeEnabled({ timeout: 30000 });
  93  |   const workspace = await page.evaluate(() =>
  94  |     (window as any).content.readMapWorkspace(),
  95  |   );
  96  |   const job = workspace.jobs.find(
  97  |     (j: any) => j.state === "awaiting-client-output",
  98  |   );
  99  |   const card = page.locator(`[data-job-id="${job.id}"]`);
  100 |   await card.getByRole("button", { name: "Refresh progress" }).click();
  101 |   await expect(
  102 |     card.getByRole("button", { name: "Save completed artwork" }),
  103 |   ).toBeEnabled({ timeout: 30000 });
  104 |   return job;
  105 | }
  106 | for (const [name, width, height, index] of [
  107 |   ["laptop", 1440, 900, 0],
  108 |   ["phone", 390, 844, 2],
  109 | ] as const) {
  110 |   test(`${name}: real fixture invent sibling comparison and upload alignment survive reload`, async ({
  111 |     page,
  112 |   }) => {
  113 |     await page.setViewportSize({ width, height });
  114 |     const c = config(index);
  115 |     await connect(page, c);
  116 |     await page.getByLabel("Columns", { exact: true }).fill("24");
  117 |     await page.getByLabel("Rows", { exact: true }).fill("18");
  118 |     await page.getByLabel("Map description").fill("A sea cave");
  119 |     await page.getByLabel("Appearance instructions").fill("Dark blue stone");
  120 |     await page.getByRole("button", { name: "Create map", exact: true }).focus();
  121 |     await page.keyboard.press("Enter");
  122 |     await expect(
  123 |       page.getByRole("button", { name: "Save completed artwork" }),
> 124 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  125 |     const queued = await page.evaluate(() =>
  126 |       (window as any).content.readMapWorkspace(),
  127 |     );
  128 |     await connect(page, c);
  129 |     await page
  130 |       .getByLabel("Map family")
  131 |       .selectOption(queued.jobs.at(-1).familyId);
  132 |     await page.getByRole("button", { name: "Refresh progress" }).last().click();
  133 |     await saveOutput(page);
  134 |     const first = await page.evaluate(() =>
  135 |       (window as any).content.readMapWorkspace(),
  136 |     );
  137 |     expect(first.presentation.version).toBeNull();
  138 |     await page.getByLabel("Map description").fill("");
  139 |     await page.getByRole("button", { name: "Try another version" }).click();
  140 |     await saveOutput(page);
  141 |     const sibling = await page.evaluate(() =>
  142 |       (window as any).content.readMapWorkspace(),
  143 |     );
  144 |     expect(sibling.versions).toHaveLength(2);
  145 |     expect(sibling.versions[0].parentVersionId).toBe(
  146 |       sibling.versions[1].parentVersionId,
  147 |     );
  148 |     expect(sibling.versions[0].instructions).toBe(
  149 |       sibling.versions[1].instructions,
  150 |     );
  151 |     await page
  152 |       .getByRole("combobox", { name: "Compare versions", exact: true })
  153 |       .selectOption(sibling.versions[0].id);
  154 |     await expect(
  155 |       page.getByRole("img", { name: "Comparison map artwork" }),
  156 |     ).toBeVisible();
  157 |     await expect(
  158 |       page.getByRole("button", { name: "Use this map", exact: true }),
  159 |     ).toBeDisabled();
  160 |     await upload(page);
  161 |     await page.getByLabel("Artwork scale", { exact: true }).fill("0.5");
  162 |     await page.getByLabel("Artwork horizontal position").fill("2");
  163 |     await page
  164 |       .getByRole("button", { name: "Save alignment as version" })
  165 |       .click();
  166 |     await expect(page.getByRole("status")).toContainText(
  167 |       "Artwork saved privately",
  168 |       { timeout: 30000 },
  169 |     );
  170 |     const saved = await page.evaluate(() =>
  171 |       (window as any).content.readMapWorkspace(),
  172 |     );
  173 |     expect(saved.versions).toHaveLength(4);
  174 |     const aligned = saved.versions.find(
  175 |       (v: any) => v.parentVersionId === saved.versions[2].id,
  176 |     );
  177 |     expect(aligned.background.width).toBe(9);
  178 |     expect(aligned.background.x).toBe(2);
  179 |     expect(saved.presentation).toEqual(first.presentation);
  180 |     await page.reload();
  181 |     await page.waitForFunction(
  182 |       () => typeof (window as any).configure === "function",
  183 |     );
  184 |     await page.evaluate((c) => (window as any).configure(c), c);
  185 |     await page.getByLabel("Map family").selectOption(saved.families[0].id);
  186 |     await expect(
  187 |       page.getByRole("button", { name: /Inspect version/ }),
  188 |     ).toHaveCount(4);
  189 |     await page.getByRole("button", { name: /Inspect version 4/ }).click();
  190 |     await expect(page.getByLabel("Artwork horizontal position")).toHaveValue(
  191 |       "2",
  192 |     );
  193 |     await page.getByRole("button", { name: "Reset to fit" }).click();
  194 |     await expect(page.getByLabel("Artwork scale", { exact: true })).toHaveValue(
  195 |       "1",
  196 |     );
  197 |     await page.screenshot({
  198 |       path: `/private/tmp/ticket07-${name}.png`,
  199 |       fullPage: true,
  200 |     });
  201 |   });
  202 |   test(`${name}: touch sketch clear undo reference creation, cancellation and retry preserve originals`, async ({
  203 |     page,
  204 |   }) => {
  205 |     await page.setViewportSize({ width, height });
  206 |     await connect(page, config(index + 1));
  207 |     await page
  208 |       .getByRole("button", { name: "Use my sketch", exact: true })
  209 |       .click();
  210 |     await page.getByLabel("Map description").fill("A closed room");
  211 |     const svg = page.getByRole("img", { name: "Sketch drawing surface" });
  212 |     await svg.locator("..").scrollIntoViewIfNeeded();
  213 |     const box = (await svg.boundingBox())!;
  214 |     async function outline() {
  215 |       if (name === "phone") {
  216 |         const cdp = await page.context().newCDPSession(page);
  217 |         await cdp.send("Input.dispatchTouchEvent", {
  218 |           type: "touchStart",
  219 |           touchPoints: [{ x: box.x + 20, y: box.y + 20 }],
  220 |         });
  221 |         for (const [x, y] of [
  222 |           [150, 20],
  223 |           [150, 120],
  224 |           [20, 120],
```
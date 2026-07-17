// Enforces the app's core privacy promise (plan section 7): no image data,
// or any data at all, ever leaves the device. Requests to the local dev
// server itself (JS/WASM/CSS assets, same-origin) are expected and allowed;
// this test fails if ANY request is observed to a non-local-server origin
// at any point during import, edit, or export.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const NEF_FIXTURE = join(
  __dirname,
  "../fixtures/nef/DSC_0049.NEF",
);

test("no external network requests during import, edit, or export", async ({ page, baseURL }) => {
  const externalRequests: string[] = [];
  const localOrigin = new URL(baseURL!).origin;

  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(localOrigin) && !url.startsWith("data:") && !url.startsWith("blob:")) {
      externalRequests.push(url);
    }
  });

  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(/WASM ready/, { timeout: 15_000 });

  // Import: load a real RAW file and wait for decode + first GPU preview.
  const fileInput = page.locator("#file");
  const buffer = readFileSync(NEF_FIXTURE);
  await fileInput.setInputFiles({
    name: "DSC_0049.NEF",
    mimeType: "application/octet-stream",
    buffer,
  });
  await expect(page.locator("#status")).toHaveText(/Decoded/, { timeout: 60_000 });

  // Edit: pick a recipe, drag the exposure slider, and toggle before/after —
  // the interactive paths that touch the recipe pipeline per frame.
  await page.locator("#recipe-kodak-portra-400").click();
  await page.locator("#exposure").fill("0.5");
  await page.locator("#before-after-toggle").click();
  await page.locator("#before-after-toggle").click();

  // Export: full-res JPEG render, the one path that produces a downloadable
  // file — confirms even export never touches the network.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#export-jpeg").click(),
  ]);
  expect(download.suggestedFilename()).toBe("film-recipe-export.jpg");
  await expect(page.locator("#status")).toHaveText(/Exported JPEG/, { timeout: 30_000 });

  expect(
    externalRequests,
    `expected zero external requests, observed: ${JSON.stringify(externalRequests)}`,
  ).toEqual([]);
});

test("clear all app data confirms, then wipes IndexedDB", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(/WASM ready/, { timeout: 15_000 });

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#clear-all-data").click();
  await expect(page.locator("#status")).toHaveText(/All app data cleared/, { timeout: 15_000 });
});

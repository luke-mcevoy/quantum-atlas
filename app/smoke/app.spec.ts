import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const atlas = JSON.parse(readFileSync(new URL("../public/atlas.json", import.meta.url), "utf8"));
const bigSystem = [...atlas.systems].sort((a, b) => (b.metrics?.length ?? 0) - (a.metrics?.length ?? 0) || (b.physical_qubits?.value ?? 0) - (a.physical_qubits?.value ?? 0))[0];
const snippetRoute = atlas.access.find((a: { snippet?: unknown }) => a.snippet);
const revised = atlas.targets.find((t: { superseded_by?: string }) => t.superseded_by);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

test("globe loads the verified atlas with labels and no errors", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.locator(".brand-name")).toHaveText("QUANTUM COMPUTING ATLAS");
  await expect(page.locator(".draft-flag")).toHaveCount(0);
  await expect(page.locator(".glabel").first()).toBeAttached();
  expect(errors).toEqual([]);
});

test("deep link to a system opens the inspector with evidence and as-stated metrics", async ({ page }) => {
  await page.goto(`/#sel=${bigSystem.id}`);
  await expect(page.locator(".inspector h2")).toHaveText(bigSystem.name);
  await expect(page.locator(".inspector .ev").first()).toBeVisible();
  if (bigSystem.metrics?.length) await expect(page.locator(".inspector .metric-def").first()).toContainText("Definition as stated");
});

test("access route shows the verbatim snippet, its source and the local-simulator result", async ({ page }) => {
  test.skip(!snippetRoute, "no snippet published");
  await page.goto(`/#mode=access&sel=${snippetRoute.id}`);
  await expect(page.locator(".inspector pre.snippet").first()).toBeVisible();
  await expect(page.locator(".inspector .snippet-meta a").first()).toHaveAttribute("href", /^https?:\/\//);
  await expect(page.locator(".inspector .sim")).toBeVisible();
});

test("roadmap timeline: achievements and targets are drawn in separate lanes and styles", async ({ page }) => {
  await page.goto("/#mode=roadmap");
  await expect(page.locator(".roadmap-tl")).toBeVisible();
  const ms = page.locator(".tl-tick.ms");
  const tg = page.locator(".tl-tick.tgt");
  expect(await ms.count()).toBe(atlas.milestones.length);
  expect(await tg.count()).toBe(atlas.targets.length);
  // No target is ever rendered with the "achieved" class.
  expect(await page.locator(".tl-tick.tgt.achieved").count()).toBe(0);
  await tg.first().click();
  await expect(page.locator(".inspector .tgt-flag")).toHaveText(/TARGET · NOT AN ACHIEVEMENT/);
});

test("a revised target shows its revision history", async ({ page }) => {
  test.skip(!revised, "no revised target published");
  await page.goto(`/#mode=roadmap&sel=${revised.id}`);
  expect(await page.locator(".inspector .revisions li").count()).toBeGreaterThan(1);
});

test("data table lists rows, filters, and exports CSV", async ({ page }) => {
  await page.goto("/");
  await page.locator(".data-btn").click();
  const rows = page.locator(".datatable tbody tr");
  expect(await rows.count()).toBe(atlas.systems.length);
  await page.locator(".dt-head input").fill(bigSystem.name);
  expect(await rows.count()).toBeGreaterThan(0);
  const download = page.waitForEvent("download");
  await page.locator(".dt-csv").click();
  expect((await download).suggestedFilename()).toMatch(/^quantum-computing-atlas-systems-.*\.csv$/);
});

test("phone layout: bottom sheet fits, no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/#sel=${bigSystem.id}`);
  await expect(page.locator(".inspector")).toBeVisible();
  const box = await page.locator(".inspector").boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollW).toBeLessThanOrEqual(390);
});

test("stories play with verbatim, linked quotes", async ({ page }) => {
  await page.goto("/");
  await page.locator(".story-btn").click();
  await page.locator(".story-picker li").first().locator("button").click();
  await expect(page.locator(".story-quote blockquote").first()).toBeVisible();
  await expect(page.locator(".story-quote a").first()).toHaveAttribute("href", /^https?:\/\//);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".tour-title .mono")).toHaveText(/^02\//);
});

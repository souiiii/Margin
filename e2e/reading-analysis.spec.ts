import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { authorise } from "./fixtures/authorise";
const origin = "http://127.0.0.1:3008";
const passage =
  "After years of delays, the project turned a corner. The volunteers took it in their stride and kept working. Their steady effort paid off.";
test("the notes panel scrolls independently and retains the collected explanation", async ({
  page,
}) => {
  await authorise(page, origin);
  await page.goto(`${origin}/auth/start?enable=1`);
  await page.setViewportSize({ width: 1440, height: 600 });
  const source = `Scrolling demonstration. ${passage}\n\n${"The neighbourhood kept working on the library, one room at a time.\n\n".repeat(60)}`;
  const response = await page.request.post(`${origin}/api/articles`, {
    headers: { Origin: origin },
    data: { title: "Panel scrolling", body: source },
  });
  const article = await response.json();
  await page.goto(`${origin}/?view=readings&article=${article.id}`);
  await expect(page.locator(".suggestion-card")).toHaveCount(3);
  const panel = page.getByRole("complementary", { name: "Reading notes" });
  const workspace = page.locator(".workspace-scroll");
  const before = await panel.boundingBox();
  const availableHeight = await page.evaluate(
    () =>
      window.innerHeight -
      document.querySelector(".topbar")!.getBoundingClientRect().height -
      document.querySelector(".reader-toolbar")!.getBoundingClientRect().height,
  );
  expect(Math.abs(before!.height - availableHeight)).toBeLessThan(2);
  await panel.hover({ position: { x: 100, y: 150 } });
  await page.mouse.wheel(0, 450);
  await expect
    .poll(() => panel.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  expect(await workspace.evaluate((el) => el.scrollTop)).toBe(0);
  const tabs = await panel.locator(".rail-tabs").boundingBox();
  expect(Math.abs(tabs!.y - before!.y)).toBeLessThan(2);
  await panel.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.locator(".article-body").hover({ position: { x: 100, y: 150 } });
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => workspace.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  const after = await panel.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
  await page
    .locator(".suggestion")
    .filter({ hasText: "turned a corner" })
    .click();
  await page
    .getByRole("button", { name: "Collect expression", exact: true })
    .click();
  await expect(page.locator(".definition-preview h2")).toHaveText(
    "turned a corner",
  );
  await expect(
    page.getByRole("button", { name: "Collected", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Discoveries", exact: true }).click();
  await expect(page.locator(".suggestion-card")).toHaveCount(3);
  await expect(
    page.getByRole("button", {
      name: "Collected turned a corner",
      exact: true,
    }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.locator(".suggestion-card")).toHaveCount(3);
  await expect(
    page.getByRole("button", {
      name: "Collected turned a corner",
      exact: true,
    }),
  ).toBeDisabled();
  const state = await page.request
    .get(`${origin}/api/state?date=2026-10-26`)
    .then((r) => r.json());
  const item = state.items.find(
    (item: { term: string; id: string }) => item.term === "turn a corner",
  );
  await page.request.delete(`${origin}/api/articles/${article.id}`, {
    headers: { Origin: origin },
  });
  await page.request.delete(`${origin}/api/items/${item.id}`, {
    headers: { Origin: origin },
  });
});
function requestsFor(source: string) {
  const hash = createHash("sha256").update(source).digest("hex");
  try {
    return readFileSync(process.env.MARGIN_E2E_AI_AUDIT!, "utf8")
      .trim()
      .split("\n")
      .filter((line) => JSON.parse(line).sourceHash === hash).length;
  } catch {
    return 0;
  }
}
test("automatic analysis, immediate exploration, collection, feedback and persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await authorise(page, origin);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/auth/start?enable=1`);
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/"))
      mutations.push(new URL(request.url()).pathname);
  });
  await page.getByRole("button", { name: "Readings", exact: true }).click();
  await page.getByRole("button", { name: "Add reading", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Patient progress");
  await page.getByLabel("Passage", { exact: true }).fill(passage);
  const started = Date.now();
  await page.getByRole("button", { name: "Save & read" }).click();
  await expect(page.locator(".article-body")).toHaveText(passage);
  const readingMs = Date.now() - started;
  await expect(page.locator(".analysis-status")).toBeVisible();
  await expect(page.locator(".ai-suggestion")).toHaveCount(3);
  const analysisMs = Date.now() - started;
  mkdirSync(".impeccable/review", { recursive: true });
  await page.screenshot({
    path: ".impeccable/review/reader-ai-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  const articleURL = page.url();
  expect(readingMs).toBeLessThan(analysisMs);
  expect(requestsFor(passage)).toBe(1);
  expect(mutations.filter((path) => path === "/api/state")).toHaveLength(0);
  const exploreStart = Date.now();
  await page
    .getByRole("button", { name: "Explore turned a corner", exact: true })
    .click();
  await expect(page.locator(".definition-preview")).toContainText(
    "Began to improve after difficulty.",
  );
  const exploreMs = Date.now() - exploreStart;
  expect(exploreMs).toBeLessThan(1000);
  await page.getByRole("button", { name: "Discoveries", exact: true }).click();
  await page
    .getByRole("button", { name: "Collect turned a corner", exact: true })
    .click();
  await expect(page.locator(".collected-mark")).toHaveCount(1);
  await expect(page.locator(".ai-suggestion")).toHaveCount(2);
  await expect(page.locator(".suggestion-card")).toHaveCount(3);
  await expect(
    page.getByRole("button", {
      name: "Collected turned a corner",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .locator(".suggestion-card")
    .filter({ hasText: "took it in their stride" })
    .getByRole("button", { name: "Already known", exact: true })
    .click();
  await expect(page.locator(".ai-suggestion")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".impeccable/review/reader-ai-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  const mutationRefetches = mutations.filter(
    (path) => path === "/api/state",
  ).length;
  expect(mutationRefetches).toBe(0);
  await page.reload();
  await expect(page.locator(".ai-suggestion")).toHaveCount(1);
  await expect(page.locator(".collected-mark")).toHaveCount(1);
  await page
    .locator(".suggestion-card")
    .filter({ hasText: "paid off" })
    .getByRole("button", { name: "Unhelpful", exact: true })
    .click();
  await expect(page.locator(".ai-suggestion")).toHaveCount(0);
  expect(requestsFor(passage)).toBe(1);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Language bank", exact: true })
    .click();
  await expect(
    page.getByText("turn a corner", { exact: true }).first(),
  ).toBeVisible();
  await page.goto(articleURL);
  await expect(page.locator(".collected-mark")).toHaveCount(1);
  expect(requestsFor(passage)).toBe(1);
  expect(errors).toEqual([]);
  console.info("Margin browser benchmark (simulated provider)", {
    readingMs,
    analysisMs,
    exploreMs,
    providerRequests: requestsFor(passage),
    mutationRefetches,
  });
});
test("opening an older unanalyzed reading starts one analysis without a save action", async ({
  page,
}) => {
  const source = `An older saved reading. ${passage}`;
  const backup = await page.request
    .get(`${origin}/api/backup`)
    .then((r) => r.json());
  const id = randomUUID(),
    now = new Date().toISOString();
  backup.data.articles.push({
    id,
    title: "An older reading",
    body: source,
    author: "",
    source_url: "",
    progress: 0,
    archived: false,
    created_at: now,
    updated_at: now,
  });
  backup.checksum = createHash("sha256")
    .update(JSON.stringify(backup.data))
    .digest("hex");
  const imported = await page.request.post(`${origin}/api/backup`, {
    headers: { Origin: origin },
    data: { mode: "merge", backup },
  });
  expect(imported.status()).toBe(200);
  expect(requestsFor(source)).toBe(0);
  expect(
    await page.request
      .get(`${origin}/api/articles/${id}/analysis`)
      .then((r) => r.json()),
  ).toBeNull();
  await page.goto(`${origin}/?view=readings&article=${id}`);
  await expect(page.locator(".article-body")).toHaveText(source);
  await expect
    .poll(
      async () =>
        (
          await page.request
            .get(`${origin}/api/articles/${id}/analysis`)
            .then((r) => r.json())
        ).status,
    )
    .toBe("complete");
  expect(requestsFor(source)).toBe(1);
  await page.reload();
  await expect(page.locator(".article-body")).toHaveText(source);
  expect(requestsFor(source)).toBe(1);
});
test("failed analysis stays failed on reopen, retries deliberately, and edits invalidate results", async ({
  page,
}) => {
  const source = `${passage} ANALYSIS_FAIL_ONCE`;
  const created = await page.request.post(`${origin}/api/articles`, {
    headers: { Origin: origin },
    data: { title: "Retrying a reading", body: source },
  });
  expect(created.status()).toBe(201);
  const article = await created.json();
  await page.goto(`${origin}/?view=readings&article=${article.id}`);
  await expect(page.locator(".article-body")).toHaveText(source);
  await expect(page.locator(".analysis-error")).toContainText("ChatGPT");
  await page.reload();
  await expect(page.locator(".analysis-error")).toBeVisible();
  expect(requestsFor(source)).toBe(1);
  await page
    .getByRole("button", { name: "Retry analysis", exact: true })
    .click();
  await expect(page.locator(".analysis-error")).toHaveCount(0);
  await expect(page.locator(".analysis-status")).toHaveCount(0);
  expect(requestsFor(source)).toBe(2);
  const revised = `${passage} A revised ending.`;
  const updated = await page.request.patch(
    `${origin}/api/articles/${article.id}`,
    { headers: { Origin: origin }, data: { body: revised } },
  );
  expect(updated.status()).toBe(200);
  await page.reload();
  await expect(page.locator(".article-body")).toHaveText(revised);
  await expect
    .poll(
      async () =>
        (
          await page.request
            .get(`${origin}/api/articles/${article.id}/analysis`)
            .then((r) => r.json())
        ).status,
    )
    .toBe("complete");
  expect(requestsFor(revised)).toBe(1);
});

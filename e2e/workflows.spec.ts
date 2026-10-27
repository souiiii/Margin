import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
async function capture(page: Page, name: string) {
  await page.locator(".toast").waitFor({ state: "hidden" });
  await page.evaluate(() => {
    document
      .querySelector(".workspace-scroll")
      ?.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: `.impeccable/review/${name}.png`,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
}
const passage =
  "The old station had fallen into disrepair. Rather than tear it down, the neighbourhood decided to turn it into a library.\n\nAt first, the plan seemed far-fetched. But the volunteers took it in their stride, restoring one room at a time. By spring, the project had turned a corner.\n\nThe library became a place for quiet conversations. The volunteers found that progress did not require grand gestures; it required showing up, day after day.";
test("complete local learning and recovery workflow", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Your English. A little more yours.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Start with a reading" }),
  ).toBeVisible();
  mkdirSync(".impeccable/review", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture(page, "today-desktop");
  await page
    .getByRole("button", { name: "Add a reading", exact: true })
    .click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("A second life for the station");
  await page.getByLabel("Passage", { exact: true }).fill(passage);
  await page.getByRole("button", { name: "Save & read" }).click();
  await expect(
    page.getByRole("heading", { name: "A second life for the station" }),
  ).toBeVisible();
  // Select real article text through the browser Range API, then exercise the highlight control.
  await page.locator(".article-body").evaluate((el) => {
    const node = el.firstChild!.firstChild!;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 44);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(page.locator(".article-body mark")).toHaveCount(1);
  await page
    .getByPlaceholder("Add a thought…")
    .fill("A useful expression for buildings, and sometimes relationships.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("button", { name: "Save note" })).toBeDisabled();
  await capture(page, "reader-desktop");
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(
    page.getByRole("button", { name: "Reading finished" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Language bank", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add expression", exact: true })
    .click();
  await page.getByLabel("Word or expression").fill("turn a corner");
  await page
    .getByLabel("Meaning", { exact: true })
    .fill("To begin to improve after a difficult period.");
  await page.getByRole("button", { name: "Collect", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "turn a corner", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Your note for this expression" })
    .fill("The project had turned a corner.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await capture(page, "bank-desktop");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Review expressions" }).click();
  await page.getByRole("button", { name: "Reveal meaning" }).click();
  await expect(
    page.getByText("To begin to improve after a difficult period.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Good On track" }).click();
  await expect(
    page.getByRole("heading", { name: "That’s a good place to pause." }),
  ).toBeVisible();
  // Refresh confirms the persistent backend, and production remains independently due.
  await page.reload();
  await page.getByRole("button", { name: /Use naturally/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Your sentence" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Working level").selectOption("C1");
  await page.getByLabel("Appearance").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await capture(page, "settings-dark-desktop");
  await page.getByLabel("Appearance").selectOption("light");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export library" }).click();
  const download = await downloadPromise;
  const file = await download.path();
  expect(file).toBeTruthy();
  await page.getByRole("button", { name: "Import backup" }).click();
  await page.locator('input[type="file"]').setInputFiles(file!);
  await expect(
    page.getByRole("heading", { name: "Bring your library back" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore library" }).click();
  await expect(
    page.getByRole("heading", { name: "Bring your library back" }),
  ).not.toBeVisible();
  // A real disconnected AI request presents recovery and never substitutes fake material.
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Make a practice" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Connect ChatGPT" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Dismiss error", exact: true })
    .click();
  await page.keyboard.press("Meta+k");
  await page.getByRole("textbox", { name: "Find in Margin" }).fill("station");
  await expect(
    page.getByRole("button", { name: /A second life for the station/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your English. A little more yours.",
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, "today-mobile");
  await page.locator(".compact-readings").getByRole("button").first().click();
  await expect(
    page.getByRole("heading", { name: "A second life for the station" }),
  ).toBeVisible();
  await capture(page, "reader-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const crossSite = await request.post("/api/items", {
    headers: { Origin: "https://example.invalid" },
    data: { term: "bad" },
  });
  expect(crossSite.status()).toBe(403);
  expect(errors).toEqual([]);
});

// Synthetic fixtures are imported only into Playwright's isolated temporary database.
test("persisted practice, comprehension and responsive study layouts", async ({
  page,
  request,
}) => {
  const res = await request.get("/api/backup");
  const backup = await res.json();
  const article = backup.data.articles[0];
  const item = backup.data.items[0];
  const now = new Date().toISOString();
  const setId = randomUUID(),
    readingSetId = randomUUID();
  const exercises = [
    {
      id: "rewrite",
      type: "rewrite",
      skill: "grammar",
      prompt:
        "Rewrite this sentence using ‘despite’: Although the plan was ambitious, the volunteers made steady progress.",
      options: [],
      answer:
        "Despite the ambitious plan, the volunteers made steady progress.",
      explanation:
        "Despite is followed by a noun phrase or a gerund, rather than a full finite clause.",
      evidence: "",
      item_ids: [],
    },
    {
      id: "choice",
      type: "multiple-choice",
      skill: "word-choice",
      prompt: "Which sentence uses ‘turn a corner’ naturally?",
      options: [
        "After months of delays, the project finally turned a corner.",
        "The project turned a corner of its schedule.",
        "She turned a corner to the meeting’s point.",
        "We turned a corner with a new paragraph.",
      ],
      answer: "After months of delays, the project finally turned a corner.",
      explanation:
        "Here it describes a change from difficulty toward improvement.",
      evidence: "",
      item_ids: [item.id],
    },
    {
      id: "writing",
      type: "writing",
      skill: "writing",
      prompt:
        "Describe a time when a difficult project began to improve. Use ‘turn a corner’ naturally in 2–3 sentences.",
      options: [],
      answer:
        "Our first attempts failed, but the project turned a corner when we asked for feedback. The next version was far clearer.",
      explanation:
        "Make the situation and the improvement clear, and use the expression naturally.",
      evidence: "",
      item_ids: [item.id],
    },
  ];
  backup.data.practice_sets.push({
    id: setId,
    kind: "mixed",
    title: "Making progress, one sentence at a time",
    payload: { exercises },
    source_article_id: null,
    created_at: now,
    completed_at: null,
  });
  backup.data.attempts.push({
    id: randomUUID(),
    set_id: setId,
    exercise_id: "rewrite",
    answer:
      "Despite the plan being ambitious, the volunteers made steady progress.",
    evaluation: {
      score: 1,
      feedback:
        "Natural and accurate. ‘Despite’ correctly introduces a gerund phrase, and your rewrite preserves the contrast in the original.",
      improved_answer:
        "Despite the ambitious plan, the volunteers made steady progress.",
      misconception: "",
      evidence: "",
    },
    skill: "grammar",
    item_ids: [],
    created_at: now,
  });
  const readingExercise = {
    id: "inference",
    type: "short-answer",
    skill: "comprehension",
    prompt:
      "Why does the writer contrast ‘grand gestures’ with ‘showing up, day after day’?",
    options: [],
    answer:
      "The contrast emphasises that consistent small actions brought the library into being, rather than a single impressive act.",
    explanation:
      "The final paragraph connects progress with the volunteers’ consistency.",
    evidence:
      "progress did not require grand gestures; it required showing up, day after day.",
    item_ids: [],
  };
  backup.data.practice_sets.push({
    id: readingSetId,
    kind: "comprehension",
    title: "The value of showing up",
    payload: { exercises: [readingExercise] },
    source_article_id: article.id,
    created_at: now,
    completed_at: null,
  });
  backup.checksum = createHash("sha256")
    .update(JSON.stringify(backup.data))
    .digest("hex");
  const imported = await request.post("/api/backup", {
    headers: { Origin: "http://127.0.0.1:3007" },
    data: { mode: "merge", backup },
  });
  expect(imported.status()).toBe(200);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/?view=practice&set=${setId}`);
  await expect(
    page.getByRole("heading", { name: exercises[1].prompt }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText("Well put.", { exact: true })).toBeVisible();
  await capture(page, "practice-desktop");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Show explanation" }).click();
  await expect(
    page.getByText(
      "Here it describes a change from difficulty toward improvement.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "practice-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto(`/?view=readings&article=${article.id}`);
  await expect(
    page.getByRole("heading", { name: readingExercise.prompt }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your answer" }),
  ).toBeVisible();
  await page.locator(".comprehension-section").screenshot({
    path: ".impeccable/review/comprehension-mobile.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=progress");
  await expect(
    page.getByRole("heading", { name: "Knowing it. Owning it." }),
  ).toBeVisible();
  await capture(page, "progress-desktop");
});

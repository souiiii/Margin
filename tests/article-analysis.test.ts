import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
const background = vi.hoisted(() => ({ jobs: [] as (() => Promise<void>)[] }));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (job: () => Promise<void>) => background.jobs.push(job),
}));
vi.mock("@/lib/auth", () => ({
  getModels: async () => [
    {
      slug: "test-model",
      display_name: "Test",
      reasoning_efforts: ["low", "medium"],
    },
  ],
  authEpoch: () => 1,
  openaiFetch: vi.fn(),
  providerError: async () => new Error("Provider failed"),
  authStatus: async () => ({ active: null, accounts: [], hostId: "test" }),
}));
import { openaiFetch } from "@/lib/auth";
import { POST, GET, PATCH } from "@/app/api/[...path]/route";
import {
  startAnalysis,
  readAnalysis,
  groundSelections,
  contentHash,
  selectionProfile,
  collectSuggestion,
  suggestionFeedback,
} from "@/lib/article-analysis";
import { runTask } from "@/lib/ai";
import { resumePlan } from "@/lib/ai-runtime";
import { rows } from "@/lib/db";
import { addItem, loadState } from "@/lib/store";
import {
  exportBackup,
  validateBackup,
  importBackup,
  checksum,
} from "@/lib/backup";
import { applyMutation } from "@/lib/client-state";
const body =
  "🙂 After years of delays, the project turned a corner. The volunteers took it in their stride and kept working. Their steady effort paid off.";
const selections = [
  {
    term: "turned a corner",
    lemma: "turn a corner",
    quote: "After years of delays, the project turned a corner.",
    kind: "idiom" as const,
    meaning: "Began to improve after difficulty.",
    reason: "Useful for describing progress.",
    example: "The business turned a corner in June.",
  },
  {
    term: "took it in their stride",
    lemma: "take it in your stride",
    quote: "The volunteers took it in their stride and kept working.",
    kind: "idiom" as const,
    meaning: "Handled the difficulty calmly.",
    reason: "A natural way to describe resilience.",
    example: "She took the delay in her stride.",
  },
  {
    term: "paid off",
    lemma: "pay off",
    quote: "Their steady effort paid off.",
    kind: "phrase" as const,
    meaning: "Produced a good result.",
    reason: "Useful when effort brings success.",
    example: "Your practice will pay off.",
  },
];
const result = {
  overview: "A project improves through patient work.",
  selections,
};
const complete = (value: unknown = result) =>
  new Response(
    `data: ${JSON.stringify({ type: "response.completed", response: { output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] } })}\n\n`,
  );
function request(path: string, method: string, data?: unknown) {
  return new NextRequest(`http://127.0.0.1:3000/api/${path}`, {
    method,
    headers: {
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
      "Content-Type": "application/json",
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
}
const ctx = (path: string) => ({
  params: Promise.resolve({ path: path.split("/") }),
});
async function article() {
  const id = randomUUID();
  await rows("INSERT INTO articles(id,title,body) VALUES($1,'A project',$2)", [
    id,
    body,
  ]);
  return id;
}
beforeEach(async () => {
  vi.clearAllMocks();
  resumePlan();
  background.jobs.length = 0;
  await rows(
    "TRUNCATE articles,items,practice_sets,ai_cache,app_settings,language_feedback CASCADE",
  );
  vi.mocked(openaiFetch).mockImplementation(async () => complete());
});

describe("automatic article learning", () => {
  it("links a collected manual highlight without duplicating it or replacing its note", async () => {
    const id = await article(),
      quote = "turned a corner",
      start = body.indexOf(quote);
    const highlight = await POST(
      request("annotations", "POST", {
        article_id: id,
        start_offset: start,
        end_offset: start + quote.length,
        quote,
        note: "My original note",
      }),
      ctx("annotations"),
    ).then((r) => r.json());
    const { item } = await addItem({
      term: quote,
      source_article_id: id,
      context: quote,
    });
    const collected = await POST(
      request("annotations", "POST", {
        article_id: id,
        start_offset: start,
        end_offset: start + quote.length,
        quote,
        item_id: item.id,
      }),
      ctx("annotations"),
    ).then((r) => r.json());
    expect(collected).toMatchObject({
      id: highlight.id,
      note: "My original note",
      item_id: item.id,
    });
    expect(
      await rows("SELECT * FROM annotations WHERE article_id=$1", [id]),
    ).toHaveLength(1);
  });
  it("persists an empty successful analysis and recovers an expired job without changing saved notes", async () => {
    const id = await article();
    vi.mocked(openaiFetch).mockResolvedValueOnce(
      complete({ overview: result.overview, selections: [] }),
    );
    await startAnalysis(id, (job) => background.jobs.push(job));
    await background.jobs.shift()!();
    expect((await readAnalysis(id))!).toMatchObject({
      status: "complete",
      payload: { selections: [] },
    });
    await startAnalysis(id, (job) => background.jobs.push(job));
    expect(background.jobs).toHaveLength(0);
    await rows(
      "UPDATE article_analyses SET status='running',payload=NULL,updated_at=now()-interval '11 minutes' WHERE article_id=$1",
      [id],
    );
    await startAnalysis(id, (job) => background.jobs.push(job));
    expect(background.jobs).toHaveLength(1);
    await background.jobs.shift()!();
    expect((await readAnalysis(id))!.status).toBe("complete");
  });
  it("preserves an existing note on collection and blocks edits to its source context", async () => {
    const id = await article();
    await startAnalysis(id, (job) => background.jobs.push(job));
    await background.jobs.shift()!();
    const saved = (await readAnalysis(id))!,
      s = saved.payload!.selections[0];
    await rows(
      "INSERT INTO annotations(id,article_id,start_offset,end_offset,quote,note) VALUES($1,$2,$3,$4,$5,'My own observation')",
      [randomUUID(), id, s.start_offset, s.end_offset, s.term],
    );
    const collected = await collectSuggestion(
      id,
      s.start_offset,
      saved.content_hash,
    );
    expect(collected.annotation.note).toBe("My own observation");
    const updated = await PATCH(
      request(`articles/${id}`, "PATCH", { body: body + " Revised." }),
      ctx(`articles/${id}`),
    );
    expect(updated.status).toBe(409);
    expect((await readAnalysis(id))!.content_hash).toBe(saved.content_hash);
  });
  it("saves immediately, schedules once across concurrent opens, persists and collects without more inference", async () => {
    const response = await POST(
      request("articles", "POST", { title: "Patient progress", body }),
      ctx("articles"),
    );
    expect(response.status).toBe(201);
    const { id } = await response.json();
    expect(openaiFetch).not.toHaveBeenCalled();
    expect(background.jobs).toHaveLength(1);
    await Promise.all(
      Array.from({ length: 5 }, () =>
        startAnalysis(id, (job) => background.jobs.push(job)),
      ),
    );
    expect(background.jobs).toHaveLength(1);
    await background.jobs.shift()!();
    const saved = (await readAnalysis(id))!;
    expect(saved.status).toBe("complete");
    expect(saved.payload!.selections).toHaveLength(3);
    expect(saved.metrics).toMatchObject({ cacheHit: false });
    const s = saved.payload!.selections[0];
    expect(body.slice(s.start_offset, s.end_offset)).toBe(s.term);
    await startAnalysis(id, () => {
      throw Error("Reopen must not schedule");
    });
    const definition = await runTask(
      {
        action: "define",
        term: s.term,
        articleId: id,
        context: s.term,
        startOffset: s.start_offset,
      },
      new AbortController().signal,
      () => {},
    );
    expect(definition).toMatchObject({
      meaning: s.meaning,
      examples: [{ sentence: s.example }],
    });
    const collected = await collectSuggestion(
      id,
      s.start_offset,
      saved.content_hash,
    );
    expect(collected.item.term).toBe(s.lemma);
    const bankDefinition = await runTask(
      { action: "define", term: s.lemma, articleId: id, context: s.quote },
      new AbortController().signal,
      () => {},
    );
    expect(bankDefinition).toMatchObject({ term: s.lemma, meaning: s.meaning });
    expect(collected.annotation.quote).toBe(s.term);
    expect(collected.reviewStates).toHaveLength(2);
    const duplicate = await collectSuggestion(
      id,
      s.start_offset,
      saved.content_hash,
    );
    expect(duplicate.item.id).toBe(collected.item.id);
    expect(duplicate.annotation.id).toBe(collected.annotation.id);
    expect(openaiFetch).toHaveBeenCalledTimes(1);
    expect(await rows("SELECT * FROM annotations")).toHaveLength(1);
    expect((await readAnalysis(id))!.payload!.selections).toHaveLength(3);
    expect((await readAnalysis(id))!.payload!.selections[0].term).toBe(s.term);
  });
  it("keeps suggestions separate from user annotations and uses feedback on future articles", async () => {
    const id = await article();
    await startAnalysis(id, (job) => background.jobs.push(job));
    await background.jobs.shift()!();
    const saved = (await readAnalysis(id))!;
    expect(await rows("SELECT * FROM annotations")).toHaveLength(0);
    await suggestionFeedback(
      id,
      saved.payload!.selections[0].start_offset,
      saved.content_hash,
      "known",
    );
    await suggestionFeedback(
      id,
      saved.payload!.selections[1].start_offset,
      saved.content_hash,
      "unhelpful",
    );
    expect((await readAnalysis(id))!.payload!.selections).toHaveLength(1);
    const profile = await selectionProfile(body);
    expect(profile).toMatchObject({
      level: "B2",
      feedback: expect.arrayContaining([
        { term: "turn a corner", feedback: "known" },
        { term: "take it in your stride", feedback: "unhelpful" },
      ]),
    });
    const second = await article();
    await startAnalysis(second, (job) => background.jobs.push(job));
    await background.jobs.shift()!();
    const sent = JSON.parse(
      JSON.parse(vi.mocked(openaiFetch).mock.calls[1][1]!.body as string)
        .input[0].content,
    );
    expect(sent.data.learner.feedback).toHaveLength(2);
    // Feedback still protects the reader if the model ignores its exclusions.
    expect((await readAnalysis(second))!.payload!.selections).toHaveLength(1);
  });
  it("reanalyzes only a changed body and rejects stale results during an edit", async () => {
    const id = await article();
    await startAnalysis(id, (job) => background.jobs.push(job));
    await PATCH(
      request(`articles/${id}`, "PATCH", { title: "New title", progress: 0.5 }),
      ctx(`articles/${id}`),
    );
    expect(background.jobs).toHaveLength(1);
    await PATCH(
      request(`articles/${id}`, "PATCH", { body: `${body} It was a success.` }),
      ctx(`articles/${id}`),
    );
    expect(background.jobs).toHaveLength(2);
    await background.jobs.shift()!();
    expect((await readAnalysis(id))!.status).toBe("running");
    await background.jobs.shift()!();
    expect((await readAnalysis(id))!.content_hash).toBe(
      contentHash(`${body} It was a success.`),
    );
    expect((await readAnalysis(id))!.status).toBe("complete");
    expect(openaiFetch).toHaveBeenCalledTimes(2);
  });
  it("persists a failed request, avoids retry loops and recovers on deliberate retry", async () => {
    const id = await article();
    vi.mocked(openaiFetch).mockResolvedValueOnce(
      new Response(
        'data: {"type":"response.failed","response":{"error":{"code":"server_error","message":"Temporary failure"}}}\n\n',
      ),
    );
    await startAnalysis(id, (job) => background.jobs.push(job));
    await background.jobs.shift()!();
    expect((await readAnalysis(id))!).toMatchObject({
      status: "failed",
      error: { code: "server_error" },
      payload: null,
    });
    await startAnalysis(id, (job) => background.jobs.push(job));
    expect(background.jobs).toHaveLength(0);
    expect(await rows("SELECT * FROM ai_cache")).toHaveLength(0);
    await startAnalysis(id, (job) => background.jobs.push(job), true);
    await background.jobs.shift()!();
    expect((await readAnalysis(id))!.status).toBe("complete");
    expect(openaiFetch).toHaveBeenCalledTimes(2);
  });
  it("pauses new plan requests after a limit while keeping completed analysis usable", async () => {
    const id = await article();
    vi.mocked(openaiFetch).mockResolvedValueOnce(
      new Response(
        'data: {"type":"error","code":"subscription_sharing_usage_limit_exceeded","message":"Allowance used"}\n\n',
      ),
    );
    await startAnalysis(id, (job) => background.jobs.push(job));
    await background.jobs.shift()!();
    const second = await article();
    await startAnalysis(second, (job) => background.jobs.push(job));
    await background.jobs.shift()!();
    expect(openaiFetch).toHaveBeenCalledTimes(1);
    expect((await readAnalysis(second))!.error?.code).toBe(
      "subscription_sharing_usage_limit_exceeded",
    );
    resumePlan();
    await startAnalysis(second, (job) => background.jobs.push(job), true);
    await background.jobs.shift()!();
    expect((await readAnalysis(second))!.status).toBe("complete");
  });
  it("bounds definition context and avoids sending a full reading twice", async () => {
    const id = await article();
    await rows("UPDATE articles SET body=$2 WHERE id=$1", [
      id,
      body.repeat(100),
    ]);
    vi.mocked(openaiFetch).mockResolvedValueOnce(
      complete({
        term: "paid off",
        kind: "phrase",
        meaning: "Brought a good result.",
        examples: [{ sentence: "The practice paid off.", note: "" }],
        collocations: [],
        related: [],
        register: "Neutral",
      }),
    );
    await runTask(
      {
        action: "define",
        articleId: id,
        term: "paid off",
        context: "paid off",
        startOffset: body.indexOf("paid off"),
      },
      new AbortController().signal,
      () => {},
    );
    const sent = JSON.parse(
      JSON.parse(vi.mocked(openaiFetch).mock.calls[0][1]!.body as string)
        .input[0].content,
    );
    expect(sent.data.context.length).toBeLessThan(1300);
    expect(sent.data).not.toHaveProperty("source");
  });
  it("round-trips analysis/feedback, accepts old backups and rejects corrupt offsets", async () => {
    const id = await article();
    await startAnalysis(id, (job) => background.jobs.push(job));
    await background.jobs.shift()!();
    const saved = (await readAnalysis(id))!;
    await suggestionFeedback(
      id,
      saved.payload!.selections[0].start_offset,
      saved.content_hash,
      "known",
    );
    const backup = await exportBackup();
    await importBackup(backup, "replace");
    expect((await readAnalysis(id))!.payload!.selections).toHaveLength(2);
    const invalid = structuredClone(backup);
    invalid.data.article_analyses[0].payload.selections[0].start_offset++;
    invalid.checksum = checksum(invalid.data);
    expect(() => validateBackup(invalid)).toThrow("does not match");
    const old = structuredClone(backup);
    delete old.data.article_analyses;
    delete old.data.language_feedback;
    old.checksum = checksum(old.data);
    expect(validateBackup(old).article_analyses).toEqual([]);
  });
  it("updates collection state with the targeted response and preserves review schedules", async () => {
    const id = await article();
    await startAnalysis(id, (job) => background.jobs.push(job));
    await background.jobs.shift()!();
    const saved = (await readAnalysis(id))!;
    const state = await loadState("2026-10-26");
    const collected = await collectSuggestion(
      id,
      saved.payload!.selections[0].start_offset,
      saved.content_hash,
    );
    const next = applyMutation(
      state,
      `articles/${id}/collect`,
      "POST",
      collected,
    )!;
    expect(next.items).toHaveLength(1);
    expect(next.annotations).toHaveLength(1);
    expect(next.reviewStates).toHaveLength(2);
    expect(next.articles).toBe(state.articles);
    const profile = await selectionProfile(body);
    expect(profile.collected).toContain("turn a corner");
    await addItem({ term: "An unrelated expression" });
    const status = await GET(
      request(`articles/${id}/analysis`, "GET"),
      ctx(`articles/${id}/analysis`),
    );
    expect((await status.json()).status).toBe("complete");
  });
});

describe("source grounding", () => {
  it("uses UTF-16 source offsets, drops hallucinations, repeated terms, overlaps and ambiguous quotations", () => {
    const grounded = groundSelections(body, {
      ...result,
      selections: [
        ...selections,
        selections[0],
        { ...selections[0], quote: "Invented source" },
      ],
    });
    expect(grounded).toHaveLength(3);
    expect(grounded[0].start_offset).toBe(body.indexOf("turned a corner"));
    expect(() => groundSelections(body + body, result)).toThrow("verified");
    expect(() =>
      groundSelections(body, {
        ...result,
        selections: [{ ...selections[0], term: "cornerstone" }],
      }),
    ).toThrow("verified");
  });
});

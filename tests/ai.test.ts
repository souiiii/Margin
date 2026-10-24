import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
vi.mock("@/lib/auth", () => ({
  getModels: async () => [
    {
      slug: "available-model",
      display_name: "Available",
      reasoning_efforts: ["low", "medium", "high"],
    },
  ],
  authEpoch: () => 0,
  openaiFetch: vi.fn(),
  providerError: async () => new Error("provider failed"),
  authStatus: async () => ({ active: null, accounts: [], hostId: "test" }),
}));
import { openaiFetch } from "@/lib/auth";
import { generate, parseSSE, validateExercises } from "@/lib/ai";
import { rows } from "@/lib/db";
import { saveSettings, defaultSettings } from "@/lib/store";
import { exercisesSchema } from "@/lib/schemas";
function stream(events: unknown[], chunkSize = 7) {
  const encoded = new TextEncoder().encode(
    events.map((e) => `data: ${JSON.stringify(e)}\r\n\r\n`).join(""),
  );
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < encoded.length; i += chunkSize)
        c.enqueue(encoded.slice(i, i + chunkSize));
      c.close();
    },
  });
}
beforeEach(() => vi.clearAllMocks());
describe("Responses stream and output quality", () => {
  it("handles SSE and UTF-8 split across arbitrary network chunks", async () => {
    const events = [];
    for await (const event of parseSSE(
      stream(
        [
          { type: "response.output_text.delta", delta: "café — clear" },
          { type: "response.completed" },
        ],
        1,
      ),
    ))
      events.push(event);
    expect(events[0].delta).toBe("café — clear");
    expect(events).toHaveLength(2);
  });
  it("uses only the account catalog model and the supported OAuth route body", async () => {
    vi.mocked(openaiFetch).mockResolvedValue(
      new Response(
        stream([
          { type: "response.output_text.delta", delta: '{"meaning":"hello"}' },
          { type: "response.completed" },
        ]),
      ),
    );
    const result = await generate(
      "test-success",
      {},
      z.object({ meaning: z.string() }),
      new AbortController().signal,
      () => {},
    );
    expect(result.meaning).toBe("hello");
    const [endpoint, options] = vi.mocked(openaiFetch).mock.calls[0];
    expect(endpoint).toBe("responses");
    const request = JSON.parse(options!.body as string);
    expect(request).toMatchObject({
      model: "available-model",
      store: false,
      stream: true,
      reasoning: { effort: "low" },
    });
    for (const unsupported of [
      "temperature",
      "max_output_tokens",
      "previous_response_id",
      "background",
    ])
      expect(request).not.toHaveProperty(unsupported);
  });
  it("sends independent efforts and separates cached results when preferences change", async () => {
    const send = () =>
      new Response(
        stream([
          { type: "response.output_text.delta", delta: '{"meaning":"routed"}' },
          { type: "response.completed" },
        ]),
      );
    vi.mocked(openaiFetch).mockImplementation(async () => send());
    await saveSettings({
      ...defaultSettings,
      everyday_reasoning: "low",
      advanced_reasoning: "medium",
    });
    const run = (profile: "everyday" | "advanced") =>
      generate(
        "reasoning-cache-check",
        {},
        z.object({ meaning: z.string() }),
        new AbortController().signal,
        () => {},
        undefined,
        profile,
      );
    await run("everyday");
    await run("everyday");
    expect(openaiFetch).toHaveBeenCalledTimes(1);
    await run("advanced");
    expect(
      JSON.parse(vi.mocked(openaiFetch).mock.calls[1][1]!.body as string)
        .reasoning,
    ).toEqual({ effort: "medium" });
    await saveSettings({
      ...defaultSettings,
      everyday_reasoning: "high",
      advanced_reasoning: "medium",
    });
    await run("everyday");
    expect(
      JSON.parse(vi.mocked(openaiFetch).mock.calls[2][1]!.body as string)
        .reasoning,
    ).toEqual({ effort: "high" });
    await saveSettings({ ...defaultSettings, everyday_reasoning: "max" });
    await expect(run("everyday")).rejects.toThrow("does not support");
    expect(openaiFetch).toHaveBeenCalledTimes(3);
    await saveSettings(defaultSettings);
  });
  it("never saves incomplete or failed streamed results", async () => {
    const before = await rows("SELECT key FROM ai_cache");
    vi.mocked(openaiFetch).mockResolvedValue(
      new Response(
        stream([
          {
            type: "response.output_text.delta",
            delta: '{"meaning":"partial"}',
          },
        ]),
      ),
    );
    await expect(
      generate(
        "test-incomplete",
        {},
        z.object({ meaning: z.string() }),
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("connection ended");
    expect(await rows("SELECT key FROM ai_cache")).toHaveLength(before.length);
  });
  it("requires semantic validation before caching generated material", async () => {
    const before = await rows("SELECT key FROM ai_cache");
    vi.mocked(openaiFetch).mockResolvedValue(
      new Response(
        stream([
          {
            type: "response.output_text.delta",
            delta: '{"meaning":"invented"}',
          },
          { type: "response.completed" },
        ]),
      ),
    );
    await expect(
      generate(
        "test-ungrounded",
        {},
        z.object({ meaning: z.string() }),
        new AbortController().signal,
        () => {},
        () => {
          throw new Error("ungrounded");
        },
      ),
    ).rejects.toThrow("ungrounded");
    expect(await rows("SELECT key FROM ai_cache")).toHaveLength(before.length);
  });
  it("catches usage errors that arrive after output has started", async () => {
    vi.mocked(openaiFetch).mockResolvedValue(
      new Response(
        stream([
          { type: "response.output_text.delta", delta: "partial" },
          {
            type: "response.failed",
            response: {
              error: { code: "subscription_sharing_usage_limit_exceeded" },
            },
          },
        ]),
      ),
    );
    await expect(
      generate(
        "test-late-limit",
        {},
        z.object({ meaning: z.string() }),
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("provider failed");
  });
  it("rejects fabricated evidence and unknown learning references", () => {
    const exercise = {
      id: "one",
      type: "short-answer" as const,
      skill: "comprehension" as const,
      prompt: "Why?",
      options: [],
      answer: "Because.",
      explanation: "Reason.",
      evidence: "An invented quote",
      item_ids: [],
    };
    expect(() =>
      validateExercises([exercise], [], "The actual source.", 1),
    ).toThrow("verified");
  });
  it("rejects ambiguous multiple-choice outputs", () => {
    expect(
      exercisesSchema.safeParse({
        title: "Test",
        exercises: [
          {
            id: "a",
            type: "multiple-choice",
            skill: "vocabulary",
            prompt: "Choose",
            options: ["A", "A", "B"],
            answer: "C",
            explanation: "why",
            evidence: "",
            item_ids: [],
          },
        ],
      }).success,
    ).toBe(false);
  });
});

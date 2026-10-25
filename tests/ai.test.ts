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
import { resumePlan } from "@/lib/ai-runtime";
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
beforeEach(() => {
  vi.clearAllMocks();
  resumePlan();
});
describe("Responses stream and output quality", () => {
  it("queues new work at two inferences, while cancelled queued work never reaches the provider", async () => {
    let active = 0,
      peak = 0;
    vi.mocked(openaiFetch).mockImplementation(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 60));
      active--;
      return new Response(
        stream([
          {
            type: "response.output_text.delta",
            delta: '{"meaning":"Queued safely"}',
          },
          { type: "response.completed" },
        ]),
      );
    });
    const progress: Record<string, unknown>[] = [];
    const run = (name: string, signal = new AbortController().signal) =>
      generate(name, {}, z.object({ meaning: z.string() }), signal, (event) =>
        progress.push(event),
      );
    const first = run("queue-first"),
      second = run("queue-second"),
      third = run("queue-third");
    const cancelled = new AbortController();
    const fourth = run("queue-cancelled", cancelled.signal);
    const failure = expect(fourth).rejects.toThrow();
    setTimeout(() => cancelled.abort(), 20);
    await Promise.all([first, second, third, failure]);
    expect(peak).toBe(2);
    expect(openaiFetch).toHaveBeenCalledTimes(3);
    expect(
      progress.some((event) => String(event.message).includes("Waiting")),
    ).toBe(true);
  });
  it("coalesces concurrent generation, measures latency, and serves subsequent calls from disk cache", async () => {
    vi.mocked(openaiFetch).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120));
      return new Response(
        stream([
          {
            type: "response.output_text.delta",
            delta: '{"meaning":"One shared response"}',
          },
          { type: "response.completed" },
        ]),
      );
    });
    const metrics: Record<string, unknown>[] = [];
    const run = () =>
      generate(
        "measured-shared-work",
        {},
        z.object({ meaning: z.string() }),
        new AbortController().signal,
        (event) => {
          if (event.type === "metrics") metrics.push(event);
        },
      );
    const firstStart = performance.now();
    await Promise.all([run(), run(), run()]);
    const firstMs = performance.now() - firstStart;
    const cachedStart = performance.now();
    await run();
    const cachedMs = performance.now() - cachedStart;
    expect(openaiFetch).toHaveBeenCalledTimes(1);
    expect(metrics[0]).toMatchObject({
      cacheHit: false,
      durationMs: expect.any(Number),
      firstTokenMs: expect.any(Number),
    });
    expect(metrics.at(-1)).toMatchObject({ cacheHit: true, inputBytes: 0 });
    expect(cachedMs).toBeLessThan(firstMs / 2);
    console.info("Margin deterministic provider benchmark", {
      concurrentConsumers: 3,
      inferenceRequests: 1,
      firstMs: Math.round(firstMs),
      cachedMs: Math.round(cachedMs),
    });
  });
  it("lets one consumer cancel shared inference without cancelling another reader", async () => {
    vi.mocked(openaiFetch).mockImplementation(
      async (_url, _options, signal) => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(signal?.aborted).toBe(false);
        return new Response(
          stream([
            {
              type: "response.output_text.delta",
              delta: '{"meaning":"Still reading"}',
            },
            { type: "response.completed" },
          ]),
        );
      },
    );
    const first = new AbortController();
    const pending = generate(
      "independent-consumer-cancellation",
      {},
      z.object({ meaning: z.string() }),
      first.signal,
      () => {},
    );
    const other = generate(
      "independent-consumer-cancellation",
      {},
      z.object({ meaning: z.string() }),
      new AbortController().signal,
      () => {},
    );
    const rejected = expect(pending).rejects.toThrow();
    setTimeout(() => first.abort(), 10);
    await rejected;
    expect(await other).toEqual({ meaning: "Still reading" });
    expect(openaiFetch).toHaveBeenCalledTimes(1);
  });
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
    ).rejects.toMatchObject({
      code: "subscription_sharing_usage_limit_exceeded",
    });
  });
  it.each([
    {
      type: "error",
      code: "invalid_type",
      message: "The provider rejected a request field.",
      param: "input[0].content",
    },
    {
      type: "error",
      error: {
        code: "invalid_type",
        message: "The provider rejected a request field.",
        param: "input[0].content",
      },
    },
    {
      type: "response.failed",
      response: {
        id: "resp_failure",
        error: {
          code: "invalid_type",
          message: "The provider rejected a request field.",
          param: "input[0].content",
        },
      },
    },
  ])(
    "preserves streaming failure cause and never caches a partial lesson ($type)",
    async (event) => {
      const before = await rows("SELECT key FROM ai_cache");
      vi.mocked(openaiFetch).mockResolvedValueOnce(
        new Response(
          stream([
            {
              type: "response.output_text.delta",
              delta: '{"meaning":"partial"}',
            },
            event,
          ]),
          { headers: { "x-request-id": "req_preserved" } },
        ),
      );
      await expect(
        generate(
          `failure-${JSON.stringify(event)}`,
          {},
          z.object({ meaning: z.string() }),
          new AbortController().signal,
          () => {},
        ),
      ).rejects.toMatchObject({
        code: "invalid_type",
        providerMessage: "The provider rejected a request field.",
        requestId: "req_preserved",
        transportStatus: 200,
        param: "input[0].content",
      });
      expect(await rows("SELECT key FROM ai_cache")).toHaveLength(
        before.length,
      );
      expect(openaiFetch).toHaveBeenCalledTimes(1);
    },
  );
  it("reads event names and the final unterminated SSE event", async () => {
    const content =
      'event: error\ndata: {"error":{"code":"invalid_type","message":"Specific cause"}}';
    const values = [];
    for await (const event of parseSSE(new Response(content).body!))
      values.push(event);
    expect(values).toEqual([
      {
        type: "error",
        error: { code: "invalid_type", message: "Specific cause" },
      },
    ]);
  });
  it("recovers on a user retry and uses final completed output when deltas are absent", async () => {
    vi.mocked(openaiFetch).mockResolvedValueOnce(
      new Response(
        stream([
          {
            type: "response.failed",
            response: {
              error: { code: "server_error", message: "Temporary failure" },
            },
          },
        ]),
      ),
    );
    const run = () =>
      generate(
        "retry-after-failure",
        {},
        z.object({ meaning: z.string() }),
        new AbortController().signal,
        () => {},
      );
    await expect(run()).rejects.toMatchObject({ code: "server_error" });
    vi.mocked(openaiFetch).mockResolvedValueOnce(
      new Response(
        stream([
          {
            type: "response.completed",
            response: {
              id: "resp_recovered",
              output: [
                {
                  type: "message",
                  content: [
                    { type: "output_text", text: '{"meaning":"recovered"}' },
                  ],
                },
              ],
            },
          },
        ]),
      ),
    );
    expect(await run()).toEqual({ meaning: "recovered" });
    expect(openaiFetch).toHaveBeenCalledTimes(2);
  });
  it("preserves request IDs for incomplete and interrupted streams", async () => {
    for (const event of [
      {
        type: "response.incomplete",
        response: {
          id: "resp_incomplete",
          incomplete_details: { reason: "max_output_tokens" },
        },
      },
      { type: "response.created", response: { id: "resp_interrupted" } },
    ]) {
      vi.mocked(openaiFetch).mockResolvedValueOnce(
        new Response(stream([event]), {
          headers: { "x-request-id": "req_interruption" },
        }),
      );
      await expect(
        generate(
          `interruption-${event.type}`,
          {},
          z.object({ meaning: z.string() }),
          new AbortController().signal,
          () => {},
        ),
      ).rejects.toMatchObject({ requestId: "req_interruption" });
    }
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

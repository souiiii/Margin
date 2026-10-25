import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const tasks = vi.hoisted(() => ({ runTask: vi.fn() }));
vi.mock("@/lib/ai", async (original) => {
  const actual = await original<typeof import("@/lib/ai")>();
  return { ...actual, runTask: tasks.runTask };
});
import { POST } from "@/app/api/ai/route";
import { normalizeProviderError } from "@/lib/provider-errors";
import { ai as clientAI } from "@/lib/client";
const request = () =>
  new Request("http://127.0.0.1:3000/api/ai", {
    method: "POST",
    headers: {
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "define", term: "take stock" }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("streaming route failure and recovery", () => {
  it("propagates provider metadata through NDJSON and releases the request slot after failure", async () => {
    tasks.runTask.mockRejectedValueOnce(
      normalizeProviderError(
        {
          type: "error",
          error: {
            code: "invalid_type",
            message: "Provider rejected the content shape.",
            status: 400,
            param: "input[0].content",
          },
        },
        { requestId: "req_route", transportStatus: 200 },
      ),
    );
    const response = await POST(request());
    expect(response.status).toBe(200);
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(events.at(-1)).toMatchObject({
      type: "error",
      code: "invalid_type",
      providerMessage: "Provider rejected the content shape.",
      providerStatus: 400,
      transportStatus: 200,
      requestId: "req_route",
    });
    expect(events.some((e) => e.type === "done")).toBe(false);
    tasks.runTask.mockResolvedValueOnce({ meaning: "A recovered lesson." });
    const recovered = await POST(request());
    expect(await recovered.text()).toContain('"type":"done"');
    expect(tasks.runTask).toHaveBeenCalledTimes(2);
  });
  it("retains streaming diagnostics in the browser error and allows a deliberate retry", async () => {
    const error = {
      type: "error",
      error: "Review the selected setting.",
      code: "unsupported_parameter",
      providerMessage: "Unsupported reasoning setting.",
      providerStatus: 400,
      transportStatus: 200,
      requestId: "req_browser",
      param: "reasoning.effort",
      diagnosticId: "diagnostic-browser",
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(error))) // Missing final newline is valid at EOF.
      .mockResolvedValueOnce(
        new Response('{"type":"done","result":{"ok":true}}\n'),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      clientAI({}, new AbortController().signal, () => {}),
    ).rejects.toMatchObject({
      code: "unsupported_parameter",
      requestId: "req_browser",
      metadata: {
        providerMessage: "Unsupported reasoning setting.",
        providerStatus: 400,
        param: "reasoning.effort",
        diagnosticId: "diagnostic-browser",
      },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await clientAI({}, new AbortController().signal, () => {})).toEqual({
      ok: true,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

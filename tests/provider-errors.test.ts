import { describe, it, expect, vi, afterEach } from "vitest";
import { normalizeProviderError, providerError } from "@/lib/provider-errors";
import { errorPayload } from "@/lib/errors";
import { logAIFailure } from "@/lib/diagnostics";
afterEach(() => vi.restoreAllMocks());
describe("provider error formats and safe diagnostics", () => {
  it("preserves response.failed metadata without inventing a stream HTTP failure", () => {
    const error = normalizeProviderError(
      {
        type: "response.failed",
        response: {
          id: "resp_failed",
          status: "failed",
          error: {
            code: "server_error",
            message: "The model failed to generate a response.",
          },
        },
      },
      { transportStatus: 200, requestId: "req_failed" },
    );
    expect(errorPayload(error)).toMatchObject({
      code: "server_error",
      providerMessage: "The model failed to generate a response.",
      transportStatus: 200,
      requestId: "req_failed",
      responseId: "resp_failed",
      eventType: "response.failed",
    });
    expect(error.providerStatus).toBeUndefined();
    expect(error.message).toContain("server error");
  });
  it("handles documented flat error events and null codes", () => {
    const error = normalizeProviderError(
      {
        type: "error",
        code: null,
        message: "A provider diagnostic.",
        param: null,
        sequence_number: 1,
      },
      { transportStatus: 200 },
    );
    expect(errorPayload(error)).toMatchObject({
      providerCode: null,
      providerMessage: "A provider diagnostic.",
      error: "A provider diagnostic.",
      param: null,
    });
  });
  it("handles nested streaming error envelopes without losing their underlying cause", () => {
    const error = normalizeProviderError(
      {
        type: "error",
        error: {
          code: "invalid_type",
          type: "invalid_request_error",
          message: "Expected input content to be an array.",
          param: "input[0].content",
          status_code: 400,
        },
        request_id: "req_nested",
      },
      { transportStatus: 200 },
    );
    expect(errorPayload(error)).toMatchObject({
      code: "invalid_type",
      providerCode: "invalid_type",
      providerMessage: "Expected input content to be an array.",
      providerStatus: 400,
      transportStatus: 200,
      param: "input[0].content",
      requestId: "req_nested",
    });
  });
  it("retains the original message alongside helpful usage guidance", () => {
    const error = normalizeProviderError({
      type: "error",
      code: "subscription_sharing_usage_limit_exceeded",
      message: "The application weekly allowance is exhausted.",
      status: 429,
    });
    expect(error.message).toContain("ChatGPT Settings");
    expect(error.providerMessage).toBe(
      "The application weekly allowance is exhausted.",
    );
    expect(error.providerStatus).toBe(429);
  });
  it("preserves HTTP admission details, status and request IDs", async () => {
    const error = await providerError(
      new Response(
        JSON.stringify({ detail: "Serving region is unavailable." }),
        { status: 403, headers: { "x-request-id": "req_region" } },
      ),
    );
    expect(errorPayload(error)).toMatchObject({
      error: "Serving region is unavailable.",
      code: "http_403",
      status: 403,
      transportStatus: 403,
      requestId: "req_region",
    });
    expect(error.details).toBeUndefined();
  });
  it("handles non-JSON admission errors without exposing raw response bodies", async () => {
    const error = await providerError(
      new Response("<html>Private gateway diagnostic</html>", {
        status: 503,
        headers: { "x-request-id": "req_gateway" },
      }),
    );
    expect(error.code).toBe("http_503");
    expect(error.message).toContain("temporarily unavailable");
    expect(errorPayload(error)).not.toHaveProperty("details");
  });
  it("logs only bounded metadata, never provider text, OAuth secrets, source contents, or raw errors", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = normalizeProviderError(
      {
        type: "error",
        error: {
          code: "invalid_request_error",
          message: "ARTICLE_CONTENT_SENTINEL Bearer OAUTH_TOKEN_SENTINEL",
          param: "input[0].content",
        },
        access_token: "CREDENTIAL_SENTINEL",
        response: { input: "PRIVATE_SOURCE_SENTINEL" },
      },
      { requestId: "req_safe", transportStatus: 200 },
    );
    logAIFailure(error, "define", "diagnostic-safe");
    const output = String(log.mock.calls[0][0]);
    expect(JSON.parse(output)).toMatchObject({
      event: "margin.ai.failure",
      code: "invalid_request_error",
      requestId: "req_safe",
      action: "define",
      transportStatus: 200,
    });
    for (const value of [
      "ARTICLE_CONTENT_SENTINEL",
      "OAUTH_TOKEN_SENTINEL",
      "CREDENTIAL_SENTINEL",
      "PRIVATE_SOURCE_SENTINEL",
      "message",
      "stack",
    ])
      expect(output).not.toContain(value);
    logAIFailure(
      new Error("DO_NOT_LOG_THIS_SECRET"),
      "untrusted source text",
      "diagnostic-safe",
    );
    expect(String(log.mock.calls[1][0])).not.toContain(
      "DO_NOT_LOG_THIS_SECRET",
    );
    expect(JSON.parse(String(log.mock.calls[1][0])).action).toBe("request");
  });
});

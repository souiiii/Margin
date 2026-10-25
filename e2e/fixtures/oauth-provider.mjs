// Loaded ONLY by the dedicated OAuth browser-test server through NODE_OPTIONS.
// No production endpoint, key, environment switch, or authentication bypass is added.
import { generateKeyPairSync, createHash, sign } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { appendFileSync } from "node:fs";
if (
  !process.env.MARGIN_DATA_DIR?.startsWith(path.join(tmpdir(), "margin-oauth-"))
)
  throw new Error("OAuth fixture requires an isolated temporary test library.");
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const key = {
  ...publicKey.export({ format: "jwk" }),
  kid: "margin-oauth-test",
  alg: "RS256",
  use: "sig",
};
const originalFetch = globalThis.fetch;
const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const failures = new Set();
globalThis.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input
        : input.url,
  );
  if (url.href === "https://auth.openai.com/.well-known/jwks.json")
    return Response.json({ keys: [key] });
  if (url.href === "https://auth.openai.com/api/accounts/oauth/token") {
    const form = new URLSearchParams(init?.body?.toString());
    if (form.get("grant_type") !== "authorization_code")
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    let grant;
    try {
      grant = JSON.parse(
        Buffer.from(form.get("code") || "", "base64url").toString(),
      );
    } catch {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    // The browser's authorization request is the contract for this exact code exchange.
    const challenge = createHash("sha256")
      .update(form.get("code_verifier") || "")
      .digest("base64url");
    if (
      form.get("redirect_uri") !== grant.redirectUri ||
      !/^http:\/\/127\.0\.0\.1:\d+\/auth\/callback$/.test(grant.redirectUri) ||
      challenge !== grant.challenge ||
      form.get("client_id") !== "oaiapp_margin_browser_test" ||
      form.get("resource") !== "https://api.openai.com/v1" ||
      grant.mode === "token-error"
    )
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${encode({ alg: "RS256", kid: key.kid })}.${encode({ iss: "https://auth.openai.com", aud: form.get("client_id"), sub: "margin-browser-test", email: "oauth-browser@example.test", nonce: grant.mode === "wrong-nonce" ? "invalid-nonce" : grant.nonce, iat: now, exp: now + 3600 })}`;
    const idToken = `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url")}`;
    return Response.json({
      access_token: "browser-test-access",
      refresh_token: "browser-test-refresh",
      id_token: idToken,
      expires_in: 3600,
      scope:
        "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
    });
  }
  if (url.href === "https://api.openai.com/v1/models")
    return Response.json({
      models: [
        {
          slug: "test-model",
          display_name: "Test model",
          visibility: "list",
          supported_reasoning_levels: ["low", "medium"],
        },
      ],
    });
  if (url.href === "https://api.openai.com/v1/responses") {
    const request = JSON.parse(init.body);
    const { data } = JSON.parse(request.input[0].content);
    const source = data.source || "";
    const sourceHash = createHash("sha256").update(source).digest("hex");
    if (
      process.env.MARGIN_E2E_AI_AUDIT?.startsWith(
        path.join(tmpdir(), "margin-ai-"),
      )
    )
      appendFileSync(
        process.env.MARGIN_E2E_AI_AUDIT,
        JSON.stringify({ sourceHash, at: Date.now() }) + "\n",
      );
    const failed =
      source.includes("ANALYSIS_FAIL_ONCE") && !failures.has(sourceHash);
    failures.add(sourceHash);
    const selections = [
      [
        "turned a corner",
        "turn a corner",
        "Began to improve after difficulty.",
        "The team turned a corner after its first win.",
      ],
      [
        "took it in their stride",
        "take it in your stride",
        "Handled the difficulty calmly.",
        "She took the delay in her stride.",
      ],
      [
        "paid off",
        "pay off",
        "Produced a good result.",
        "The extra practice paid off.",
      ],
    ]
      .filter(([term]) => source.includes(term))
      .map(([term, lemma, meaning, example]) => {
        const start = source.indexOf(term);
        return {
          term,
          lemma,
          meaning,
          example,
          kind: "idiom",
          reason: "Useful for describing everyday progress.",
          quote: source.slice(
            Math.max(0, start - 25),
            Math.min(source.length, start + term.length + 25),
          ),
        };
      });
    // Artificial provider latency makes non-blocking rendering observable.
    return new Response(
      new ReadableStream({
        start(controller) {
          setTimeout(() => {
            const event = failed
              ? {
                  type: "response.failed",
                  response: {
                    error: {
                      code: "server_error",
                      message: "Temporary fixture failure",
                    },
                  },
                }
              : {
                  type: "response.completed",
                  response: {
                    output: [
                      {
                        content: [
                          {
                            type: "output_text",
                            text: JSON.stringify({
                              overview:
                                "A project improves through persistent effort.",
                              selections,
                            }),
                          },
                        ],
                      },
                    ],
                  },
                };
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
            );
            controller.close();
          }, 1200);
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  }
  if (["auth.openai.com", "api.openai.com"].includes(url.hostname))
    throw new Error(
      `Unexpected provider call in OAuth browser test: ${url.pathname}`,
    );
  return originalFetch(input, init);
};

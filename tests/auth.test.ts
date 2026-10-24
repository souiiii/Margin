import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
const keys = vi.hoisted(() => ({
  publicKey: undefined as CryptoKey | undefined,
}));
vi.mock("jose", async (original) => {
  const actual = await original<typeof import("jose")>();
  return { ...actual, createRemoteJWKSet: () => async () => keys.publicKey! };
});
import { generateKeyPair, SignJWT } from "jose";
import {
  beginAuth,
  finishAuth,
  authStatus,
  accountForInference,
} from "@/lib/auth";
import { dataDir } from "@/lib/db";
let privateKey: CryptoKey;
beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  keys.publicKey = pair.publicKey;
});
async function signed(
  nonce: string,
  audience: string,
  subject = "learner",
  expired = false,
) {
  return new SignJWT({ nonce, email: "learner@example.test" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer("https://auth.openai.com")
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(expired ? "-1h" : "1h")
    .sign(privateKey);
}
async function attempt(
  overrides: {
    nonce?: string;
    audience?: string;
    expired?: boolean;
    subject?: string;
    scope?: string;
  } = {},
) {
  const browser = randomUUID();
  const url = new URL(await beginAuth("http://127.0.0.1:3000", browser));
  const nonce = url.searchParams.get("nonce")!;
  const clientId = `oaiapp_${randomUUID()}`;
  const token = await signed(
    overrides.nonce || nonce,
    overrides.audience || clientId,
    overrides.subject,
    overrides.expired,
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        access_token: "test-access",
        refresh_token: "test-refresh",
        id_token: token,
        scope:
          overrides.scope ??
          "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
        expires_in: 3600,
      }),
    ),
  );
  return {
    browser,
    url,
    clientId,
    params: new URLSearchParams({
      code: "test-code",
      state: url.searchParams.get("state")!,
      client_id: clientId,
    }),
  };
}
describe("official ChatGPT OAuth", () => {
  it("uses stable host identity, fresh PKCE/state, and public dynamic registration", async () => {
    const a = new URL(await beginAuth("http://127.0.0.1:3000", "browser-a"));
    const b = new URL(await beginAuth("http://127.0.0.1:3000", "browser-b"));
    expect(a.origin + a.pathname).toBe(
      "https://auth.openai.com/api/accounts/authorize",
    );
    expect(a.searchParams.get("ext_agent_host_id")).toBe(
      b.searchParams.get("ext_agent_host_id"),
    );
    expect(a.searchParams.get("client_id")).toBe("dynamic_agent_client");
    expect(a.searchParams.get("code_challenge_method")).toBe("S256");
    expect(a.searchParams.get("state")).not.toBe(b.searchParams.get("state"));
    expect(a.searchParams.get("scope")).toContain("chatgpt.tokens.use.direct");
    expect(a.searchParams.has("client_secret")).toBe(false);
  });
  it("rejects callbacks from another browser before exchanging a code", async () => {
    const a = await attempt();
    const fetch = vi.mocked(globalThis.fetch);
    await expect(finishAuth(a.params, "different-browser")).rejects.toThrow(
      "another browser",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects a signed ID token with the wrong nonce or audience, or expired token", async () => {
    for (const overrides of [
      { nonce: "wrong" },
      { audience: "wrong" },
      { expired: true },
    ]) {
      const a = await attempt(overrides);
      await expect(finishAuth(a.params, a.browser)).rejects.toThrow();
    }
  });
  it("validates identity, retains issued registration, and keeps credentials out of public status", async () => {
    const a = await attempt();
    await finishAuth(a.params, a.browser);
    const status = await authStatus();
    expect(
      status.accounts.find((x) => x.id === status.active)?.planEnabled,
    ).toBe(true);
    expect(JSON.stringify(status)).not.toMatch(
      /test-access|test-refresh|id_token/,
    );
    const vaultFile = path.join(dataDir, "private", "accounts.json");
    expect((await stat(vaultFile)).mode & 0o777).toBe(0o600);
    const vault = JSON.parse(await readFile(vaultFile, "utf8"));
    expect(
      vault.accounts.find(
        (v: { client_id: string }) => v.client_id === a.clientId,
      ),
    ).toBeTruthy();
    const returning = new URL(
      await beginAuth("http://127.0.0.1:3000", randomUUID(), status.active!),
    );
    expect(returning.searchParams.get("client_id")).toBe(a.clientId);
    expect(returning.searchParams.has("agent_name_hint")).toBe(false);
    expect(returning.searchParams.has("id_token_hint")).toBe(true);
    await expect(finishAuth(a.params, a.browser)).rejects.toThrow("expired");
  });
  it("retains signed-in identity without plan permission and stops inference", async () => {
    const a = await attempt({ scope: "openid profile email" });
    await finishAuth(a.params, a.browser);
    const status = await authStatus();
    expect(
      status.accounts.find((x) => x.id === status.active)?.planEnabled,
    ).toBe(false);
    await expect(accountForInference()).rejects.toThrow(
      "Enable ChatGPT plan usage",
    );
  });
});

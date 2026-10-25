import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import {
  readFile,
  writeFile,
  mkdir,
  rename,
  chmod,
  open,
} from "node:fs/promises";
import path from "node:path";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { dataDir } from "./db";
import { normalizeLoopbackOrigin } from "./loopback";
import { providerError } from "./provider-errors";
import { AppError } from "./errors";
import { modelEfforts } from "./reasoning";
import type { AuthStatus, Model } from "./types";
const ISSUER = "https://auth.openai.com";
const RESOURCE = "https://api.openai.com/v1";
const SCOPES =
  "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
interface Account {
  id: string;
  client_id: string;
  subject: string;
  email: string;
  label: string;
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  scopes: string[];
  expires_at: number;
  needsReauth?: boolean;
}
interface Vault {
  hostId: string;
  active: string | null;
  accounts: Account[];
}
interface Pending {
  state: string;
  nonce: string;
  verifier: string;
  browser: string;
  redirect: string;
  clientId?: string;
  accountId?: string;
  expires: number;
}
const state = globalThis as unknown as {
  marginAuth?: {
    queue: Promise<unknown>;
    pending: Map<string, Pending>;
    refreshes: Map<string, Promise<Account>>;
    epoch: number;
    models: Map<string, { at: number; models: Model[] }>;
  };
};
const runtime = (state.marginAuth ??= {
  queue: Promise.resolve(),
  pending: new Map(),
  refreshes: new Map(),
  epoch: 0,
  models: new Map(),
});
const vaultPath = path.join(dataDir, "private", "accounts.json");
async function readVault(): Promise<Vault> {
  try {
    return JSON.parse(await readFile(vaultPath, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT")
      throw new AppError(
        "The credential file could not be read. Restore it or reconnect ChatGPT.",
        500,
        "credential_storage",
      );
    return { hostId: `urn:uuid:${randomUUID()}`, active: null, accounts: [] };
  }
}
async function writeVault(v: Vault) {
  await mkdir(path.dirname(vaultPath), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(vaultPath), 0o700);
  const temp = `${vaultPath}.${randomUUID()}.tmp`;
  const file = await open(temp, "wx", 0o600);
  try {
    await file.writeFile(JSON.stringify(v));
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temp, vaultPath);
  await chmod(vaultPath, 0o600);
}
async function mutate<T>(fn: (v: Vault) => Promise<T> | T): Promise<T> {
  const job = runtime.queue
    .catch(() => {})
    .then(async () => {
      const vault = await readVault();
      const result = await fn(vault);
      await writeVault(vault);
      return result;
    });
  runtime.queue = job.catch(() => {});
  return job;
}
async function vault() {
  await runtime.queue;
  return mutate((v) => structuredClone(v));
}
function publicStatus(v: Vault): AuthStatus {
  return {
    active: v.active,
    hostId: v.hostId,
    accounts: v.accounts.map((a) => ({
      id: a.id,
      label: a.label,
      email: a.email,
      connected: !!a.access_token,
      planEnabled: a.scopes.includes("chatgpt.tokens.use.direct"),
      needsReauth: !!a.needsReauth,
    })),
  };
}
export async function authStatus() {
  return publicStatus(await vault());
}
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
export async function beginAuth(
  origin: string,
  browser: string,
  accountId?: string,
  enable = false,
) {
  const v = await vault();
  const account = accountId
    ? v.accounts.find((a) => a.id === accountId)
    : undefined;
  if (accountId && !account)
    throw new AppError("That account is no longer saved.", 404);
  for (const [k, p] of runtime.pending)
    if (p.expires < Date.now()) runtime.pending.delete(k);
  if (runtime.pending.size > 20)
    throw new AppError("Too many sign-in attempts. Wait a few minutes.", 429);
  const pending: Pending = {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    verifier: randomBytes(48).toString("base64url"),
    browser,
    redirect: `${normalizeLoopbackOrigin(origin)}/auth/callback`,
    clientId: account?.client_id,
    accountId: account?.id,
    expires: Date.now() + 600000,
  };
  runtime.pending.set(pending.state, pending);
  const url = new URL(`${ISSUER}/api/accounts/authorize`);
  const params: Record<string, string> = {
    client_id: account?.client_id || "dynamic_agent_client",
    ext_agent_host_id: v.hostId,
    response_type: "code",
    redirect_uri: pending.redirect,
    scope: SCOPES,
    resource: RESOURCE,
    state: pending.state,
    nonce: pending.nonce,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256")
      .update(pending.verifier)
      .digest("base64url"),
  };
  if (!account) params.agent_name_hint = "Margin";
  if (account?.id_token) params.id_token_hint = account.id_token;
  if (account?.email) params.login_hint = account.email;
  if (enable) params.prompt = "consent";
  Object.entries(params).forEach(([k, val]) => url.searchParams.set(k, val));
  return url.toString();
}
export async function finishAuth(
  params: URLSearchParams,
  browser: string | undefined,
  origin: string,
) {
  const key = params.get("state") || "";
  const p = runtime.pending.get(key);
  if (
    !p ||
    !browser ||
    p.expires < Date.now() ||
    !safeEqual(p.browser, browser)
  )
    throw new AppError(
      "Sign-in expired or belongs to another browser. Start again.",
      400,
      "invalid_state",
    );
  if (p.redirect !== `${normalizeLoopbackOrigin(origin)}/auth/callback`)
    throw new AppError(
      "Sign-in belongs to another local port. Start again.",
      400,
      "invalid_state",
    );
  runtime.pending.delete(key);
  if (params.has("error"))
    throw new AppError(
      params.get("error") === "access_denied"
        ? "ChatGPT sign-in was cancelled. You can reconnect in Settings."
        : "ChatGPT could not complete sign-in. Please try again.",
      400,
      "oauth_denied",
    );
  const supplied = params.get("client_id");
  if (p.clientId && supplied && supplied !== p.clientId)
    throw new AppError(
      "The account registration changed. Start sign-in again.",
      400,
      "client_mismatch",
    );
  const clientId = p.clientId || supplied;
  if (!clientId || clientId === "dynamic_agent_client" || !params.get("code"))
    throw new AppError(
      "ChatGPT did not return a complete registration. Start again.",
      400,
      "registration_incomplete",
    );
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    client_id: clientId,
    code: params.get("code")!,
    code_verifier: p.verifier,
    redirect_uri: p.redirect,
    resource: RESOURCE,
  });
  if (typeof tokens.id_token !== "string")
    throw new AppError(
      "ChatGPT did not return a verifiable identity.",
      401,
      "missing_id_token",
    );
  const { payload } = await jwtVerify(tokens.id_token, jwks, {
    issuer: ISSUER,
    audience: clientId,
    requiredClaims: ["sub", "exp", "iat"],
    clockTolerance: 5,
  });
  if (payload.nonce !== p.nonce || !payload.sub)
    throw new AppError(
      "The returned identity could not be verified.",
      401,
      "identity_mismatch",
    );
  await mutate((v) => {
    const previous = p.accountId
      ? v.accounts.find((a) => a.id === p.accountId)
      : v.accounts.find(
          (a) => a.client_id === clientId && a.subject === payload.sub,
        );
    if (p.accountId && (!previous || previous.subject !== payload.sub))
      throw new AppError(
        "This sign-in belongs to a different account. Add it as a new account.",
        401,
        "identity_mismatch",
      );
    const email =
      typeof payload.email === "string" ? payload.email : "ChatGPT account";
    const a: Account = {
      id: previous?.id || randomUUID(),
      client_id: clientId,
      subject: payload.sub!,
      email,
      label: previous?.label || `${email} · ${v.accounts.length + 1}`,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      id_token: tokens.id_token,
      scopes: tokens.scope.split(" ").filter(Boolean),
      expires_at: Date.now() + tokens.expires_in * 1000,
      needsReauth: false,
    };
    if (previous) v.accounts[v.accounts.indexOf(previous)] = a;
    else v.accounts.push(a);
    v.active = a.id;
  });
  runtime.epoch++;
  runtime.models.clear();
}
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  scope: string;
  expires_in: number;
}
async function tokenRequest(
  params: Record<string, string>,
): Promise<TokenResponse> {
  const response = await fetch(`${ISSUER}/api/accounts/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new AppError(
      response.status >= 500
        ? "ChatGPT is temporarily unavailable. Try again shortly."
        : "Your ChatGPT session needs to be connected again.",
      response.status,
      typeof data.error === "string"
        ? data.error
        : data.error?.code || "oauth_error",
      response.headers.get("x-request-id") || undefined,
    );
  if (
    typeof data.access_token !== "string" ||
    typeof data.expires_in !== "number"
  )
    throw new AppError(
      "ChatGPT returned an incomplete token response.",
      502,
      "oauth_response",
    );
  return { ...data, scope: typeof data.scope === "string" ? data.scope : "" };
}
export async function accountForInference(
  forceRefresh = false,
): Promise<Account> {
  const v = await vault();
  const a = v.accounts.find((x) => x.id === v.active);
  if (!a?.access_token || a.needsReauth)
    throw new AppError(
      "Connect ChatGPT in Settings to generate learning material.",
      401,
      "sign_in_required",
    );
  if (!a.scopes.includes("chatgpt.tokens.use.direct"))
    throw new AppError(
      "Enable ChatGPT plan usage in Settings to continue.",
      403,
      "plan_permission_required",
    );
  if (!forceRefresh && a.expires_at > Date.now() + 60000) return a;
  if (runtime.refreshes.has(a.id)) return runtime.refreshes.get(a.id)!;
  const job = (async () => {
    if (!a.refresh_token)
      throw new AppError(
        "Your session expired. Reconnect ChatGPT in Settings.",
        401,
        "sign_in_required",
      );
    try {
      const t = await tokenRequest({
        grant_type: "refresh_token",
        client_id: a.client_id,
        refresh_token: a.refresh_token,
        resource: RESOURCE,
      });
      const next = {
        ...a,
        access_token: t.access_token,
        refresh_token: t.refresh_token || a.refresh_token,
        id_token: t.id_token || a.id_token,
        scopes: t.scope ? t.scope.split(" ") : a.scopes,
        expires_at: Date.now() + t.expires_in * 1000,
      };
      await mutate((v) => {
        const found = v.accounts.find((x) => x.id === a.id);
        if (!found || found.access_token !== a.access_token)
          throw new AppError(
            "Account changed during renewal. Try again.",
            409,
            "account_changed",
          );
        Object.assign(found, next);
      });
      return next;
    } catch (e) {
      if (
        e instanceof AppError &&
        [
          "invalid_grant",
          "invalid_refresh_token",
          "token_expired",
          "refresh_token_expired",
          "refresh_token_invalidated",
          "refresh_token_reused",
        ].includes(e.code)
      )
        await mutate((v) => {
          const found = v.accounts.find((x) => x.id === a.id);
          if (found) {
            delete found.access_token;
            delete found.refresh_token;
            delete found.id_token;
            found.needsReauth = true;
          }
        });
      throw e;
    }
  })();
  runtime.refreshes.set(a.id, job);
  try {
    return await job;
  } finally {
    runtime.refreshes.delete(a.id);
  }
}
export async function switchAccount(id: string) {
  await mutate((v) => {
    const a = v.accounts.find((a) => a.id === id);
    if (!a?.access_token || a.needsReauth)
      throw new AppError(
        "Reconnect this account first.",
        401,
        "sign_in_required",
      );
    v.active = id;
  });
  runtime.epoch++;
  runtime.models.clear();
}
export async function signOut(id: string) {
  const v = await vault(),
    a = v.accounts.find((x) => x.id === id);
  if (!a) throw new AppError("Account not found.", 404);
  runtime.epoch++;
  let revoked = !a.refresh_token;
  if (a.refresh_token) {
    for (let i = 0; i < 2; i++) {
      try {
        const discovery = await fetch(
          `${ISSUER}/.well-known/openid-configuration`,
          { signal: AbortSignal.timeout(10000) },
        ).then((r) => r.json());
        const endpoint = new URL(discovery.revocation_endpoint);
        if (endpoint.origin !== ISSUER)
          throw new Error("Unexpected revocation endpoint");
        const r = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: a.refresh_token,
            token_type_hint: "refresh_token",
            client_id: a.client_id,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (r.ok) {
          revoked = true;
          break;
        }
        if (r.status < 500) break;
      } catch {}
      if (i === 0) await new Promise((r) => setTimeout(r, 300));
    }
  }
  await mutate((v) => {
    const found = v.accounts.find((x) => x.id === id);
    if (found) {
      delete found.access_token;
      delete found.refresh_token;
      delete found.id_token;
      found.needsReauth = false;
    }
    if (v.active === id) v.active = null;
  });
  runtime.models.clear();
  return { revoked };
}
export function authEpoch() {
  return runtime.epoch;
}
export async function openaiFetch(
  endpoint: "models" | "responses",
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<Response> {
  let a = await accountForInference();
  const run = () =>
    fetch(`${RESOURCE}/${endpoint}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${a.access_token}` },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(150000)])
        : AbortSignal.timeout(20000),
      cache: "no-store",
    });
  let response = await run();
  if (response.status === 401) {
    await response.body?.cancel();
    a = await accountForInference(true);
    response = await run();
  }
  return response;
}
export async function getModels(refresh = false): Promise<Model[]> {
  const a = await accountForInference();
  const cached = runtime.models.get(a.id);
  if (
    !refresh &&
    cached &&
    cached.models.every((m: Model) => "reasoning_efforts" in m) &&
    Date.now() - cached.at < 300000
  )
    return cached.models;
  const r = await openaiFetch("models");
  if (!r.ok) throw await providerError(r);
  const data = await r.json();
  if (!Array.isArray(data.models))
    throw new AppError(
      "ChatGPT returned an unexpected model catalog. Try refreshing.",
      502,
      "model_catalog",
    );
  const models: Model[] = data.models
    .filter(
      (m: Record<string, unknown>) =>
        m.visibility === "list" &&
        typeof m.slug === "string" &&
        typeof m.display_name === "string",
    )
    .map((m: Model & { supported_reasoning_levels?: unknown }) => ({
      slug: m.slug,
      display_name: m.display_name,
      reasoning_efforts: modelEfforts(m.supported_reasoning_levels),
    }));
  if (!models.length)
    throw new AppError(
      "No models are currently available for this ChatGPT account.",
      403,
      "no_models",
    );
  runtime.models.set(a.id, { at: Date.now(), models });
  return models;
}
export { providerError } from "./provider-errors";

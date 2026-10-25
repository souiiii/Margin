import { expect, type Page } from "@playwright/test";

type Outcome =
  | "success"
  | "denied"
  | "token-error"
  | "wrong-nonce"
  | "wrong-state"
  | "missing-cookie"
  | "localhost-callback";
export async function authorise(
  page: Page,
  origin: string,
  outcome: Outcome = "success",
) {
  // This suite must never contact real OpenAI services or use a real account.
  await page
    .context()
    .route(
      /^https:\/\/(auth\.openai\.com|api\.openai\.com|auth-cdn\.oaistatic\.com)\//,
      (route) => route.abort(),
    );
  await page.route("**/auth/start**", async (route) => {
    // Intercept only the provider boundary after executing the real start
    // route. Chrome does not route-intercept a redirected URL reliably.
    const response = await route.fetch({ maxRedirects: 0 });
    const url = new URL(response.headers().location);
    expect(url.origin + url.pathname).toBe(
      "https://auth.openai.com/api/accounts/authorize",
    );
    const redirectUri = url.searchParams.get("redirect_uri")!;
    expect(redirectUri).toBe(`${origin}/auth/callback`);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("client_id")).toBe("dynamic_agent_client");
    expect(url.searchParams.get("nonce")).toBeTruthy();
    const callback = new URL(redirectUri);
    callback.searchParams.set(
      "state",
      outcome === "wrong-state"
        ? "forged-state"
        : url.searchParams.get("state")!,
    );
    if (outcome === "denied")
      callback.searchParams.set("error", "access_denied");
    else {
      const grant = {
        redirectUri,
        challenge: url.searchParams.get("code_challenge"),
        nonce: url.searchParams.get("nonce"),
        mode: outcome,
      };
      callback.searchParams.set(
        "code",
        Buffer.from(JSON.stringify(grant)).toString("base64url"),
      );
      callback.searchParams.set("client_id", "oaiapp_margin_browser_test");
    }
    if (outcome === "missing-cookie") await page.context().clearCookies();
    // A stale alias must return to the cookie's canonical host before validation.
    if (outcome === "localhost-callback") callback.hostname = "localhost";
    const cookies = await page.context().cookies(origin);
    if (outcome !== "missing-cookie")
      expect(cookies.find((c) => c.name === "margin_oauth")).toMatchObject({
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      });
    const headers: Record<string, string> = {
      ...response.headers(),
      location: callback.toString(),
    };
    if (outcome === "missing-cookie") delete headers["set-cookie"];
    await route.fulfill({ status: 302, response, headers });
  });
}

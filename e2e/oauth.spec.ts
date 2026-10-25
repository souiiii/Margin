import { test, expect } from "@playwright/test";

import { authorise } from "./fixtures/authorise";
for (const port of [3008, 3009]) {
  const origin = `http://127.0.0.1:${port}`;
  test.describe(`OAuth browser flow on port ${port}`, () => {
    test("canonicalizes aliases and completes authorization, code exchange, cookies, and UI login", async ({
      page,
      request,
    }) => {
      const alias = await request.get(
        `http://localhost:${port}/?view=settings&keep=a%2Bb`,
        { maxRedirects: 0 },
      );
      expect(alias.status()).toBe(307);
      expect(alias.headers().location).toBe(
        `${origin}/?view=settings&keep=a%2Bb`,
      );
      const start = await request.get(
        `http://localhost:${port}/auth/start?enable=1`,
        { maxRedirects: 0 },
      );
      expect(start.headers().location).toBe(`${origin}/auth/start?enable=1`);
      expect(start.headers()["set-cookie"]).toBeUndefined();
      // Follow the real alias chain in Chrome rather than relying on request.url assertions.
      await authorise(page, origin);
      await page.goto(`http://localhost:${port}/?view=settings`);
      await expect(page).toHaveURL(`${origin}/?view=settings`);
      const startResponse = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/auth/start",
      );
      await page
        .getByRole("link", { name: "Continue with ChatGPT", exact: true })
        .click();
      const authURL = new URL((await startResponse).headers().location);
      await expect(page).toHaveURL(`${origin}/?view=settings&connected=1`);
      await expect(
        page.getByText("oauth-browser@example.test", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Connected", { exact: true })).toBeVisible();
      expect(
        (await page.context().cookies(origin)).some(
          (c) => c.name === "margin_oauth",
        ),
      ).toBe(false);
      // A spent transaction cannot be replayed, including after a successful browser login.
      await page.goto(
        `${origin}/auth/callback?state=${authURL.searchParams.get("state")}&code=replay&client_id=oaiapp_margin_browser_test`,
      );
      await expect(page).toHaveURL(
        new RegExp(
          `^${origin.replaceAll(".", "\\.")}/\\?view=settings&auth_error=`,
        ),
      );
      await expect(page.locator(".auth-message [role=alert]")).toContainText(
        "expired or belongs to another browser",
      );
      await expect(
        page.getByText("oauth-browser@example.test", { exact: true }),
      ).toBeVisible();
    });
    for (const outcome of [
      "denied",
      "token-error",
      "wrong-nonce",
      "wrong-state",
      "missing-cookie",
    ] as const) {
      test(`keeps ${outcome} callbacks canonical, clears the cookie and preserves saved accounts`, async ({
        page,
      }) => {
        await authorise(page, origin, outcome);
        await page.goto(`${origin}/auth/start`);
        await expect(page).toHaveURL(
          new RegExp(
            `^${origin.replaceAll(".", "\\.")}/\\?view=settings&auth_error=`,
          ),
        );
        await expect(page.locator(".auth-message [role=alert]")).toBeVisible();
        expect(new URL(page.url()).searchParams.has("connected")).toBe(false);
        expect(
          (await page.context().cookies(origin)).some(
            (c) => c.name === "margin_oauth",
          ),
        ).toBe(false);
        const state = await page.request
          .get(`${origin}/api/state?date=2026-10-25`)
          .then((r) => r.json());
        expect(state.auth.accounts).toHaveLength(1);
        expect(state.auth.accounts[0].email).toBe("oauth-browser@example.test");
      });
    }
    test("recovers a localhost callback without losing the canonical browser cookie", async ({
      page,
    }) => {
      await authorise(page, origin, "localhost-callback");
      await page.goto(`${origin}/auth/start`);
      await expect(page).toHaveURL(`${origin}/?view=settings&connected=1`);
      await expect(
        page.getByText("oauth-browser@example.test", { exact: true }),
      ).toBeVisible();
    });
    test("start-route failures return to the same canonical port", async ({
      page,
    }) => {
      await page.goto(`${origin}/auth/start?account=not-a-saved-account`);
      await expect(page).toHaveURL(`${origin}/?view=settings&auth_error=start`);
      await expect(page.locator(".auth-message [role=alert]")).toContainText(
        "could not start",
      );
    });
  });
}

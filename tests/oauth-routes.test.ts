import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
const auth = vi.hoisted(() => ({ beginAuth: vi.fn(), finishAuth: vi.fn() }));
vi.mock("@/lib/auth", () => auth);
import { GET as start } from "@/app/auth/start/route";
import { GET as callback } from "@/app/auth/callback/route";
import { proxy } from "@/proxy";
import { GET as canonical } from "@/app/auth/canonical/route";

function request(
  path: string,
  host = "127.0.0.1:3000",
  headers: Record<string, string> = {},
) {
  // NextRequest normalizes req.url to localhost, even though Host is 127.0.0.1.
  return new NextRequest(`http://${host}${path}`, {
    headers: { host, ...headers },
  });
}
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("OAuth route redirect regression", () => {
  it.each([3000, 54321])(
    "redirects a successful callback to the canonical origin on port %i",
    async (port) => {
      auth.finishAuth.mockResolvedValue(undefined);
      const response = await callback(
        request(
          "/auth/callback?code=code&state=state&client_id=oaiapp_test",
          `127.0.0.1:${port}`,
          { cookie: "margin_oauth=browser", "sec-fetch-site": "cross-site" },
        ),
      );
      expect(response.headers.get("location")).toBe(
        `http://127.0.0.1:${port}/?view=settings&connected=1`,
      );
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.cookies.get("margin_oauth")?.maxAge).toBe(0);
      expect(auth.finishAuth).toHaveBeenCalledWith(
        expect.any(URLSearchParams),
        "browser",
        `http://127.0.0.1:${port}`,
      );
    },
  );
  it("keeps failed callbacks on the canonical origin and clears the transaction cookie", async () => {
    auth.finishAuth.mockRejectedValue(
      new Error("Sign-in expired. Start again."),
    );
    const response = await callback(
      request("/auth/callback?state=expired&code=code"),
    );
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("http://127.0.0.1:3000");
    expect(location.searchParams.get("auth_error")).toBe(
      "Sign-in expired. Start again.",
    );
    expect(location.searchParams.has("connected")).toBe(false);
    expect(response.cookies.get("margin_oauth")?.maxAge).toBe(0);
  });
  it("uses the canonical origin for authorization and start-error recovery", async () => {
    auth.beginAuth.mockResolvedValueOnce(
      "https://auth.openai.com/api/accounts/authorize?state=test",
    );
    const response = await start(request("/auth/start", "127.0.0.1:43210"));
    expect(auth.beginAuth).toHaveBeenCalledWith(
      "http://127.0.0.1:43210",
      expect.any(String),
      undefined,
      false,
    );
    const cookie = response.cookies.get("margin_oauth")!;
    expect(cookie).toMatchObject({
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
    });
    expect(cookie.domain).toBeUndefined();
    auth.beginAuth.mockRejectedValueOnce(new Error("storage failure"));
    expect(
      (await start(request("/auth/start", "127.0.0.1:43210"))).headers.get(
        "location",
      ),
    ).toBe("http://127.0.0.1:43210/?view=settings&auth_error=start");
  });
  it("canonicalizes localhost before setting or consuming a cookie, preserving callback parameters", async () => {
    const req = request(
      "/auth/callback?state=a%2Bb&code=c%2Fd&client_id=oaiapp_test",
      "localhost:43210",
    );
    const rewrite = new URL(proxy(req).headers.get("x-middleware-rewrite")!);
    expect(rewrite.origin).toBe("http://127.0.0.1:43210");
    const redirected = canonical(
      request(`${rewrite.pathname}${rewrite.search}`, "localhost:43210", {
        "x-margin-canonical-path": req.nextUrl.pathname,
        "x-margin-canonical-search": req.nextUrl.search,
      }),
    );
    for (const response of [redirected, await callback(req)]) {
      expect(response.headers.get("location")).toBe(
        "http://127.0.0.1:43210/auth/callback?state=a%2Bb&code=c%2Fd&client_id=oaiapp_test",
      );
      expect(response.headers.get("set-cookie")).toBeNull();
    }
    expect(auth.finishAuth).not.toHaveBeenCalled();
    const response = await start(
      request("/auth/start?account=saved", "localhost:43210"),
    );
    expect(response.headers.get("location")).toBe(
      "http://127.0.0.1:43210/auth/start?account=saved",
    );
    expect(auth.beginAuth).not.toHaveBeenCalled();
  });
  it("never redirects or exchanges credentials for untrusted hosts or forged forwarded headers", async () => {
    for (const route of [start, callback]) {
      const response = await route(
        request("/auth/callback?state=state&code=code", "evil.example:3000", {
          "x-forwarded-host": "127.0.0.1:3000",
        }),
      );
      expect(response.status).toBe(403);
      expect(response.headers.has("location")).toBe(false);
    }
    expect(auth.beginAuth).not.toHaveBeenCalled();
    expect(auth.finishAuth).not.toHaveBeenCalled();
  });
});

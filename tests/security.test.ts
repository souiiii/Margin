import { describe, it, expect } from "vitest";
import { guard, bodyJson } from "@/lib/security";
describe("local application boundary", () => {
  it("allows same-origin local mutation", () =>
    expect(() =>
      guard(
        new Request("http://127.0.0.1:3000/api/items", {
          method: "POST",
          headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).not.toThrow());
  it("rejects DNS rebinding hosts", () =>
    expect(() =>
      guard(
        new Request("http://evil.example/api/state", {
          headers: { host: "evil.example" },
        }),
      ),
    ).toThrow("only on this computer"));
  it("rejects cross-origin writes and cross-site reads", () => {
    expect(() =>
      guard(
        new Request("http://127.0.0.1:3000/api/items", {
          method: "POST",
          headers: { host: "127.0.0.1:3000", origin: "https://evil.example" },
        }),
      ),
    ).toThrow("Reload");
    expect(() =>
      guard(
        new Request("http://127.0.0.1:3000/api/state", {
          headers: { host: "127.0.0.1:3000", "sec-fetch-site": "cross-site" },
        }),
      ),
    ).toThrow("directly");
  });
  it("allows a cross-site OAuth callback only on the dedicated path", () =>
    expect(() =>
      guard(
        new Request("http://127.0.0.1:3000/auth/callback", {
          headers: { host: "127.0.0.1:3000", "sec-fetch-site": "cross-site" },
        }),
        true,
      ),
    ).not.toThrow());
  it("bounds streamed bodies even without content-length", async () => {
    await expect(
      bodyJson(
        new Request("http://127.0.0.1/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ large: "x".repeat(500) }),
        }),
        100,
      ),
    ).rejects.toThrow("too large");
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { loopbackOrigin, normalizeLoopbackOrigin } from "@/lib/loopback";
import { guard } from "@/lib/security";
const request = (host: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost:9999/", { headers: { host, ...headers } });
afterEach(() => vi.unstubAllEnvs());
describe("canonical local origin", () => {
  it.each(["127.0.0.1:3000", "localhost:3000", "LOCALHOST:3000"])(
    "resolves %s from Host regardless of a normalized request URL",
    (host) =>
      expect(
        loopbackOrigin(
          request(host, {
            "x-forwarded-host": "evil.example:4444",
            "x-forwarded-proto": "https",
          }),
        ),
      ).toBe("http://127.0.0.1:3000"),
  );
  it("canonicalizes a legacy configured localhost origin while enforcing its port", () => {
    vi.stubEnv("MARGIN_ORIGIN", "http://localhost:43210");
    expect(loopbackOrigin(request("127.0.0.1:43210"))).toBe(
      "http://127.0.0.1:43210",
    );
    expect(() => loopbackOrigin(request("127.0.0.1:3000"))).toThrow(
      "configured local port",
    );
  });
  it.each([
    "evil.example:3000",
    "127.0.0.1.evil.example:3000",
    "127.0.0.1:65536",
    "127.0.0.1:0",
    "127.0.0.1:3000@evil.example",
    "localhost:3000, evil.example",
  ])("rejects an unsafe authority %s", (host) =>
    expect(() => loopbackOrigin(request(host))).toThrow(),
  );
  it.each([
    "https://127.0.0.1:3000",
    "http://evil.example:3000",
    "http://127.0.0.1:3000/path",
    "http://user:secret@127.0.0.1:3000",
    "http://127.0.0.1:3000/?redirect=evil",
  ])("rejects an invalid configured origin %s", (value) =>
    expect(() => normalizeLoopbackOrigin(value)).toThrow(),
  );
  it("requires mutations to come from the canonical origin", () => {
    const make = (origin: string) =>
      new Request("http://localhost:3000/api/items", {
        method: "POST",
        headers: { host: "127.0.0.1:3000", origin },
      });
    expect(() => guard(make("http://127.0.0.1:3000"))).not.toThrow();
    expect(() => guard(make("http://localhost:3000"))).toThrow("Reload");
  });
});

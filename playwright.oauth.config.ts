import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const ports = [3008, 3009];
export default defineConfig({
  testDir: "./e2e",
  testMatch: "oauth.spec.ts",
  workers: 1,
  maxFailures: 1,
  fullyParallel: false,
  timeout: 30000,
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: ports.map((port) => ({
    command: `npm run start -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      MARGIN_DATA_DIR: mkdtempSync(path.join(os.tmpdir(), "margin-oauth-")),
      // Cover both canonical and legacy configured origins, always emitting the IP.
      MARGIN_ORIGIN: `http://${port === 3008 ? "127.0.0.1" : "localhost"}:${port}`,
      DATABASE_URL: "",
      NODE_OPTIONS: `--import=${path.resolve("e2e/fixtures/oauth-provider.mjs")}`,
    },
  })),
});

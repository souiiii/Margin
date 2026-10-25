import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import path from "node:path";
import os from "node:os";
const dir =
  process.env.MARGIN_E2E_DATA_DIR ||
  mkdtempSync(path.join(os.tmpdir(), "margin-browser-"));
export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["oauth.spec.ts", "reading-analysis.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: "http://127.0.0.1:3007", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "npm run start -- --port 3007",
    url: "http://127.0.0.1:3007",
    reuseExistingServer: false,
    env: {
      MARGIN_DATA_DIR: dir,
      MARGIN_ORIGIN: "http://127.0.0.1:3007",
      DATABASE_URL: "",
    },
    timeout: 60000,
  },
});

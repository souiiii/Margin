import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.MARGIN_DATA_DIR = mkdtempSync(
  path.join(os.tmpdir(), "margin-unit-"),
);
delete process.env.DATABASE_URL;

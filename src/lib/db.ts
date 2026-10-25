import { PGlite } from "@electric-sql/pglite";
import { Pool, type PoolClient } from "pg";
import { mkdir } from "node:fs/promises";
import path from "node:path";
export const dataDir = path.resolve(
  /* turbopackIgnore: true */ process.env.MARGIN_DATA_DIR ||
    path.join(process.cwd(), ".margin"),
);
export interface Database {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
  transaction<T>(fn: (db: Database) => Promise<T>): Promise<T>;
}
const schema = `
CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS articles (id uuid PRIMARY KEY, title text NOT NULL, body text NOT NULL, author text NOT NULL DEFAULT '', source_url text NOT NULL DEFAULT '', progress real NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 1), archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS items (id uuid PRIMARY KEY, term text NOT NULL, normalized text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('word','idiom','phrase','construction')), meaning text NOT NULL DEFAULT '', examples jsonb NOT NULL DEFAULT '[]', collocations jsonb NOT NULL DEFAULT '[]', related jsonb NOT NULL DEFAULT '[]', register text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', source_article_id uuid REFERENCES articles(id) ON DELETE SET NULL, context text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS annotations (id uuid PRIMARY KEY, article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE, start_offset integer NOT NULL CHECK(start_offset >= 0), end_offset integer NOT NULL, quote text NOT NULL, note text NOT NULL DEFAULT '', item_id uuid REFERENCES items(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK(end_offset > start_offset));
CREATE TABLE IF NOT EXISTS review_states (item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE, mode text NOT NULL CHECK(mode IN ('recognition','production')), due_at timestamptz NOT NULL DEFAULT now(), interval_days real NOT NULL DEFAULT 0, ease real NOT NULL DEFAULT 2.5, repetitions integer NOT NULL DEFAULT 0, lapses integer NOT NULL DEFAULT 0, PRIMARY KEY(item_id,mode));
CREATE TABLE IF NOT EXISTS reviews (id uuid PRIMARY KEY, item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE, mode text NOT NULL CHECK(mode IN ('recognition','production')), rating integer NOT NULL CHECK(rating BETWEEN 0 AND 3), answer text NOT NULL DEFAULT '', feedback jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS practice_sets (id uuid PRIMARY KEY, kind text NOT NULL, title text NOT NULL, payload jsonb NOT NULL, source_article_id uuid REFERENCES articles(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz);
CREATE TABLE IF NOT EXISTS attempts (id uuid PRIMARY KEY, set_id uuid NOT NULL REFERENCES practice_sets(id) ON DELETE CASCADE, exercise_id text NOT NULL, answer text NOT NULL, evaluation jsonb NOT NULL, skill text NOT NULL, item_ids jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(set_id,exercise_id));
CREATE TABLE IF NOT EXISTS ai_cache (key text PRIMARY KEY, model text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS app_settings (key text PRIMARY KEY, value jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS curriculum_units (id uuid PRIMARY KEY, position integer NOT NULL UNIQUE, title text NOT NULL, specification jsonb NOT NULL, published boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS article_analyses (article_id uuid PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE, content_hash text NOT NULL, status text NOT NULL CHECK(status IN ('running','complete','failed')), payload jsonb, error jsonb, metrics jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS language_feedback (normalized text PRIMARY KEY, term text NOT NULL, feedback text NOT NULL CHECK(feedback IN ('known','unhelpful')), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS annotations_article_idx ON annotations(article_id);
CREATE INDEX IF NOT EXISTS review_due_idx ON review_states(due_at);
CREATE INDEX IF NOT EXISTS attempts_skill_idx ON attempts(skill,created_at);
INSERT INTO schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO schema_migrations(version) VALUES (2) ON CONFLICT DO NOTHING;
`;
function wrapPg(client: Pool | PoolClient): Database {
  return {
    async query<T extends Record<string, unknown>>(
      sql: string,
      params: unknown[] = [],
    ) {
      const result = await client.query(sql, params);
      return { rows: result.rows as T[] };
    },
    async transaction<T>(fn: (db: Database) => Promise<T>) {
      const c = client instanceof Pool ? await client.connect() : client;
      try {
        await c.query("BEGIN");
        const result = await fn(wrapPg(c));
        await c.query("COMMIT");
        return result;
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        if (client instanceof Pool) (c as PoolClient).release();
      }
    },
  };
}
function wrapLite(lite: Pick<PGlite, "query" | "transaction">): Database {
  return {
    async query<T extends Record<string, unknown>>(
      sql: string,
      params: unknown[] = [],
    ) {
      const r = await lite.query<T>(sql, params);
      return { rows: r.rows };
    },
    async transaction<T>(fn: (db: Database) => Promise<T>) {
      return lite.transaction((tx) => fn(wrapLite(tx as unknown as PGlite)));
    },
  };
}
const globalDb = globalThis as unknown as {
  marginDatabase?: Promise<Database>;
};
export function getDb(): Promise<Database> {
  return (globalDb.marginDatabase ??= (async () => {
    let db: Database;
    if (process.env.DATABASE_URL) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 4,
      });
      db = wrapPg(pool);
      await pool.query(schema);
    } else {
      await mkdir(dataDir, { recursive: true, mode: 0o700 });
      const lite = new PGlite(path.join(dataDir, "data"));
      await lite.waitReady;
      await lite.exec(schema);
      db = wrapLite(lite);
    }
    return db;
  })());
}
export async function rows<T>(
  sql: string,
  params: unknown[] = [],
  db?: Database,
): Promise<T[]> {
  return (await (db || (await getDb())).query(sql, params)).rows as T[];
}
export async function one<T>(
  sql: string,
  params: unknown[] = [],
  db?: Database,
): Promise<T | null> {
  return (await rows<T>(sql, params, db))[0] ?? null;
}
export const json = (value: unknown) => JSON.stringify(value);

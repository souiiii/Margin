import { z } from "zod";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDir, getDb, rows, json } from "./db";
import {
  articleInput,
  itemInput,
  settingsSchema,
  exercisesSchema,
  evaluationSchema,
  dailySchema,
  savedSuggestionSchema,
} from "./schemas";
import { normalizeTerm } from "./scheduler";
import { AppError } from "./errors";
const stamp = z.iso.datetime({ offset: true });
const id = z.uuid();
const article = articleInput.extend({
  id,
  created_at: stamp,
  updated_at: stamp,
  progress: z.number().min(0).max(1),
  archived: z.boolean(),
});
const item = itemInput.extend({
  id,
  normalized: z.string().min(1).max(200),
  created_at: stamp,
  updated_at: stamp,
});
const annotation = z.object({
  id,
  article_id: id,
  start_offset: z.number().int().min(0),
  end_offset: z.number().int().min(1),
  quote: z.string().min(1).max(5000),
  note: z.string().max(4000),
  item_id: id.nullable(),
  created_at: stamp,
});
const reviewState = z.object({
  item_id: id,
  mode: z.enum(["recognition", "production"]),
  due_at: stamp,
  interval_days: z.number().min(0).max(365),
  ease: z.number().min(1.3).max(3.2),
  repetitions: z.number().int().min(0),
  lapses: z.number().int().min(0),
});
const review = z.object({
  id,
  item_id: id,
  mode: z.enum(["recognition", "production"]),
  rating: z.number().int().min(0).max(3),
  answer: z.string().max(8000),
  feedback: evaluationSchema.nullable(),
  created_at: stamp,
});
const set = z.object({
  id,
  kind: z.string().max(100),
  title: z.string().max(300),
  payload: z.object({ exercises: exercisesSchema.shape.exercises }),
  source_article_id: id.nullable(),
  created_at: stamp,
  completed_at: stamp.nullable(),
});
const attempt = z.object({
  id,
  set_id: id,
  exercise_id: z.string().max(100),
  answer: z.string().max(8000),
  evaluation: evaluationSchema,
  skill: z.enum([
    "vocabulary",
    "grammar",
    "comprehension",
    "writing",
    "word-choice",
  ]),
  item_ids: z.array(id).max(10),
  created_at: stamp,
});
const cache = z.object({
  key: z.string().max(200),
  model: z.string().max(200),
  payload: z.json(),
  created_at: stamp,
});
const setting = z.object({ key: z.string().max(100), value: z.json() });
const unit = z.object({
  id,
  position: z.number().int(),
  title: z.string().max(300),
  specification: z.json(),
  published: z.boolean(),
});
const analysis = z.object({
  article_id: id,
  content_hash: z.string().length(64),
  status: z.enum(["running", "complete", "failed"]),
  payload: z
    .object({
      overview: z.string().max(240),
      selections: z.array(savedSuggestionSchema).max(8),
    })
    .nullable(),
  error: z.json().nullable(),
  metrics: z.json(),
  updated_at: stamp,
});
const feedback = z.object({
  normalized: z.string().min(1).max(200),
  term: z.string().min(1).max(180),
  feedback: z.enum(["known", "unhelpful"]),
  created_at: stamp,
});
export const backupData = z.object({
  articles: z.array(article).max(10000),
  items: z.array(item).max(100000),
  annotations: z.array(annotation).max(100000),
  review_states: z.array(reviewState).max(200000),
  reviews: z.array(review).max(500000),
  practice_sets: z.array(set).max(50000),
  attempts: z.array(attempt).max(300000),
  ai_cache: z.array(cache).max(100000),
  app_settings: z.array(setting).max(10000),
  curriculum_units: z.array(unit).max(10000),
  article_analyses: z.array(analysis).max(10000).default([]),
  language_feedback: z.array(feedback).max(100000).default([]),
});
const tables = [
  "articles",
  "items",
  "annotations",
  "review_states",
  "reviews",
  "practice_sets",
  "attempts",
  "article_analyses",
  "language_feedback",
  "ai_cache",
  "app_settings",
  "curriculum_units",
] as const;
const keys: Record<(typeof tables)[number], string[]> = {
  articles: ["id"],
  items: ["id"],
  annotations: ["id"],
  review_states: ["item_id", "mode"],
  reviews: ["id"],
  practice_sets: ["id"],
  attempts: ["id"],
  ai_cache: ["key"],
  app_settings: ["key"],
  curriculum_units: ["id"],
  article_analyses: ["article_id"],
  language_feedback: ["normalized"],
};
const jsonColumns = new Set([
  "examples",
  "collocations",
  "related",
  "feedback",
  "payload",
  "evaluation",
  "item_ids",
  "value",
  "specification",
  "error",
  "metrics",
]);
export const checksum = (data: unknown) =>
  createHash("sha256").update(JSON.stringify(data)).digest("hex");
export async function exportBackup() {
  const db = await getDb();
  const data = await db.transaction(async (tx) => {
    await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const entries = [];
    for (const table of tables)
      entries.push([
        table,
        await rows(
          `SELECT * FROM ${table} ORDER BY ${keys[table].join(",")}`,
          [],
          tx,
        ),
      ]);
    return Object.fromEntries(entries);
  });
  const serial = JSON.parse(JSON.stringify(data));
  return {
    format: "margin-backup",
    version: 1,
    exported_at: new Date().toISOString(),
    checksum: checksum(serial),
    data: serial,
  };
}
export function validateBackup(raw: unknown) {
  const envelope = z
    .object({
      format: z.literal("margin-backup"),
      version: z.literal(1),
      exported_at: stamp,
      checksum: z.string().length(64),
      data: z.unknown(),
    })
    .parse(raw);
  if (checksum(envelope.data) !== envelope.checksum)
    throw new AppError(
      "This backup’s checksum does not match. The file may be damaged or edited.",
      400,
      "invalid_backup",
    );
  const data = backupData.parse(envelope.data);
  for (const table of tables) {
    const unique = data[table].map((r) =>
      keys[table].map((k) => (r as Record<string, unknown>)[k]).join(":"),
    );
    if (new Set(unique).size !== unique.length)
      throw new AppError(`The backup contains duplicate ${table} records.`);
  }
  const articles = new Map(data.articles.map((a) => [a.id, a]));
  const items = new Set(data.items.map((i) => i.id));
  const sets = new Map(data.practice_sets.map((s) => [s.id, s]));
  for (const analysis of data.article_analyses) {
    const source = articles.get(analysis.article_id);
    if (
      !source ||
      createHash("sha256").update(source.body).digest("hex") !==
        analysis.content_hash ||
      analysis.payload?.selections.some(
        (s) =>
          source.body.slice(s.start_offset, s.end_offset) !== s.term ||
          !source.body.includes(s.quote),
      )
    )
      throw new AppError("An analysis does not match its source reading.");
  }
  for (const f of data.language_feedback)
    if (f.normalized !== normalizeTerm(f.term))
      throw new AppError("A feedback search key does not match its term.");
  if (new Set(data.items.map((i) => i.normalized)).size !== data.items.length)
    throw new AppError("The backup has duplicate expressions.");
  for (const a of data.annotations) {
    const source = articles.get(a.article_id);
    if (
      !source ||
      source.body.slice(a.start_offset, a.end_offset) !== a.quote ||
      (a.item_id && !items.has(a.item_id))
    )
      throw new AppError(
        "The backup contains an annotation without its original source.",
      );
  }
  for (const i of data.items) {
    if (i.normalized !== normalizeTerm(i.term))
      throw new AppError("An expression’s search key does not match its term.");
    if (i.source_article_id && !articles.has(i.source_article_id))
      throw new AppError("The backup is missing a source reading.");
  }
  for (const r of [...data.review_states, ...data.reviews])
    if (!items.has(r.item_id))
      throw new AppError("The backup is missing a reviewed expression.");
  for (const s of data.practice_sets) {
    if (
      new Set(s.payload.exercises.map((e) => e.id)).size !==
      s.payload.exercises.length
    )
      throw new AppError("A practice set contains duplicate question IDs.");
    if (s.source_article_id) {
      const article = articles.get(s.source_article_id);
      if (
        article &&
        s.payload.exercises.some(
          (e) => !e.evidence || !article.body.includes(e.evidence),
        )
      )
        throw new AppError(
          "A question’s evidence does not match its source reading.",
        );
    }
    if (s.source_article_id && !articles.has(s.source_article_id))
      throw new AppError("The backup is missing an exercise source.");
    if (
      s.payload.exercises.some((e) => e.item_ids.some((id) => !items.has(id)))
    )
      throw new AppError("The backup is missing a practised expression.");
  }
  for (const a of data.attempts) {
    if (
      !sets.get(a.set_id)?.payload.exercises.some((e) => e.id === a.exercise_id)
    )
      throw new AppError("The backup contains an answer without its question.");
  }
  for (const s of data.app_settings) {
    if (s.key === "preferences") settingsSchema.parse(s.value);
    if (s.key.startsWith("daily:")) {
      const daily = dailySchema
        .extend({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
        .parse(s.value);
      if (s.key !== `daily:${daily.date}`)
        throw new AppError("A daily discovery has an inconsistent date.");
    }
  }
  return data;
}
export async function importBackup(raw: unknown, mode: "merge" | "replace") {
  const data = validateBackup(raw);
  const db = await getDb();
  if (mode === "merge") {
    const existing = await rows<{ id: string; normalized: string }>(
      "SELECT id,normalized FROM items",
    );
    if (
      data.items.some((i) =>
        existing.some((e) => e.normalized === i.normalized && e.id !== i.id),
      )
    )
      throw new AppError(
        "This backup has expressions from a different library with conflicting IDs. Export your current library, then use Replace to restore the backup.",
        409,
        "merge_conflict",
      );
  }
  const snapshot = await exportBackup();
  const directory = path.join(dataDir, "backups");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = `before-import-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(
    path.join(directory, filename),
    JSON.stringify(snapshot, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  await db.transaction(async (tx) => {
    if (mode === "replace")
      for (const table of [...tables].reverse())
        await tx.query(`DELETE FROM ${table}`);
    for (const table of tables) {
      for (const row of data[table]) {
        const record = row as Record<string, unknown>;
        const columns = Object.keys(record);
        const key = keys[table];
        const updated = columns
          .filter((c) => !key.includes(c))
          .map((c) => `${c}=excluded.${c}`)
          .join(",");
        const values = columns.map((c) =>
          jsonColumns.has(c) &&
          !(table === "language_feedback" && c === "feedback") &&
          record[c] !== null
            ? json(record[c])
            : record[c],
        );
        await tx.query(
          `INSERT INTO ${table}(${columns.join(",")}) VALUES(${columns.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT(${key.join(",")}) DO UPDATE SET ${updated}`,
          values,
        );
      }
    }
  });
  return {
    articles: data.articles.length,
    items: data.items.length,
    snapshot: filename,
  };
}

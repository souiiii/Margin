import { randomUUID } from "node:crypto";
import { getDb, rows, one, json, type Database } from "./db";
import { authStatus } from "./auth";
import { AppError } from "./errors";
import { normalizeTerm, schedule } from "./scheduler";
import { itemInput, settingsSchema } from "./schemas";
import type {
  AppState,
  Article,
  LanguageItem,
  ReviewState,
  Settings,
  PracticeSet,
  Attempt,
  Evaluation,
  Exercise,
  Daily,
} from "./types";
export const defaultSettings: Settings = {
  everyday_reasoning: "low",
  advanced_reasoning: "medium",
  level: "B2",
  model: "",
  theme: "light",
  daily_size: 5,
};
export async function settings(): Promise<Settings> {
  const row = await one<{ value: Settings }>(
    "SELECT value FROM app_settings WHERE key='preferences'",
  );
  return row ? settingsSchema.parse(row.value) : defaultSettings;
}
export async function saveSettings(value: Settings) {
  await rows(
    "INSERT INTO app_settings(key,value) VALUES('preferences',$1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    [json(settingsSchema.parse(value))],
  );
}
export async function loadState(date: string): Promise<AppState> {
  const db = await getDb();
  const [
    articles,
    annotations,
    items,
    reviewStates,
    reviews,
    sets,
    attempts,
    prefs,
    auth,
    daily,
  ] = await Promise.all([
    rows<AppState["articles"][number]>(
      "SELECT * FROM articles ORDER BY updated_at DESC",
      [],
      db,
    ),
    rows<AppState["annotations"][number]>(
      "SELECT * FROM annotations ORDER BY created_at",
      [],
      db,
    ),
    rows<LanguageItem>("SELECT * FROM items ORDER BY created_at DESC", [], db),
    rows<ReviewState>("SELECT * FROM review_states ORDER BY due_at", [], db),
    rows<AppState["reviews"][number]>(
      "SELECT * FROM reviews ORDER BY created_at DESC",
      [],
      db,
    ),
    rows<PracticeSet>(
      "SELECT * FROM practice_sets ORDER BY created_at DESC",
      [],
      db,
    ),
    rows<Attempt>("SELECT * FROM attempts ORDER BY created_at DESC", [], db),
    settings(),
    authStatus(),
    one<{ value: Daily }>(
      "SELECT value FROM app_settings WHERE key=$1",
      [`daily:${date}`],
      db,
    ),
  ]);
  return {
    articles,
    annotations,
    items,
    reviewStates,
    reviews,
    sets,
    attempts,
    settings: prefs,
    auth,
    daily: daily?.value || null,
    storage: process.env.DATABASE_URL ? "PostgreSQL" : "PGlite",
  };
}
export async function requireArticle(id: string): Promise<Article> {
  const a = await one<Article>("SELECT * FROM articles WHERE id=$1", [id]);
  if (!a)
    throw new AppError("This reading was deleted or could not be found.", 404);
  return a;
}
export async function requireItem(id: string): Promise<LanguageItem> {
  const i = await one<LanguageItem>("SELECT * FROM items WHERE id=$1", [id]);
  if (!i)
    throw new AppError(
      "This expression was deleted or could not be found.",
      404,
    );
  return i;
}
export async function addItem(input: unknown, tx?: Database) {
  const data = itemInput.parse(input);
  const normalized = normalizeTerm(data.term);
  if (!normalized) throw new AppError("Enter an expression.");
  const save = async (db: Database) => {
    const existing = await one<LanguageItem>(
      "SELECT * FROM items WHERE normalized=$1",
      [normalized],
      db,
    );
    if (existing) return { item: existing, duplicate: true };
    if (
      data.source_article_id &&
      !(await one(
        "SELECT id FROM articles WHERE id=$1",
        [data.source_article_id],
        db,
      ))
    )
      throw new AppError("The source reading no longer exists.", 404);
    const id = randomUUID();
    await rows(
      "INSERT INTO items(id,term,normalized,kind,meaning,examples,collocations,related,register,note,source_article_id,context) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(normalized) DO NOTHING",
      [
        id,
        data.term,
        normalized,
        data.kind,
        data.meaning,
        json(data.examples),
        json(data.collocations),
        json(data.related),
        data.register,
        data.note,
        data.source_article_id,
        data.context,
      ],
      db,
    );
    const item = (await one<LanguageItem>(
      "SELECT * FROM items WHERE normalized=$1",
      [normalized],
      db,
    ))!;
    for (const mode of ["recognition", "production"])
      await rows(
        "INSERT INTO review_states(item_id,mode) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [item.id, mode],
        db,
      );
    return { item, duplicate: item.id !== id };
  };
  return tx ? save(tx) : (await getDb()).transaction(save);
}
export async function recordReview(
  itemId: string,
  mode: "recognition" | "production",
  rating: number,
  answer = "",
  feedback: Evaluation | null = null,
) {
  return (await getDb()).transaction(async (db) => {
    const state = await one<ReviewState>(
      "SELECT * FROM review_states WHERE item_id=$1 AND mode=$2 FOR UPDATE",
      [itemId, mode],
      db,
    );
    if (!state)
      throw new AppError("This expression is no longer available.", 404);
    if (new Date(state.due_at).getTime() > Date.now() + 1000)
      throw new AppError(
        "This review was already recorded. Continue with the next expression.",
        409,
        "already_reviewed",
      );
    const next = schedule(state, rating);
    await rows(
      "UPDATE review_states SET due_at=$3,interval_days=$4,ease=$5,repetitions=$6,lapses=$7 WHERE item_id=$1 AND mode=$2",
      [
        itemId,
        mode,
        next.due_at,
        next.interval_days,
        next.ease,
        next.repetitions,
        next.lapses,
      ],
      db,
    );
    const id = randomUUID();
    const review = (
      await rows(
        "INSERT INTO reviews(id,item_id,mode,rating,answer,feedback) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [id, itemId, mode, rating, answer, feedback ? json(feedback) : null],
        db,
      )
    )[0];
    return { id, state: next, feedback, review };
  });
}
export async function createSet(
  kind: string,
  title: string,
  exercises: Exercise[],
  articleId: string | null = null,
  db?: Database,
) {
  const id = randomUUID();
  return (
    await rows<PracticeSet>(
      "INSERT INTO practice_sets(id,kind,title,payload,source_article_id) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [id, kind, title, json({ exercises }), articleId],
      db,
    )
  )[0];
}
export async function recordAttempt(
  set: PracticeSet,
  exercise: Exercise,
  answer: string,
  evaluation: Evaluation,
) {
  return (await getDb()).transaction(async (db) => {
    const attempt = (
      await rows<Attempt>(
        "INSERT INTO attempts(id,set_id,exercise_id,answer,evaluation,skill,item_ids) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(set_id,exercise_id) DO UPDATE SET exercise_id=excluded.exercise_id RETURNING *",
        [
          randomUUID(),
          set.id,
          exercise.id,
          answer,
          json(evaluation),
          exercise.skill,
          json(exercise.item_ids),
        ],
        db,
      )
    )[0];
    const count = await one<{ count: number }>(
      "SELECT count(*)::int AS count FROM attempts WHERE set_id=$1",
      [set.id],
      db,
    );
    if (count && count.count >= set.payload.exercises.length)
      await rows(
        "UPDATE practice_sets SET completed_at=now() WHERE id=$1",
        [set.id],
        db,
      );
    return attempt;
  });
}

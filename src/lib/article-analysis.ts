import { createHash } from "node:crypto";
import { z } from "zod";
import { rows, one, json, getDb } from "./db";
import { requireArticle, settings, addItem } from "./store";
import { generate } from "./ai";
import { analysisSchema } from "./schemas";
import { AppError, errorPayload } from "./errors";
import { normalizeTerm } from "./scheduler";
import { logAIFailure } from "./diagnostics";
import type {
  ArticleAnalysis,
  Suggestion,
  Annotation,
  ReviewState,
} from "./types";
import { randomUUID } from "node:crypto";

export const contentHash = (body: string) =>
  createHash("sha256").update(body).digest("hex");
type Generated = z.infer<typeof analysisSchema>;
const LEASE_MS = 10 * 60_000;

export function groundSelections(
  body: string,
  result: Generated,
): Suggestion[] {
  const seen = new Set<string>();
  const selections: Suggestion[] = [];
  for (const s of result.selections) {
    const quoteStart = body.indexOf(s.quote),
      within = s.quote.indexOf(s.term);
    // Ambiguous repetitions are rejected rather than attached to the wrong use.
    if (
      quoteStart < 0 ||
      within < 0 ||
      body.indexOf(s.quote, quoteStart + 1) >= 0 ||
      s.quote.indexOf(s.term, within + 1) >= 0
    )
      continue;
    const start = quoteStart + within,
      end = start + s.term.length;
    const letter = /[\p{L}\p{N}]/u;
    if (
      (letter.test(s.term[0]) && letter.test(body[start - 1] || "")) ||
      (letter.test(s.term.at(-1)!) && letter.test(body[end] || ""))
    )
      continue;
    const normalized = normalizeTerm(s.lemma);
    if (
      seen.has(normalized) ||
      selections.some((a) => start < a.end_offset && end > a.start_offset)
    )
      continue;
    seen.add(normalized);
    selections.push({ ...s, start_offset: start, end_offset: end });
  }
  if (result.selections.length && !selections.length)
    throw new AppError(
      "The suggestions could not be verified against this reading. Retry analysis.",
      502,
      "ungrounded_output",
    );
  return selections;
}

export async function selectionProfile(body: string) {
  const [prefs, collected, feedback, history, mistakes] = await Promise.all([
    settings(),
    rows<{ term: string }>(
      "SELECT term FROM items ORDER BY updated_at DESC LIMIT 120",
    ),
    rows<{ term: string; feedback: string }>(
      "SELECT term,feedback FROM language_feedback ORDER BY created_at DESC LIMIT 120",
    ),
    rows(
      "SELECT mode, count(*)::int AS reviews, round(avg(rating)::numeric,1) AS recall FROM reviews GROUP BY mode",
    ),
    rows(
      "SELECT skill,evaluation->>'misconception' AS gap FROM attempts WHERE (evaluation->>'score')::real<0.8 AND evaluation->>'misconception'<>'' ORDER BY created_at DESC LIMIT 5",
    ),
  ]);
  const source = body.toLowerCase();
  const relevantFirst = <T extends { term: string }>(values: T[]) =>
    values
      .sort(
        (a, b) =>
          Number(source.includes(b.term.toLowerCase())) -
          Number(source.includes(a.term.toLowerCase())),
      )
      .slice(0, 60);
  return {
    level: prefs.level,
    collected: relevantFirst(collected).map((i) => i.term),
    feedback: relevantFirst(feedback),
    reviewHistory: history,
    recentGaps: mistakes,
  };
}

export async function readAnalysis(
  articleId: string,
): Promise<ArticleAnalysis | null> {
  const article = await requireArticle(articleId);
  let analysis = await one<ArticleAnalysis>(
    "SELECT * FROM article_analyses WHERE article_id=$1 AND content_hash=$2",
    [articleId, contentHash(article.body)],
  );
  if (
    analysis?.status === "running" &&
    Date.now() - new Date(analysis.updated_at).getTime() >= LEASE_MS
  ) {
    analysis =
      (await one<ArticleAnalysis>(
        "UPDATE article_analyses SET status='failed',error=$3,updated_at=now() WHERE article_id=$1 AND content_hash=$2 AND status='running' AND updated_at < now()-interval '10 minutes' RETURNING *",
        [
          articleId,
          analysis.content_hash,
          json({
            error:
              "Analysis was interrupted. Retry to finish noticing language.",
            code: "interrupted_analysis",
          }),
        ],
      )) || analysis;
  }
  if (analysis?.payload) {
    const candidates = analysis.payload.selections.flatMap((s) => [
      normalizeTerm(s.term),
      normalizeTerm(s.lemma),
    ]);
    const [collected, feedback, annotations] = await Promise.all([
      rows<{ normalized: string }>(
        "SELECT normalized FROM items WHERE normalized=ANY($1::text[])",
        [candidates],
      ),
      rows<{ normalized: string }>(
        "SELECT normalized FROM language_feedback WHERE normalized=ANY($1::text[])",
        [candidates],
      ),
      rows<{ start_offset: number; end_offset: number }>(
        "SELECT start_offset,end_offset FROM annotations WHERE article_id=$1 AND item_id IS NOT NULL",
        [articleId],
      ),
    ]);
    const known = new Set(collected.map((e) => e.normalized));
    const dismissed = new Set(feedback.map((e) => e.normalized));
    analysis.payload.selections = analysis.payload.selections.filter(
      (s) =>
        !dismissed.has(normalizeTerm(s.term)) &&
        !dismissed.has(normalizeTerm(s.lemma)) &&
        ((!known.has(normalizeTerm(s.term)) &&
          !known.has(normalizeTerm(s.lemma))) ||
          annotations.some(
            (a) =>
              a.start_offset === s.start_offset &&
              a.end_offset === s.end_offset,
          )),
    );
  }
  return analysis;
}

// Acquire a persisted lease before scheduling. Concurrent saves, tabs and opens
// all share one job; a crashed process can be recovered with an explicit retry.
export async function startAnalysis(
  articleId: string,
  schedule: (job: () => Promise<void>) => void,
  retry = false,
) {
  const acquired = await (
    await getDb()
  ).transaction(async (db) => {
    const article = await one<{ body: string }>(
      "SELECT body FROM articles WHERE id=$1 FOR UPDATE",
      [articleId],
      db,
    );
    if (!article) throw new AppError("This reading no longer exists.", 404);
    const hash = contentHash(article.body);
    const current = await one<ArticleAnalysis>(
      "SELECT * FROM article_analyses WHERE article_id=$1",
      [articleId],
      db,
    );
    if (
      current?.content_hash === hash &&
      (current.status === "complete" ||
        (current.status === "failed" && !retry) ||
        (current.status === "running" &&
          Date.now() - new Date(current.updated_at).getTime() < LEASE_MS))
    )
      return null;
    await rows(
      "INSERT INTO article_analyses(article_id,content_hash,status) VALUES($1,$2,'running') ON CONFLICT(article_id) DO UPDATE SET content_hash=excluded.content_hash,status='running',payload=NULL,error=NULL,metrics='{}',updated_at=now()",
      [articleId, hash],
      db,
    );
    return { body: article.body, hash };
  });
  if (acquired)
    schedule(async () => {
      try {
        const profile = await selectionProfile(acquired.body);
        const metrics: Record<string, number | boolean> = {};
        const result = await generate(
          "First understand the whole article: its topic, stance, tone and intended meaning. Summarise this in overview (one short sentence). Then select up to 8 expressions this learner is likely NOT to know. Rank by estimated unfamiliarity at their CEFR level, everyday usefulness, expressive value and relevance to this passage. Fewer, better selections are preferable; zero is valid. Include useful vocabulary, idioms, collocations (kind phrase), phrases and contiguous grammatical constructions. Exclude collected expressions, known/unhelpful feedback, elementary words used normally, names, jargon, obscure expressions, repeated meanings and arbitrary fragments. Use review history and demonstrated gaps cautiously; do not invent learner traits. Each term must be copied VERBATIM from source inside an EXACT unique source quote with enough surrounding text to disambiguate its meaning. Set lemma to its standard dictionary form (e.g. turned a corner → turn a corner), preserving the same expression and sense. Highlight only the term. Explain ONLY the sense intended here, in one short sentence, with one natural NEW example using that sense and a brief concrete learning reason. If uncertain about meaning or value, omit it. Do not pad the list.",
          { source: acquired.body, learner: profile },
          analysisSchema,
          AbortSignal.timeout(8 * 60_000),
          (event) => {
            if (event.type === "metrics")
              for (const [key, value] of Object.entries(event))
                if (typeof value === "number" || typeof value === "boolean")
                  metrics[key] = value;
          },
          (value) => {
            groundSelections(acquired.body, value);
          },
          "advanced",
        );
        const selections = groundSelections(acquired.body, result);
        await rows(
          "UPDATE article_analyses SET status='complete',payload=$3,metrics=$4,error=NULL,updated_at=now() WHERE article_id=$1 AND content_hash=$2 AND EXISTS(SELECT 1 FROM articles WHERE id=$1 AND body=$5)",
          [
            articleId,
            acquired.hash,
            json({ overview: result.overview, selections }),
            json(metrics),
            acquired.body,
          ],
        );
      } catch (error) {
        const diagnosticId = randomUUID();
        logAIFailure(error, "analyze", diagnosticId);
        await rows(
          "UPDATE article_analyses SET status='failed',error=$3,updated_at=now() WHERE article_id=$1 AND content_hash=$2",
          [
            articleId,
            acquired.hash,
            json({ ...errorPayload(error), diagnosticId }),
          ],
        );
      }
    });
  return readAnalysis(articleId);
}

export async function suggestionFeedback(
  articleId: string,
  start: number,
  hash: string,
  feedback: "known" | "unhelpful",
) {
  const analysis = await readAnalysis(articleId);
  const selection = analysis?.payload?.selections.find(
    (s) => s.start_offset === start,
  );
  if (!selection || analysis?.content_hash !== hash)
    throw new AppError(
      "This suggestion changed. Reopen the reading.",
      409,
      "source_changed",
    );
  await rows(
    "INSERT INTO language_feedback(normalized,term,feedback) VALUES($1,$2,$3) ON CONFLICT(normalized) DO UPDATE SET feedback=excluded.feedback,created_at=now()",
    [normalizeTerm(selection.lemma), selection.lemma, feedback],
  );
  return readAnalysis(articleId);
}

export async function collectSuggestion(
  articleId: string,
  start: number,
  hash: string,
) {
  // Read the original payload, including suggestions already collected in another tab.
  const saved = await (
    await getDb()
  ).transaction(async (db) => {
    const article = await one<{ body: string }>(
      "SELECT body FROM articles WHERE id=$1 FOR UPDATE",
      [articleId],
      db,
    );
    const analysis = await one<ArticleAnalysis>(
      "SELECT * FROM article_analyses WHERE article_id=$1",
      [articleId],
      db,
    );
    const s = analysis?.payload?.selections.find(
      (s) => s.start_offset === start,
    );
    if (
      !article ||
      !s ||
      hash !== contentHash(article.body) ||
      hash !== analysis?.content_hash ||
      article.body.slice(s.start_offset, s.end_offset) !== s.term
    )
      throw new AppError(
        "This suggestion no longer matches the reading.",
        409,
        "source_changed",
      );
    const result = await addItem(
      {
        term: s.lemma,
        kind: s.kind,
        meaning: s.meaning,
        examples: [{ sentence: s.example, note: "" }],
        source_article_id: articleId,
        context: s.quote,
      },
      db,
    );
    const existing = await one<Annotation>(
      "SELECT * FROM annotations WHERE article_id=$1 AND start_offset=$2 AND end_offset=$3",
      [articleId, s.start_offset, s.end_offset],
      db,
    );
    const annotation = existing
      ? (
          await rows<Annotation>(
            "UPDATE annotations SET item_id=COALESCE(item_id,$2) WHERE id=$1 RETURNING *",
            [existing.id, result.item.id],
            db,
          )
        )[0]
      : (
          await rows<Annotation>(
            "INSERT INTO annotations(id,article_id,start_offset,end_offset,quote,item_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
            [
              randomUUID(),
              articleId,
              s.start_offset,
              s.end_offset,
              s.term,
              result.item.id,
            ],
            db,
          )
        )[0];
    const reviewStates = await rows<ReviewState>(
      "SELECT * FROM review_states WHERE item_id=$1",
      [result.item.id],
      db,
    );
    return { ...result, annotation, reviewStates };
  });
  return { ...saved, analysis: await readAnalysis(articleId) };
}

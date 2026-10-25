import { NextRequest, after } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { guard, bodyJson } from "@/lib/security";
import {
  loadState,
  addItem,
  saveSettings,
  recordReview,
  requireArticle,
  requireItem,
} from "@/lib/store";
import { rows, one, json, getDb } from "@/lib/db";
import { getModels, switchAccount, signOut } from "@/lib/auth";
import { articleInput, itemInput, settingsSchema } from "@/lib/schemas";
import { exportBackup, importBackup } from "@/lib/backup";
import { AppError, errorPayload } from "@/lib/errors";
import { normalizeTerm } from "@/lib/scheduler";
import type { LanguageItem, Article, Annotation } from "@/lib/types";
import {
  startAnalysis,
  readAnalysis,
  suggestionFeedback,
  collectSuggestion,
} from "@/lib/article-analysis";
import { resumePlan } from "@/lib/ai-runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    guard(req);
    const { path } = await ctx.params;
    const [resource, id, operation] = path;
    const data = () =>
      bodyJson(req, resource === "backup" ? 260_000_000 : 1_000_000);
    const response = (value: unknown, status = 200) =>
      Response.json(value, {
        status,
        headers: { "Cache-Control": "no-store" },
      });
    if (resource === "state" && req.method === "GET") {
      const date = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .parse(req.nextUrl.searchParams.get("date"));
      return response(await loadState(date));
    }
    if (resource === "models" && req.method === "GET")
      return response({
        models: await getModels(
          req.nextUrl.searchParams.get("refresh") === "1",
        ),
      });
    if (resource === "accounts" && req.method === "POST") {
      const b = z
        .object({ action: z.enum(["switch", "signout"]), id: z.uuid() })
        .parse(await data());
      return response(
        b.action === "switch"
          ? (await switchAccount(b.id), { ok: true })
          : await signOut(b.id),
      );
    }
    if (resource === "settings" && req.method === "PATCH") {
      const settings = settingsSchema.parse(await data());
      await saveSettings(settings);
      return response(settings);
    }
    if (resource === "ai-resume" && req.method === "POST") {
      resumePlan();
      return response({ ok: true });
    }
    if (resource === "articles") {
      if (!id && req.method === "POST") {
        const a = articleInput.parse(await data());
        const article = (
          await rows<Article>(
            "INSERT INTO articles(id,title,body,author,source_url) VALUES($1,$2,$3,$4,$5) RETURNING *",
            [randomUUID(), a.title, a.body, a.author, a.source_url],
          )
        )[0];
        await startAnalysis(article.id as string, (job) => after(job));
        return response(article, 201);
      }
      if (id) {
        z.uuid().parse(id);
        const article = await requireArticle(id);
        if (operation === "analysis") {
          if (req.method === "GET") return response(await readAnalysis(id));
          if (req.method === "POST") {
            const { retry } = z
              .object({ retry: z.boolean().default(false) })
              .parse(await data());
            return response(
              await startAnalysis(id, (job) => after(job), retry),
            );
          }
        }
        if (
          (operation === "feedback" || operation === "collect") &&
          req.method === "POST"
        ) {
          const input = z
            .object({
              start: z.number().int().min(0),
              hash: z.string().length(64),
              feedback: z.enum(["known", "unhelpful"]).optional(),
            })
            .parse(await data());
          if (operation === "collect")
            return response(
              await collectSuggestion(id, input.start, input.hash),
            );
          if (!input.feedback) throw new AppError("Choose a feedback option.");
          return response(
            await suggestionFeedback(
              id,
              input.start,
              input.hash,
              input.feedback,
            ),
          );
        }
        if (req.method === "PATCH") {
          const body = z
            .object({
              title: z.string().trim().min(1).max(300).optional(),
              body: z.string().trim().min(20).max(80000).optional(),
              author: z.string().trim().max(200).optional(),
              source_url: articleInput.shape.source_url.optional(),
              progress: z.number().min(0).max(1).optional(),
              archived: z.boolean().optional(),
            })
            .strict()
            .parse(await data());
          const contentChanged = await (
            await getDb()
          ).transaction(async (db) => {
            const current = await one<Article>(
              "SELECT * FROM articles WHERE id=$1 FOR UPDATE",
              [id],
              db,
            );
            if (!current)
              throw new AppError("This reading no longer exists.", 404);
            const changed =
              body.body !== undefined && body.body !== current.body;
            if (changed) {
              const count = await one<{ count: number }>(
                "SELECT ((SELECT count(*) FROM annotations WHERE article_id=$1) + (SELECT count(*) FROM practice_sets WHERE source_article_id=$1))::int as count",
                [id],
                db,
              );
              if (count?.count)
                throw new AppError(
                  "This passage has saved highlights or questions. Add a revised reading to preserve their original context.",
                  409,
                  "has_saved_context",
                );
            }
            const entries = Object.entries(body);
            if (entries.length)
              await rows(
                `UPDATE articles SET ${entries.map(([k], i) => `${k}=$${i + 2}`).join(",")},updated_at=now() WHERE id=$1`,
                [id, ...entries.map((e) => e[1])],
                db,
              );
            return changed;
          });
          if (contentChanged) await startAnalysis(id, (job) => after(job));
          return response(await requireArticle(id));
        }
        if (req.method === "DELETE") {
          await rows("DELETE FROM articles WHERE id=$1", [id]);
          return response({ ok: true });
        }
      }
    }
    if (resource === "items") {
      if (!id && req.method === "POST") {
        const result = await addItem(await data());
        return response(
          {
            ...result,
            reviewStates: await rows(
              "SELECT * FROM review_states WHERE item_id=$1",
              [result.item.id],
            ),
          },
          201,
        );
      }
      if (id) {
        z.uuid().parse(id);
        await requireItem(id);
        if (req.method === "PATCH") {
          const item = itemInput
            .omit({ source_article_id: true, context: true })
            .partial()
            .strict()
            .parse(await data());
          const entries = Object.entries(item);
          const jsonFields = ["examples", "collocations", "related"];
          if (item.term) {
            const duplicate = await one<LanguageItem>(
              "SELECT * FROM items WHERE normalized=$1 AND id<>$2",
              [normalizeTerm(item.term), id],
            );
            if (duplicate)
              throw new AppError(
                "That expression is already in your language bank.",
                409,
              );
            entries.push(["normalized", normalizeTerm(item.term)]);
          }
          if (entries.length)
            await rows(
              `UPDATE items SET ${entries.map(([k], i) => `${k}=$${i + 2}`).join(",")},updated_at=now() WHERE id=$1`,
              [
                id,
                ...entries.map(([k, v]) =>
                  jsonFields.includes(k) ? json(v) : v,
                ),
              ],
            );
          return response(await requireItem(id));
        }
        if (req.method === "DELETE") {
          await (
            await getDb()
          ).transaction(async (db) => {
            await rows(
              "UPDATE practice_sets SET payload=jsonb_set(payload,'{exercises}',(SELECT jsonb_agg(jsonb_set(ex,'{item_ids}',(ex->'item_ids') - $1::text)) FROM jsonb_array_elements(payload->'exercises') ex))",
              [id],
              db,
            );
            await rows(
              "UPDATE attempts SET item_ids=item_ids - $1::text",
              [id],
              db,
            );
            await rows("DELETE FROM items WHERE id=$1", [id], db);
          });
          return response({ ok: true });
        }
      }
    }
    if (resource === "annotations") {
      if (!id && req.method === "POST") {
        const a = z
          .object({
            article_id: z.uuid(),
            start_offset: z.number().int().min(0),
            end_offset: z.number().int().min(1),
            quote: z.string().min(1).max(5000),
            note: z.string().max(4000).default(""),
            item_id: z.uuid().nullable().default(null),
          })
          .parse(await data());
        const annotation = await (
          await getDb()
        ).transaction(async (db) => {
          const article = await one<Article>(
            "SELECT * FROM articles WHERE id=$1 FOR UPDATE",
            [a.article_id],
            db,
          );
          if (!article)
            throw new AppError("This reading no longer exists.", 404);
          if (
            article.body.slice(a.start_offset, a.end_offset) !== a.quote ||
            a.start_offset >= a.end_offset
          )
            throw new AppError(
              "This selection no longer matches your reading. Select it again.",
              409,
            );
          if (a.item_id) {
            if (
              !(await one("SELECT id FROM items WHERE id=$1", [a.item_id], db))
            )
              throw new AppError("This expression no longer exists.", 404);
            const existing = await one<Annotation>(
              "SELECT * FROM annotations WHERE article_id=$1 AND start_offset=$2 AND end_offset=$3",
              [a.article_id, a.start_offset, a.end_offset],
              db,
            );
            if (existing)
              return (
                await rows<Annotation>(
                  "UPDATE annotations SET item_id=COALESCE(item_id,$2) WHERE id=$1 RETURNING *",
                  [existing.id, a.item_id],
                  db,
                )
              )[0];
          }
          return (
            await rows<Annotation>(
              "INSERT INTO annotations(id,article_id,start_offset,end_offset,quote,note,item_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
              [
                randomUUID(),
                a.article_id,
                a.start_offset,
                a.end_offset,
                a.quote,
                a.note,
                a.item_id,
              ],
              db,
            )
          )[0];
        });
        return response(annotation, 201);
      }
      if (id) {
        z.uuid().parse(id);
        if (req.method === "PATCH") {
          const b = z
            .object({ note: z.string().max(4000) })
            .parse(await data());
          const updated = (
            await rows(
              "UPDATE annotations SET note=$2 WHERE id=$1 RETURNING *",
              [id, b.note],
            )
          )[0];
          if (!updated)
            throw new AppError("This highlight no longer exists.", 404);
          return response(updated);
        }
        if (req.method === "DELETE") {
          await rows("DELETE FROM annotations WHERE id=$1", [id]);
          return response({ ok: true });
        }
      }
    }
    if (resource === "reviews" && req.method === "POST") {
      const b = z
        .object({ itemId: z.uuid(), rating: z.number().int().min(0).max(3) })
        .parse(await data());
      return response(await recordReview(b.itemId, "recognition", b.rating));
    }
    if (resource === "sets" && id && req.method === "DELETE") {
      z.uuid().parse(id);
      await rows("DELETE FROM practice_sets WHERE id=$1", [id]);
      return response({ ok: true });
    }
    if (resource === "backup") {
      if (req.method === "GET") {
        return new Response(JSON.stringify(await exportBackup(), null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="margin-${new Date().toISOString().slice(0, 10)}.json"`,
            "Cache-Control": "no-store",
          },
        });
      }
      if (req.method === "POST") {
        const b = z
          .object({
            mode: z.enum(["merge", "replace"]),
            backup: z.unknown(),
            confirmation: z.string().optional(),
          })
          .parse(await data());
        if (b.mode === "replace" && b.confirmation !== "REPLACE")
          throw new AppError("Type REPLACE to confirm restoring this backup.");
        return response(await importBackup(b.backup, b.mode));
      }
    }
    throw new AppError("This action could not be found.", 404);
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json(
        {
          error: e.issues
            .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
            .slice(0, 3)
            .join(" · "),
          code: "validation",
        },
        { status: 400 },
      );
    return Response.json(errorPayload(e), {
      status: e instanceof AppError ? e.status : 500,
    });
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;

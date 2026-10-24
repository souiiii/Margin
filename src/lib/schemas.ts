import { z } from "zod";
export const kindSchema = z.enum(["word", "idiom", "phrase", "construction"]);
export const levelSchema = z.enum(["B1", "B2", "C1", "C2"]);
const short = z.string().trim().min(1).max(300);
export const articleInput = z.object({
  title: short,
  body: z.string().trim().min(20).max(80000),
  author: z.string().trim().max(200).default(""),
  source_url: z
    .union([
      z.literal(""),
      z.url().refine((v) => /^https?:\/\//.test(v), "Use an http or https URL"),
    ])
    .default(""),
});
export const itemInput = z.object({
  term: z.string().trim().min(1).max(180),
  kind: kindSchema.default("word"),
  meaning: z.string().trim().max(4000).default(""),
  examples: z
    .array(
      z.object({
        sentence: z.string().trim().min(1).max(1000),
        note: z.string().max(500),
      }),
    )
    .max(8)
    .default([]),
  collocations: z.array(short).max(12).default([]),
  related: z.array(short).max(12).default([]),
  register: z.string().max(500).default(""),
  note: z.string().max(4000).default(""),
  source_article_id: z.uuid().nullable().default(null),
  context: z.string().max(3000).default(""),
});
export const definitionSchema = z.object({
  term: z.string().min(1).max(180),
  kind: kindSchema,
  meaning: z.string().min(1).max(4000),
  examples: z
    .array(
      z.object({
        sentence: z.string().min(1).max(1000),
        note: z.string().max(500),
      }),
    )
    .min(2)
    .max(4),
  collocations: z.array(short).max(8),
  related: z.array(short).max(6),
  register: z.string().min(1).max(500),
});
export const analysisSchema = z.object({
  selections: z
    .array(
      z.object({
        term: z.string().min(1).max(180),
        quote: z.string().min(1).max(600),
        kind: kindSchema,
        meaning: z.string().min(1).max(1000),
        reason: z.string().min(1).max(500),
      }),
    )
    .max(10),
});
export const exerciseSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.enum([
      "short-answer",
      "multiple-choice",
      "cloze",
      "rewrite",
      "writing",
    ]),
    skill: z.enum([
      "vocabulary",
      "grammar",
      "comprehension",
      "writing",
      "word-choice",
    ]),
    prompt: z.string().min(1).max(3000),
    options: z.array(z.string().min(1).max(1000)).max(5),
    answer: z.string().min(1).max(4000),
    explanation: z.string().min(1).max(3000),
    evidence: z.string().max(2000),
    item_ids: z.array(z.uuid()).max(10),
  })
  .superRefine((v, ctx) => {
    if (
      v.type === "multiple-choice" &&
      (v.options.length < 3 ||
        !v.options.includes(v.answer) ||
        new Set(v.options).size !== v.options.length)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Multiple choice requires distinct options and an exact matching answer",
      });
  });
export const exercisesSchema = z
  .object({ title: short, exercises: z.array(exerciseSchema).min(1).max(8) })
  .superRefine((v, ctx) => {
    if (new Set(v.exercises.map((e) => e.id)).size !== v.exercises.length)
      ctx.addIssue({ code: "custom", message: "Exercise IDs must be unique" });
  });
export const evaluationSchema = z.object({
  score: z.number().min(0).max(1),
  feedback: z.string().min(1).max(3000),
  improved_answer: z.string().max(4000),
  misconception: z.string().max(1000),
  evidence: z.string().max(2000),
});
export const dailySchema = z.object({
  discoveries: z
    .array(
      z.object({
        title: short,
        note: z.string().min(1).max(600),
        term: z.string().min(1).max(180),
        kind: kindSchema,
        meaning: z.string().min(1).max(1000),
        example: z.string().min(1).max(1000),
      }),
    )
    .min(1)
    .max(3),
  prompt: z.string().min(1).max(1000),
});
export const settingsSchema = z.object({
  level: levelSchema,
  model: z.string().max(200),
  theme: z.enum(["light", "dark"]),
  daily_size: z.number().int().min(3).max(8),
});

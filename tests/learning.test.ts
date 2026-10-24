import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { schedule, normalizeTerm } from "@/lib/scheduler";
import { getDb, rows } from "@/lib/db";
import { addItem, recordReview, createSet, recordAttempt } from "@/lib/store";
import {
  exportBackup,
  validateBackup,
  importBackup,
  checksum,
} from "@/lib/backup";
import type { ReviewState, Exercise } from "@/lib/types";
const state: ReviewState = {
  item_id: randomUUID(),
  mode: "recognition",
  due_at: new Date().toISOString(),
  interval_days: 0,
  ease: 2.5,
  repetitions: 0,
  lapses: 0,
};
describe("long-term learning", () => {
  it("schedules a lapse soon while preserving the independent production state", () => {
    const now = new Date("2026-10-25T10:00:00Z");
    const result = schedule(
      { ...state, interval_days: 30, repetitions: 4 },
      0,
      now,
    );
    expect(result.due_at).toBe("2026-10-25T10:10:00.000Z");
    expect(result.lapses).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(state.mode).toBe("recognition");
  });
  it("expands intervals after successful recall and bounds ease", () => {
    let next = state;
    for (let i = 0; i < 30; i++) next = schedule(next, 3);
    expect(next.interval_days).toBe(365);
    expect(next.ease).toBeLessThanOrEqual(3.2);
  });
  it("normalizes Unicode, whitespace and case for effortless deduplication", () =>
    expect(normalizeTerm("  Take   ＳＴＯＣＫ  ")).toBe("take stock"));
  it("creates two distinct schedules, deduplicates and prevents double reviews", async () => {
    const first = await addItem({
      term: "Turn a corner",
      kind: "idiom",
      meaning: "Begin to improve",
    });
    const duplicate = await addItem({
      term: " turn  a CORNER ",
      kind: "phrase",
    });
    expect(duplicate.item.id).toBe(first.item.id);
    expect(duplicate.duplicate).toBe(true);
    await recordReview(first.item.id, "recognition", 2);
    const states = await rows<ReviewState>(
      "SELECT * FROM review_states WHERE item_id=$1",
      [first.item.id],
    );
    expect(states.find((s) => s.mode === "recognition")?.repetitions).toBe(1);
    expect(states.find((s) => s.mode === "production")?.repetitions).toBe(0);
    await expect(recordReview(first.item.id, "recognition", 2)).rejects.toThrow(
      "already recorded",
    );
  });
  it("stores evaluations once and marks complete only after all answers", async () => {
    const exercise: Exercise = {
      id: "one",
      type: "short-answer",
      skill: "writing",
      prompt: "Write one sentence.",
      options: [],
      answer: "A thoughtful answer.",
      explanation: "A clear sentence.",
      evidence: "",
      item_ids: [],
    };
    const set = await createSet("writing", "Your sentence", [exercise]);
    const evaluation = {
      score: 0.9,
      feedback: "Clear and natural.",
      improved_answer: "",
      misconception: "",
      evidence: "",
    };
    const a = await recordAttempt(set, exercise, "My answer.", evaluation);
    const b = await recordAttempt(
      set,
      exercise,
      "Overwritten answer.",
      evaluation,
    );
    expect(b.id).toBe(a.id);
    expect(b.answer).toBe("My answer.");
    const saved = await rows<{ completed_at: string | null }>(
      "SELECT completed_at FROM practice_sets WHERE id=$1",
      [set.id],
    );
    expect(saved[0].completed_at).not.toBeNull();
  });
});
describe("portable backups", () => {
  it("round-trips all learning records through a checksummed export and import", async () => {
    const backup = await exportBackup();
    const before = validateBackup(backup);
    expect(before.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(backup)).not.toMatch(
      /access_token|refresh_token|id_token/,
    );
    await importBackup(backup, "replace");
    const after = validateBackup(await exportBackup());
    expect(after).toEqual(before);
  });
  it("rejects corruption before altering the library", async () => {
    const backup = await exportBackup();
    backup.data.items[0].term = "corrupted";
    await expect(importBackup(backup, "replace")).rejects.toThrow("checksum");
  });
  it("rejects dangling references even when the checksum was recomputed", async () => {
    const backup = await exportBackup();
    backup.data.items[0].source_article_id = randomUUID();
    backup.checksum = checksum(backup.data);
    expect(() => validateBackup(backup)).toThrow("source reading");
  });
  it("rejects malformed persisted daily material before an import", async () => {
    const backup = await exportBackup();
    backup.data.app_settings.push({
      key: "daily:2026-10-25",
      value: { date: "2026-10-25", discoveries: "broken", prompt: "test" },
    });
    backup.checksum = checksum(backup.data);
    expect(() => validateBackup(backup)).toThrow();
  });
  it("rejects expression keys that would bypass duplicate detection", async () => {
    const backup = await exportBackup();
    backup.data.items[0].normalized = "wrong key";
    backup.checksum = checksum(backup.data);
    expect(() => validateBackup(backup)).toThrow("search key");
  });
  it("rolls back a failed transaction", async () => {
    const db = await getDb();
    const id = randomUUID();
    await expect(
      db.transaction(async (tx) => {
        await tx.query(
          "INSERT INTO articles(id,title,body) VALUES($1,'test','test')",
          [id],
        );
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(await rows("SELECT * FROM articles WHERE id=$1", [id])).toHaveLength(
      0,
    );
  });
});

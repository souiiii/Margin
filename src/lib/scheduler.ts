import type { ReviewState } from "./types";
export function schedule(
  current: ReviewState,
  rating: number,
  now = new Date(),
): ReviewState {
  if (![0, 1, 2, 3].includes(rating)) throw new Error("Invalid rating");
  let interval = current.interval_days;
  let repetitions = current.repetitions;
  let ease = current.ease;
  let lapses = current.lapses;
  if (rating === 0) {
    interval = 10 / 1440;
    repetitions = 0;
    ease = Math.max(1.3, ease - 0.2);
    lapses++;
  } else if (rating === 1) {
    interval = Math.max(0.5, interval * 1.2);
    ease = Math.max(1.3, ease - 0.15);
    repetitions++;
  } else {
    interval =
      repetitions === 0
        ? rating === 3
          ? 3
          : 1
        : repetitions === 1
          ? rating === 3
            ? 7
            : 3
          : Math.min(365, interval * ease * (rating === 3 ? 1.3 : 1));
    ease = Math.min(3.2, ease + (rating === 3 ? 0.1 : 0));
    repetitions++;
  }
  return {
    ...current,
    interval_days: interval,
    repetitions,
    ease,
    lapses,
    due_at: new Date(now.getTime() + interval * 86400000).toISOString(),
  };
}
export function normalizeTerm(s: string) {
  return s
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ")
    .trim();
}

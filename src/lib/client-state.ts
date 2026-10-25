import type {
  AppState,
  Article,
  Annotation,
  LanguageItem,
  ReviewState,
  Review,
  PracticeSet,
  Attempt,
  Daily,
  Settings,
} from "./types";

function upsert<T extends { id: string }>(list: T[], item: T) {
  return [item, ...list.filter((old) => old.id !== item.id)];
}
function reviewResult(state: AppState, value: unknown): AppState {
  const result = value as { state: ReviewState; review: Review };
  return {
    ...state,
    reviewStates: [
      ...state.reviewStates.filter(
        (s) =>
          !(s.item_id === result.state.item_id && s.mode === result.state.mode),
      ),
      result.state,
    ],
    reviews: upsert(state.reviews, result.review),
  };
}
export function applyAIResult(
  state: AppState,
  input: { action: string },
  result: unknown,
): AppState {
  if (input.action === "questions" || input.action === "practice")
    return { ...state, sets: upsert(state.sets, result as PracticeSet) };
  if (input.action === "daily") return { ...state, daily: result as Daily };
  if (input.action === "production") return reviewResult(state, result);
  if (input.action === "evaluate") {
    const attempt = result as Attempt,
      attempts = upsert(state.attempts, attempt);
    return {
      ...state,
      attempts,
      sets: state.sets.map((set) =>
        set.id === attempt.set_id &&
        set.payload.exercises.every((e) =>
          attempts.some((a) => a.set_id === set.id && a.exercise_id === e.id),
        )
          ? { ...set, completed_at: attempt.created_at }
          : set,
      ),
    };
  }
  return state;
}
// Return null only for administrative operations needing a new account/library snapshot.
export function applyMutation(
  state: AppState,
  path: string,
  method: string,
  result: unknown,
): AppState | null {
  const [resource, id, operation] = path.split("/");
  if (resource === "articles" && operation === "collect") {
    const saved = result as {
      item: LanguageItem;
      annotation: Annotation;
      reviewStates: ReviewState[];
    };
    return {
      ...state,
      items: upsert(state.items, saved.item),
      annotations: upsert(state.annotations, saved.annotation),
      reviewStates: [
        ...state.reviewStates.filter((r) => r.item_id !== saved.item.id),
        ...saved.reviewStates,
      ],
    };
  }
  if (resource === "articles" && operation) return state;
  if (resource === "articles") {
    if (method !== "DELETE")
      return { ...state, articles: upsert(state.articles, result as Article) };
    return {
      ...state,
      articles: state.articles.filter((a) => a.id !== id),
      annotations: state.annotations.filter((a) => a.article_id !== id),
      items: state.items.map((i) =>
        i.source_article_id === id ? { ...i, source_article_id: null } : i,
      ),
      sets: state.sets.map((s) =>
        s.source_article_id === id ? { ...s, source_article_id: null } : s,
      ),
    };
  }
  if (resource === "annotations")
    return {
      ...state,
      annotations:
        method === "DELETE"
          ? state.annotations.filter((a) => a.id !== id)
          : upsert(state.annotations, result as Annotation),
    };
  if (resource === "settings")
    return { ...state, settings: result as Settings };
  if (resource === "reviews") return reviewResult(state, result);
  if (resource === "items") {
    if (method === "POST") {
      const saved = result as {
        item: LanguageItem;
        reviewStates: ReviewState[];
      };
      return {
        ...state,
        items: upsert(state.items, saved.item),
        reviewStates: [
          ...state.reviewStates.filter((s) => s.item_id !== saved.item.id),
          ...saved.reviewStates,
        ],
      };
    }
    if (method === "PATCH")
      return { ...state, items: upsert(state.items, result as LanguageItem) };
    return {
      ...state,
      items: state.items.filter((i) => i.id !== id),
      annotations: state.annotations.map((a) =>
        a.item_id === id ? { ...a, item_id: null } : a,
      ),
      reviewStates: state.reviewStates.filter((s) => s.item_id !== id),
      reviews: state.reviews.filter((r) => r.item_id !== id),
      sets: state.sets.map((s) => ({
        ...s,
        payload: {
          exercises: s.payload.exercises.map((e) => ({
            ...e,
            item_ids: e.item_ids.filter((i) => i !== id),
          })),
        },
      })),
      attempts: state.attempts.map((a) => ({
        ...a,
        item_ids: a.item_ids.filter((i) => i !== id),
      })),
    };
  }
  if (resource === "sets" && method === "DELETE")
    return {
      ...state,
      sets: state.sets.filter((s) => s.id !== id),
      attempts: state.attempts.filter((a) => a.set_id !== id),
    };
  return null;
}

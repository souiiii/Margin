import type { ReasoningEffort } from "./reasoning";
export type ItemKind = "word" | "idiom" | "phrase" | "construction";
export type Skill =
  "vocabulary" | "grammar" | "comprehension" | "writing" | "word-choice";
export type ExerciseType =
  "short-answer" | "multiple-choice" | "cloze" | "rewrite" | "writing";
export type Level = "B1" | "B2" | "C1" | "C2";
export interface Article {
  id: string;
  title: string;
  body: string;
  author: string;
  source_url: string;
  progress: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}
export interface Annotation {
  id: string;
  article_id: string;
  start_offset: number;
  end_offset: number;
  quote: string;
  note: string;
  item_id: string | null;
  created_at: string;
}
export interface Example {
  sentence: string;
  note: string;
}
export interface LanguageItem {
  id: string;
  term: string;
  normalized: string;
  kind: ItemKind;
  meaning: string;
  examples: Example[];
  collocations: string[];
  related: string[];
  register: string;
  note: string;
  source_article_id: string | null;
  context: string;
  created_at: string;
  updated_at: string;
}
export interface ReviewState {
  item_id: string;
  mode: "recognition" | "production";
  due_at: string;
  interval_days: number;
  ease: number;
  repetitions: number;
  lapses: number;
}
export interface Exercise {
  id: string;
  type: ExerciseType;
  skill: Skill;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  evidence: string;
  item_ids: string[];
}
export interface PracticeSet {
  id: string;
  kind: string;
  title: string;
  payload: { exercises: Exercise[] };
  source_article_id: string | null;
  created_at: string;
  completed_at: string | null;
}
export interface Evaluation {
  score: number;
  feedback: string;
  improved_answer: string;
  misconception: string;
  evidence: string;
}
export interface Attempt {
  id: string;
  set_id: string;
  exercise_id: string;
  answer: string;
  evaluation: Evaluation;
  skill: Skill;
  item_ids: string[];
  created_at: string;
}
export interface Review {
  id: string;
  item_id: string;
  mode: "recognition" | "production";
  rating: number;
  answer: string;
  feedback: Evaluation | null;
  created_at: string;
}
export interface Settings {
  everyday_reasoning: ReasoningEffort;
  advanced_reasoning: ReasoningEffort;
  level: Level;
  model: string;
  theme: "light" | "dark";
  daily_size: number;
}
export interface Model {
  slug: string;
  display_name: string;
  reasoning_efforts?: ReasoningEffort[] | null;
}
export interface AuthStatus {
  active: string | null;
  accounts: {
    id: string;
    label: string;
    email: string;
    connected: boolean;
    planEnabled: boolean;
    needsReauth: boolean;
  }[];
  hostId: string;
}
export interface Discovery {
  title: string;
  note: string;
  term: string;
  kind: ItemKind;
  meaning: string;
  example: string;
}
export interface Daily {
  date: string;
  discoveries: Discovery[];
  prompt: string;
}
export interface AppState {
  articles: Article[];
  annotations: Annotation[];
  items: LanguageItem[];
  reviewStates: ReviewState[];
  reviews: Review[];
  sets: PracticeSet[];
  attempts: Attempt[];
  settings: Settings;
  auth: AuthStatus;
  daily: Daily | null;
  storage: "PGlite" | "PostgreSQL";
}

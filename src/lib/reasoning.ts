import { AppError } from "./errors";
import type { Model, Settings } from "./types";
export const reasoningEfforts = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
export type ReasoningEffort = (typeof reasoningEfforts)[number];
export type ReasoningProfile = "everyday" | "advanced";
export const effortLabels: Record<ReasoningEffort, string> = {
  none: "None",
  minimal: "Minimal",
  low: "Light",
  medium: "Medium",
  high: "High",
  xhigh: "Extra high",
  max: "Maximum",
};
export function modelEfforts(raw: unknown): ReasoningEffort[] | null {
  if (!Array.isArray(raw)) return null;
  return [
    ...new Set(
      raw
        .map((v) => (typeof v === "string" ? v : v?.effort))
        .filter((v): v is ReasoningEffort => reasoningEfforts.includes(v)),
    ),
  ];
}
export function reasoningProfile(
  input: {
    action: string;
    focus?: string;
    retrySetId?: string;
    skill?: string;
    type?: string;
  },
  level: string,
): ReasoningProfile {
  if (["questions", "production", "analyze"].includes(input.action))
    return "advanced";
  if (
    input.action === "evaluate" &&
    (["writing", "comprehension"].includes(input.skill || "") ||
      ["writing", "rewrite"].includes(input.type || "") ||
      (input.skill === "grammar" && ["C1", "C2"].includes(level)))
  )
    return "advanced";
  if (
    input.action === "practice" &&
    (input.focus === "writing" ||
      input.focus === "mixed" ||
      input.retrySetId ||
      (input.focus === "grammar" && ["C1", "C2"].includes(level)))
  )
    return "advanced";
  return "everyday";
}
export function requireEffort(model: Model, effort: ReasoningEffort) {
  if (!model.reasoning_efforts)
    throw new AppError(
      `Reasoning support for ${model.display_name} could not be verified. Refresh models or choose another model in Settings.`,
      400,
      "reasoning_unverified",
    );
  if (!model.reasoning_efforts.includes(effort))
    throw new AppError(
      `${model.display_name} does not support ${effortLabels[effort]} reasoning. Choose a supported effort in Settings.`,
      400,
      "reasoning_unsupported",
    );
}
export function profileEffort(prefs: Settings, profile: ReasoningProfile) {
  return profile === "advanced"
    ? prefs.advanced_reasoning
    : prefs.everyday_reasoning;
}

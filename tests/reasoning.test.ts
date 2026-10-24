import { describe, it, expect } from "vitest";
import { reasoningProfile, requireEffort, modelEfforts } from "@/lib/reasoning";
import { settingsSchema } from "@/lib/schemas";
describe("reasoning preferences and task routing", () => {
  it("upgrades existing preferences without losing them", () =>
    expect(
      settingsSchema.parse({
        level: "C1",
        model: "chosen",
        theme: "dark",
        daily_size: 3,
      }),
    ).toMatchObject({
      level: "C1",
      model: "chosen",
      theme: "dark",
      everyday_reasoning: "low",
      advanced_reasoning: "medium",
    }));
  it.each(["define", "daily"])("uses everyday effort for %s", (action) =>
    expect(reasoningProfile({ action }, "B2")).toBe("everyday"),
  );
  it.each(["questions", "analyze", "production"])(
    "uses advanced effort for %s",
    (action) => expect(reasoningProfile({ action }, "B2")).toBe("advanced"),
  );
  it("routes simple practice and complex grammar independently", () => {
    expect(
      reasoningProfile({ action: "practice", focus: "vocabulary" }, "C1"),
    ).toBe("everyday");
    expect(
      reasoningProfile({ action: "practice", focus: "grammar" }, "B1"),
    ).toBe("everyday");
    expect(
      reasoningProfile({ action: "practice", focus: "grammar" }, "C1"),
    ).toBe("advanced");
    expect(
      reasoningProfile({ action: "practice", focus: "writing" }, "B1"),
    ).toBe("advanced");
    expect(
      reasoningProfile({ action: "evaluate", skill: "writing" }, "B1"),
    ).toBe("advanced");
    expect(
      reasoningProfile(
        { action: "evaluate", skill: "vocabulary", type: "multiple-choice" },
        "B1",
      ),
    ).toBe("everyday");
  });
  it("validates catalog capabilities without guessing model-name support", () => {
    expect(
      modelEfforts([
        { effort: "low" },
        { effort: "medium" },
        { effort: "unsupported" },
      ]),
    ).toEqual(["low", "medium"]);
    expect(() =>
      requireEffort(
        {
          slug: "limited",
          display_name: "Limited",
          reasoning_efforts: ["medium"],
        },
        "low",
      ),
    ).toThrow("does not support Light");
    expect(() =>
      requireEffort({ slug: "unknown", display_name: "Unknown" }, "medium"),
    ).toThrow("could not be verified");
  });
});

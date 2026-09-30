import { describe, expect, it } from "vitest";
import {
  SUGGESTED_BAD_HABITS,
  SUGGESTED_GOOD_HABITS,
  describeProblem,
  habitAmount,
  habitAmounts,
  normalizeLabel,
  validateHabitSelection,
} from "@/domain/habits";
import { DEFAULT_RULES } from "@/domain/rules";
import { makeBoard } from "@/domain/simulation";

describe("habitAmounts", () => {
  it("shares a split total out, remainder first", () => {
    expect(habitAmounts({ mode: "split", fullDay: 8 }, 3)).toEqual([3, 3, 2]);
    expect(habitAmounts({ mode: "split", fullDay: 8 }, 4)).toEqual([2, 2, 2, 2]);
    expect(habitAmounts({ mode: "split", fullDay: 18 }, 4)).toEqual([5, 5, 4, 4]);
    expect(habitAmounts({ mode: "split", fullDay: 8 }, 6)).toEqual([2, 2, 1, 1, 1, 1]);
  });

  it("always adds up to the full day, whatever the number of habits", () => {
    for (let count = 3; count <= 6; count++) {
      const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
      expect(sum(habitAmounts(DEFAULT_RULES.ladders, count))).toBe(8);
      expect(sum(habitAmounts(DEFAULT_RULES.snakes, count))).toBe(18);
    }
  });

  it("gives every habit the same amount in 'each' mode", () => {
    expect(habitAmounts({ mode: "each", perHabit: 5 }, 3)).toEqual([5, 5, 5]);
  });

  it("returns nothing for no habits", () => {
    expect(habitAmounts({ mode: "split", fullDay: 8 }, 0)).toEqual([]);
  });

  it("looks a habit's amount up by its slot", () => {
    const board = makeBoard(3, 3);
    const [first, , third] = board.filter((h) => h.kind === "good");
    expect(habitAmount(first, board, DEFAULT_RULES)).toBe(3);
    expect(habitAmount(third, board, DEFAULT_RULES)).toBe(2);
    expect(() => habitAmount({ ...first, id: "missing" }, board, DEFAULT_RULES)).toThrow();
  });
});

describe("validateHabitSelection", () => {
  const good = ["Went to the gym", "Read 20 pages", "Slept before 11"];
  const bad = ["Scrolled reels 2+ hours", "Skipped workout", "Stayed up past 1am"];

  it("accepts 3–6 of each kind and tidies whitespace", () => {
    const result = validateHabitSelection({ good: ["  Went   to the gym ", ...good.slice(1)], bad }, DEFAULT_RULES);
    expect(result).toEqual({ ok: true, good, bad });
  });

  it("rejects fewer than 3 or more than 6 of a kind", () => {
    const tooFew = validateHabitSelection({ good: good.slice(0, 2), bad }, DEFAULT_RULES);
    expect(tooFew.ok).toBe(false);
    if (!tooFew.ok) expect(tooFew.problems).toContainEqual({ code: "too-few", kind: "good", min: 3, max: 6 });

    const sevenBad = [...bad, "a", "b", "c", "d"];
    const tooMany = validateHabitSelection({ good, bad: sevenBad }, DEFAULT_RULES);
    expect(tooMany.ok).toBe(false);
    if (!tooMany.ok) expect(tooMany.problems).toContainEqual({ code: "too-many", kind: "bad", min: 3, max: 6 });
  });

  it("allows exactly 40 characters and rejects 41", () => {
    const forty = "x".repeat(40);
    expect(validateHabitSelection({ good: [...good.slice(0, 2), forty], bad }, DEFAULT_RULES).ok).toBe(true);
    const result = validateHabitSelection({ good: [...good.slice(0, 2), forty + "y"], bad }, DEFAULT_RULES);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0]).toMatchObject({ code: "too-long", max: 40 });
  });

  it("counts characters, not UTF-16 units, so emoji labels are not cut short", () => {
    const label = "🧘".repeat(40);
    expect(validateHabitSelection({ good: [...good.slice(0, 2), label], bad }, DEFAULT_RULES).ok).toBe(true);
  });

  it("rejects empty labels and repeats, including across kinds and letter case", () => {
    const result = validateHabitSelection(
      { good: [...good, "   "], bad: [...bad, "read 20 PAGES"] },
      DEFAULT_RULES,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems).toContainEqual({ code: "empty", kind: "good" });
      expect(result.problems).toContainEqual({ code: "duplicate", label: "read 20 PAGES" });
      expect(result.problems.map(describeProblem).every((m) => m.length > 0)).toBe(true);
    }
  });
});

describe("suggestions", () => {
  it("fit the label limit and never repeat", () => {
    const all = [...SUGGESTED_GOOD_HABITS, ...SUGGESTED_BAD_HABITS];
    for (const label of all) expect(label.length).toBeLessThanOrEqual(DEFAULT_RULES.maxHabitLabelLength);
    expect(new Set(all.map((l) => l.toLowerCase())).size).toBe(all.length);
    expect(normalizeLabel(" a  b ")).toBe("a b");
  });
});

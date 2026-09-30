import { describe, expect, it } from "vitest";
import { type Habit } from "@/domain/habits";
import { climb, playDay, slide } from "@/domain/movement";
import { DEFAULT_RULES, ORIGINAL_BRIEF_RULES, type GameRules } from "@/domain/rules";
import { makeBoard } from "@/domain/simulation";

// 4 good habits (ladders of 2 each) and 4 bad habits (snakes of 5, 5, 4, 4) with the default rules.
const board: Habit[] = makeBoard(4, 4);
const [g0, g1, g2, g3] = board.filter((h) => h.kind === "good").map((h) => h.id);
const [b0, b1, b2, b3] = board.filter((h) => h.kind === "bad").map((h) => h.id);

const day = (startSquare: number, roll: number, doneHabitIds: string[] = [], rules: GameRules = DEFAULT_RULES) =>
  playDay({ startSquare, roll, habits: board, doneHabitIds }, rules);

describe("checking in", () => {
  it("always moves the pawn forward by the dice roll", () => {
    const result = day(10, 3);
    expect(result.moves).toEqual([{ kind: "dice", roll: 3, from: 10, to: 13 }]);
    expect(result.endSquare).toBe(13);
    expect(result.reachedMoksha).toBe(false);
  });

  it("rejects rolls outside the dice", () => {
    expect(() => day(10, 0)).toThrow(RangeError);
    expect(() => day(10, DEFAULT_RULES.diceFaces + 1)).toThrow(RangeError);
    expect(() => day(10, 1.5)).toThrow(RangeError);
  });

  it("rejects a pawn that is off the board or already home", () => {
    expect(() => day(0, 1)).toThrow(RangeError);
    expect(() => day(100, 1)).toThrow(RangeError);
  });

  it("rejects habits that are not on the board", () => {
    expect(() => day(10, 1, ["nope"])).toThrow(/Unknown habit/);
  });
});

describe("ladders (good habits)", () => {
  it("climbs the habit's ladder after the dice", () => {
    const result = day(10, 2, [g0]);
    expect(result.moves).toEqual([
      { kind: "dice", roll: 2, from: 10, to: 12 },
      { kind: "ladder", habitId: g0, amount: 2, from: 12, to: 14 },
    ]);
    expect(result.endSquare).toBe(14);
  });

  it("uses the original brief's +5 per good habit when configured that way", () => {
    const result = day(10, 6, [g0, g1], ORIGINAL_BRIEF_RULES);
    expect(result.moves.map((m) => m.to)).toEqual([16, 21, 26]);
  });
});

describe("snakes (bad habits)", () => {
  it("slides down the habit's snake after the dice", () => {
    const result = day(40, 1, [b0]);
    expect(result.moves[1]).toEqual({ kind: "snake", habitId: b0, amount: 5, from: 41, to: 36 });
    expect(result.endSquare).toBe(36);
  });

  it("never goes below square 1", () => {
    const result = day(1, 1, [b0]);
    expect(result.moves[1]).toMatchObject({ kind: "snake", from: 2, to: 1 });
    expect(result.endSquare).toBe(1);
  });

  it("records a snake that cannot move because the pawn is already on square 1", () => {
    const result = day(1, 1, [b0, b1]);
    expect(result.moves.slice(1)).toEqual([
      { kind: "snake", habitId: b0, amount: 5, from: 2, to: 1 },
      { kind: "snake", habitId: b1, amount: 5, from: 1, to: 1 },
    ]);
  });

  it("uses the original brief's −4 per bad habit when configured that way", () => {
    const result = day(50, 1, [b0, b1], ORIGINAL_BRIEF_RULES);
    expect(result.moves.map((m) => m.to)).toEqual([51, 47, 43]);
  });
});

describe("multiple habits in one day", () => {
  it("moves dice, then every ladder, then every snake, each from where the last one ended", () => {
    const result = day(30, 3, [b2, g1, b0, g3, g0]);
    expect(result.moves).toEqual([
      { kind: "dice", roll: 3, from: 30, to: 33 },
      { kind: "ladder", habitId: g0, amount: 2, from: 33, to: 35 },
      { kind: "ladder", habitId: g1, amount: 2, from: 35, to: 37 },
      { kind: "ladder", habitId: g3, amount: 2, from: 37, to: 39 },
      { kind: "snake", habitId: b0, amount: 5, from: 39, to: 34 },
      { kind: "snake", habitId: b2, amount: 4, from: 34, to: 30 },
    ]);
    expect(result.endSquare).toBe(30);
    expect(result.skippedHabitIds).toEqual([]);
  });

  it("ignores habits that were not done", () => {
    const result = day(30, 3, [g2]);
    expect(result.moves.map((m) => m.kind)).toEqual(["dice", "ladder"]);
  });

  it("clamps each snake separately at square 1", () => {
    const result = day(3, 1, [b0, b1, b2, b3]);
    expect(result.moves.map((m) => m.to)).toEqual([4, 1, 1, 1, 1]);
    expect(result.endSquare).toBe(1);
  });

  it("doing every habit moves the full day's ladder and snake totals", () => {
    const all = board.map((h) => h.id);
    const result = day(50, 2, all);
    // +2 dice, +8 ladders, −18 snakes.
    expect(result.endSquare).toBe(50 + 2 + 8 - 18);
  });
});

describe("reaching Moksha (square 100)", () => {
  it("wins when the dice lands exactly on 100", () => {
    const result = day(97, 3);
    expect(result.endSquare).toBe(100);
    expect(result.reachedMoksha).toBe(true);
  });

  it("wins when a ladder lands exactly on 100", () => {
    const result = day(97, 1, [g0]);
    expect(result.moves.at(-1)).toMatchObject({ kind: "ladder", from: 98, to: 100 });
    expect(result.reachedMoksha).toBe(true);
  });

  it("counts overshooting 100 as landing on it by default", () => {
    expect(day(99, 3).endSquare).toBe(100);
    const result = day(98, 1, [g0]);
    expect(result.moves.at(-1)).toMatchObject({ kind: "ladder", amount: 2, from: 99, to: 100 });
    expect(result.reachedMoksha).toBe(true);
  });

  it("skips every remaining ladder and snake once Moksha is reached", () => {
    const result = day(96, 3, [g0, g1, g2, b0, b1]);
    expect(result.moves).toEqual([
      { kind: "dice", roll: 3, from: 96, to: 99 },
      { kind: "ladder", habitId: g0, amount: 2, from: 99, to: 100 },
    ]);
    expect(result.skippedHabitIds).toEqual([g1, g2, b0, b1]);
    expect(result.endSquare).toBe(100);
    expect(result.reachedMoksha).toBe(true);
  });

  it("does not let snakes pull the pawn back from 100 after the dice reaches it", () => {
    const result = day(98, 2, [b0]);
    expect(result.reachedMoksha).toBe(true);
    expect(result.skippedHabitIds).toEqual([b0]);
  });

  describe("with the exact-roll rule", () => {
    const exact: GameRules = { ...DEFAULT_RULES, exactRollToWin: true };

    it("cancels a dice move that would pass 100", () => {
      const result = day(99, 3, [], exact);
      expect(result.moves).toEqual([{ kind: "dice", roll: 3, from: 99, to: 99 }]);
      expect(result.reachedMoksha).toBe(false);
    });

    it("cancels a ladder that would pass 100 but still plays the snakes", () => {
      const result = day(97, 2, [g0, b0], exact);
      expect(result.moves.map((m) => [m.kind, m.from, m.to])).toEqual([
        ["dice", 97, 99],
        ["ladder", 99, 99],
        ["snake", 99, 94],
      ]);
    });

    it("still wins on an exact landing", () => {
      expect(day(97, 3, [], exact).reachedMoksha).toBe(true);
    });
  });
});

describe("climb and slide", () => {
  it("clamp at the ends of the board", () => {
    expect(climb(95, 10, DEFAULT_RULES)).toBe(100);
    expect(climb(95, 10, { ...DEFAULT_RULES, exactRollToWin: true })).toBe(95);
    expect(slide(3, 10)).toBe(1);
    expect(slide(30, 10)).toBe(20);
  });
});

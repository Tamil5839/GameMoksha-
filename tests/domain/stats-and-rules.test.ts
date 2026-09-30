import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, ORIGINAL_BRIEF_RULES, parseRules, validateRules } from "@/domain/rules";
import { makeBoard } from "@/domain/simulation";
import { biggestLadderAndSnake } from "@/domain/stats";

describe("biggestLadderAndSnake", () => {
  const board = makeBoard(3, 3);

  it("adds up the squares each habit actually moved this season", () => {
    const { ladder, snake } = biggestLadderAndSnake(board, [
      { habitId: "good-0", from: 10, to: 13 },
      { habitId: "good-1", from: 13, to: 16 },
      { habitId: "good-1", from: 20, to: 23 },
      { habitId: "bad-2", from: 23, to: 17 },
      { habitId: "bad-0", from: 30, to: 25 },
    ]);
    expect(ladder).toEqual({ habit: board[1], squares: 6 });
    expect(snake).toEqual({ habit: board[5], squares: 6 });
  });

  it("breaks ties in favour of the habit earlier on the board", () => {
    const { ladder } = biggestLadderAndSnake(board, [
      { habitId: "good-2", from: 10, to: 13 },
      { habitId: "good-0", from: 13, to: 16 },
    ]);
    expect(ladder?.habit.id).toBe("good-0");
  });

  it("leaves out habits that never moved the pawn", () => {
    const { ladder, snake } = biggestLadderAndSnake(board, [{ habitId: "bad-0", from: 1, to: 1 }]);
    expect(ladder).toBeNull();
    expect(snake).toBeNull();
  });
});

describe("rules", () => {
  it("ships valid defaults", () => {
    expect(validateRules(DEFAULT_RULES)).toEqual([]);
    expect(validateRules(ORIGINAL_BRIEF_RULES)).toEqual([]);
  });

  it("catches rules that cannot work", () => {
    expect(validateRules({ ...DEFAULT_RULES, diceFaces: 0 })).toHaveLength(1);
    // 5 squares cannot be split over 6 habits without a habit moving 0.
    expect(validateRules({ ...DEFAULT_RULES, ladders: { mode: "split", fullDay: 5 } })).toHaveLength(1);
    expect(validateRules({ ...DEFAULT_RULES, habitsPerKind: { min: 4, max: 7 } })).toHaveLength(1);
  });

  it("reads a stored snapshot, falling back to the defaults", () => {
    expect(parseRules({ ...DEFAULT_RULES, diceFaces: 6 }).diceFaces).toBe(6);
    expect(parseRules({ diceFaces: 4 })).toEqual({ ...DEFAULT_RULES, diceFaces: 4 });
    expect(parseRules({ diceFaces: -1 })).toEqual(DEFAULT_RULES);
    expect(parseRules(null)).toEqual(DEFAULT_RULES);
  });
});

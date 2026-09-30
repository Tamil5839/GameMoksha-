import { FINAL_SQUARE, START_SQUARE } from "./board/geometry";
import { habitAmounts, type Habit } from "./habits";
import type { GameRules } from "./rules";

/** One animated movement of the pawn during a check-in. */
export type Move =
  | { readonly kind: "dice"; readonly roll: number; readonly from: number; readonly to: number }
  | {
      readonly kind: "ladder" | "snake";
      readonly habitId: string;
      /** The habit's full ladder/snake length (the actual move can be shorter at the board's ends). */
      readonly amount: number;
      readonly from: number;
      readonly to: number;
    };

export interface DayInput {
  /** Where the pawn stands before today's check-in (1–99). */
  readonly startSquare: number;
  /** Today's dice roll (1..rules.diceFaces). */
  readonly roll: number;
  /** Every habit on the board. */
  readonly habits: readonly Habit[];
  /** Ids of the habits the player did today. */
  readonly doneHabitIds: readonly string[];
}

export interface DayResult {
  /** Applied moves, in the order they are animated: dice, ladders, then snakes. */
  readonly moves: readonly Move[];
  /** Habits done today that never moved because Moksha was reached first. */
  readonly skippedHabitIds: readonly string[];
  readonly endSquare: number;
  readonly reachedMoksha: boolean;
}

/** Moves forward; past 100 either counts as 100 or cancels the move (exact-roll rule). */
export function climb(from: number, squares: number, rules: GameRules): number {
  const target = from + squares;
  if (target <= FINAL_SQUARE) return target;
  return rules.exactRollToWin ? from : FINAL_SQUARE;
}

/** Moves back, never below square 1. */
export function slide(from: number, squares: number): number {
  return Math.max(START_SQUARE, from - squares);
}

/**
 * Plays one day's check-in:
 *  1. roll the dice and move forward (showing up always moves you),
 *  2. climb each done good habit's ladder, in board order,
 *  3. slide down each done bad habit's snake, in board order.
 * Touching square 100 is Moksha: the season is won and any remaining moves are skipped.
 */
export function playDay(input: DayInput, rules: GameRules): DayResult {
  const { startSquare, roll, habits, doneHabitIds } = input;
  if (!Number.isInteger(startSquare) || startSquare < START_SQUARE || startSquare >= FINAL_SQUARE) {
    throw new RangeError(`The pawn must start on a square from ${START_SQUARE} to ${FINAL_SQUARE - 1}, got ${startSquare}`);
  }
  if (!Number.isInteger(roll) || roll < 1 || roll > rules.diceFaces) {
    throw new RangeError(`A roll must be 1–${rules.diceFaces}, got ${roll}`);
  }
  const done = new Set(doneHabitIds);
  const known = new Set(habits.map((h) => h.id));
  for (const id of done) {
    if (!known.has(id)) throw new Error(`Unknown habit ${id}`);
  }

  const bySlot = (a: Habit, b: Habit) => a.slot - b.slot;
  const goodHabits = habits.filter((h) => h.kind === "good").sort(bySlot);
  const badHabits = habits.filter((h) => h.kind === "bad").sort(bySlot);
  const amounts = new Map<string, number>();
  habitAmounts(rules.ladders, goodHabits.length).forEach((n, i) => amounts.set(goodHabits[i].id, n));
  habitAmounts(rules.snakes, badHabits.length).forEach((n, i) => amounts.set(badHabits[i].id, n));
  const ladders = goodHabits.filter((h) => done.has(h.id));
  const snakes = badHabits.filter((h) => done.has(h.id));

  const moves: Move[] = [];
  const skippedHabitIds: string[] = [];
  let square = startSquare;

  const afterDice = climb(square, roll, rules);
  moves.push({ kind: "dice", roll, from: square, to: afterDice });
  square = afterDice;

  for (const habit of [...ladders, ...snakes]) {
    if (square === FINAL_SQUARE) {
      skippedHabitIds.push(habit.id);
      continue;
    }
    const amount = amounts.get(habit.id) ?? 0;
    const kind = habit.kind === "good" ? "ladder" : "snake";
    const to = kind === "ladder" ? climb(square, amount, rules) : slide(square, amount);
    moves.push({ kind, habitId: habit.id, amount, from: square, to });
    square = to;
  }

  return { moves, skippedHabitIds, endSquare: square, reachedMoksha: square === FINAL_SQUARE };
}

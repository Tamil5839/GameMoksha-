import type { Habit } from "./habits";

/** A ladder climb or snake slide that actually happened. */
export interface HabitMove {
  readonly habitId: string;
  readonly from: number;
  readonly to: number;
}

export interface HabitTotal {
  readonly habit: Habit;
  /** Squares climbed (ladder) or slid (snake) over the season, always positive. */
  readonly squares: number;
}

/**
 * The habit that climbed the most squares this season and the one that slid
 * the most. Ties go to the habit earlier on the board. Habits that never
 * moved the pawn are left out.
 */
export function biggestLadderAndSnake(
  habits: readonly Habit[],
  moves: readonly HabitMove[],
): { ladder: HabitTotal | null; snake: HabitTotal | null } {
  const totals = new Map<string, number>();
  for (const move of moves) {
    totals.set(move.habitId, (totals.get(move.habitId) ?? 0) + Math.abs(move.to - move.from));
  }

  const best = (kind: Habit["kind"]): HabitTotal | null => {
    let winner: HabitTotal | null = null;
    for (const habit of [...habits].filter((h) => h.kind === kind).sort((a, b) => a.slot - b.slot)) {
      const squares = totals.get(habit.id) ?? 0;
      if (squares > 0 && (!winner || squares > winner.squares)) winner = { habit, squares };
    }
    return winner;
  };

  return { ladder: best("good"), snake: best("bad") };
}

import type { Habit } from "../habits";

/**
 * Where each habit's ladder or snake is painted on the board. There are six
 * hand-placed spots of each kind; a habit's slot picks its spot. The first
 * three spots are spread over the board so a 3-habit board still looks full.
 *
 * The painted ladders and snakes are symbols of the habits: on check-in the
 * pawn climbs or slides the habit's amount from wherever it stands.
 */
export interface LadderSpot {
  /** Foot of the ladder. */
  readonly from: number;
  /** Top of the ladder. */
  readonly to: number;
}

export interface SnakeSpot {
  readonly head: number;
  readonly tail: number;
}

export const LADDER_SPOTS: readonly LadderSpot[] = [
  { from: 3, to: 22 },
  { from: 44, to: 65 },
  { from: 73, to: 94 },
  { from: 14, to: 33 },
  { from: 49, to: 70 },
  { from: 79, to: 99 },
];

export const SNAKE_SPOTS: readonly SnakeSpot[] = [
  { head: 36, tail: 17 },
  { head: 67, tail: 46 },
  { head: 97, tail: 76 },
  { head: 30, tail: 9 },
  { head: 62, tail: 41 },
  { head: 92, tail: 71 },
];

export interface PaintedLadder extends LadderSpot {
  readonly habit: Habit;
}

export interface PaintedSnake extends SnakeSpot {
  readonly habit: Habit;
}

export function paintBoard(habits: readonly Habit[]): { ladders: PaintedLadder[]; snakes: PaintedSnake[] } {
  const ladders: PaintedLadder[] = [];
  const snakes: PaintedSnake[] = [];
  for (const habit of habits) {
    if (habit.kind === "good") {
      const spot = LADDER_SPOTS[habit.slot];
      if (spot) ladders.push({ ...spot, habit });
    } else {
      const spot = SNAKE_SPOTS[habit.slot];
      if (spot) snakes.push({ ...spot, habit });
    }
  }
  const bySlot = (a: { habit: Habit }, b: { habit: Habit }) => a.habit.slot - b.habit.slot;
  return { ladders: ladders.sort(bySlot), snakes: snakes.sort(bySlot) };
}

/**
 * Every number that sets the pace of the game lives here.
 *
 * To re-tune the game, change DEFAULT_RULES and run `npm test`: the balance
 * simulation in tests/domain/balance.test.ts checks that a typical player
 * still reaches Moksha in about 25–30 days.
 *
 * A snapshot of the rules is stored with each season when it starts, so
 * changing these numbers never rewrites past seasons.
 */

/** How a group of habits (all ladders, or all snakes) turns into squares. */
export type HabitScoring =
  /**
   * Doing every habit of this kind moves `fullDay` squares in total. The
   * total is shared out between the habits, so a board with 3 habits and a
   * board with 6 habits play at the same pace.
   */
  | { readonly mode: "split"; readonly fullDay: number }
  /** Every habit moves the same fixed number of squares. */
  | { readonly mode: "each"; readonly perHabit: number };

export interface GameRules {
  /** A season lasts this many days. */
  readonly seasonLengthDays: number;
  /** Checking in rolls one dice with faces 1..diceFaces. */
  readonly diceFaces: number;
  /** How far good habits climb. */
  readonly ladders: HabitScoring;
  /** How far bad habits slide. */
  readonly snakes: HabitScoring;
  /**
   * false: overshooting square 100 counts as landing on it (Moksha).
   * true: classic rule, a move that would pass 100 is cancelled.
   */
  readonly exactRollToWin: boolean;
  /** How many good habits and how many bad habits a board has. */
  readonly habitsPerKind: { readonly min: number; readonly max: number };
  /** Longest allowed habit label, in characters. */
  readonly maxHabitLabelLength: number;
}

export const DEFAULT_RULES: GameRules = {
  seasonLengthDays: 30,
  diceFaces: 3,
  ladders: { mode: "split", fullDay: 8 },
  snakes: { mode: "split", fullDay: 18 },
  exactRollToWin: false,
  habitsPerKind: { min: 3, max: 6 },
  maxHabitLabelLength: 40,
};

/**
 * The numbers from the very first brief (one dice 1–6, +5 per good habit,
 * −4 per bad habit). Kept so the balance test can show why the defaults
 * differ: with these, a typical player wins in about a week.
 */
export const ORIGINAL_BRIEF_RULES: GameRules = {
  ...DEFAULT_RULES,
  diceFaces: 6,
  ladders: { mode: "each", perHabit: 5 },
  snakes: { mode: "each", perHabit: 4 },
};

const isPositiveInt = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n > 0;

/** Returns a list of problems; an empty list means the rules are usable. */
export function validateRules(rules: GameRules): string[] {
  const problems: string[] = [];
  if (!isPositiveInt(rules.seasonLengthDays)) problems.push("seasonLengthDays must be a positive integer");
  if (!isPositiveInt(rules.diceFaces)) problems.push("diceFaces must be a positive integer");
  if (!isPositiveInt(rules.maxHabitLabelLength)) problems.push("maxHabitLabelLength must be a positive integer");

  const { min, max } = rules.habitsPerKind;
  if (!isPositiveInt(min) || !isPositiveInt(max) || min > max || max > 6) {
    problems.push("habitsPerKind must satisfy 1 <= min <= max <= 6 (the board has 6 ladder and 6 snake spots)");
  }

  for (const [name, scoring] of [["ladders", rules.ladders], ["snakes", rules.snakes]] as const) {
    if (scoring.mode === "split") {
      // Every habit must move at least one square, even on the fullest board.
      if (!isPositiveInt(scoring.fullDay) || scoring.fullDay < max) {
        problems.push(`${name}.fullDay must be an integer of at least habitsPerKind.max (${max})`);
      }
    } else if (!isPositiveInt(scoring.perHabit)) {
      problems.push(`${name}.perHabit must be a positive integer`);
    }
  }
  return problems;
}

/**
 * Reads a rules snapshot stored with a season. Anything missing or invalid
 * falls back to the defaults, so old snapshots keep working.
 */
export function parseRules(value: unknown): GameRules {
  if (typeof value !== "object" || value === null) return DEFAULT_RULES;
  const merged = { ...DEFAULT_RULES, ...(value as Partial<GameRules>) } as GameRules;
  return validateRules(merged).length === 0 ? merged : DEFAULT_RULES;
}

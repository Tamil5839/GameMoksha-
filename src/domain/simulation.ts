import { START_SQUARE } from "./board/geometry";
import type { Habit } from "./habits";
import { playDay } from "./movement";
import type { GameRules } from "./rules";

/** How a simulated player behaves each day. */
export interface PlayerProfile {
  /** Chance of checking in on a given day. */
  readonly checkInRate: number;
  /** Chance of doing each good habit on a check-in day. */
  readonly goodRate: number;
  /** Chance of doing each bad habit on a check-in day. */
  readonly badRate: number;
}

export const PLAYER_PROFILES = {
  /** Does most good habits and few bad ones: should reach Moksha in about 25–30 days. */
  typical: { checkInRate: 1, goodRate: 0.75, badRate: 0.25 },
  perfect: { checkInRate: 1, goodRate: 1, badRate: 0 },
  /** Shows up every day but does no habits at all. */
  diceOnly: { checkInRate: 1, goodRate: 0, badRate: 0 },
  struggling: { checkInRate: 1, goodRate: 0.25, badRate: 0.75 },
} as const satisfies Record<string, PlayerProfile>;

/** Small, fast, seedable PRNG so simulations are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeBoard(goodCount: number, badCount: number): Habit[] {
  const make = (kind: Habit["kind"], count: number) =>
    Array.from({ length: count }, (_, slot) => ({ id: `${kind}-${slot}`, kind, label: `${kind} ${slot + 1}`, slot }));
  return [...make("good", goodCount), ...make("bad", badCount)];
}

/** Plays days until Moksha or `maxDays`; returns the winning day, or null. */
export function simulateSeason(
  rules: GameRules,
  profile: PlayerProfile,
  board: readonly Habit[],
  random: () => number,
  maxDays: number,
): number | null {
  let square = START_SQUARE;
  for (let day = 1; day <= maxDays; day++) {
    if (random() >= profile.checkInRate) continue;
    const roll = 1 + Math.floor(random() * rules.diceFaces);
    const doneHabitIds = board
      .filter((h) => random() < (h.kind === "good" ? profile.goodRate : profile.badRate))
      .map((h) => h.id);
    const result = playDay({ startSquare: square, roll, habits: board, doneHabitIds }, rules);
    if (result.reachedMoksha) return day;
    square = result.endSquare;
  }
  return null;
}

export interface SimulationSummary {
  /** Share of seasons that reach Moksha within the season's length. */
  readonly winRate: number;
  /** Median days to Moksha when nobody stops at the season's end (Infinity if most never get there). */
  readonly medianDays: number;
  readonly p10Days: number;
  readonly p90Days: number;
}

export function simulate(
  rules: GameRules,
  profile: PlayerProfile,
  board: readonly Habit[],
  { runs = 2000, seed = 1, maxDays = 365 } = {},
): SimulationSummary {
  const random = mulberry32(seed);
  const days: number[] = [];
  for (let i = 0; i < runs; i++) {
    days.push(simulateSeason(rules, profile, board, random, maxDays) ?? Number.POSITIVE_INFINITY);
  }
  days.sort((a, b) => a - b);
  const at = (q: number) => days[Math.min(days.length - 1, Math.floor(q * days.length))];
  return {
    winRate: days.filter((d) => d <= rules.seasonLengthDays).length / runs,
    medianDays: at(0.5),
    p10Days: at(0.1),
    p90Days: at(0.9),
  };
}

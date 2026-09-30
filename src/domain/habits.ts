import type { GameRules, HabitScoring } from "./rules";

/** Good habits are ladders (virtues); bad habits are snakes (vices). */
export type HabitKind = "good" | "bad";

export interface Habit {
  readonly id: string;
  readonly kind: HabitKind;
  readonly label: string;
  /** Position among habits of the same kind (0-based); picks the board spot. */
  readonly slot: number;
}

export const SUGGESTED_GOOD_HABITS = [
  "Went to the gym",
  "Read 20 pages",
  "Slept before 11",
  "Meditated 10 minutes",
  "Walked 8,000 steps",
  "Drank 2 litres of water",
  "Cooked a healthy meal",
  "Journaled",
  "Called family",
  "Studied for an hour",
] as const;

export const SUGGESTED_BAD_HABITS = [
  "Scrolled reels 2+ hours",
  "Skipped workout",
  "Stayed up past 1am",
  "Ordered junk food",
  "Snoozed the alarm 3+ times",
  "Doomscrolled the news",
  "Binge-watched 3+ episodes",
  "Smoked",
  "Skipped breakfast",
  "Lost my temper",
] as const;

/** Trims and collapses inner whitespace. */
export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

export type HabitSelectionProblem =
  | { readonly code: "too-few" | "too-many"; readonly kind: HabitKind; readonly min: number; readonly max: number }
  | { readonly code: "empty"; readonly kind: HabitKind }
  | { readonly code: "too-long"; readonly kind: HabitKind; readonly label: string; readonly max: number }
  | { readonly code: "duplicate"; readonly label: string };

export type HabitSelectionResult =
  | { readonly ok: true; readonly good: string[]; readonly bad: string[] }
  | { readonly ok: false; readonly problems: HabitSelectionProblem[] };

/** Checks a board's habits: 3–6 of each kind, 1–40 characters, no repeats. */
export function validateHabitSelection(
  selection: { readonly good: readonly string[]; readonly bad: readonly string[] },
  rules: GameRules,
): HabitSelectionResult {
  const problems: HabitSelectionProblem[] = [];
  const { min, max } = rules.habitsPerKind;
  const seen = new Set<string>();
  const cleaned: Record<HabitKind, string[]> = { good: [], bad: [] };

  for (const kind of ["good", "bad"] as const) {
    for (const raw of selection[kind]) {
      const label = normalizeLabel(raw);
      if (label.length === 0) {
        problems.push({ code: "empty", kind });
        continue;
      }
      if ([...label].length > rules.maxHabitLabelLength) {
        problems.push({ code: "too-long", kind, label, max: rules.maxHabitLabelLength });
        continue;
      }
      const key = label.toLocaleLowerCase();
      if (seen.has(key)) {
        problems.push({ code: "duplicate", label });
        continue;
      }
      seen.add(key);
      cleaned[kind].push(label);
    }
    const count = selection[kind].length;
    if (count < min) problems.push({ code: "too-few", kind, min, max });
    if (count > max) problems.push({ code: "too-many", kind, min, max });
  }

  return problems.length === 0 ? { ok: true, ...cleaned } : { ok: false, problems };
}

export function describeProblem(problem: HabitSelectionProblem): string {
  const noun = (kind: HabitKind) => (kind === "good" ? "good habits (ladders)" : "bad habits (snakes)");
  switch (problem.code) {
    case "too-few":
    case "too-many":
      return `Pick ${problem.min}–${problem.max} ${noun(problem.kind)}.`;
    case "empty":
      return `A ${problem.kind} habit is empty.`;
    case "too-long":
      return `“${problem.label}” is longer than ${problem.max} characters.`;
    case "duplicate":
      return `“${problem.label}” is on your board twice.`;
  }
}

/**
 * How many squares each habit of one kind moves, indexed by slot.
 * With "split" scoring the day's total is shared out and any remainder goes
 * to the first slots, so 8 squares over 3 habits is [3, 3, 2].
 */
export function habitAmounts(scoring: HabitScoring, habitCount: number): number[] {
  if (habitCount <= 0) return [];
  if (scoring.mode === "each") return Array.from({ length: habitCount }, () => scoring.perHabit);
  const base = Math.floor(scoring.fullDay / habitCount);
  const remainder = scoring.fullDay % habitCount;
  return Array.from({ length: habitCount }, (_, slot) => base + (slot < remainder ? 1 : 0));
}

/** The number of squares this habit's ladder climbs or snake slides. */
export function habitAmount(habit: Habit, allHabits: readonly Habit[], rules: GameRules): number {
  const sameKind = allHabits.filter((h) => h.kind === habit.kind).sort((a, b) => a.slot - b.slot);
  const index = sameKind.findIndex((h) => h.id === habit.id);
  if (index < 0) throw new Error(`Habit ${habit.id} is not on this board`);
  const scoring = habit.kind === "good" ? rules.ladders : rules.snakes;
  return habitAmounts(scoring, sameKind.length)[index];
}

/** Board order: good habits by slot, then bad habits by slot. */
export function sortHabits<T extends Habit>(habits: readonly T[]): T[] {
  const rank = (h: Habit) => (h.kind === "good" ? 0 : 100) + h.slot;
  return [...habits].sort((a, b) => rank(a) - rank(b));
}

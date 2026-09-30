import type { GameRules, Habit, HabitKind, LocalDate, SeasonStatus } from "@/domain";

/** Current time; swapped for a fixed clock in tests and the demo. */
export interface Clock {
  now(): Date;
}

/** Rolls one dice with faces 1..faces. Dice are always rolled on the server. */
export interface Dice {
  roll(faces: number): number;
}

export interface SeasonRecord {
  readonly id: string;
  readonly userId: string;
  /** 1 for the user's first season, 2 for the next… */
  readonly number: number;
  readonly status: SeasonStatus;
  readonly startDate: LocalDate;
  /** IANA time zone that decides when the player's days start and end. */
  readonly timeZone: string;
  readonly lengthDays: number;
  readonly currentSquare: number;
  readonly wonOnDay: number | null;
  readonly endedAt: Date | null;
  /** Rules snapshot taken when the season started. */
  readonly rules: GameRules;
  readonly habits: readonly Habit[];
}

export interface CheckInHabitRecord {
  readonly habitId: string;
  readonly kind: HabitKind;
  /** The habit's label on the day, kept even if habits change later. */
  readonly label: string;
  readonly done: boolean;
  /** Whether its ladder or snake moved the pawn (false if not done, or skipped after Moksha). */
  readonly applied: boolean;
  /** The habit's ladder or snake length that day. */
  readonly amount: number;
  readonly fromSquare: number | null;
  readonly toSquare: number | null;
}

export interface CheckInRecord {
  readonly id: string;
  readonly seasonId: string;
  readonly localDate: LocalDate;
  readonly dayNumber: number;
  readonly roll: number;
  readonly startSquare: number;
  readonly endSquare: number;
  readonly reachedMoksha: boolean;
  readonly createdAt: Date;
  readonly habits: readonly CheckInHabitRecord[];
}

export interface NewSeason {
  readonly startDate: LocalDate;
  readonly timeZone: string;
  readonly lengthDays: number;
  readonly rules: GameRules;
  readonly habits: readonly { readonly kind: HabitKind; readonly label: string; readonly slot: number }[];
}

export type NewCheckIn = Omit<CheckInRecord, "id" | "createdAt">;

export type RecordCheckInOutcome =
  | { readonly ok: true; readonly checkIn: CheckInRecord }
  /** already-checked-in: the day has a check-in. stale: the season changed since it was read. */
  | { readonly ok: false; readonly reason: "already-checked-in" | "stale" };

/** Storage for seasons and check-ins. Every method is scoped to one user. */
export interface GameRepository {
  /** The user's newest season, or null before onboarding. */
  latestSeason(userId: string): Promise<SeasonRecord | null>;
  getSeason(userId: string, seasonId: string): Promise<SeasonRecord | null>;
  /** All of the user's seasons, newest first. */
  listSeasons(userId: string): Promise<SeasonRecord[]>;
  /** Check-ins of the given seasons, oldest first. */
  listCheckIns(userId: string, seasonIds: readonly string[]): Promise<CheckInRecord[]>;
  /** Ends the user's active season, if any, and starts the next one. Atomic. */
  startSeason(userId: string, season: NewSeason): Promise<SeasonRecord>;
  /**
   * Saves a check-in and moves the season's pawn from startSquare to
   * endSquare (winning it if reachedMoksha). Atomic.
   */
  recordCheckIn(userId: string, checkIn: NewCheckIn): Promise<RecordCheckInOutcome>;
}

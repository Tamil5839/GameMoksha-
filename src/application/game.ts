import {
  DEFAULT_RULES,
  biggestLadderAndSnake,
  checkInAvailability,
  displayDay,
  habitAmounts,
  isValidTimeZone,
  localDateIn,
  playDay,
  seasonPhase,
  seasonTimeline,
  sortHabits,
  validateHabitSelection,
  type CheckInAvailability,
  type GameRules,
  type Habit,
  type HabitMove,
  type HabitTotal,
  type LocalDate,
  type Move,
  type SeasonCalendar,
  type SeasonPhase,
  type TimelineDay,
} from "@/domain";
import { GameError } from "./errors";
import type { CheckInHabitRecord, CheckInRecord, Clock, Dice, GameRepository, SeasonRecord } from "./ports";

export interface GameDeps {
  readonly repo: GameRepository;
  readonly clock: Clock;
  readonly dice: Dice;
  /** Rules for new seasons. Existing seasons keep the snapshot they started with. */
  readonly rules?: GameRules;
}

export function seasonCalendar(season: SeasonRecord): SeasonCalendar {
  return {
    status: season.status,
    startDate: season.startDate,
    lengthDays: season.lengthDays,
    wonOnDay: season.wonOnDay,
    endedOn: season.endedAt ? localDateIn(season.timeZone, season.endedAt) : null,
  };
}

/** Each habit's ladder or snake length in this season, by habit id. */
export function amountsByHabit(season: SeasonRecord): Record<string, number> {
  const amounts: Record<string, number> = {};
  for (const kind of ["good", "bad"] as const) {
    const habits = sortHabits(season.habits.filter((h) => h.kind === kind));
    const lengths = habitAmounts(kind === "good" ? season.rules.ladders : season.rules.snakes, habits.length);
    habits.forEach((habit, i) => (amounts[habit.id] = lengths[i]));
  }
  return amounts;
}

function habitMoves(checkIns: readonly CheckInRecord[]): HabitMove[] {
  return checkIns.flatMap((c) =>
    c.habits.flatMap((h) =>
      h.applied && h.fromSquare !== null && h.toSquare !== null
        ? [{ habitId: h.habitId, from: h.fromSquare, to: h.toSquare }]
        : [],
    ),
  );
}

// ─── Start a season ──────────────────────────────────────────────────────────

export interface StartSeasonInput {
  readonly good: readonly string[];
  readonly bad: readonly string[];
  /** The player's IANA time zone, from the browser. */
  readonly timeZone: string;
}

/** Onboarding and "new season": ends the current season (kept in history) and starts day 1 today. */
export async function startSeason(deps: GameDeps, userId: string, input: StartSeasonInput): Promise<SeasonRecord> {
  const rules = deps.rules ?? DEFAULT_RULES;
  const selection = validateHabitSelection(input, rules);
  if (!selection.ok) throw new GameError("invalid-habits", selection.problems);
  if (!isValidTimeZone(input.timeZone)) throw new GameError("invalid-time-zone");

  return deps.repo.startSeason(userId, {
    startDate: localDateIn(input.timeZone, deps.clock.now()),
    timeZone: input.timeZone,
    lengthDays: rules.seasonLengthDays,
    rules,
    habits: [
      ...selection.good.map((label, slot) => ({ kind: "good" as const, label, slot })),
      ...selection.bad.map((label, slot) => ({ kind: "bad" as const, label, slot })),
    ],
  });
}

// ─── Board ───────────────────────────────────────────────────────────────────

export interface BoardView {
  readonly season: SeasonRecord;
  readonly today: LocalDate;
  /** Day shown to the player (today's day, capped to the season). */
  readonly day: number;
  readonly phase: SeasonPhase;
  readonly availability: CheckInAvailability;
  readonly todayCheckIn: CheckInRecord | null;
  /** This season's check-ins, oldest first. */
  readonly checkIns: readonly CheckInRecord[];
  /** Ladder/snake length of each habit, by habit id. */
  readonly amounts: Readonly<Record<string, number>>;
  readonly biggestLadder: HabitTotal | null;
  readonly biggestSnake: HabitTotal | null;
}

function buildBoardView(season: SeasonRecord, checkIns: readonly CheckInRecord[], now: Date): BoardView {
  const calendar = seasonCalendar(season);
  const today = localDateIn(season.timeZone, now);
  const todayCheckIn = checkIns.find((c) => c.localDate === today) ?? null;
  const { ladder, snake } = biggestLadderAndSnake(season.habits, habitMoves(checkIns));
  return {
    season,
    today,
    day: displayDay(calendar, today),
    phase: seasonPhase(calendar, today),
    availability: checkInAvailability(calendar, today, todayCheckIn !== null),
    todayCheckIn,
    checkIns,
    amounts: amountsByHabit(season),
    biggestLadder: ladder,
    biggestSnake: snake,
  };
}

/** The player's current board, or null if they have not set one up yet. */
export async function loadBoard(deps: GameDeps, userId: string): Promise<BoardView | null> {
  const season = await deps.repo.latestSeason(userId);
  if (!season) return null;
  const checkIns = await deps.repo.listCheckIns(userId, [season.id]);
  return buildBoardView(season, checkIns, deps.clock.now());
}

// ─── Daily check-in ──────────────────────────────────────────────────────────

export interface CheckInInput {
  readonly seasonId: string;
  /** Good and bad habits the player did today. */
  readonly doneHabitIds: readonly string[];
}

export interface CheckInResult {
  readonly checkIn: CheckInRecord;
  /** Dice, then ladders, then snakes: the order to animate them in. */
  readonly moves: readonly Move[];
  readonly skippedHabitIds: readonly string[];
  readonly reachedMoksha: boolean;
}

/** Rolls the dice on the server, plays the day and saves it. One check-in per local day. */
export async function checkIn(deps: GameDeps, userId: string, input: CheckInInput): Promise<CheckInResult> {
  const season = await deps.repo.getSeason(userId, input.seasonId);
  if (!season) throw new GameError("season-not-found");

  const onBoard = new Set(season.habits.map((h) => h.id));
  const done = new Set(input.doneHabitIds);
  for (const id of done) if (!onBoard.has(id)) throw new GameError("unknown-habit");

  const today = localDateIn(season.timeZone, deps.clock.now());
  const checkIns = await deps.repo.listCheckIns(userId, [season.id]);
  const availability = checkInAvailability(
    seasonCalendar(season),
    today,
    checkIns.some((c) => c.localDate === today),
  );
  if (!availability.ok) throw new GameError(availability.reason);

  const roll = deps.dice.roll(season.rules.diceFaces);
  const day = playDay(
    { startSquare: season.currentSquare, roll, habits: season.habits, doneHabitIds: [...done] },
    season.rules,
  );

  const amounts = amountsByHabit(season);
  const moveByHabit = new Map<string, Move>();
  for (const move of day.moves) if (move.kind !== "dice") moveByHabit.set(move.habitId, move);
  const habits: CheckInHabitRecord[] = sortHabits(season.habits).map((habit) => {
    const move = moveByHabit.get(habit.id);
    return {
      habitId: habit.id,
      kind: habit.kind,
      label: habit.label,
      done: done.has(habit.id),
      applied: move !== undefined,
      amount: amounts[habit.id],
      fromSquare: move?.from ?? null,
      toSquare: move?.to ?? null,
    };
  });

  const outcome = await deps.repo.recordCheckIn(userId, {
    seasonId: season.id,
    localDate: today,
    dayNumber: availability.day,
    roll,
    startSquare: season.currentSquare,
    endSquare: day.endSquare,
    reachedMoksha: day.reachedMoksha,
    habits,
  });
  if (!outcome.ok) throw new GameError(outcome.reason);

  return {
    checkIn: outcome.checkIn,
    moves: day.moves,
    skippedHabitIds: day.skippedHabitIds,
    reachedMoksha: day.reachedMoksha,
  };
}

/** Rebuilds a saved check-in's moves (dice, ladders, snakes) for replays and summaries. */
export function movesOfCheckIn(checkIn: CheckInRecord): Move[] {
  const applied = checkIn.habits.filter((h) => h.applied && h.fromSquare !== null && h.toSquare !== null);
  const diceTo = applied[0]?.fromSquare ?? checkIn.endSquare;
  return [
    { kind: "dice", roll: checkIn.roll, from: checkIn.startSquare, to: diceTo },
    ...applied.map(
      (h): Move => ({
        kind: h.kind === "good" ? "ladder" : "snake",
        habitId: h.habitId,
        amount: h.amount,
        from: h.fromSquare!,
        to: h.toSquare!,
      }),
    ),
  ];
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface SeasonHistory {
  readonly season: SeasonRecord;
  readonly phase: SeasonPhase;
  /** Day shown for the season (today's day, capped to the season). */
  readonly day: number;
  /** Every day so far, oldest first, including missed days. */
  readonly days: readonly TimelineDay<CheckInRecord>[];
  readonly checkedInDays: number;
  readonly missedDays: number;
}

/** Every season, newest first, with a day-by-day timeline. */
export async function loadHistory(deps: GameDeps, userId: string): Promise<SeasonHistory[]> {
  const seasons = await deps.repo.listSeasons(userId);
  if (seasons.length === 0) return [];
  const checkIns = await deps.repo.listCheckIns(
    userId,
    seasons.map((s) => s.id),
  );
  const now = deps.clock.now();
  return seasons.map((season) => {
    const calendar = seasonCalendar(season);
    const today = localDateIn(season.timeZone, now);
    const days = seasonTimeline(
      calendar,
      checkIns.filter((c) => c.seasonId === season.id),
      today,
    );
    return {
      season,
      phase: seasonPhase(calendar, today),
      day: displayDay(calendar, today),
      days,
      checkedInDays: days.filter((d) => d.state === "checked-in").length,
      missedDays: days.filter((d) => d.state === "missed").length,
    };
  });
}

// ─── Share card ──────────────────────────────────────────────────────────────

export interface ShareCardData {
  readonly seasonNumber: number;
  readonly day: number;
  readonly square: number;
  readonly won: boolean;
  /** Every habit with its ladder or snake length, to label the board. */
  readonly habits: readonly (Habit & { readonly amount: number })[];
  readonly biggestLadder: { readonly label: string; readonly squares: number } | null;
  readonly biggestSnake: { readonly label: string; readonly squares: number } | null;
}

export async function loadShareCard(deps: GameDeps, userId: string, seasonId: string): Promise<ShareCardData | null> {
  const season = await deps.repo.getSeason(userId, seasonId);
  if (!season) return null;
  const checkIns = await deps.repo.listCheckIns(userId, [season.id]);
  const view = buildBoardView(season, checkIns, deps.clock.now());
  const summary = (total: HabitTotal | null) => total && { label: total.habit.label, squares: total.squares };
  return {
    seasonNumber: season.number,
    day: view.day,
    square: season.currentSquare,
    won: season.status === "won",
    habits: season.habits.map((h) => ({ ...h, amount: view.amounts[h.id] })),
    biggestLadder: summary(view.biggestLadder),
    biggestSnake: summary(view.biggestSnake),
  };
}

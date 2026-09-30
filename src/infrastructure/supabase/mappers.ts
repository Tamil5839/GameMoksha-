import type { CheckInHabitRecord, CheckInRecord, NewCheckIn, SeasonRecord } from "@/application/ports";
import { parseRules, type HabitKind, type SeasonStatus } from "@/domain";
import type { Json, Tables } from "./database.types";

export type SeasonRow = Tables<"seasons"> & { habits: Tables<"habits">[] };
export type CheckInRow = Tables<"check_ins"> & {
  check_in_habits: (Tables<"check_in_habits"> & { habits: { slot: number } | null })[];
};

const SEASON_STATUSES: readonly SeasonStatus[] = ["active", "won", "ended"];

function asKind(value: string): HabitKind {
  if (value !== "good" && value !== "bad") throw new Error(`Unexpected habit kind: ${value}`);
  return value;
}

function asStatus(value: string): SeasonStatus {
  if (!SEASON_STATUSES.includes(value as SeasonStatus)) throw new Error(`Unexpected season status: ${value}`);
  return value as SeasonStatus;
}

export function toSeasonRecord(row: SeasonRow): SeasonRecord {
  return {
    id: row.id,
    userId: row.user_id,
    number: row.number,
    status: asStatus(row.status),
    startDate: row.start_date,
    timeZone: row.time_zone,
    lengthDays: row.length_days,
    currentSquare: row.current_square,
    wonOnDay: row.won_on_day,
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    rules: parseRules(row.rules),
    habits: row.habits
      .map((h) => ({ id: h.id, kind: asKind(h.kind), label: h.label, slot: h.slot }))
      .sort((a, b) => (a.kind === b.kind ? a.slot - b.slot : a.kind === "good" ? -1 : 1)),
  };
}

export function toCheckInRecord(row: CheckInRow): CheckInRecord {
  // Board order: good habits by slot, then bad habits by slot.
  const rank = (h: CheckInRow["check_in_habits"][number]) => (h.kind === "good" ? 0 : 100) + (h.habits?.slot ?? 99);
  const habits: CheckInHabitRecord[] = [...row.check_in_habits]
    .sort((a, b) => rank(a) - rank(b))
    .map((h) => ({
      habitId: h.habit_id,
      kind: asKind(h.kind),
      label: h.label,
      done: h.done,
      applied: h.applied,
      amount: h.amount,
      fromSquare: h.from_square,
      toSquare: h.to_square,
    }));
  return {
    id: row.id,
    seasonId: row.season_id,
    localDate: row.local_date,
    dayNumber: row.day_number,
    roll: row.roll,
    startSquare: row.start_square,
    endSquare: row.end_square,
    reachedMoksha: row.reached_moksha,
    createdAt: new Date(row.created_at),
    habits,
  };
}

/** Arguments for the record_check_in database function. */
export function toRecordCheckInArgs(userId: string, checkIn: NewCheckIn) {
  return {
    p_user_id: userId,
    p_season_id: checkIn.seasonId,
    p_local_date: checkIn.localDate,
    p_day_number: checkIn.dayNumber,
    p_roll: checkIn.roll,
    p_start_square: checkIn.startSquare,
    p_end_square: checkIn.endSquare,
    p_reached_moksha: checkIn.reachedMoksha,
    p_habits: checkIn.habits.map((h) => ({
      habit_id: h.habitId,
      kind: h.kind,
      label: h.label,
      done: h.done,
      applied: h.applied,
      amount: h.amount,
      from_square: h.fromSquare,
      to_square: h.toSquare,
    })) satisfies Json,
  };
}

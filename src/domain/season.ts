import { daysBetween, addDays, type LocalDate } from "./dates";

/**
 * active: being played. won: reached Moksha. ended: replaced by a newer
 * season before it was won (kept in history).
 */
export type SeasonStatus = "active" | "won" | "ended";

export interface SeasonCalendar {
  readonly status: SeasonStatus;
  /** Day 1 of the season, in the season's time zone. */
  readonly startDate: LocalDate;
  readonly lengthDays: number;
  readonly wonOnDay: number | null;
  /** The local day the season was ended, if it was ended. */
  readonly endedOn: LocalDate | null;
}

/** Day number of `date` within the season: the start date is day 1. */
export function seasonDay(startDate: LocalDate, date: LocalDate): number {
  return daysBetween(startDate, date) + 1;
}

export function seasonDate(startDate: LocalDate, day: number): LocalDate {
  return addDays(startDate, day - 1);
}

/** Like the stored status, plus "over": still active but all its days have passed. */
export type SeasonPhase = SeasonStatus | "over";

export function seasonPhase(season: SeasonCalendar, today: LocalDate): SeasonPhase {
  if (season.status !== "active") return season.status;
  return seasonDay(season.startDate, today) > season.lengthDays ? "over" : "active";
}

export type CheckInBlocker = "won" | "ended" | "over" | "not-started" | "already-checked-in";

export type CheckInAvailability =
  | { readonly ok: true; readonly day: number }
  | { readonly ok: false; readonly reason: CheckInBlocker; readonly day: number };

/** One check-in per day, only while the season is active and inside its days. */
export function checkInAvailability(
  season: SeasonCalendar,
  today: LocalDate,
  checkedInToday: boolean,
): CheckInAvailability {
  const day = seasonDay(season.startDate, today);
  const phase = seasonPhase(season, today);
  if (phase !== "active") return { ok: false, reason: phase, day };
  if (day < 1) return { ok: false, reason: "not-started", day };
  if (checkedInToday) return { ok: false, reason: "already-checked-in", day };
  return { ok: true, day };
}

/** The day shown for the season, e.g. on the share card: capped to the season. */
export function displayDay(season: SeasonCalendar, today: LocalDate): number {
  if (season.status === "won" && season.wonOnDay) return season.wonOnDay;
  const lastDay = season.endedOn ? seasonDay(season.startDate, season.endedOn) : seasonDay(season.startDate, today);
  return Math.min(Math.max(lastDay, 1), season.lengthDays);
}

export type TimelineState = "checked-in" | "missed" | "today";

export interface TimelineDay<T> {
  readonly day: number;
  readonly date: LocalDate;
  readonly state: TimelineState;
  readonly checkIn: T | null;
}

/**
 * Every day of the season so far, oldest first. A day without a check-in is
 * "missed" (no dice that day, no other penalty), except today, which is still open.
 */
export function seasonTimeline<T extends { readonly dayNumber: number }>(
  season: SeasonCalendar,
  checkIns: readonly T[],
  today: LocalDate,
): TimelineDay<T>[] {
  const byDay = new Map(checkIns.map((c) => [c.dayNumber, c]));
  const lastCheckInDay = Math.max(0, ...checkIns.map((c) => c.dayNumber));

  let lastDay: number;
  let openDay: number | null = null;
  if (season.status === "won" && season.wonOnDay) {
    lastDay = season.wonOnDay;
  } else if (season.status === "ended" && season.endedOn) {
    // The day it was ended only counts if the player checked in before ending it.
    const endDay = seasonDay(season.startDate, season.endedOn);
    lastDay = Math.max(endDay - 1, lastCheckInDay);
  } else {
    const todayDay = seasonDay(season.startDate, today);
    lastDay = todayDay;
    if (todayDay <= season.lengthDays && !byDay.has(todayDay)) openDay = todayDay;
  }
  lastDay = Math.min(lastDay, season.lengthDays);

  const days: TimelineDay<T>[] = [];
  for (let day = 1; day <= lastDay; day++) {
    const checkIn = byDay.get(day) ?? null;
    const state: TimelineState = checkIn ? "checked-in" : day === openDay ? "today" : "missed";
    days.push({ day, date: seasonDate(season.startDate, day), state, checkIn });
  }
  return days;
}

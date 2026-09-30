import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isLocalDate, isValidTimeZone, localDateIn } from "@/domain/dates";
import {
  checkInAvailability,
  displayDay,
  seasonDay,
  seasonPhase,
  seasonTimeline,
  type SeasonCalendar,
} from "@/domain/season";

describe("local dates", () => {
  it("uses the player's own time zone to decide what day it is", () => {
    const instant = new Date("2026-09-30T20:30:00Z");
    expect(localDateIn("UTC", instant)).toBe("2026-09-30");
    expect(localDateIn("Asia/Kolkata", instant)).toBe("2026-10-01"); // 02:00 next day
    expect(localDateIn("America/Los_Angeles", instant)).toBe("2026-09-30");
  });

  it("counts days across month, year and daylight-saving boundaries", () => {
    expect(daysBetween("2026-09-30", "2026-10-01")).toBe(1);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-03-01", "2026-03-31")).toBe(30);
    expect(daysBetween("2026-10-01", "2026-09-30")).toBe(-1);
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-09-30", 29)).toBe("2026-10-29");
  });

  it("validates dates and time zones", () => {
    expect(isLocalDate("2026-02-29")).toBe(false);
    expect(isLocalDate("2028-02-29")).toBe(true);
    expect(isLocalDate("2026-9-3")).toBe(false);
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

const season = (overrides: Partial<SeasonCalendar> = {}): SeasonCalendar => ({
  status: "active",
  startDate: "2026-09-01",
  lengthDays: 30,
  wonOnDay: null,
  endedOn: null,
  ...overrides,
});

describe("season days", () => {
  it("numbers the start date as day 1", () => {
    expect(seasonDay("2026-09-01", "2026-09-01")).toBe(1);
    expect(seasonDay("2026-09-01", "2026-09-30")).toBe(30);
  });

  it("is over after its 30th day unless it was won", () => {
    expect(seasonPhase(season(), "2026-09-30")).toBe("active");
    expect(seasonPhase(season(), "2026-10-01")).toBe("over");
    expect(seasonPhase(season({ status: "won", wonOnDay: 20 }), "2026-10-05")).toBe("won");
  });
});

describe("check-in availability", () => {
  it("allows one check-in per day", () => {
    expect(checkInAvailability(season(), "2026-09-05", false)).toEqual({ ok: true, day: 5 });
    expect(checkInAvailability(season(), "2026-09-05", true)).toEqual({
      ok: false,
      reason: "already-checked-in",
      day: 5,
    });
  });

  it("allows checking in after missed days, with no penalty", () => {
    // Nothing on days 2–9: day 10 is just a normal day.
    expect(checkInAvailability(season(), "2026-09-10", false)).toEqual({ ok: true, day: 10 });
  });

  it("allows the last day and blocks the day after", () => {
    expect(checkInAvailability(season(), "2026-09-30", false).ok).toBe(true);
    expect(checkInAvailability(season(), "2026-10-01", false)).toMatchObject({ ok: false, reason: "over" });
  });

  it("blocks won and ended seasons", () => {
    expect(checkInAvailability(season({ status: "won", wonOnDay: 3 }), "2026-09-05", false)).toMatchObject({
      reason: "won",
    });
    expect(checkInAvailability(season({ status: "ended", endedOn: "2026-09-04" }), "2026-09-05", false)).toMatchObject({
      reason: "ended",
    });
  });

  it("blocks days before the season started (e.g. after a time-zone change)", () => {
    expect(checkInAvailability(season(), "2026-08-31", false)).toMatchObject({ ok: false, reason: "not-started" });
  });
});

describe("displayDay", () => {
  it("shows today's day, the winning day, or the last day", () => {
    expect(displayDay(season(), "2026-09-12")).toBe(12);
    expect(displayDay(season({ status: "won", wonOnDay: 26 }), "2026-10-20")).toBe(26);
    expect(displayDay(season(), "2026-11-20")).toBe(30);
    expect(displayDay(season({ status: "ended", endedOn: "2026-09-08" }), "2026-11-20")).toBe(8);
  });
});

describe("seasonTimeline", () => {
  const checkIns = [{ dayNumber: 1 }, { dayNumber: 2 }, { dayNumber: 4 }];

  it("marks missed days and leaves today open", () => {
    const days = seasonTimeline(season(), checkIns, "2026-09-05");
    expect(days.map((d) => [d.day, d.state])).toEqual([
      [1, "checked-in"],
      [2, "checked-in"],
      [3, "missed"],
      [4, "checked-in"],
      [5, "today"],
    ]);
    expect(days[2].date).toBe("2026-09-03");
  });

  it("stops at the winning day", () => {
    const days = seasonTimeline(season({ status: "won", wonOnDay: 4 }), checkIns, "2026-09-20");
    expect(days.map((d) => d.day)).toEqual([1, 2, 3, 4]);
  });

  it("stops at the season's length once it is over", () => {
    const days = seasonTimeline(season(), checkIns, "2026-10-15");
    expect(days).toHaveLength(30);
    expect(days.at(-1)?.state).toBe("missed");
  });

  it("does not count the day a season was ended as missed", () => {
    const days = seasonTimeline(season({ status: "ended", endedOn: "2026-09-06" }), checkIns, "2026-09-20");
    expect(days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
  });
});

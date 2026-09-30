import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "@/domain";
import {
  toCheckInRecord,
  toRecordCheckInArgs,
  toSeasonRecord,
  type CheckInRow,
  type SeasonRow,
} from "@/infrastructure/supabase/mappers";

const seasonRow: SeasonRow = {
  id: "s1",
  user_id: "u1",
  number: 2,
  status: "ended",
  start_date: "2026-09-01",
  time_zone: "Asia/Kolkata",
  length_days: 30,
  current_square: 42,
  won_on_day: null,
  ended_at: "2026-09-10T05:00:00+00:00",
  rules: { ...DEFAULT_RULES, diceFaces: 6 },
  created_at: "2026-09-01T00:00:00+00:00",
  habits: [
    { id: "b0", season_id: "s1", user_id: "u1", kind: "bad", label: "Reels", slot: 0, created_at: "" },
    { id: "g1", season_id: "s1", user_id: "u1", kind: "good", label: "Read", slot: 1, created_at: "" },
    { id: "g0", season_id: "s1", user_id: "u1", kind: "good", label: "Gym", slot: 0, created_at: "" },
  ],
};

describe("Supabase row mappers", () => {
  it("maps a season row with its habits in board order", () => {
    const season = toSeasonRecord(seasonRow);
    expect(season).toMatchObject({
      id: "s1",
      userId: "u1",
      number: 2,
      status: "ended",
      startDate: "2026-09-01",
      timeZone: "Asia/Kolkata",
      currentSquare: 42,
      endedAt: new Date("2026-09-10T05:00:00Z"),
    });
    expect(season.rules.diceFaces).toBe(6);
    expect(season.habits.map((h) => h.id)).toEqual(["g0", "g1", "b0"]);
  });

  it("falls back to the default rules for a broken snapshot and rejects unknown values", () => {
    expect(toSeasonRecord({ ...seasonRow, rules: "nonsense" }).rules).toEqual(DEFAULT_RULES);
    expect(() => toSeasonRecord({ ...seasonRow, status: "paused" })).toThrow();
  });

  it("maps a check-in with its habits in board order", () => {
    const row: CheckInRow = {
      id: "c1",
      season_id: "s1",
      user_id: "u1",
      local_date: "2026-09-02",
      day_number: 2,
      roll: 3,
      start_square: 10,
      end_square: 9,
      reached_moksha: false,
      created_at: "2026-09-02T06:00:00+00:00",
      check_in_habits: [
        { check_in_id: "c1", habit_id: "b0", user_id: "u1", kind: "bad", label: "Reels", done: true, applied: true, amount: 6, from_square: 15, to_square: 9, habits: { slot: 0 } },
        { check_in_id: "c1", habit_id: "g1", user_id: "u1", kind: "good", label: "Read", done: false, applied: false, amount: 3, from_square: null, to_square: null, habits: { slot: 1 } },
        { check_in_id: "c1", habit_id: "g0", user_id: "u1", kind: "good", label: "Gym", done: true, applied: true, amount: 3, from_square: 13, to_square: 16, habits: { slot: 0 } },
      ],
    };
    const checkIn = toCheckInRecord(row);
    expect(checkIn).toMatchObject({ id: "c1", dayNumber: 2, roll: 3, startSquare: 10, endSquare: 9 });
    expect(checkIn.habits.map((h) => h.habitId)).toEqual(["g0", "g1", "b0"]);
    expect(checkIn.habits[2]).toEqual({
      habitId: "b0",
      kind: "bad",
      label: "Reels",
      done: true,
      applied: true,
      amount: 6,
      fromSquare: 15,
      toSquare: 9,
    });
  });

  it("builds the record_check_in arguments", () => {
    const args = toRecordCheckInArgs("u1", {
      seasonId: "s1",
      localDate: "2026-09-02",
      dayNumber: 2,
      roll: 3,
      startSquare: 10,
      endSquare: 13,
      reachedMoksha: false,
      habits: [{ habitId: "g0", kind: "good", label: "Gym", done: false, applied: false, amount: 3, fromSquare: null, toSquare: null }],
    });
    expect(args).toEqual({
      p_user_id: "u1",
      p_season_id: "s1",
      p_local_date: "2026-09-02",
      p_day_number: 2,
      p_roll: 3,
      p_start_square: 10,
      p_end_square: 13,
      p_reached_moksha: false,
      p_habits: [{ habit_id: "g0", kind: "good", label: "Gym", done: false, applied: false, amount: 3, from_square: null, to_square: null }],
    });
  });
});

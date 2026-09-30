import { describe, expect, it } from "vitest";
import {
  GameError,
  checkIn,
  loadBoard,
  loadHistory,
  loadShareCard,
  movesOfCheckIn,
  startSeason,
  type GameDeps,
  type SeasonRecord,
} from "@/application";
import { DEFAULT_RULES, type HabitKind } from "@/domain";
import { MemoryGameRepository } from "@/infrastructure/memory/memory-repository";
import { ScriptedDice, TestClock } from "../support/fakes";

const GOOD = ["Went to the gym", "Read 20 pages", "Slept before 11"];
const BAD = ["Scrolled reels 2+ hours", "Skipped workout", "Stayed up past 1am"];
const USER = "user-1";

function setup(startIso = "2026-09-01T09:00:00Z") {
  const clock = new TestClock(new Date(startIso));
  const dice = new ScriptedDice();
  const repo = new MemoryGameRepository(clock);
  const deps: GameDeps = { repo, clock, dice };
  return { clock, dice, repo, deps };
}

const habitId = (season: SeasonRecord, kind: HabitKind, slot: number) =>
  season.habits.find((h) => h.kind === kind && h.slot === slot)!.id;

async function expectGameError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(GameError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe("startSeason", () => {
  it("creates season 1 on the player's local day, with habits in board order", async () => {
    const { deps } = setup("2026-09-01T20:00:00Z");
    const season = await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "Asia/Kolkata" });
    expect(season).toMatchObject({
      number: 1,
      status: "active",
      startDate: "2026-09-02", // already the 2nd in India
      timeZone: "Asia/Kolkata",
      lengthDays: 30,
      currentSquare: 1,
      rules: DEFAULT_RULES,
    });
    expect(season.habits.map((h) => [h.kind, h.slot, h.label])).toEqual([
      ["good", 0, GOOD[0]],
      ["good", 1, GOOD[1]],
      ["good", 2, GOOD[2]],
      ["bad", 0, BAD[0]],
      ["bad", 1, BAD[1]],
      ["bad", 2, BAD[2]],
    ]);
  });

  it("rejects boards that break the habit rules", async () => {
    const { deps } = setup();
    const attempt = startSeason(deps, USER, { good: GOOD.slice(0, 2), bad: BAD, timeZone: "UTC" });
    await expectGameError(attempt, "invalid-habits");
    await expect(attempt).rejects.toMatchObject({ problems: [{ code: "too-few", kind: "good" }] });
  });

  it("rejects unknown time zones", async () => {
    const { deps } = setup();
    await expectGameError(startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "Nowhere/Land" }), "invalid-time-zone");
  });

  it("ends the active season, keeping it in history, when a new one starts", async () => {
    const { deps, clock, repo } = setup();
    const first = await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });
    await checkIn(deps, USER, { seasonId: first.id, doneHabitIds: [] });
    clock.advanceDays(3);
    const second = await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });

    expect(second).toMatchObject({ number: 2, status: "active", startDate: "2026-09-04" });
    expect(await repo.getSeason(USER, first.id)).toMatchObject({ status: "ended", endedAt: clock.now() });
    expect(await repo.listCheckIns(USER, [first.id])).toHaveLength(1);
  });

  it("leaves a won season marked as won", async () => {
    const { deps, dice, repo } = setup();
    const season = await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });
    await repo.recordCheckIn(USER, {
      seasonId: season.id,
      localDate: "2026-09-01",
      dayNumber: 1,
      roll: 3,
      startSquare: 1,
      endSquare: 100,
      reachedMoksha: true,
      habits: [],
    });
    dice.push(1);
    await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });
    expect(await repo.getSeason(USER, season.id)).toMatchObject({ status: "won", wonOnDay: 1 });
  });
});

describe("loadBoard", () => {
  it("is empty before onboarding", async () => {
    const { deps } = setup();
    expect(await loadBoard(deps, USER)).toBeNull();
  });

  it("shows day 1, an open check-in and every habit's ladder or snake length", async () => {
    const { deps } = setup();
    const season = await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });
    const board = (await loadBoard(deps, USER))!;
    expect(board.day).toBe(1);
    expect(board.phase).toBe("active");
    expect(board.availability).toEqual({ ok: true, day: 1 });
    expect(board.todayCheckIn).toBeNull();
    // 8 squares split over 3 ladders, 18 over 3 snakes.
    expect(season.habits.map((h) => board.amounts[h.id])).toEqual([3, 3, 2, 6, 6, 6]);
  });
});

describe("checkIn", () => {
  async function started() {
    const ctx = setup();
    const season = await startSeason(ctx.deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });
    return { ...ctx, season };
  }

  it("rolls on the server, climbs ladders, slides snakes and saves the day", async () => {
    const { deps, dice, season, repo } = await started();
    dice.push(3);
    const g0 = habitId(season, "good", 0);
    const g2 = habitId(season, "good", 2);
    const b1 = habitId(season, "bad", 1);

    const result = await checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [b1, g2, g0] });

    expect(result.moves).toEqual([
      { kind: "dice", roll: 3, from: 1, to: 4 },
      { kind: "ladder", habitId: g0, amount: 3, from: 4, to: 7 },
      { kind: "ladder", habitId: g2, amount: 2, from: 7, to: 9 },
      { kind: "snake", habitId: b1, amount: 6, from: 9, to: 3 },
    ]);
    expect(result.checkIn).toMatchObject({ dayNumber: 1, localDate: "2026-09-01", roll: 3, startSquare: 1, endSquare: 3 });
    expect(result.checkIn.habits).toHaveLength(6);
    expect(result.checkIn.habits.find((h) => h.habitId === b1)).toEqual({
      habitId: b1,
      kind: "bad",
      label: BAD[1],
      done: true,
      applied: true,
      amount: 6,
      fromSquare: 9,
      toSquare: 3,
    });
    expect(result.checkIn.habits.find((h) => h.habitId === habitId(season, "good", 1))).toMatchObject({
      done: false,
      applied: false,
      fromSquare: null,
    });
    expect((await repo.getSeason(USER, season.id))?.currentSquare).toBe(3);
  });

  it("can rebuild a saved check-in's moves for replays", async () => {
    const { deps, dice, season } = await started();
    dice.push(3);
    const result = await checkIn(deps, USER, {
      seasonId: season.id,
      doneHabitIds: [habitId(season, "bad", 1), habitId(season, "good", 0)],
    });
    expect(movesOfCheckIn(result.checkIn)).toEqual(result.moves);
  });

  it("allows only one check-in per day", async () => {
    const { deps, season } = await started();
    await checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] });
    await expectGameError(checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] }), "already-checked-in");
  });

  it("treats a missed day as just no dice roll that day", async () => {
    const { deps, dice, clock, season } = await started();
    dice.push(2, 2);
    await checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] });
    clock.advanceDays(4); // days 2–4 missed
    const result = await checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] });
    expect(result.checkIn).toMatchObject({ dayNumber: 5, startSquare: 3, endSquare: 5 });
  });

  it("uses the player's time zone to decide when a new day starts", async () => {
    const { deps, clock } = setup("2026-09-01T12:00:00Z");
    const season = await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "Asia/Kolkata" });
    await checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] });
    clock.set("2026-09-01T18:40:00Z"); // 00:10 on 2 September in India
    const result = await checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] });
    expect(result.checkIn).toMatchObject({ dayNumber: 2, localDate: "2026-09-02" });
  });

  it("closes the season after its 30th day", async () => {
    const { deps, clock, season } = await started();
    clock.advanceDays(29);
    await checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] });
    clock.advanceDays(1);
    await expectGameError(checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] }), "over");
    expect((await loadBoard(deps, USER))?.phase).toBe("over");
  });

  it("wins the season on reaching square 100 and records skipped habits", async () => {
    const { deps, dice, clock, season, repo } = await started();
    await repo.recordCheckIn(USER, {
      seasonId: season.id,
      localDate: "2026-09-01",
      dayNumber: 1,
      roll: 1,
      startSquare: 1,
      endSquare: 97,
      reachedMoksha: false,
      habits: [],
    });
    clock.advanceDays(1);
    dice.push(2);
    const g0 = habitId(season, "good", 0);
    const g1 = habitId(season, "good", 1);
    const b0 = habitId(season, "bad", 0);

    const result = await checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [g0, g1, b0] });

    expect(result.reachedMoksha).toBe(true);
    expect(result.skippedHabitIds).toEqual([g1, b0]);
    expect(result.checkIn.habits.find((h) => h.habitId === b0)).toMatchObject({ done: true, applied: false });
    expect(await repo.getSeason(USER, season.id)).toMatchObject({ status: "won", wonOnDay: 2, currentSquare: 100 });

    clock.advanceDays(1);
    await expectGameError(checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] }), "won");
  });

  it("rolls with the dice the season started with, even if the rules change later", async () => {
    const { deps, dice } = setup();
    const season = await startSeason({ ...deps, rules: { ...DEFAULT_RULES, diceFaces: 6 } }, USER, {
      good: GOOD,
      bad: BAD,
      timeZone: "UTC",
    });
    await checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] });
    expect(dice.facesAsked).toEqual([6]);
  });

  it("rejects habits that are not on this season's board", async () => {
    const { deps, season, clock } = await started();
    await expectGameError(checkIn(deps, USER, { seasonId: season.id, doneHabitIds: ["made-up"] }), "unknown-habit");
    clock.advanceDays(1);
    const next = await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });
    await expectGameError(
      checkIn(deps, USER, { seasonId: next.id, doneHabitIds: [habitId(season, "good", 0)] }),
      "unknown-habit",
    );
  });

  it("refuses ended seasons and other players' seasons", async () => {
    const { deps, season } = await started();
    await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });
    await expectGameError(checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [] }), "ended");
    await expectGameError(checkIn(deps, "someone-else", { seasonId: season.id, doneHabitIds: [] }), "season-not-found");
  });

  it("reports a stale board when the pawn moved in between", async () => {
    const { deps, season, repo } = await started();
    const stale = { ...deps, repo: Object.assign(Object.create(repo), { recordCheckIn: async () => ({ ok: false, reason: "stale" }) }) };
    await expectGameError(checkIn(stale, USER, { seasonId: season.id, doneHabitIds: [] }), "stale");
  });
});

describe("loadHistory", () => {
  it("lists seasons newest first with a day-by-day timeline", async () => {
    const { deps, dice, clock } = setup();
    const first = await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });
    dice.push(3, 1);
    await checkIn(deps, USER, { seasonId: first.id, doneHabitIds: [habitId(first, "good", 0)] });
    clock.advanceDays(2);
    await checkIn(deps, USER, { seasonId: first.id, doneHabitIds: [] });
    clock.advanceDays(1);
    await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });

    const history = await loadHistory(deps, USER);
    expect(history.map((h) => [h.season.number, h.phase])).toEqual([
      [2, "active"],
      [1, "ended"],
    ]);
    expect(history[0].days.map((d) => d.state)).toEqual(["today"]);
    expect(history[1].days.map((d) => [d.day, d.state, d.checkIn?.endSquare ?? null])).toEqual([
      [1, "checked-in", 7],
      [2, "missed", null],
      [3, "checked-in", 8],
    ]);
    expect(history[1]).toMatchObject({ checkedInDays: 2, missedDays: 1, day: 4 });
    expect(history[0].day).toBe(1);
  });

  it("is empty for a new player", async () => {
    const { deps } = setup();
    expect(await loadHistory(deps, USER)).toEqual([]);
  });
});

describe("loadShareCard", () => {
  it("shows the day, the square and the biggest ladder and snake", async () => {
    const { deps, dice, clock } = setup();
    const season = await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });
    dice.push(2, 2, 2);
    await checkIn(deps, USER, { seasonId: season.id, doneHabitIds: [habitId(season, "good", 1)] });
    clock.advanceDays(1);
    await checkIn(deps, USER, {
      seasonId: season.id,
      doneHabitIds: [habitId(season, "good", 1), habitId(season, "good", 0), habitId(season, "bad", 2)],
    });
    clock.advanceDays(9);

    const card = await loadShareCard(deps, USER, season.id);
    expect(card).toMatchObject({
      seasonNumber: 1,
      day: 11,
      won: false,
      biggestLadder: { label: GOOD[1], squares: 6 },
      biggestSnake: { label: BAD[2], squares: 6 },
    });
    // Day 1: 1 +2 dice +3 = 6. Day 2: +2 dice = 8, +3 = 11, +3 = 14, −6 = 8.
    expect(card?.square).toBe(8);
  });

  it("only shows the player's own seasons", async () => {
    const { deps } = setup();
    const season = await startSeason(deps, USER, { good: GOOD, bad: BAD, timeZone: "UTC" });
    expect(await loadShareCard(deps, "someone-else", season.id)).toBeNull();
  });
});

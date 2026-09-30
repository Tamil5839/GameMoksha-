import { describe, expect, it } from "vitest";
import { FINAL_SQUARE, START_SQUARE } from "@/domain/board/geometry";
import { DEFAULT_RULES, ORIGINAL_BRIEF_RULES } from "@/domain/rules";
import { PLAYER_PROFILES, makeBoard, simulate } from "@/domain/simulation";

/**
 * Balance target: a player who does most good habits and few bad ones
 * reaches Moksha in about 25–30 days. Each case plays 2,000 seeded seasons.
 */
const RUNS = 2000;
const HABIT_COUNTS = [3, 4, 5, 6];

describe("balance with the default rules", () => {
  it.each(HABIT_COUNTS.flatMap((good) => HABIT_COUNTS.map((bad) => [good, bad])))(
    "a typical player (75%% of good habits, 25%% of bad) reaches Moksha in 25–30 days with %i good / %i bad habits",
    (good, bad) => {
      const result = simulate(DEFAULT_RULES, PLAYER_PROFILES.typical, makeBoard(good, bad), { runs: RUNS, seed: 42 });
      expect(result.medianDays).toBeGreaterThanOrEqual(25);
      expect(result.medianDays).toBeLessThanOrEqual(30);
      // Most typical players win their season, but it is not a given.
      expect(result.winRate).toBeGreaterThan(0.6);
      expect(result.winRate).toBeLessThan(0.9);
    },
  );

  it("never lets a player win on dice alone within a season", () => {
    // Even rolling the top face every single day falls short of square 100.
    const bestDiceOnlySquare = START_SQUARE + DEFAULT_RULES.diceFaces * DEFAULT_RULES.seasonLengthDays;
    expect(bestDiceOnlySquare).toBeLessThan(FINAL_SQUARE);
    const result = simulate(DEFAULT_RULES, PLAYER_PROFILES.diceOnly, makeBoard(4, 4), { runs: RUNS, maxDays: 30 });
    expect(result.winRate).toBe(0);
  });

  it("rewards a perfect player with a faster win", () => {
    const perfect = simulate(DEFAULT_RULES, PLAYER_PROFILES.perfect, makeBoard(4, 4), { runs: RUNS });
    const typical = simulate(DEFAULT_RULES, PLAYER_PROFILES.typical, makeBoard(4, 4), { runs: RUNS });
    expect(perfect.winRate).toBe(1);
    expect(perfect.medianDays).toBeLessThan(typical.medianDays);
  });

  it("almost never lets a player who mostly does bad habits win", () => {
    const result = simulate(DEFAULT_RULES, PLAYER_PROFILES.struggling, makeBoard(4, 4), { runs: RUNS, maxDays: 30 });
    expect(result.winRate).toBeLessThan(0.05);
  });
});

describe("why the defaults differ from the first brief", () => {
  it("with one dice 1–6, +5 per good habit and −4 per bad habit, a typical player wins in about a week", () => {
    const result = simulate(ORIGINAL_BRIEF_RULES, PLAYER_PROFILES.typical, makeBoard(4, 4), { runs: RUNS });
    expect(result.medianDays).toBeLessThanOrEqual(10);
  });

  it("with those numbers the dice alone nearly wins a season", () => {
    const result = simulate(ORIGINAL_BRIEF_RULES, PLAYER_PROFILES.diceOnly, makeBoard(4, 4), { runs: RUNS });
    expect(result.medianDays).toBeLessThanOrEqual(31);
  });
});

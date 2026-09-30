import { describe, expect, it } from "vitest";
import {
  FINAL_SQUARE,
  cellToSquare,
  isSquare,
  squareCenter,
  squareToCell,
  walk,
} from "@/domain/board/geometry";
import { LADDER_SPOTS, SNAKE_SPOTS, paintBoard } from "@/domain/board/layout";
import { makeBoard } from "@/domain/simulation";

describe("board geometry", () => {
  it("snakes left-right: 1 bottom-left, 11 above 10, 100 top-left", () => {
    expect(squareToCell(1)).toEqual({ row: 0, col: 0 });
    expect(squareToCell(10)).toEqual({ row: 0, col: 9 });
    expect(squareToCell(11)).toEqual({ row: 1, col: 9 });
    expect(squareToCell(20)).toEqual({ row: 1, col: 0 });
    expect(squareToCell(21)).toEqual({ row: 2, col: 0 });
    expect(squareToCell(91)).toEqual({ row: 9, col: 9 });
    expect(squareToCell(100)).toEqual({ row: 9, col: 0 });
  });

  it("maps every square to a unique cell and back", () => {
    const cells = new Set<string>();
    for (let s = 1; s <= FINAL_SQUARE; s++) {
      const cell = squareToCell(s);
      cells.add(`${cell.row},${cell.col}`);
      expect(cellToSquare(cell)).toBe(s);
    }
    expect(cells.size).toBe(100);
  });

  it("puts consecutive squares next to each other", () => {
    for (let s = 1; s < FINAL_SQUARE; s++) {
      const a = squareCenter(s);
      const b = squareCenter(s + 1);
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(100);
    }
  });

  it("uses SVG coordinates with square 100 at the top-left", () => {
    expect(squareCenter(100)).toEqual({ x: 50, y: 50 });
    expect(squareCenter(1)).toEqual({ x: 50, y: 950 });
    expect(squareCenter(10)).toEqual({ x: 950, y: 950 });
  });

  it("rejects squares off the board", () => {
    expect(isSquare(0)).toBe(false);
    expect(isSquare(101)).toBe(false);
    expect(() => squareToCell(0)).toThrow(RangeError);
  });

  it("walks square by square in either direction", () => {
    expect(walk(5, 8)).toEqual([5, 6, 7, 8]);
    expect(walk(8, 5)).toEqual([8, 7, 6, 5]);
    expect(walk(5, 5)).toEqual([5]);
  });
});

describe("board layout", () => {
  it("has six ladders going up and six snakes going down", () => {
    expect(LADDER_SPOTS).toHaveLength(6);
    expect(SNAKE_SPOTS).toHaveLength(6);
    for (const l of LADDER_SPOTS) expect(squareToCell(l.to).row).toBeGreaterThan(squareToCell(l.from).row);
    for (const s of SNAKE_SPOTS) expect(squareToCell(s.head).row).toBeGreaterThan(squareToCell(s.tail).row);
  });

  it("keeps spots off the start and Moksha squares and never shares an end", () => {
    const ends = [...LADDER_SPOTS.flatMap((l) => [l.from, l.to]), ...SNAKE_SPOTS.flatMap((s) => [s.head, s.tail])];
    for (const square of ends) {
      expect(isSquare(square)).toBe(true);
      expect([1, 100]).not.toContain(square);
    }
    expect(new Set(ends).size).toBe(ends.length);
  });

  it("paints each habit on the spot for its slot", () => {
    const { ladders, snakes } = paintBoard(makeBoard(3, 5));
    expect(ladders.map((l) => [l.habit.slot, l.from])).toEqual([
      [0, LADDER_SPOTS[0].from],
      [1, LADDER_SPOTS[1].from],
      [2, LADDER_SPOTS[2].from],
    ]);
    expect(snakes).toHaveLength(5);
    expect(snakes[4].head).toBe(SNAKE_SPOTS[4].head);
  });
});

import { describe, expect, it } from "vitest";
import { gridLines, ladderShape, shortLabel, smoothPath, snakeShape, wobblyLine } from "@/components/board/shapes";

describe("board shapes", () => {
  it("draws a ladder with two rails and rungs in between", () => {
    const ladder = ladderShape({ x: 0, y: 400 }, { x: 0, y: 0 }, 30, 40);
    expect(ladder.rails[0]).toBe("M15 400 L15 0");
    expect(ladder.rails[1]).toBe("M-15 400 L-15 0");
    expect(ladder.rungs).toHaveLength(9);
    expect(ladder.angle).toBe(-90);
  });

  it("always gives a short ladder at least one rung", () => {
    expect(ladderShape({ x: 0, y: 0 }, { x: 50, y: 0 }).rungs).toHaveLength(1);
  });

  it("starts a snake at its head and ends it at its tail", () => {
    const snake = snakeShape({ x: 100, y: 100 }, { x: 300, y: 700 });
    expect(snake.points[0]).toEqual({ x: 100, y: 100 });
    const last = snake.points.at(-1)!;
    expect(last.x).toBeCloseTo(300, 5);
    expect(last.y).toBeCloseTo(700, 5);
    expect(snake.body.startsWith("M100 100 C")).toBe(true);
  });

  it("draws smooth and hand-drawn lines deterministically", () => {
    expect(smoothPath([{ x: 0, y: 0 }])).toBe("");
    expect(wobblyLine({ x: 0, y: 0 }, { x: 100, y: 0 }, 7)).toBe(wobblyLine({ x: 0, y: 0 }, { x: 100, y: 0 }, 7));
    expect(gridLines()).toHaveLength(22);
  });

  it("shortens long labels at a word boundary", () => {
    expect(shortLabel("Read 20 pages")).toBe("Read 20 pages");
    expect(shortLabel("Practised guitar for 30 minutes")).toBe("Practised…");
    expect(shortLabel("Supercalifragilisticexpialidocious")).toBe("Supercalifragil…");
    expect([...shortLabel("🧘".repeat(30))]).toHaveLength(16);
  });
});

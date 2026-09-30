/**
 * Board drawings as plain path data, so the React board and the share-card
 * image (an SVG string) draw exactly the same ladders, snakes, lotus and pawn.
 */
import { squareOrigin, FINAL_SQUARE, type Point } from "@/domain";
import { BOARD_COLORS as C, snakeColors } from "./palette";
import { gridLines, ladderShape, snakeOutline, snakeShape } from "./shapes";

export interface Prim {
  readonly d: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly dash?: string;
  readonly opacity?: number;
  readonly transform?: string;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function circlePath(cx: number, cy: number, rx: number, ry = rx): string {
  return `M${r1(cx - rx)} ${r1(cy)} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;
}

export function gridPrims(): Prim[] {
  return gridLines().map((d) => ({ d, stroke: C.grid, strokeWidth: 3, opacity: 0.75 }));
}

export function ladderPrims(foot: Point, top: Point, glow = false): Prim[] {
  const { rails, rungs } = ladderShape(foot, top, 34, 40);
  return [
    ...(glow ? [{ d: `M${foot.x} ${foot.y} L${top.x} ${top.y}`, stroke: C.ladderGlow, strokeWidth: 78, opacity: 0.6 }] : []),
    ...[...rails, ...rungs].map((d, i) => ({ d, stroke: "#4a2c10", strokeWidth: i < 2 ? 12 : 9 })),
    ...rungs.map((d) => ({ d, stroke: C.bambooLight, strokeWidth: 5 })),
    ...rails.flatMap((d) => [
      { d, stroke: C.bamboo, strokeWidth: 7.5 },
      { d, stroke: "#5a3712", strokeWidth: 7.5, dash: "3 44" },
    ]),
  ];
}

const SNAKE_HEAD = "M-10 -18 C12 -24 34 -12 36 0 C34 12 12 24 -10 18 C-4 8 -4 -8 -10 -18 Z";

export function snakePrims(head: Point, tail: Point, slot: number, glow = false): Prim[] {
  const shape = snakeShape(head, tail);
  const colors = snakeColors(slot);
  const at = `translate(${r1(shape.head.x)} ${r1(shape.head.y)}) rotate(${r1(shape.headAngle)}) scale(1.15)`;
  return [
    ...(glow ? [{ d: shape.body, stroke: "#f08a6c", strokeWidth: 74, opacity: 0.5 }] : []),
    { d: snakeOutline(shape.points, 32, 6), fill: colors.body, stroke: colors.belly, strokeWidth: 4 },
    { d: shape.body, stroke: colors.spots, strokeWidth: 7, dash: "3 17" },
    { d: "M34 0 L50 0 M50 0 L57 -6 M50 0 L57 6", stroke: "#c2412b", strokeWidth: 3.5, transform: at },
    { d: SNAKE_HEAD, fill: colors.body, stroke: colors.belly, strokeWidth: 4, transform: at },
    { d: circlePath(15, -9, 5.5), fill: "#fff8e7", transform: at },
    { d: circlePath(16.5, -9, 2.8), fill: "#1a0f08", transform: at },
    { d: circlePath(15, 9, 5.5), fill: "#fff8e7", transform: at },
    { d: circlePath(16.5, 9, 2.8), fill: "#1a0f08", transform: at },
  ];
}

const PETAL = "M0 -34 C9 -22 9 -6 0 6 C-9 -6 -9 -22 0 -34 Z";

export function lotusPrims(x: number, y: number, scale = 1): Prim[] {
  const at = (angle: number) => `translate(${x} ${y}) scale(${scale}) rotate(${angle} 0 6)`;
  const petal = (angle: number, fill: string): Prim => ({ d: PETAL, fill, stroke: "#93301f", strokeWidth: 2.5, transform: at(angle) });
  return [petal(-62, "#f4b983"), petal(62, "#f4b983"), petal(-31, "#e8793f"), petal(31, "#e8793f"), petal(0, "#c2412b")];
}

/** The lotus on the Moksha square. */
export function mokshaLotusPrims(): Prim[] {
  const { x, y } = squareOrigin(FINAL_SQUARE);
  return lotusPrims(x + 58, y + 56, 0.95);
}

/** A painted wooden pawn standing on (x, y). */
export function pawnPrims(x = 0, y = 0, scale = 1.3): Prim[] {
  const at = `translate(${r1(x)} ${r1(y)}) scale(${scale})`;
  return [
    { d: circlePath(0, 14, 24, 8), fill: "#3a2314", opacity: 0.35, transform: at },
    {
      d: "M-21 13 C-21 2 -10 -5 -8 -13 C-17 -18 -17 -38 0 -41 C17 -38 17 -18 8 -13 C10 -5 21 2 21 13 Z",
      fill: C.pawn,
      stroke: C.pawnDeep,
      strokeWidth: 3.5,
      transform: at,
    },
    { d: "M-15 5 H15", stroke: C.moksha, strokeWidth: 4, transform: at },
    { d: circlePath(-5, -30, 4, 6), fill: "#fff8e7", opacity: 0.55, transform: at },
  ];
}

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Serialises primitives into a standalone SVG document. */
export function primsToSvg(prims: readonly Prim[], viewBox = "0 0 1000 1000"): string {
  const paths = prims
    .map((p) => {
      const attrs = [
        `d="${escapeAttr(p.d)}"`,
        `fill="${escapeAttr(p.fill ?? "none")}"`,
        p.stroke ? `stroke="${escapeAttr(p.stroke)}"` : "",
        p.strokeWidth ? `stroke-width="${p.strokeWidth}"` : "",
        p.dash ? `stroke-dasharray="${p.dash}"` : "",
        p.opacity !== undefined ? `opacity="${p.opacity}"` : "",
        p.transform ? `transform="${escapeAttr(p.transform)}"` : "",
      ].filter(Boolean);
      return `<path ${attrs.join(" ")}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

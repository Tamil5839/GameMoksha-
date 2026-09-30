/**
 * Pure drawing geometry for the board, shared by the animated web board and
 * the share-card image. Coordinates are board units (the board is 1000×1000).
 */
import { BOARD_COLUMNS, BOARD_SIZE, CELL_SIZE, type Point } from "@/domain";

const round = (n: number) => Math.round(n * 10) / 10;
const pt = (p: Point) => `${round(p.x)} ${round(p.y)}`;

export interface LadderShape {
  readonly rails: readonly [string, string];
  readonly rungs: readonly string[];
  readonly angle: number;
}

/** Two rails and evenly spaced rungs from the foot to the top. */
export function ladderShape(foot: Point, top: Point, width = 30, rungGap = 36): LadderShape {
  const dx = top.x - foot.x;
  const dy = top.y - foot.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * (width / 2);
  const ny = (dx / length) * (width / 2);
  const rail = (side: 1 | -1) =>
    `M${pt({ x: foot.x + side * nx, y: foot.y + side * ny })} L${pt({ x: top.x + side * nx, y: top.y + side * ny })}`;
  const count = Math.max(1, Math.floor(length / rungGap) - 1);
  const rungs = Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1);
    const c = { x: foot.x + dx * t, y: foot.y + dy * t };
    return `M${pt({ x: c.x + nx, y: c.y + ny })} L${pt({ x: c.x - nx, y: c.y - ny })}`;
  });
  return { rails: [rail(1), rail(-1)], rungs, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/** A smooth path through the points (Catmull-Rom converted to cubic Béziers). */
export function smoothPath(points: readonly Point[]): string {
  if (points.length < 2) return "";
  let d = `M${pt(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
}

export interface SnakeShape {
  /** Path of the body from head to tail. */
  readonly body: string;
  /** Points along the body, head first: the pawn slides through them. */
  readonly points: readonly Point[];
  readonly head: Point;
  /** Direction the head faces, in degrees (away from the body). */
  readonly headAngle: number;
}

/** A wavy S-shaped body from the head down to the tail. */
export function snakeShape(head: Point, tail: Point, samples = 40): SnakeShape {
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const amplitude = Math.min(46, 12 + length * 0.1);
  const waves = length > 320 ? 1.5 : 1;
  const points: Point[] = Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples;
    const envelope = Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.15))) ** 0.7;
    const offset = amplitude * envelope * Math.sin(2 * Math.PI * waves * t);
    return { x: head.x + dx * t + nx * offset, y: head.y + dy * t + ny * offset };
  });
  const toward = points[1];
  const headAngle = (Math.atan2(head.y - toward.y, head.x - toward.x) * 180) / Math.PI;
  return { body: smoothPath(points), points, head, headAngle };
}

/** Deterministic PRNG so the hand-drawn wobble is the same on every render. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A slightly wobbly line, as if painted by hand. */
export function wobblyLine(from: Point, to: Point, seed: number, wobble = 3): string {
  const random = seeded(seed);
  const steps = 5;
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const edge = i === 0 || i === steps;
    return {
      x: from.x + (to.x - from.x) * t + (edge ? 0 : (random() - 0.5) * wobble * 2),
      y: from.y + (to.y - from.y) * t + (edge ? 0 : (random() - 0.5) * wobble * 2),
    };
  });
  return smoothPath(points);
}

/** The board's grid lines, painted by hand. */
export function gridLines(): string[] {
  const lines: string[] = [];
  for (let i = 0; i <= BOARD_COLUMNS; i++) {
    const at = i * CELL_SIZE;
    lines.push(wobblyLine({ x: 0, y: at }, { x: BOARD_SIZE, y: at }, 100 + i));
    lines.push(wobblyLine({ x: at, y: 0 }, { x: at, y: BOARD_SIZE }, 200 + i));
  }
  return lines;
}

/** Shortens a label to fit a plaque, preferring to cut between words. */
export function shortLabel(label: string, max = 16): string {
  const chars = [...label];
  if (chars.length <= max) return label;
  const cut = chars.slice(0, max - 1).join("");
  const space = cut.lastIndexOf(" ");
  return `${(space >= max * 0.5 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Points the pawn passes through when it walks from one square centre to the next. */
export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Closed outline of a snake body that tapers from the head to the tail. */
export function snakeOutline(points: readonly Point[], headWidth = 30, tailWidth = 5): string {
  const n = points.length;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;
    const t = i / Math.max(1, n - 1);
    const half = (headWidth + (tailWidth - headWidth) * t ** 1.6) / 2;
    left.push({ x: points[i].x - (dy / length) * half, y: points[i].y + (dx / length) * half });
    right.push({ x: points[i].x + (dy / length) * half, y: points[i].y - (dx / length) * half });
  }
  return `${smoothPath(left)} ${smoothPath([...right].reverse()).replace(/^M/, "L")} Z`;
}

function quadratic(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

export interface ArcLadderShape {
  readonly rails: readonly [string, string];
  readonly rungs: readonly string[];
  /** Centre line of the ladder, foot first: the pawn climbs along it. */
  readonly path: readonly Point[];
}

/**
 * A ladder that arcs upwards between two squares, so even a short climb
 * along one row reads as a climb. Tall climbs stay almost straight.
 */
export function arcLadderShape(foot: Point, top: Point, width = 34, rungGap = 36): ArcLadderShape {
  const dx = top.x - foot.x;
  const dy = top.y - foot.y;
  const length = Math.hypot(dx, dy) || 1;
  const flatness = Math.abs(dx) / length;
  const bulge = Math.min(150, 40 + length * 0.35) * flatness;
  const control = { x: (foot.x + top.x) / 2, y: (foot.y + top.y) / 2 - bulge };
  const samples = 28;
  const path = Array.from({ length: samples + 1 }, (_, i) => quadratic(foot, control, top, i / samples));

  const normals = path.map((_, i) => {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(samples, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const l = Math.hypot(tx, ty) || 1;
    return { x: (-ty / l) * (width / 2), y: (tx / l) * (width / 2) };
  });
  const left = path.map((p, i) => ({ x: p.x + normals[i].x, y: p.y + normals[i].y }));
  const right = path.map((p, i) => ({ x: p.x - normals[i].x, y: p.y - normals[i].y }));

  const distances = [0];
  for (let i = 1; i < path.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  }
  const total = distances[distances.length - 1];
  const count = Math.max(1, Math.floor(total / rungGap) - 1);
  const rungs = Array.from({ length: count }, (_, k) => {
    const target = ((k + 1) / (count + 1)) * total;
    const i = Math.max(1, distances.findIndex((d) => d >= target));
    const t = (target - distances[i - 1]) / (distances[i] - distances[i - 1] || 1);
    return `M${pt(lerp(left[i - 1], left[i], t))} L${pt(lerp(right[i - 1], right[i], t))}`;
  });
  return { rails: [smoothPath(left), smoothPath(right)], rungs, path };
}

import {
  BOARD_SIZE,
  CELL_SIZE,
  FINAL_SQUARE,
  START_SQUARE,
  paintBoard,
  squareCenter,
  squareOrigin,
  squareToCell,
  type Habit,
  type Point,
} from "@/domain";
import { BOARD_COLORS as C, squareTint } from "./palette";
import { gridPrims, ladderPrims, mokshaLotusPrims, snakePrims, type Prim } from "./primitives";
import { shortLabel } from "./shapes";

/** The frame adds a painted band around the 1000×1000 board. */
export const BOARD_VIEWBOX = "-40 -40 1080 1080";

export interface BoardHabit extends Habit {
  /** Squares this habit's ladder climbs or snake slides. */
  readonly amount: number;
}

const GRID = gridPrims();
const LOTUS = mokshaLotusPrims();

/** Renders drawing primitives (shared with the share-card image). */
export function Prims({ prims }: { prims: readonly Prim[] }) {
  return (
    <>
      {prims.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? "none"}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          strokeDasharray={p.dash}
          opacity={p.opacity}
          transform={p.transform}
        />
      ))}
    </>
  );
}

function Frame({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <pattern id={`${id}-band`} width="26" height="26" patternUnits="userSpaceOnUse">
          <rect width="26" height="26" fill={C.frameBand} />
          <path d="M0 26 L13 13 L26 26 Z M0 0 L13 13 L26 0 Z" fill={C.frameMotif} />
          <circle cx="13" cy="13" r="3" fill={C.frame} />
        </pattern>
      </defs>
      <rect x={-40} y={-40} width={1080} height={1080} rx={26} fill={C.frame} />
      <rect x={-30} y={-30} width={1060} height={1060} rx={18} fill={`url(#${id}-band)`} />
      <rect x={-8} y={-8} width={1016} height={1016} rx={6} fill={C.frame} />
    </g>
  );
}

function Squares() {
  const squares = Array.from({ length: FINAL_SQUARE }, (_, i) => i + 1);
  return (
    <g>
      {squares.map((square) => {
        const { x, y } = squareOrigin(square);
        const { row, col } = squareToCell(square);
        const fill = square === FINAL_SQUARE ? C.moksha : square === START_SQUARE ? C.start : squareTint(row, col);
        return <rect key={square} x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill={fill} />;
      })}
      <g className="font-hand" fontWeight={700} fill={C.ink}>
        {squares.map((square) => {
          const { x, y } = squareOrigin(square);
          return (
            <text key={square} x={x + 9} y={y + 29} fontSize={26} opacity={0.82}>
              {square}
            </text>
          );
        })}
      </g>
      <Prims prims={LOTUS} />
      <text
        x={squareCenter(FINAL_SQUARE).x}
        y={squareOrigin(FINAL_SQUARE).y + 92}
        textAnchor="middle"
        className="font-display"
        fontSize={19}
        fill={C.frame}
      >
        Moksha
      </text>
      <text
        x={squareCenter(START_SQUARE).x}
        y={squareOrigin(START_SQUARE).y + 88}
        textAnchor="middle"
        className="font-display"
        fontSize={19}
        fill={C.good}
      >
        Start
      </text>
      <Prims prims={GRID} />
    </g>
  );
}

/** Where a habit's plaque sits: at the ladder's foot, or just below the snake's head. */
export function plaqueAnchor(kind: Habit["kind"], at: Point): Point {
  return kind === "good" ? { x: at.x, y: at.y + 26 } : { x: at.x, y: at.y + 40 };
}

/** Plaque width in board units, and the label shown on it. */
export function plaqueLayout(habit: BoardHabit) {
  const text = shortLabel(habit.label, 15);
  const width = Math.min(300, [...text].length * 13.5 + 70);
  return { text, width, badge: `${habit.kind === "good" ? "+" : "−"}${habit.amount}` };
}

/** Keeps a plaque inside the board. */
export function clampPlaqueX(x: number, width: number): number {
  return Math.min(Math.max(x, width / 2 + 6), BOARD_SIZE - width / 2 - 6);
}

function Plaque({ at, habit }: { at: Point; habit: BoardHabit }) {
  const { text, width, badge } = plaqueLayout(habit);
  const x = clampPlaqueX(at.x, width);
  const color = habit.kind === "good" ? C.good : C.bad;
  return (
    <g transform={`translate(${x} ${at.y})`}>
      <title>{`${habit.label} (${badge})`}</title>
      <rect x={-width / 2} y={-21} width={width} height={42} rx={13} fill={C.plaque} stroke={color} strokeWidth={3.5} />
      <text x={-width / 2 + 13} y={8} className="font-hand" fontWeight={700} fontSize={24} fill={C.ink}>
        {text}
      </text>
      <rect x={width / 2 - 46} y={-15} width={38} height={30} rx={10} fill={color} />
      <text x={width / 2 - 27} y={7} textAnchor="middle" fontWeight={700} fontSize={20} fill="#fff8e7">
        {badge}
      </text>
    </g>
  );
}

/**
 * The static painted board: squares, hand-drawn grid, each habit's ladder
 * or snake, and plaques with the player's own labels.
 */
export function BoardArt({
  habits,
  highlight = null,
  id = "board",
}: {
  habits: readonly BoardHabit[];
  highlight?: string | null;
  id?: string;
}) {
  const { ladders, snakes } = paintBoard(habits);
  const byId = new Map(habits.map((h) => [h.id, h]));
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <Frame id={id} />
      <Squares />
      {ladders.map((l) => (
        <Prims key={l.habit.id} prims={ladderPrims(squareCenter(l.from), squareCenter(l.to), highlight === l.habit.id)} />
      ))}
      {snakes.map((s) => (
        <Prims
          key={s.habit.id}
          prims={snakePrims(squareCenter(s.head), squareCenter(s.tail), s.habit.slot, highlight === s.habit.id)}
        />
      ))}
      {ladders.map((l) => (
        <Plaque key={l.habit.id} at={plaqueAnchor("good", squareCenter(l.from))} habit={byId.get(l.habit.id)!} />
      ))}
      {snakes.map((s) => (
        <Plaque key={s.habit.id} at={plaqueAnchor("bad", squareCenter(s.head))} habit={byId.get(s.habit.id)!} />
      ))}
    </g>
  );
}

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
import { BOARD_COLORS as C, snakeColors, squareTint } from "./palette";
import { gridLines, ladderShape, shortLabel, snakeOutline, snakeShape } from "./shapes";

/** The frame adds a painted band around the 1000×1000 board. */
export const BOARD_VIEWBOX = "-40 -40 1080 1080";

export interface BoardHabit extends Habit {
  /** Squares this habit's ladder climbs or snake slides. */
  readonly amount: number;
}

const GRID = gridLines();
const PETAL = "M0 -34 C9 -22 9 -6 0 6 C-9 -6 -9 -22 0 -34 Z";

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

function LotusGlyph({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke="#93301f" strokeWidth={2.5} strokeLinejoin="round">
      {[-62, 62].map((a) => (
        <path key={a} d={PETAL} fill="#f4b983" transform={`rotate(${a} 0 6)`} />
      ))}
      {[-31, 31].map((a) => (
        <path key={a} d={PETAL} fill="#e8793f" transform={`rotate(${a} 0 6)`} />
      ))}
      <path d={PETAL} fill="#c2412b" />
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
      <LotusGlyph x={squareCenter(FINAL_SQUARE).x + 8} y={squareCenter(FINAL_SQUARE).y + 6} scale={0.95} />
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
      <g stroke={C.grid} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.75}>
        {GRID.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </g>
  );
}

export function PaintedLadder({ foot, top, glow = false }: { foot: Point; top: Point; glow?: boolean }) {
  const { rails, rungs } = ladderShape(foot, top, 34, 40);
  return (
    <g strokeLinecap="round" fill="none">
      {glow ? (
        <path d={`M${foot.x} ${foot.y} L${top.x} ${top.y}`} stroke={C.ladderGlow} strokeWidth={78} opacity={0.6} />
      ) : null}
      {[...rails, ...rungs].map((d, i) => (
        <path key={`o${i}`} d={d} stroke="#4a2c10" strokeWidth={i < 2 ? 12 : 9} />
      ))}
      {rungs.map((d, i) => (
        <path key={`r${i}`} d={d} stroke={C.bambooLight} strokeWidth={5} />
      ))}
      {rails.map((d, i) => (
        <g key={`b${i}`}>
          <path d={d} stroke={C.bamboo} strokeWidth={7.5} />
          <path d={d} stroke="#5a3712" strokeWidth={7.5} strokeDasharray="3 44" />
        </g>
      ))}
    </g>
  );
}

export function PaintedSnake({ head, tail, slot, glow = false }: { head: Point; tail: Point; slot: number; glow?: boolean }) {
  const shape = snakeShape(head, tail);
  const colors = snakeColors(slot);
  const outline = snakeOutline(shape.points, 32, 6);
  return (
    <g>
      {glow ? (
        <path d={shape.body} stroke="#f08a6c" strokeWidth={74} opacity={0.5} fill="none" strokeLinecap="round" />
      ) : null}
      <path d={outline} fill={colors.body} stroke={colors.belly} strokeWidth={4} strokeLinejoin="round" />
      <path d={shape.body} fill="none" stroke={colors.spots} strokeWidth={7} strokeDasharray="3 17" strokeLinecap="round" />
      <g transform={`translate(${shape.head.x} ${shape.head.y}) rotate(${shape.headAngle}) scale(1.15)`}>
        <path d="M34 0 L50 0 M50 0 L57 -6 M50 0 L57 6" stroke="#c2412b" strokeWidth={3.5} strokeLinecap="round" />
        <path
          d="M-10 -18 C12 -24 34 -12 36 0 C34 12 12 24 -10 18 C-4 8 -4 -8 -10 -18 Z"
          fill={colors.body}
          stroke={colors.belly}
          strokeWidth={4}
        />
        <circle cx={15} cy={-9} r={5.5} fill="#fff8e7" />
        <circle cx={16.5} cy={-9} r={2.8} fill="#1a0f08" />
        <circle cx={15} cy={9} r={5.5} fill="#fff8e7" />
        <circle cx={16.5} cy={9} r={2.8} fill="#1a0f08" />
      </g>
    </g>
  );
}

function Plaque({ at, habit }: { at: Point; habit: BoardHabit }) {
  const text = shortLabel(habit.label, 15);
  const good = habit.kind === "good";
  const badge = `${good ? "+" : "−"}${habit.amount}`;
  const width = Math.min(300, [...text].length * 13.5 + 70);
  const x = Math.min(Math.max(at.x, width / 2 + 6), BOARD_SIZE - width / 2 - 6);
  const color = good ? C.good : C.bad;
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
    <g>
      <Frame id={id} />
      <Squares />
      {ladders.map((l) => (
        <PaintedLadder key={l.habit.id} foot={squareCenter(l.from)} top={squareCenter(l.to)} glow={highlight === l.habit.id} />
      ))}
      {snakes.map((s) => (
        <PaintedSnake
          key={s.habit.id}
          head={squareCenter(s.head)}
          tail={squareCenter(s.tail)}
          slot={s.habit.slot}
          glow={highlight === s.habit.id}
        />
      ))}
      {ladders.map((l) => {
        const foot = squareCenter(l.from);
        return <Plaque key={l.habit.id} at={{ x: foot.x, y: foot.y + 26 }} habit={byId.get(l.habit.id)!} />;
      })}
      {snakes.map((s) => {
        const head = squareCenter(s.head);
        return <Plaque key={s.habit.id} at={{ x: head.x, y: head.y + 40 }} habit={byId.get(s.habit.id)!} />;
      })}
    </g>
  );
}

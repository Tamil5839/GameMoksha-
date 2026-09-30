import { BOARD_COLORS as C } from "./palette";

/** A painted wooden pawn standing on (0, 0); the body rises above it. */
export function PawnGlyph({ scale = 1.3 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <ellipse cx={0} cy={14} rx={24} ry={8} fill="rgb(58 35 20 / 0.35)" />
      <path
        d="M-21 13 C-21 2 -10 -5 -8 -13 C-17 -18 -17 -38 0 -41 C17 -38 17 -18 8 -13 C10 -5 21 2 21 13 Z"
        fill={C.pawn}
        stroke={C.pawnDeep}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <path d="M-15 5 H15" stroke={C.moksha} strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={-5} cy={-30} rx={4} ry={6} fill="#fff8e7" opacity={0.55} />
    </g>
  );
}

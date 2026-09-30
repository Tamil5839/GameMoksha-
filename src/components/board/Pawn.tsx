import { Prims } from "./BoardArt";
import { pawnPrims } from "./primitives";

const PAWN = pawnPrims();

/** A painted wooden pawn standing on (0, 0); the body rises above it. */
export function PawnGlyph() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <Prims prims={PAWN} />
    </g>
  );
}

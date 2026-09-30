/**
 * The board is 10×10, squares 1 to 100, snaking like a real Snakes and
 * Ladders board: square 1 is bottom-left, row 1 runs left to right, row 2
 * right to left, and so on up to square 100 at the top-left.
 */
export const BOARD_COLUMNS = 10;
export const START_SQUARE = 1;
export const FINAL_SQUARE = 100;

/** Size of one square in board units (the SVG board is 1000×1000). */
export const CELL_SIZE = 100;
export const BOARD_SIZE = BOARD_COLUMNS * CELL_SIZE;

export interface Cell {
  /** 0 is the bottom row. */
  readonly row: number;
  /** 0 is the left column. */
  readonly col: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function isSquare(n: number): boolean {
  return Number.isInteger(n) && n >= START_SQUARE && n <= FINAL_SQUARE;
}

function assertSquare(square: number): void {
  if (!isSquare(square)) throw new RangeError(`Not a board square: ${square}`);
}

export function squareToCell(square: number): Cell {
  assertSquare(square);
  const index = square - 1;
  const row = Math.floor(index / BOARD_COLUMNS);
  const offset = index % BOARD_COLUMNS;
  const col = row % 2 === 0 ? offset : BOARD_COLUMNS - 1 - offset;
  return { row, col };
}

export function cellToSquare({ row, col }: Cell): number {
  const offset = row % 2 === 0 ? col : BOARD_COLUMNS - 1 - col;
  const square = row * BOARD_COLUMNS + offset + 1;
  assertSquare(square);
  return square;
}

/** Top-left corner of a square, in board units (y grows downwards). */
export function squareOrigin(square: number): Point {
  const { row, col } = squareToCell(square);
  return { x: col * CELL_SIZE, y: (BOARD_COLUMNS - 1 - row) * CELL_SIZE };
}

/** Centre of a square, in board units. */
export function squareCenter(square: number): Point {
  const { x, y } = squareOrigin(square);
  return { x: x + CELL_SIZE / 2, y: y + CELL_SIZE / 2 };
}

/** Every square the pawn passes through going from `from` to `to`, both included. */
export function walk(from: number, to: number): number[] {
  assertSquare(from);
  assertSquare(to);
  const step = to >= from ? 1 : -1;
  const squares: number[] = [];
  for (let s = from; s !== to + step; s += step) squares.push(s);
  return squares;
}

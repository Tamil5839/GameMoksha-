/** Colours of the painted board, shared by the web board and the share card. */
export const BOARD_COLORS = {
  ink: "#3a2314",
  grid: "#6e4a2a",
  frame: "#7c2331",
  frameBand: "#e9b62a",
  frameMotif: "#c2412b",
  moksha: "#f2c14e",
  start: "#dfe3b5",
  bamboo: "#8a5a2b",
  bambooLight: "#c79a5b",
  ladderGlow: "#f7d774",
  plaque: "#fff7e6",
  good: "#35591c",
  bad: "#7c2331",
  pawn: "#c2412b",
  pawnDeep: "#7a2416",
  gold: "#c9982f",
} as const;

/** Warm tints for the squares, like faded mineral paints. */
const TINTS = ["#f6dcaa", "#efc6a0", "#e2dcac", "#f2cfb8", "#ead8b4", "#f3d49b"] as const;

export function squareTint(row: number, col: number): string {
  return TINTS[(row * 4 + col * 3 + (row % 2) * 2) % TINTS.length];
}

/** Body colours for snakes 1–6. */
export const SNAKE_COLORS = [
  { body: "#4f7d2b", spots: "#e2d86a", belly: "#2f4d17" },
  { body: "#2c3e78", spots: "#f0b35c", belly: "#1b2750" },
  { body: "#8e2a38", spots: "#f5c1a0", belly: "#5b1822" },
  { body: "#1d6f6a", spots: "#f3dc9a", belly: "#0f4441" },
  { body: "#9c5a1f", spots: "#fbe3a8", belly: "#643812" },
  { body: "#5b3a6b", spots: "#f1c6e0", belly: "#3a2346" },
] as const;

export function snakeColors(slot: number) {
  return SNAKE_COLORS[slot % SNAKE_COLORS.length];
}

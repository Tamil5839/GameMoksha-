import type { CheckInBlocker, HabitSelectionProblem } from "@/domain";

export type GameErrorCode =
  | CheckInBlocker
  | "invalid-habits"
  | "invalid-time-zone"
  | "no-season"
  | "season-not-found"
  | "unknown-habit"
  | "stale";

const MESSAGES: Record<GameErrorCode, string> = {
  "already-checked-in": "You have already checked in today. Come back tomorrow!",
  won: "This season is won: you reached Moksha. Start a new season to play again.",
  ended: "This season has ended. Start a new season to keep playing.",
  over: "All of this season's days have passed. Start a new season to keep playing.",
  "not-started": "This season starts tomorrow in your time zone.",
  "invalid-habits": "Please check your habits.",
  "invalid-time-zone": "We could not work out your time zone.",
  "no-season": "Set up your board first.",
  "season-not-found": "That season does not exist.",
  "unknown-habit": "That habit is not on this board.",
  stale: "Your board changed in another tab. Reload and try again.",
};

export class GameError extends Error {
  constructor(
    readonly code: GameErrorCode,
    readonly problems: readonly HabitSelectionProblem[] = [],
  ) {
    super(MESSAGES[code]);
    this.name = "GameError";
  }
}

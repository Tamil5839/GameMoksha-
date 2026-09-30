"use server";

import { GameError, checkIn } from "@/application";
import type { Move } from "@/domain";
import { gameDeps } from "@/server/game";
import { requirePlayer } from "@/server/session";

export type CheckInActionResult =
  | {
      readonly ok: true;
      readonly roll: number;
      readonly moves: readonly Move[];
      readonly endSquare: number;
      readonly reachedMoksha: boolean;
      readonly dayNumber: number;
    }
  | { readonly ok: false; readonly message: string };

/** Today's check-in: the server rolls the dice and plays the day; the client animates the result. */
export async function checkInAction(seasonId: unknown, doneHabitIds: unknown): Promise<CheckInActionResult> {
  const player = await requirePlayer("/board");
  if (
    typeof seasonId !== "string" ||
    !Array.isArray(doneHabitIds) ||
    doneHabitIds.length > 12 ||
    !doneHabitIds.every((id) => typeof id === "string")
  ) {
    return { ok: false, message: "Something went wrong. Please reload and try again." };
  }

  try {
    const result = await checkIn(await gameDeps(), player.id, { seasonId, doneHabitIds });
    return {
      ok: true,
      roll: result.checkIn.roll,
      moves: result.moves,
      endSquare: result.checkIn.endSquare,
      reachedMoksha: result.reachedMoksha,
      dayNumber: result.checkIn.dayNumber,
    };
  } catch (error) {
    if (error instanceof GameError) return { ok: false, message: error.message };
    console.error("check-in failed", error);
    return { ok: false, message: "We couldn't save your check-in. Please try again." };
  }
}

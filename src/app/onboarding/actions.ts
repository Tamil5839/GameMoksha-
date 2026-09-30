"use server";

import { redirect } from "next/navigation";
import { GameError, startSeason } from "@/application";
import { describeProblem } from "@/domain";
import { gameDeps } from "@/server/game";
import { requirePlayer } from "@/server/session";

export interface SeasonFormState {
  readonly message?: string;
  readonly problems?: readonly string[];
}

/** Starts a new season with the chosen habits (onboarding and "new season"). */
export async function startSeasonAction(_: SeasonFormState, formData: FormData): Promise<SeasonFormState> {
  const player = await requirePlayer("/onboarding");
  const good = formData.getAll("good").map(String);
  const bad = formData.getAll("bad").map(String);
  const timeZone = String(formData.get("timeZone") || "UTC");

  try {
    await startSeason(await gameDeps(), player.id, { good, bad, timeZone });
  } catch (error) {
    if (error instanceof GameError) {
      return { message: error.message, problems: error.problems.map(describeProblem) };
    }
    throw error;
  }
  redirect("/board?welcome=1");
}

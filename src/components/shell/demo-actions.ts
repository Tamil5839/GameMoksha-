"use server";

import { revalidatePath } from "next/cache";
import { advanceDemoDay } from "@/server/demo";
import { isDemoMode } from "@/server/env";

/** Demo mode only: moves the demo clock forward one day. */
export async function nextDemoDay(): Promise<void> {
  if (!isDemoMode()) throw new Error("Demo mode is off");
  advanceDemoDay();
  revalidatePath("/", "layout");
}

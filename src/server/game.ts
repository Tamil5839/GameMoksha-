import "server-only";
import type { GameDeps } from "@/application";
import { SupabaseGameRepository } from "@/infrastructure/supabase/repository";
import { cryptoDice, systemClock } from "@/infrastructure/system";
import { demoWorld } from "./demo";
import { isDemoMode } from "./env";
import { createSupabaseServerClient, supabaseAdmin } from "./supabase";

/** Composition root: wires the use cases to Supabase, or to memory in demo mode. */
export async function gameDeps(): Promise<GameDeps> {
  if (isDemoMode()) {
    const { repo, clock } = demoWorld();
    return { repo, clock, dice: cryptoDice };
  }
  const reader = await createSupabaseServerClient();
  return { repo: new SupabaseGameRepository(reader, supabaseAdmin()), clock: systemClock, dice: cryptoDice };
}

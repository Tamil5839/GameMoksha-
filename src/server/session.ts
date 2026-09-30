import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { DEMO_COOKIE, isDemoMode, readSupabaseEnv } from "./env";
import { createSupabaseServerClient } from "./supabase";

export interface Player {
  readonly id: string;
  readonly email: string | null;
}

/** The signed-in player for this request, or null. */
export const getPlayer = cache(async (): Promise<Player | null> => {
  // Reading cookies first also makes every page that checks the player render per request.
  const cookieStore = await cookies();
  if (isDemoMode()) {
    const id = cookieStore.get(DEMO_COOKIE)?.value;
    return id ? { id, email: null } : null;
  }
  if (!readSupabaseEnv()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  return { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
});

/** The signed-in player, or a redirect to the login page. */
export async function requirePlayer(returnTo: string): Promise<Player> {
  const player = await getPlayer();
  if (!player) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return player;
}

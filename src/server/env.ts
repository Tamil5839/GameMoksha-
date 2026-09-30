/**
 * Server configuration from environment variables (never hard-coded; use
 * .env.local locally and Project Settings → Environment Variables on Vercel).
 * Kept free of "server-only" so the proxy can read it too.
 */

export interface SupabaseEnv {
  readonly url: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
}

/** Cookie that identifies a player in demo mode. */
export const DEMO_COOKIE = "mp_demo_player";

/** DEMO_MODE=true runs the app without Supabase: in-memory data and a one-tap demo login. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/** The Supabase settings, or null when they are missing. */
export function readSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Legacy "anon"/"service_role" keys and the newer "publishable"/"secret" keys both work.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !anonKey || !serviceRoleKey) return null;
  return { url, anonKey, serviceRoleKey };
}

export function supabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and " +
        "SUPABASE_SERVICE_ROLE_KEY (see README), or set DEMO_MODE=true to try the app without Supabase.",
    );
  }
  return env;
}

/** Where to send people back to after a redirect: a local path only. */
export function safeNextPath(value: unknown, fallback = "/board"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}

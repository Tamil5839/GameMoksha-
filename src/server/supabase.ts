import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/infrastructure/supabase/database.types";
import { supabaseEnv } from "./env";

/** The signed-in player's client (their session cookie, row-level security applies). */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the proxy keeps sessions fresh instead.
        }
      },
    },
  });
}

let admin: SupabaseClient<Database> | undefined;

/** Service-role client. Server only; used just to call the write functions. */
export function supabaseAdmin(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = supabaseEnv();
  admin ??= createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return admin;
}

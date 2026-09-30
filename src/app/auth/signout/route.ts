import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, isDemoMode, readSupabaseEnv } from "@/server/env";
import { createSupabaseServerClient } from "@/server/supabase";

export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    (await cookies()).delete(DEMO_COOKIE);
  } else if (readSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}

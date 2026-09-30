import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/server/env";
import { createSupabaseServerClient } from "@/server/supabase";

/**
 * Where magic links land. Works with the recommended email template
 * (?token_hash=…&type=email, any device) and with Supabase's default
 * template (?code=…, same browser only).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");

  const supabase = await createSupabaseServerClient();
  let signedIn = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    signedIn = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    signedIn = !error;
  }

  const target = signedIn ? next : `/login?error=link&next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(target, request.nextUrl.origin));
}

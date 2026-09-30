"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE, isDemoMode, readSupabaseEnv, safeNextPath } from "@/server/env";
import { siteUrl } from "@/server/site-url";
import { createSupabaseServerClient } from "@/server/supabase";

export interface LoginState {
  readonly status: "idle" | "sent" | "error";
  readonly email?: string;
  readonly message?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Emails a magic link (and a one-time code, with the recommended template). */
export async function sendMagicLink(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNextPath(formData.get("next"));
  if (!EMAIL.test(email) || email.length > 254) {
    return { status: "error", email, message: "Please enter a valid email address." };
  }
  if (!readSupabaseEnv()) {
    return { status: "error", email, message: "Email login is not set up yet (Supabase keys are missing)." };
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = new URL("/auth/confirm", await siteUrl());
  redirectTo.searchParams.set("next", next);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo.toString(), shouldCreateUser: true },
  });
  if (error) {
    const message =
      error.status === 429
        ? "Too many sign-in emails. Please wait a minute and try again."
        : "We couldn't send your link. Please try again.";
    return { status: "error", email, message };
  }
  return { status: "sent", email };
}

/** Signs in with the code from the email, for when the link opens in another browser. */
export async function verifyEmailCode(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\s+/g, "");
  const next = safeNextPath(formData.get("next"));
  if (!/^\d{6,10}$/.test(token)) {
    return { status: "sent", email, message: "Enter the code from your email." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { status: "sent", email, message: "That code didn't work. Check it or send a new link." };
  redirect(next);
}

/** Demo mode only: signs in as a fresh demo player. */
export async function startDemo(formData: FormData): Promise<void> {
  if (!isDemoMode()) throw new Error("Demo mode is off");
  const store = await cookies();
  if (!store.get(DEMO_COOKIE)) {
    store.set(DEMO_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  redirect(safeNextPath(formData.get("next")));
}

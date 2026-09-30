import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Lotus";
import { isDemoMode, readSupabaseEnv, safeNextPath } from "@/server/env";
import { getPlayer } from "@/server/session";
import { startDemo } from "./actions";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getPlayer()) redirect(next);

  const demo = isDemoMode();
  const configured = readSupabaseEnv() !== null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10">
      <header className="py-4">
        <Link href="/" aria-label="Moksha Patam home">
          <Logo />
        </Link>
      </header>

      <section className="card mt-6 p-6">
        <p className="eyebrow">Sign in</p>
        <h1 className="mt-1 font-display text-3xl">Begin your climb</h1>
        <p className="mt-2 text-ink-soft">No password. We&apos;ll email you a magic link.</p>

        {params.error === "link" ? (
          <p role="alert" className="mt-4 rounded-xl bg-maroon-soft px-4 py-3 text-maroon">
            That sign-in link has expired or was already used. Send yourself a new one.
          </p>
        ) : null}

        {configured ? (
          <LoginForm next={next} />
        ) : !demo ? (
          <p className="mt-4 rounded-xl bg-turmeric/25 px-4 py-3 text-sm">
            Email sign-in isn&apos;t set up yet: add your Supabase keys (see the README), or run with{" "}
            <code className="font-semibold">DEMO_MODE=true</code> to try the app without them.
          </p>
        ) : null}

        {demo ? (
          <form action={startDemo} className="mt-6 border-t border-gold/40 pt-6">
            <input type="hidden" name="next" value={next} />
            <p className="text-sm text-ink-soft">Demo mode is on: data lives in memory only.</p>
            <button type="submit" className="btn btn-gold mt-3 w-full">
              Play the demo (no email needed)
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

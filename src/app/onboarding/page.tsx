import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadBoard } from "@/application";
import { Logo } from "@/components/brand/Lotus";
import { HabitPicker } from "@/components/habits/HabitPicker";
import { gameDeps } from "@/server/game";
import { requirePlayer } from "@/server/session";
import { startSeasonAction } from "./actions";

export const metadata: Metadata = { title: "Paint your board" };

export default async function OnboardingPage() {
  const player = await requirePlayer("/onboarding");
  if (await loadBoard(await gameDeps(), player.id)) redirect("/board");

  return (
    <main className="mx-auto max-w-xl px-4">
      <header className="py-4">
        <Logo />
      </header>
      <p className="eyebrow mt-2">Season 1 · Day 1</p>
      <h1 className="mt-1 font-display text-3xl leading-tight">Paint your board</h1>
      <p className="mt-2 text-ink-soft">
        Choose the habits you want to climb and the ones you want to stop. Each one gets its own ladder or snake, labelled
        with your words.
      </p>
      <HabitPicker action={startSeasonAction} submitLabel="Paint my board" />
    </main>
  );
}

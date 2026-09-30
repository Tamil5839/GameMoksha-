import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadBoard } from "@/application";
import { startSeasonAction } from "@/app/onboarding/actions";
import { HabitPicker } from "@/components/habits/HabitPicker";
import { PageHeader } from "@/components/shell/PageHeader";
import { sortHabits } from "@/domain";
import { gameDeps } from "@/server/game";
import { requirePlayer } from "@/server/session";

export const metadata: Metadata = { title: "New season" };

export default async function NewSeasonPage() {
  const player = await requirePlayer("/seasons/new");
  const board = await loadBoard(await gameDeps(), player.id);
  if (!board) redirect("/onboarding");

  const { season } = board;
  const habits = sortHabits(season.habits);
  const endsCurrent = board.phase === "active";

  return (
    <>
      <PageHeader />
      <p className="eyebrow">Season {season.number + 1} · Day 1</p>
      <h1 className="mt-1 font-display text-3xl leading-tight">Paint a fresh board</h1>
      <p className="mt-2 text-ink-soft">
        Keep last season&apos;s habits or change them. Your pawn starts again on square 1.
      </p>
      {endsCurrent ? (
        <p className="mt-3 rounded-xl bg-turmeric/25 px-4 py-3 text-sm">
          This ends season {season.number} now (day {board.day}, square {season.currentSquare}). It stays in your
          history.
        </p>
      ) : null}
      <HabitPicker
        action={startSeasonAction}
        initialGood={habits.filter((h) => h.kind === "good").map((h) => h.label)}
        initialBad={habits.filter((h) => h.kind === "bad").map((h) => h.label)}
        submitLabel={`Start season ${season.number + 1}`}
        aboveNav
      />
    </>
  );
}

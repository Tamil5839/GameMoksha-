import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadHistory } from "@/application";
import { SeasonHistoryCard } from "@/components/history/SeasonHistoryCard";
import { DaySquarePill, PageHeader } from "@/components/shell/PageHeader";
import { gameDeps } from "@/server/game";
import { requirePlayer } from "@/server/session";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const player = await requirePlayer("/history");
  const history = await loadHistory(await gameDeps(), player.id);
  if (history.length === 0) redirect("/onboarding");

  const current = history[0];

  return (
    <>
      <PageHeader
        right={<DaySquarePill day={current.day} square={current.season.currentSquare} length={current.season.lengthDays} />}
      />
      <h1 className="font-display text-3xl">Your journey</h1>
      <p className="text-ink-soft">Every check-in and every move, newest first. Past seasons stay here for good.</p>
      {history.map((season, i) => (
        <SeasonHistoryCard key={season.season.id} history={season} open={i === 0} />
      ))}
    </>
  );
}

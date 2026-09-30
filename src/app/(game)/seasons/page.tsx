import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { amountsByHabit, loadHistory } from "@/application";
import { formatDate } from "@/components/format";
import { LadderIcon, SnakeIcon } from "@/components/icons";
import { DaySquarePill, PageHeader } from "@/components/shell/PageHeader";
import { sortHabits } from "@/domain";
import { gameDeps } from "@/server/game";
import { requirePlayer } from "@/server/session";

export const metadata: Metadata = { title: "Seasons" };

const OUTCOME = {
  active: "In progress",
  won: "Reached Moksha",
  ended: "Ended early",
  over: "Time's up",
} as const;

export default async function SeasonsPage() {
  const player = await requirePlayer("/seasons");
  const history = await loadHistory(await gameDeps(), player.id);
  if (history.length === 0) redirect("/onboarding");

  const [current, ...past] = history;
  const { season } = current;
  const habits = sortHabits(season.habits);
  const amounts = amountsByHabit(season);
  const stillPlaying = current.phase === "active";

  return (
    <>
      <PageHeader right={<DaySquarePill day={current.day} square={season.currentSquare} length={season.lengthDays} />} />
      <h1 className="font-display text-3xl">Seasons</h1>
      <p className="text-ink-soft">
        Each season is {season.lengthDays} days on a fresh board. Past seasons stay in your history.
      </p>

      <section className="card mt-4 p-5">
        <p className="eyebrow">Current season</p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl">Season {season.number}</h2>
          <span className="text-sm font-semibold text-ink-soft">{OUTCOME[current.phase]}</span>
        </div>
        <p className="text-sm text-ink-soft">
          Started {formatDate(season.startDate)} · day {current.day} of {season.lengthDays} · square {season.currentSquare}
        </p>
        <ul className="mt-4 space-y-1.5">
          {habits.map((h) => (
            <li key={h.id} className="flex items-center gap-2">
              {h.kind === "good" ? (
                <LadderIcon className="h-4 w-4 shrink-0 text-leaf-deep" />
              ) : (
                <SnakeIcon className="h-4 w-4 shrink-0 text-maroon" />
              )}
              <span className="flex-1">{h.label}</span>
              <span className={`text-sm font-bold tabular-nums ${h.kind === "good" ? "text-leaf-deep" : "text-maroon"}`}>
                {h.kind === "good" ? "+" : "−"}
                {amounts[h.id]}
              </span>
            </li>
          ))}
        </ul>
        <Link href="/seasons/new" className={`btn mt-5 w-full ${stillPlaying ? "btn-ghost" : "btn-primary"}`}>
          Start a new {season.lengthDays}-day season
        </Link>
        {stillPlaying ? (
          <p className="mt-2 text-center text-xs text-ink-soft">
            Starting over ends season {season.number} early; it stays in your history.
          </p>
        ) : null}
      </section>

      {past.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-display text-xl">Past seasons</h2>
          <ul className="mt-2 space-y-2">
            {past.map((h) => (
              <li key={h.season.id}>
                <Link href={`/history#season-${h.season.number}`} className="card flex items-center gap-3 px-4 py-3">
                  <span className="font-display text-lg">Season {h.season.number}</span>
                  <span className="flex-1 text-sm text-ink-soft">
                    {h.phase === "won" ? `Moksha on day ${h.season.wonOnDay}` : `${OUTCOME[h.phase]} · square ${h.season.currentSquare}`}
                  </span>
                  <span aria-hidden className="text-ink-soft">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 border-t border-gold/40 pt-4 text-sm text-ink-soft">
        <p>{player.email ? `Signed in as ${player.email}` : "Signed in"}</p>
        <form action="/auth/signout" method="post" className="mt-2">
          <button type="submit" className="font-semibold text-vermilion underline underline-offset-4">
            Sign out
          </button>
        </form>
      </section>
    </>
  );
}

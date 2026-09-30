import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadBoard, movesOfCheckIn } from "@/application";
import { PlayArea, type PlayStatus } from "@/components/board/PlayArea";
import { DaySquarePill, PageHeader } from "@/components/shell/PageHeader";
import { gameDeps } from "@/server/game";
import { requirePlayer } from "@/server/session";
import { checkInAction } from "./actions";

export const metadata: Metadata = { title: "My board" };

export default async function BoardPage({ searchParams }: PageProps<"/board">) {
  const player = await requirePlayer("/board");
  const board = await loadBoard(await gameDeps(), player.id);
  if (!board) redirect("/onboarding");

  const { season, availability, todayCheckIn } = board;
  const status: PlayStatus = availability.ok
    ? "open"
    : availability.reason === "already-checked-in"
      ? "done"
      : availability.reason;
  const today = todayCheckIn && {
    roll: todayCheckIn.roll,
    moves: movesOfCheckIn(todayCheckIn),
    endSquare: todayCheckIn.endSquare,
    reachedMoksha: todayCheckIn.reachedMoksha,
    dayNumber: todayCheckIn.dayNumber,
  };
  const welcome = (await searchParams).welcome === "1" && board.checkIns.length === 0;

  return (
    <>
      <PageHeader right={<DaySquarePill day={board.day} square={season.currentSquare} length={season.lengthDays} />} />
      {welcome ? (
        <p className="mb-3 rounded-2xl bg-leaf-soft px-4 py-3 text-leaf-deep">
          Your board is painted! Each ladder and snake carries one of your habits. Check in below once a day.
        </p>
      ) : null}
      <PlayArea
        // A new day (or season) starts a fresh check-in.
        key={`${season.id}:${board.day}`}
        seasonId={season.id}
        seasonNumber={season.number}
        lengthDays={season.lengthDays}
        day={board.day}
        square={season.currentSquare}
        diceFaces={season.rules.diceFaces}
        habits={season.habits.map((h) => ({ ...h, amount: board.amounts[h.id] }))}
        status={status}
        today={today}
        wonOnDay={season.wonOnDay}
        onCheckIn={checkInAction}
      />
    </>
  );
}

import { redirect } from "next/navigation";
import { loadBoard } from "@/application";
import { DaySquarePill, PageHeader } from "@/components/shell/PageHeader";
import { gameDeps } from "@/server/game";
import { requirePlayer } from "@/server/session";

export default async function BoardPage() {
  const player = await requirePlayer("/board");
  const board = await loadBoard(await gameDeps(), player.id);
  if (!board) redirect("/onboarding");
  const { season } = board;

  return (
    <>
      <PageHeader right={<DaySquarePill day={board.day} square={season.currentSquare} length={season.lengthDays} />} />
      <h1 className="font-display text-2xl">Season {season.number}</h1>
      <ul className="mt-4 space-y-2">
        {season.habits.map((h) => (
          <li key={h.id} className="card px-4 py-2">
            {h.kind === "good" ? "Ladder" : "Snake"} · {h.label} · {board.amounts[h.id]}
          </li>
        ))}
      </ul>
    </>
  );
}

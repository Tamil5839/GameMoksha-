import Link from "next/link";
import type { CheckInRecord, SeasonHistory } from "@/application";
import { FINAL_SQUARE, type TimelineDay } from "@/domain";
import { formatDate, formatDay, formatDelta } from "@/components/format";
import { DiceIcon, LadderIcon, SnakeIcon } from "@/components/icons";

const PHASE_BADGE = {
  active: { text: "In progress", style: "bg-turmeric/30 text-ink" },
  won: { text: "Moksha", style: "bg-vermilion text-paper" },
  ended: { text: "Ended early", style: "bg-parchment-deep text-ink-soft" },
  over: { text: "Time's up", style: "bg-parchment-deep text-ink-soft" },
} as const;

function DayRow({ entry }: { entry: TimelineDay<CheckInRecord> }) {
  const { checkIn } = entry;
  if (!checkIn) {
    return (
      <li className="flex items-center gap-3 py-2.5 text-ink-soft">
        <span className="w-14 shrink-0 font-hand text-lg font-bold">Day {entry.day}</span>
        <span className="flex-1 text-sm">
          {formatDay(entry.date)} ·{" "}
          {entry.state === "today" ? (
            <Link href="/board" className="font-semibold text-vermilion underline underline-offset-4">
              not checked in yet
            </Link>
          ) : (
            "missed: no roll that day"
          )}
        </span>
      </li>
    );
  }

  const delta = checkIn.endSquare - checkIn.startSquare;
  const moved = checkIn.habits.filter((h) => h.done);
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <span className="w-14 shrink-0 font-hand text-lg font-bold">Day {entry.day}</span>
        <span className="flex-1 text-sm text-ink-soft">{formatDay(entry.date)}</span>
        <span className="font-semibold tabular-nums">
          {checkIn.startSquare} → {checkIn.endSquare}
        </span>
        <span
          className={`w-11 rounded-lg px-1.5 py-0.5 text-center text-sm font-bold tabular-nums ${
            delta > 0 ? "bg-leaf-soft text-leaf-deep" : delta < 0 ? "bg-maroon-soft text-maroon" : "bg-parchment-deep"
          }`}
        >
          {formatDelta(delta)}
        </span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5 pl-[4.25rem] text-sm">
        <li className="flex items-center gap-1 rounded-full bg-turmeric/25 px-2.5 py-1">
          <DiceIcon className="h-4 w-4" /> Rolled {checkIn.roll}
        </li>
        {moved.map((h) => {
          const good = h.kind === "good";
          const Icon = good ? LadderIcon : SnakeIcon;
          const squares = h.applied && h.fromSquare !== null && h.toSquare !== null ? Math.abs(h.toSquare - h.fromSquare) : 0;
          return (
            <li
              key={h.habitId}
              className={`flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 ${
                !h.applied ? "bg-parchment-deep text-ink-soft line-through" : good ? "bg-leaf-soft text-leaf-deep" : "bg-maroon-soft text-maroon"
              }`}
              title={h.applied ? undefined : "Not needed: Moksha was already reached"}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{h.label}</span>
              {h.applied ? (
                <span className="font-semibold tabular-nums">{good ? `+${squares}` : `−${squares}`}</span>
              ) : null}
            </li>
          );
        })}
        {checkIn.reachedMoksha ? (
          <li className="rounded-full bg-vermilion px-2.5 py-1 font-semibold text-paper">Moksha!</li>
        ) : null}
      </ul>
    </li>
  );
}

/** One season: its outcome, then every day newest first. */
export function SeasonHistoryCard({ history, open }: { history: SeasonHistory; open: boolean }) {
  const { season, phase, days } = history;
  const badge = PHASE_BADGE[phase];
  const lastDate = days.at(-1)?.date ?? season.startDate;
  return (
    <details id={`season-${season.number}`} open={open} className="card group mt-4 scroll-mt-24 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl">Season {season.number}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${badge.style}`}>
              {phase === "won" ? `Moksha · day ${season.wonOnDay}` : badge.text}
            </span>
          </div>
          <p className="text-sm text-ink-soft">
            {formatDate(season.startDate)} – {formatDate(lastDate)}
          </p>
          <p className="mt-1 text-sm">
            <strong className="tabular-nums">Square {season.currentSquare}</strong>
            <span className="text-ink-soft"> of {FINAL_SQUARE}</span> · {history.checkedInDays} check-ins ·{" "}
            {history.missedDays} missed
          </p>
        </div>
        <span aria-hidden className="text-2xl text-ink-soft transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
      {days.length > 0 ? (
        <ol className="divide-y divide-gold/25 border-t border-gold/30 px-4">
          {[...days].reverse().map((entry) => (
            <DayRow key={entry.day} entry={entry} />
          ))}
        </ol>
      ) : (
        <p className="border-t border-gold/30 p-4 text-ink-soft">No days played yet.</p>
      )}
    </details>
  );
}

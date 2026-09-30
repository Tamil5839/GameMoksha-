import type { Move } from "@/domain";
import { DiceIcon, LadderIcon, SnakeIcon } from "@/components/icons";

/** One line per move: "Rolled 3 · 12 → 15", "Read 20 pages · 15 → 17"… */
export function JourneyLog({ moves, labels }: { moves: readonly Move[]; labels: ReadonlyMap<string, string> }) {
  return (
    <ol className="space-y-1.5">
      {moves.map((move, i) => {
        const text =
          move.kind === "dice"
            ? `Rolled ${move.roll}`
            : move.kind === "ladder"
              ? labels.get(move.habitId) ?? "Ladder"
              : labels.get(move.habitId) ?? "Snake";
        const style =
          move.kind === "dice"
            ? "bg-turmeric/25 text-ink"
            : move.kind === "ladder"
              ? "bg-leaf-soft text-leaf-deep"
              : "bg-maroon-soft text-maroon";
        const Icon = move.kind === "dice" ? DiceIcon : move.kind === "ladder" ? LadderIcon : SnakeIcon;
        const stayed = move.from === move.to;
        return (
          <li key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${style}`}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-medium">{text}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {stayed ? `stays on ${move.to}` : `${move.from} → ${move.to}`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

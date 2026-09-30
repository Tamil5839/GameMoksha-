"use client";

import { motion } from "framer-motion";
import { DiceIcon, LadderIcon, SnakeIcon } from "@/components/icons";
import type { BoardHabit } from "./BoardArt";

function HabitSwitch({ habit, on, disabled, onToggle }: { habit: BoardHabit; on: boolean; disabled: boolean; onToggle: () => void }) {
  const good = habit.kind === "good";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
        on ? (good ? "border-leaf bg-leaf-soft" : "border-maroon bg-maroon-soft") : "border-ink-soft/20 bg-paper"
      }`}
    >
      <span className="min-w-0 flex-1 font-medium leading-snug">{habit.label}</span>
      <span
        className={`shrink-0 rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums ${
          good ? "bg-leaf text-paper" : "bg-maroon text-paper"
        }`}
      >
        {good ? "+" : "−"}
        {habit.amount}
      </span>
      <span
        aria-hidden
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? (good ? "bg-leaf" : "bg-maroon") : "bg-ink-soft/25"}`}
      >
        <motion.span
          className="absolute top-1 h-5 w-5 rounded-full bg-paper shadow"
          animate={{ left: on ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  );
}

export function CheckInForm({
  habits,
  done,
  onToggle,
  onRoll,
  busy,
  day,
  lengthDays,
  diceFaces,
}: {
  habits: readonly BoardHabit[];
  done: ReadonlySet<string>;
  onToggle: (habitId: string) => void;
  onRoll: () => void;
  busy: boolean;
  day: number;
  lengthDays: number;
  diceFaces: number;
}) {
  const groups = [
    { kind: "good" as const, title: "Ladders I climbed", icon: <LadderIcon />, color: "text-leaf-deep" },
    { kind: "bad" as const, title: "Snakes I slid down", icon: <SnakeIcon />, color: "text-maroon" },
  ];
  return (
    <section className="card mt-4 p-4" aria-labelledby="checkin-title">
      <p className="eyebrow">
        Day {day} of {lengthDays}
      </p>
      <h2 id="checkin-title" className="font-display text-2xl">
        What did you do today?
      </h2>
      <p className="text-sm text-ink-soft">Be honest: the board only works if you are.</p>

      {groups.map((group) => (
        <div key={group.kind} className="mt-4">
          <h3 className={`mb-2 flex items-center gap-2 font-semibold ${group.color}`}>
            {group.icon}
            {group.title}
          </h3>
          <div className="space-y-2">
            {habits
              .filter((h) => h.kind === group.kind)
              .map((habit) => (
                <HabitSwitch
                  key={habit.id}
                  habit={habit}
                  on={done.has(habit.id)}
                  disabled={busy}
                  onToggle={() => onToggle(habit.id)}
                />
              ))}
          </div>
        </div>
      ))}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 mt-5 bg-gradient-to-t from-paper via-paper/95 to-transparent px-4 pb-2 pt-4">
        <button type="button" onClick={onRoll} disabled={busy} className="btn btn-primary w-full text-lg">
          <DiceIcon className="h-6 w-6" />
          {busy ? "Rolling…" : "Roll the dice"}
        </button>
        <p className="mt-2 text-center text-xs text-ink-soft">
          You roll 1–{diceFaces}, then climb your ladders and slide down your snakes.
        </p>
      </div>
    </section>
  );
}

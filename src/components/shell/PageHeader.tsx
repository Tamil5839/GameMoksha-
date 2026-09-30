import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Lotus";
import { isDemoMode } from "@/server/env";
import { demoDayOffset } from "@/server/demo";
import { nextDemoDay } from "./demo-actions";

/** Top bar of the signed-in pages; `right` is usually the Day · Square pill. */
export function PageHeader({ right }: { right?: ReactNode }) {
  const demo = isDemoMode();
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-2 bg-parchment/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3">
        <Link href="/board" aria-label="Moksha Patam board" className="shrink-0">
          <Logo compact />
        </Link>
        {right}
      </div>
      {demo ? (
        <form action={nextDemoDay} className="flex items-center justify-between gap-2 pb-2 text-xs text-ink-soft">
          <span>Demo mode · {demoDayOffset() === 0 ? "today" : `+${demoDayOffset()} day${demoDayOffset() === 1 ? "" : "s"}`}</span>
          <button type="submit" className="rounded-full border border-ink-soft/30 px-3 py-1 font-semibold text-ink">
            Next day →
          </button>
        </form>
      ) : null}
    </header>
  );
}

export function DaySquarePill({ day, square, length }: { day: number; square: number; length: number }) {
  return (
    <p className="whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-paper tabular-nums">
      Day {day}
      <span className="text-paper/60">/{length}</span> · Square {square}
    </p>
  );
}

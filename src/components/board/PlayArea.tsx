"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FINAL_SQUARE, squareCenter, walk, type Move, type Point } from "@/domain";
import { DiceIcon, LadderIcon, SnakeIcon } from "@/components/icons";
import { BOARD_VIEWBOX, BoardArt, type BoardHabit } from "./BoardArt";
import { CheckInForm } from "./CheckInForm";
import { RollingDice } from "./Dice";
import { GhostLadder, GhostSnake } from "./Ghosts";
import { JourneyLog } from "./JourneyLog";
import { MokshaCelebration } from "./MokshaCelebration";
import { PawnGlyph } from "./Pawn";
import { arcLadderShape, lerp, snakeShape } from "./shapes";

export type PlayStatus = "open" | "done" | "won" | "over" | "ended" | "not-started";

export interface DayPlay {
  readonly roll: number;
  readonly moves: readonly Move[];
  readonly endSquare: number;
  readonly reachedMoksha: boolean;
  readonly dayNumber: number;
}

export type CheckInResponse = ({ readonly ok: true } & DayPlay) | { readonly ok: false; readonly message: string };

/** Seconds for each part of the show. */
const TIMING = { hop: 0.17, draw: 0.45, climb: 0.75, slide: 1, pause: 0.3, tumble: 0.8, settle: 0.9 };

const sleep = (seconds: number) => new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000));

/** Point at fraction t (0–1) along a polyline. */
function along(points: readonly Point[], t: number): Point {
  const at = Math.min(points.length - 1, Math.max(0, t * (points.length - 1)));
  const i = Math.min(points.length - 2, Math.floor(at));
  return lerp(points[i], points[i + 1], at - i);
}

type Ghost = { readonly from: Point; readonly to: Point; readonly key: number; readonly duration: number } & (
  | { readonly kind: "ladder" }
  | { readonly kind: "snake"; readonly slot: number }
);

type Caption = { readonly kind: Move["kind"]; readonly text: string; readonly amount?: number; readonly key: number };

export function PlayArea({
  seasonId,
  seasonNumber,
  lengthDays,
  day,
  square,
  diceFaces,
  habits,
  status,
  today,
  wonOnDay,
  onCheckIn,
  shareButton,
}: {
  seasonId: string;
  seasonNumber: number;
  lengthDays: number;
  day: number;
  square: number;
  diceFaces: number;
  habits: readonly BoardHabit[];
  status: PlayStatus;
  today: DayPlay | null;
  wonOnDay: number | null;
  onCheckIn: (seasonId: string, doneHabitIds: string[]) => Promise<CheckInResponse>;
  shareButton?: ReactNode;
}) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const byId = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);
  const labels = useMemo(() => new Map(habits.map((h) => [h.id, h.label])), [habits]);

  const home = squareCenter(square);
  const x = useMotionValue(home.x);
  const y = useMotionValue(home.y);
  const lift = useMotionValue(0);
  const pawnY = useTransform(() => y.get() + lift.get());

  const [phase, setPhase] = useState<"idle" | "rolling" | "animating" | "finished">("idle");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [dice, setDice] = useState<{ value: number | null } | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [caption, setCaption] = useState<Caption | null>(null);
  const [played, setPlayed] = useState<readonly Move[]>([]);
  const [result, setResult] = useState<DayPlay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const skipping = useRef(false);
  const step = useRef(0);

  // When the server moves the pawn (a refresh, the demo's next day…), follow it unless a show is running.
  const showing = useRef(false);
  useEffect(() => {
    if (showing.current) return;
    const c = squareCenter(square);
    x.set(c.x);
    y.set(c.y);
  }, [square, x, y]);

  const time = (seconds: number) => (skipping.current || reduce ? 0 : seconds);

  /**
   * Brings the board into view below the sticky header. It jumps rather than
   * glides: the dice overlay hides the jump, and a smooth scroll gets cut
   * short by the re-render that starts the roll.
   */
  function showBoard() {
    const board = boardRef.current;
    if (!board) return;
    const top = board.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  }

  async function moveAlong(points: readonly Point[], seconds: number, ease: "easeIn" | "easeInOut") {
    if (time(seconds) === 0) {
      const end = points[points.length - 1];
      x.set(end.x);
      y.set(end.y);
      return;
    }
    await animate(0, 1, {
      duration: time(seconds),
      ease,
      onUpdate: (t) => {
        const p = along(points, t);
        x.set(p.x);
        y.set(p.y);
      },
    });
  }

  async function hop(from: number, to: number) {
    for (const square of walk(from, to).slice(1)) {
      const c = squareCenter(square);
      if (time(TIMING.hop) === 0) {
        x.set(c.x);
        y.set(c.y);
        continue;
      }
      await Promise.all([
        animate(x, c.x, { duration: time(TIMING.hop), ease: "easeInOut" }),
        animate(y, c.y, { duration: time(TIMING.hop), ease: "easeInOut" }),
        animate(lift, [0, -40, 0], { duration: time(TIMING.hop) }),
      ]);
    }
  }

  /** Animates the day's moves one by one: dice, then each ladder, then each snake. */
  async function play(moves: readonly Move[]) {
    skipping.current = false;
    setPhase("animating");
    setPlayed([]);
    const start = squareCenter(moves[0].from);
    x.set(start.x);
    y.set(start.y);

    for (const move of moves) {
      const key = ++step.current;
      if (move.kind === "dice") {
        setCaption({ kind: "dice", text: `Rolled ${move.roll}`, key });
        await hop(move.from, move.to);
      } else {
        const habit = byId.get(move.habitId);
        const from = squareCenter(move.from);
        const to = squareCenter(move.to);
        setHighlight(move.habitId);
        setCaption({ kind: move.kind, text: habit?.label ?? "", amount: move.amount, key });
        if (move.from === move.to) {
          // Nowhere to go: already on square 1, or the exact-roll rule.
          if (time(0.4) > 0) await animate(x, [from.x, from.x - 12, from.x + 12, from.x], { duration: time(0.45) });
        } else if (move.kind === "ladder") {
          setGhost({ kind: "ladder", from, to, key, duration: time(TIMING.draw) });
          await sleep(time(TIMING.draw));
          await moveAlong(arcLadderShape(from, to).path, TIMING.climb, "easeInOut");
        } else {
          setGhost({ kind: "snake", from, to, slot: habit?.slot ?? 0, key, duration: time(TIMING.draw) });
          await sleep(time(TIMING.draw));
          await moveAlong(snakeShape(from, to).points, TIMING.slide, "easeIn");
        }
        await sleep(time(TIMING.pause));
        setGhost(null);
        setHighlight(null);
      }
      setPlayed((p) => [...p, move]);
    }
    setCaption(null);
  }

  async function roll() {
    showing.current = true;
    setError(null);
    setPhase("rolling");
    setDice({ value: null });
    showBoard();

    let response: CheckInResponse;
    try {
      [response] = await Promise.all([onCheckIn(seasonId, [...done]), sleep(reduce ? 0 : TIMING.tumble)]);
    } catch {
      response = { ok: false, message: "We couldn't reach the board. Check your connection and try again." };
    }
    if (!response.ok) {
      showing.current = false;
      setDice(null);
      setPhase("idle");
      setError(response.message);
      return;
    }

    setDice({ value: response.roll });
    await sleep(reduce ? 0.4 : TIMING.settle);
    setDice(null);
    await play(response.moves);
    setResult(response);
    setPhase("finished");
    showing.current = false;
    if (response.reachedMoksha) setCelebrate(true);
    router.refresh();
  }

  async function replay(day: DayPlay) {
    showing.current = true;
    setDice({ value: day.roll });
    showBoard();
    await sleep(reduce ? 0.3 : TIMING.settle);
    setDice(null);
    await play(day.moves);
    setResult(day);
    setPhase("finished");
    showing.current = false;
  }

  const busy = phase === "rolling" || phase === "animating";
  const shown = result ?? today;

  return (
    <div>
      <div ref={boardRef} className="relative mx-auto w-full max-w-[34rem] scroll-mt-24">
        <svg
          viewBox={BOARD_VIEWBOX}
          className="block h-auto w-full touch-manipulation select-none"
          role="img"
          aria-label={`Your board: the pawn is on square ${square}.`}
        >
          <BoardArt habits={habits} highlight={highlight} />
          <AnimatePresence>
            {ghost?.kind === "ladder" ? (
              <GhostLadder key={ghost.key} from={ghost.from} to={ghost.to} duration={ghost.duration} />
            ) : ghost?.kind === "snake" ? (
              <GhostSnake key={ghost.key} from={ghost.from} to={ghost.to} slot={ghost.slot} duration={ghost.duration} />
            ) : null}
          </AnimatePresence>
          <motion.g style={{ x, y: pawnY }}>
            <PawnGlyph />
          </motion.g>
        </svg>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[3%] opacity-60 mix-blend-multiply"
          style={{ backgroundImage: "var(--paper-grain)" }}
        />

        <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[6%] flex justify-center px-6">
          <AnimatePresence mode="popLayout">
            {caption ? (
              <motion.p
                key={caption.key}
                initial={{ opacity: 0, y: -12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                className={`flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-base font-semibold shadow-lg ${
                  caption.kind === "ladder"
                    ? "bg-leaf text-paper"
                    : caption.kind === "snake"
                      ? "bg-maroon text-paper"
                      : "bg-ink text-paper"
                }`}
              >
                {caption.kind === "ladder" ? <LadderIcon /> : caption.kind === "snake" ? <SnakeIcon /> : <DiceIcon />}
                <span className="truncate">{caption.text}</span>
                {caption.amount !== undefined ? (
                  <span className="shrink-0 tabular-nums">
                    {caption.kind === "ladder" ? "+" : "−"}
                    {caption.amount}
                  </span>
                ) : null}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {dice ? (
            <motion.div
              key="dice"
              className="fixed inset-0 z-40 flex items-center justify-center bg-parchment/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
            >
              <RollingDice value={dice.value} faces={diceFaces} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-maroon-soft px-4 py-3 text-maroon">
          {error}
        </p>
      ) : null}

      {phase === "animating" ? (
        <section className="card mt-4 p-4" aria-live="polite">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Today&apos;s journey</h2>
            <button type="button" onClick={() => (skipping.current = true)} className="text-sm font-semibold text-vermilion underline underline-offset-4">
              Skip animation
            </button>
          </div>
          <div className="mt-3">
            <JourneyLog moves={played} labels={labels} />
          </div>
        </section>
      ) : phase === "finished" && shown ? (
        <ResultCard
          play={shown}
          labels={labels}
          lengthDays={lengthDays}
          shareButton={shareButton}
          onReplay={() => replay(shown)}
          onCelebrate={shown.reachedMoksha ? () => setCelebrate(true) : undefined}
        />
      ) : status === "open" ? (
        <CheckInForm
          habits={habits}
          done={done}
          busy={busy}
          onToggle={(id) =>
            setDone((d) => {
              const next = new Set(d);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onRoll={roll}
          day={day}
          lengthDays={lengthDays}
          diceFaces={diceFaces}
        />
      ) : status === "won" ? (
        <section className="card mt-4 p-5 text-center">
          <p className="eyebrow">Season {seasonNumber} · won</p>
          <h2 className="mt-1 font-display text-3xl text-vermilion">Moksha on day {wonOnDay}</h2>
          <p className="mt-2 text-ink-soft">You reached square {FINAL_SQUARE}. Your season is complete.</p>
          <div className="mt-5 flex flex-col gap-3">
            <button type="button" onClick={() => setCelebrate(true)} className="btn btn-gold w-full">
              Celebrate again
            </button>
            {shareButton}
            <Link href="/seasons/new" className="btn btn-ghost w-full">
              Start a new season
            </Link>
          </div>
        </section>
      ) : status === "done" && today ? (
        <ResultCard
          play={today}
          labels={labels}
          lengthDays={lengthDays}
          shareButton={shareButton}
          onReplay={() => replay(today)}
          note="You've checked in today. Come back tomorrow for your next roll."
        />
      ) : status === "not-started" ? (
        <section className="card mt-4 p-5">
          <h2 className="font-display text-2xl">Your season starts tomorrow</h2>
          <p className="mt-1 text-ink-soft">Day 1 begins at midnight in your time zone.</p>
        </section>
      ) : (
        <section className="card mt-4 p-5 text-center">
          <p className="eyebrow">Season {seasonNumber} · over</p>
          <h2 className="mt-1 font-display text-3xl">Your {lengthDays} days are done</h2>
          <p className="mt-2 text-ink-soft">
            You finished on square {square}. Every season is a fresh board: start again and climb higher.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Link href="/seasons/new" className="btn btn-primary w-full">
              Start a new season
            </Link>
            {shareButton}
          </div>
        </section>
      )}

      <MokshaCelebration
        open={celebrate}
        onClose={() => setCelebrate(false)}
        day={result?.dayNumber ?? wonOnDay ?? day}
        seasonNumber={seasonNumber}
        shareButton={shareButton}
      />
    </div>
  );
}

function ResultCard({
  play,
  labels,
  lengthDays,
  shareButton,
  onReplay,
  onCelebrate,
  note,
}: {
  play: DayPlay;
  labels: ReadonlyMap<string, string>;
  lengthDays: number;
  shareButton?: ReactNode;
  onReplay: () => void;
  onCelebrate?: () => void;
  note?: string;
}) {
  return (
    <section className="card mt-4 p-5" aria-labelledby="result-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            Day {play.dayNumber} of {lengthDays}
          </p>
          <h2 id="result-title" className="font-display text-4xl leading-none">
            Square {play.endSquare}
          </h2>
        </div>
        <button type="button" onClick={onReplay} className="text-sm font-semibold text-vermilion underline underline-offset-4">
          Replay
        </button>
      </div>
      {note ? <p className="mt-2 text-ink-soft">{note}</p> : null}
      {play.reachedMoksha ? (
        <p className="mt-2 font-semibold text-vermilion">Moksha! You reached square {FINAL_SQUARE} and won the season.</p>
      ) : null}
      <div className="mt-4">
        <JourneyLog moves={play.moves} labels={labels} />
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {onCelebrate ? (
          <button type="button" onClick={onCelebrate} className="btn btn-gold w-full">
            Celebrate again
          </button>
        ) : null}
        {shareButton}
        {play.reachedMoksha ? (
          <Link href="/seasons/new" className="btn btn-primary w-full">
            Start a new season
          </Link>
        ) : null}
        <Link href="/history" className="btn btn-ghost w-full">
          See my history
        </Link>
      </div>
    </section>
  );
}

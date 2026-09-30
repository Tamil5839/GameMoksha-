import Link from "next/link";
import { BOARD_VIEWBOX, BoardArt, type BoardHabit } from "@/components/board/BoardArt";
import { PawnGlyph } from "@/components/board/Pawn";
import { Logo, Lotus } from "@/components/brand/Lotus";
import { squareCenter } from "@/domain";
import { DiceIcon, LadderIcon, SnakeIcon } from "@/components/icons";
import { getPlayer } from "@/server/session";

const SAMPLE: BoardHabit[] = [
  ...["Went to the gym", "Read 20 pages", "Slept before 11"].map((label, slot) => ({
    id: `g${slot}`,
    kind: "good" as const,
    label,
    slot,
    amount: [3, 3, 2][slot],
  })),
  ...["Scrolled reels 2+ hours", "Skipped workout", "Stayed up past 1am"].map((label, slot) => ({
    id: `b${slot}`,
    kind: "bad" as const,
    label,
    slot,
    amount: 6,
  })),
];
const SAMPLE_PAWN = squareCenter(47);

const STEPS = [
  {
    icon: <LadderIcon className="h-6 w-6" />,
    title: "Paint your board",
    body: "Pick 3–6 good habits to be your ladders and 3–6 bad habits to be your snakes.",
  },
  {
    icon: <DiceIcon className="h-6 w-6" />,
    title: "Check in once a day",
    body: "Tell the board what you really did, then roll. Showing up always moves you forward.",
  },
  {
    icon: <SnakeIcon className="h-6 w-6" />,
    title: "Climb to Moksha",
    body: "Good habits climb, bad habits slide. Reach square 100 within your 30-day season.",
  },
];

export default async function LandingPage() {
  const player = await getPlayer();
  const cta = player ? { href: "/board", label: "Continue your journey" } : { href: "/login", label: "Start your season" };

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-10">
      <header className="flex items-center justify-between py-4">
        <Logo />
        <Link href={player ? "/board" : "/login"} className="text-sm font-semibold text-vermilion underline-offset-4 hover:underline">
          {player ? "My board" : "Sign in"}
        </Link>
      </header>

      <section className="mt-6 text-center">
        <Lotus className="mx-auto h-24 w-24 drop-shadow-sm" />
        <p className="eyebrow mt-4">Snakes &amp; Ladders, as it began</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">Your habits are the ladders and the snakes.</h1>
      </section>

      <figure className="mt-8">
        <svg viewBox={BOARD_VIEWBOX} className="h-auto w-full" role="img" aria-label="A sample Moksha Patam board with habits as ladders and snakes">
          <BoardArt habits={SAMPLE} id="sample" />
          <g transform={`translate(${SAMPLE_PAWN.x} ${SAMPLE_PAWN.y})`}>
            <PawnGlyph />
          </g>
        </svg>
        <figcaption className="mt-2 text-center text-sm text-ink-soft">
          A sample board. Yours is painted with your own habits.
        </figcaption>
      </figure>

      <section className="card mt-6 p-5 text-[1.05rem] leading-relaxed">
        <p>
          Snakes and Ladders began in India as <strong>Moksha Patam</strong>, a game about karma. Its ladders were virtues
          like generosity and faith that lifted you towards the sky; its snakes were vices like anger and greed that pulled
          you back down. The last square was <em>moksha</em>: freedom.
        </p>
        <p className="mt-3">
          Here, your good habits are the ladders and your bad habits are the snakes. You have 30 days to reach Moksha.
        </p>
      </section>

      <ol className="mt-6 space-y-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="card flex items-start gap-4 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-turmeric/30 text-vermilion">
              {step.icon}
            </span>
            <div>
              <p className="font-display text-lg leading-snug">
                {i + 1}. {step.title}
              </p>
              <p className="text-ink-soft">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-4 mt-8">
        <Link href={cta.href} className="btn btn-primary w-full text-lg">
          {cta.label}
        </Link>
      </div>
    </main>
  );
}

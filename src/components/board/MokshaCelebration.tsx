"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

const PETAL = "M0 -34 C9 -22 9 -6 0 6 C-9 -6 -9 -22 0 -34 Z";

// Deterministic "random" spread so server and client render the same petals.
const FALLING = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i * 0.23) % 2.4,
  duration: 3.2 + ((i * 7) % 10) / 5,
  size: 10 + ((i * 5) % 9),
  hue: i % 3,
}));
const PETAL_COLORS = ["#e8793f", "#c2412b", "#f4b983"];

function BloomingLotus() {
  const petals = [
    { angle: -62, fill: "#f4b983", delay: 0.35 },
    { angle: 62, fill: "#f4b983", delay: 0.35 },
    { angle: -31, fill: "#e8793f", delay: 0.2 },
    { angle: 31, fill: "#e8793f", delay: 0.2 },
    { angle: 0, fill: "#c2412b", delay: 0.05 },
  ];
  return (
    <svg viewBox="-60 -50 120 80" className="mx-auto h-28 w-40" aria-hidden>
      {petals.map((p) => (
        <motion.path
          key={p.angle}
          d={PETAL}
          fill={p.fill}
          stroke="#93301f"
          strokeWidth={2}
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: 1.25, rotate: p.angle }}
          transition={{ delay: p.delay, type: "spring", stiffness: 120, damping: 12 }}
          // Pivot on the petal's base (bottom centre of its box).
          style={{ originX: 0.5, originY: 1 }}
        />
      ))}
      <motion.path
        d="M-40 18 Q0 30 40 18"
        fill="none"
        stroke="#c9982f"
        strokeWidth={4}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      />
    </svg>
  );
}

/** Full-screen celebration for reaching square 100. */
export function MokshaCelebration({
  open,
  onClose,
  day,
  seasonNumber,
  shareButton,
}: {
  open: boolean;
  onClose: () => void;
  day: number;
  seasonNumber: number;
  shareButton?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="moksha-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink/70 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {FALLING.map((p, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute top-0 block rounded-[60%_0]"
              style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.4, background: PETAL_COLORS[p.hue] }}
              initial={{ y: -40, rotate: 0, opacity: 0 }}
              animate={{ y: "105vh", rotate: 540, opacity: [0, 1, 1, 0.6] }}
              transition={{ delay: p.delay, duration: p.duration, repeat: Infinity, ease: "linear" }}
            />
          ))}

          <motion.div
            className="card relative w-full max-w-sm overflow-hidden px-6 pb-6 pt-8 text-center"
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-24 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 opacity-40"
              style={{
                background:
                  "repeating-conic-gradient(from 0deg, #f2c14e 0deg 10deg, transparent 10deg 20deg)",
                maskImage: "radial-gradient(circle, black 20%, transparent 60%)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative">
              <BloomingLotus />
              <p className="eyebrow mt-2">Square 100</p>
              <h2 id="moksha-title" className="font-display text-5xl text-vermilion">
                Moksha!
              </h2>
              <p className="mt-3 text-lg">
                You reached Moksha on <strong>day {day}</strong> of season {seasonNumber}.
              </p>
              <p className="mt-2 text-ink-soft">Every ladder you climbed was a day you chose yourself. Well played.</p>
              <div className="mt-6 flex flex-col gap-3">
                {shareButton}
                <Link href="/seasons/new" className="btn btn-gold w-full">
                  Start a new season
                </Link>
                <button type="button" onClick={onClose} className="btn btn-ghost w-full">
                  Back to my board
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

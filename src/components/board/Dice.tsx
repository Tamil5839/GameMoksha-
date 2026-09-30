"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [30, 30],
    [70, 70],
  ],
  3: [
    [27, 27],
    [50, 50],
    [73, 73],
  ],
  4: [
    [30, 30],
    [70, 30],
    [30, 70],
    [70, 70],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [30, 26],
    [70, 26],
    [30, 50],
    [70, 50],
    [30, 74],
    [70, 74],
  ],
};

export function DieFace({ value, className = "h-20 w-20" }: { value: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`Dice showing ${value}`}>
      <rect x="4" y="4" width="92" height="92" rx="20" fill="#fff8e7" stroke="#3a2314" strokeWidth="5" />
      <rect x="10" y="10" width="80" height="80" rx="15" fill="none" stroke="#ecd08a" strokeWidth="3" />
      {(PIPS[value] ?? PIPS[1]).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={value === 1 ? 12 : 9} fill={value === 1 ? "#c2412b" : "#3a2314"} />
      ))}
    </svg>
  );
}

/**
 * A dice that tumbles while `value` is null and settles on it once known
 * (the server rolls; this is only the show).
 */
export function RollingDice({ value, faces }: { value: number | null; faces: number }) {
  const reduce = useReducedMotion();
  const [face, setFace] = useState(1);

  useEffect(() => {
    if (value !== null) return;
    const timer = setInterval(() => setFace(1 + Math.floor(Math.random() * faces)), 90);
    return () => clearInterval(timer);
  }, [value, faces]);

  const shown = value ?? face;
  return (
    <motion.div
      key={value === null ? "rolling" : "settled"}
      initial={value === null ? { scale: 0.6, rotate: -30, y: 40 } : { rotate: -200, scale: 1.25 }}
      animate={
        value === null
          ? reduce
            ? { scale: 1, rotate: 0, y: 0 }
            : { scale: 1, y: [0, -26, 0], rotate: [0, 120, 240, 360] }
          : { rotate: 0, scale: 1, y: 0 }
      }
      transition={
        value === null
          ? { duration: 0.5, repeat: reduce ? 0 : Infinity, ease: "linear" }
          : { type: "spring", stiffness: 260, damping: 14 }
      }
      className="drop-shadow-[0_10px_12px_rgb(58_35_20_/_0.35)]"
    >
      <DieFace value={shown} className="h-24 w-24" />
    </motion.div>
  );
}

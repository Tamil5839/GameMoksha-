"use client";

import { motion } from "framer-motion";
import type { Point } from "@/domain";
import { snakeColors } from "./palette";
import { arcLadderShape, smoothPath, snakeShape } from "./shapes";

/** The habit's ladder, drawn in gold from where the pawn stands to where it climbs. */
export function GhostLadder({ from, to, duration }: { from: Point; to: Point; duration: number }) {
  const { rails, rungs, path } = arcLadderShape(from, to, 34, 34);
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} strokeLinecap="round" fill="none">
      <path d={smoothPath(path)} stroke="#f7d774" strokeWidth={80} opacity={0.45} />
      {[...rails, ...rungs].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          stroke="#5a3712"
          strokeWidth={i < 2 ? 13 : 10}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration, delay: i < 2 ? 0 : (i - 2) * 0.04 }}
        />
      ))}
      {[...rails, ...rungs].map((d, i) => (
        <motion.path
          key={`g${i}`}
          d={d}
          stroke="#f2c14e"
          strokeWidth={i < 2 ? 7 : 5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration, delay: i < 2 ? 0 : (i - 2) * 0.04 }}
        />
      ))}
    </motion.g>
  );
}

/** The habit's snake, drawn from where the pawn stands (its head) to where it lands (its tail). */
export function GhostSnake({ from, to, slot, duration }: { from: Point; to: Point; slot: number; duration: number }) {
  const { body, head, headAngle } = snakeShape(from, to);
  const colors = snakeColors(slot);
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} fill="none" strokeLinecap="round">
      <path d={body} stroke="#f08a6c" strokeWidth={70} opacity={0.35} />
      <motion.path d={body} stroke={colors.belly} strokeWidth={30} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration }} />
      <motion.path d={body} stroke={colors.body} strokeWidth={22} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration }} />
      <motion.path
        d={body}
        stroke={colors.spots}
        strokeWidth={6}
        strokeDasharray="3 16"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration }}
      />
      <g transform={`translate(${head.x} ${head.y}) rotate(${headAngle}) scale(1.2)`}>
        <path d="M-10 -18 C12 -24 34 -12 36 0 C34 12 12 24 -10 18 C-4 8 -4 -8 -10 -18 Z" fill={colors.body} stroke={colors.belly} strokeWidth={4} />
        <circle cx={15} cy={-9} r={5.5} fill="#fff8e7" />
        <circle cx={16.5} cy={-9} r={2.8} fill="#1a0f08" />
        <circle cx={15} cy={9} r={5.5} fill="#fff8e7" />
        <circle cx={16.5} cy={9} r={2.8} fill="#1a0f08" />
      </g>
    </motion.g>
  );
}

import { randomInt } from "node:crypto";
import type { Clock, Dice } from "@/application/ports";

export const systemClock: Clock = { now: () => new Date() };

/** A fair dice from the operating system's secure random source. */
export const cryptoDice: Dice = { roll: (faces) => randomInt(1, faces + 1) };

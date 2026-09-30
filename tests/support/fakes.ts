import type { Clock, Dice } from "@/application/ports";

/** A clock that stays put until told to move. */
export class TestClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current);
  }
  set(iso: string): void {
    this.current = new Date(iso);
  }
  advanceDays(days: number): void {
    this.current = new Date(this.current.getTime() + days * 24 * 60 * 60 * 1000);
  }
}

/** Rolls the queued values in order (then 1s), remembering the faces asked for. */
export class ScriptedDice implements Dice {
  readonly facesAsked: number[] = [];
  constructor(private readonly queue: number[] = []) {}
  push(...rolls: number[]): void {
    this.queue.push(...rolls);
  }
  roll(faces: number): number {
    this.facesAsked.push(faces);
    return this.queue.shift() ?? 1;
  }
}

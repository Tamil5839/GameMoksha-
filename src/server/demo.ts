import "server-only";
import type { Clock, GameRepository } from "@/application/ports";
import { MemoryGameRepository } from "@/infrastructure/memory/memory-repository";

/**
 * Demo mode keeps all data in this server process's memory (lost on restart)
 * and lets you jump ahead a day at a time to play a whole season quickly.
 */
class DemoClock implements Clock {
  offsetDays = 0;
  now(): Date {
    return new Date(Date.now() + this.offsetDays * 24 * 60 * 60 * 1000);
  }
}

interface DemoWorld {
  readonly clock: DemoClock;
  readonly repo: GameRepository;
}

const globalForDemo = globalThis as typeof globalThis & { __mokshaPatamDemo?: DemoWorld };

export function demoWorld(): DemoWorld {
  if (!globalForDemo.__mokshaPatamDemo) {
    const clock = new DemoClock();
    globalForDemo.__mokshaPatamDemo = { clock, repo: new MemoryGameRepository(clock) };
  }
  return globalForDemo.__mokshaPatamDemo;
}

export function advanceDemoDay(): void {
  demoWorld().clock.offsetDays += 1;
}

export function demoDayOffset(): number {
  return demoWorld().clock.offsetDays;
}

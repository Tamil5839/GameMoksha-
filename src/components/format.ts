import type { LocalDate } from "@/domain";

const PARTS = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function parts(date: LocalDate) {
  const [y, m, d] = date.split("-").map(Number);
  const all = PARTS.formatToParts(new Date(Date.UTC(y, m - 1, d)));
  const get = (type: Intl.DateTimeFormatPartTypes) => all.find((p) => p.type === type)?.value ?? "";
  return { weekday: get("weekday"), day: get("day"), month: get("month"), year: get("year") };
}

/** "Wed 30 Sep" */
export function formatDay(date: LocalDate): string {
  const p = parts(date);
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** "30 Sep 2026" */
export function formatDate(date: LocalDate): string {
  const p = parts(date);
  return `${p.day} ${p.month} ${p.year}`;
}

/** "+9", "−3", "±0" */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}

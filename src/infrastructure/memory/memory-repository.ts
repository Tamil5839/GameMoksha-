import type {
  CheckInRecord,
  Clock,
  GameRepository,
  NewCheckIn,
  NewSeason,
  RecordCheckInOutcome,
  SeasonRecord,
} from "@/application/ports";

const systemClock: Clock = { now: () => new Date() };

/**
 * Keeps everything in memory. Used by the tests and by demo mode; it follows
 * the same rules as the Postgres functions (one active season per user, one
 * check-in per day, optimistic check on the pawn's square).
 */
export class MemoryGameRepository implements GameRepository {
  private seasons: SeasonRecord[] = [];
  private checkIns: CheckInRecord[] = [];

  constructor(private readonly clock: Clock = systemClock) {}

  private seasonsOf(userId: string): SeasonRecord[] {
    return this.seasons.filter((s) => s.userId === userId).sort((a, b) => b.number - a.number);
  }

  async latestSeason(userId: string): Promise<SeasonRecord | null> {
    return this.seasonsOf(userId)[0] ?? null;
  }

  async getSeason(userId: string, seasonId: string): Promise<SeasonRecord | null> {
    return this.seasons.find((s) => s.id === seasonId && s.userId === userId) ?? null;
  }

  async listSeasons(userId: string): Promise<SeasonRecord[]> {
    return this.seasonsOf(userId);
  }

  async listCheckIns(userId: string, seasonIds: readonly string[]): Promise<CheckInRecord[]> {
    const seasonNumber = new Map(this.seasonsOf(userId).map((s) => [s.id, s.number]));
    const wanted = new Set(seasonIds.filter((id) => seasonNumber.has(id)));
    const order = (c: CheckInRecord) => (seasonNumber.get(c.seasonId) ?? 0) * 1000 + c.dayNumber;
    return this.checkIns.filter((c) => wanted.has(c.seasonId)).sort((a, b) => order(a) - order(b));
  }

  async startSeason(userId: string, draft: NewSeason): Promise<SeasonRecord> {
    const now = this.clock.now();
    this.seasons = this.seasons.map((s) =>
      s.userId === userId && s.status === "active" ? { ...s, status: "ended", endedAt: now } : s,
    );
    const season: SeasonRecord = {
      id: crypto.randomUUID(),
      userId,
      number: Math.max(0, ...this.seasonsOf(userId).map((s) => s.number)) + 1,
      status: "active",
      startDate: draft.startDate,
      timeZone: draft.timeZone,
      lengthDays: draft.lengthDays,
      currentSquare: 1,
      wonOnDay: null,
      endedAt: null,
      rules: draft.rules,
      habits: draft.habits.map((h) => ({ id: crypto.randomUUID(), ...h })),
    };
    this.seasons.push(season);
    return season;
  }

  async recordCheckIn(userId: string, draft: NewCheckIn): Promise<RecordCheckInOutcome> {
    const index = this.seasons.findIndex((s) => s.id === draft.seasonId && s.userId === userId);
    const season = this.seasons[index];
    if (!season) return { ok: false, reason: "stale" };
    if (this.checkIns.some((c) => c.seasonId === season.id && (c.localDate === draft.localDate || c.dayNumber === draft.dayNumber))) {
      return { ok: false, reason: "already-checked-in" };
    }
    if (season.status !== "active" || season.currentSquare !== draft.startSquare) {
      return { ok: false, reason: "stale" };
    }

    const checkIn: CheckInRecord = { ...draft, id: crypto.randomUUID(), createdAt: this.clock.now() };
    this.checkIns.push(checkIn);
    this.seasons[index] = {
      ...season,
      currentSquare: draft.endSquare,
      status: draft.reachedMoksha ? "won" : season.status,
      wonOnDay: draft.reachedMoksha ? draft.dayNumber : season.wonOnDay,
    };
    return { ok: true, checkIn };
  }
}

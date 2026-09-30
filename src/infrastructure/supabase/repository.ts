import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CheckInRecord,
  GameRepository,
  NewCheckIn,
  NewSeason,
  RecordCheckInOutcome,
  SeasonRecord,
} from "@/application/ports";
import type { Database, Json } from "./database.types";
import { toCheckInRecord, toRecordCheckInArgs, toSeasonRecord, type CheckInRow, type SeasonRow } from "./mappers";

type Client = SupabaseClient<Database>;

const SEASON_COLUMNS = "*, habits(*)";
const CHECK_IN_COLUMNS = "*, check_in_habits(*, habits(slot))";

/**
 * Supabase-backed storage.
 *  - `reader` is the signed-in player's client: row-level security limits
 *    reads to their own rows (the user id filters below are a second guard).
 *  - `writer` is a service-role client used only to call the two database
 *    functions that write, so the browser can never forge dice or squares.
 */
export class SupabaseGameRepository implements GameRepository {
  constructor(
    private readonly reader: Client,
    private readonly writer: Client,
  ) {}

  async latestSeason(userId: string): Promise<SeasonRecord | null> {
    const { data, error } = await this.reader
      .from("seasons")
      .select(SEASON_COLUMNS)
      .eq("user_id", userId)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toSeasonRecord(data as SeasonRow) : null;
  }

  async getSeason(userId: string, seasonId: string): Promise<SeasonRecord | null> {
    const { data, error } = await this.reader
      .from("seasons")
      .select(SEASON_COLUMNS)
      .eq("user_id", userId)
      .eq("id", seasonId)
      .maybeSingle();
    if (error) throw error;
    return data ? toSeasonRecord(data as SeasonRow) : null;
  }

  async listSeasons(userId: string): Promise<SeasonRecord[]> {
    const { data, error } = await this.reader
      .from("seasons")
      .select(SEASON_COLUMNS)
      .eq("user_id", userId)
      .order("number", { ascending: false });
    if (error) throw error;
    return (data as SeasonRow[]).map(toSeasonRecord);
  }

  async listCheckIns(userId: string, seasonIds: readonly string[]): Promise<CheckInRecord[]> {
    if (seasonIds.length === 0) return [];
    const { data, error } = await this.reader
      .from("check_ins")
      .select(CHECK_IN_COLUMNS)
      .eq("user_id", userId)
      .in("season_id", [...seasonIds])
      .order("day_number", { ascending: true });
    if (error) throw error;
    return (data as unknown as CheckInRow[]).map(toCheckInRecord);
  }

  async startSeason(userId: string, season: NewSeason): Promise<SeasonRecord> {
    const { data: seasonId, error } = await this.writer.rpc("start_season", {
      p_user_id: userId,
      p_start_date: season.startDate,
      p_time_zone: season.timeZone,
      p_length_days: season.lengthDays,
      p_rules: season.rules as unknown as Json,
      p_habits: season.habits.map((h) => ({ kind: h.kind, label: h.label, slot: h.slot })),
    });
    if (error) throw error;
    const created = await this.getSeason(userId, seasonId);
    if (!created) throw new Error(`Season ${seasonId} was not found after it was created`);
    return created;
  }

  async recordCheckIn(userId: string, checkIn: NewCheckIn): Promise<RecordCheckInOutcome> {
    const { data: checkInId, error } = await this.writer.rpc("record_check_in", toRecordCheckInArgs(userId, checkIn));
    if (error) {
      // Error codes raised by public.record_check_in.
      if (error.code === "MP409" || error.code === "23505") return { ok: false, reason: "already-checked-in" };
      if (error.code === "MP412" || error.code === "MP404") return { ok: false, reason: "stale" };
      throw error;
    }
    const { data, error: readError } = await this.reader
      .from("check_ins")
      .select(CHECK_IN_COLUMNS)
      .eq("user_id", userId)
      .eq("id", checkInId)
      .single();
    if (readError) throw readError;
    return { ok: true, checkIn: toCheckInRecord(data as unknown as CheckInRow) };
  }
}

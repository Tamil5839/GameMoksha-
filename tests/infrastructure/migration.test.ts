import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Runs the real Supabase migrations in PGlite (Postgres compiled to WASM),
 * with a minimal stand-in for Supabase's auth schema and roles.
 */
const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
const ALICE = "00000000-0000-4000-8000-00000000000a";
const BOB = "00000000-0000-4000-8000-00000000000b";

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  insert into auth.users (id, email) values ('${ALICE}', 'alice@example.com'), ('${BOB}', 'bob@example.com');
`;

let db: PGlite;

const habitsJson = (labels: { good: string[]; bad: string[] }) =>
  JSON.stringify([
    ...labels.good.map((label, slot) => ({ kind: "good", label, slot })),
    ...labels.bad.map((label, slot) => ({ kind: "bad", label, slot })),
  ]);

const HABITS = habitsJson({ good: ["Gym", "Read", "Sleep early"], bad: ["Reels", "Junk food", "Late night"] });

async function asServiceRole<T>(sql: string, params: unknown[] = []) {
  await db.exec("reset role;");
  await db.exec("set role service_role;");
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec("reset role;");
  }
}

async function asPlayer<T>(userId: string, sql: string, params: unknown[] = []) {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("set role authenticated;");
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec("reset role;");
  }
}

async function startSeason(userId: string, startDate = "2026-09-01") {
  const { rows } = await asServiceRole<{ id: string }>(
    "select public.start_season($1, $2, 'UTC', 30, '{}'::jsonb, $3::jsonb) as id",
    [userId, startDate, HABITS],
  );
  return rows[0].id;
}

async function habitsOf(seasonId: string) {
  const { rows } = await db.query<{ id: string; kind: string; slot: number; label: string }>(
    "select id, kind, slot, label from public.habits where season_id = $1 order by kind desc, slot",
    [seasonId],
  );
  return rows;
}

async function recordCheckIn(
  userId: string,
  seasonId: string,
  day: { date: string; day: number; start: number; end: number; moksha?: boolean; habits?: object[] },
) {
  return asServiceRole<{ id: string }>(
    "select public.record_check_in($1, $2, $3, $4, 2, $5, $6, $7, $8::jsonb) as id",
    [userId, seasonId, day.date, day.day, day.start, day.end, day.moksha ?? false, JSON.stringify(day.habits ?? [])],
  );
}

const errorCode = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return "no error";
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("start_season", () => {
  it("creates numbered seasons with their habits and ends the previous one", async () => {
    const first = await startSeason(ALICE);
    expect(await habitsOf(first)).toHaveLength(6);

    const second = await startSeason(ALICE, "2026-09-05");
    const { rows } = await db.query<{ id: string; number: number; status: string; ended: boolean }>(
      "select id, number, status, ended_at is not null as ended from public.seasons where user_id = $1 order by number",
      [ALICE],
    );
    expect(rows).toEqual([
      { id: first, number: 1, status: "ended", ended: true },
      { id: second, number: 2, status: "active", ended: false },
    ]);
  });

  it("rejects habit labels longer than 40 characters", async () => {
    const tooLong = habitsJson({ good: ["x".repeat(41), "b", "c"], bad: ["d", "e", "f"] });
    const code = await errorCode(
      asServiceRole("select public.start_season($1, '2026-09-01', 'UTC', 30, '{}', $2::jsonb)", [BOB, tooLong]),
    );
    expect(code).toBe("23514"); // check_violation
  });

  it("cannot be called by players directly", async () => {
    const code = await errorCode(
      asPlayer(ALICE, "select public.start_season($1, '2026-09-01', 'UTC', 30, '{}', $2::jsonb)", [ALICE, HABITS]),
    );
    expect(code).toBe("42501"); // insufficient_privilege
  });
});

describe("record_check_in", () => {
  it("saves the day and moves the pawn", async () => {
    const season = await startSeason(BOB);
    const [gym] = await habitsOf(season);
    await recordCheckIn(BOB, season, {
      date: "2026-09-01",
      day: 1,
      start: 1,
      end: 6,
      habits: [
        { habit_id: gym.id, kind: "good", label: gym.label, done: true, applied: true, amount: 3, from_square: 3, to_square: 6 },
      ],
    });
    const { rows } = await db.query<{ current_square: number }>("select current_square from public.seasons where id = $1", [
      season,
    ]);
    expect(rows[0].current_square).toBe(6);
    const saved = await db.query("select * from public.check_in_habits where habit_id = $1", [gym.id]);
    expect(saved.rows).toHaveLength(1);
  });

  it("allows one check-in per day", async () => {
    const season = await startSeason(BOB, "2026-09-10");
    await recordCheckIn(BOB, season, { date: "2026-09-10", day: 1, start: 1, end: 3 });
    expect(await errorCode(recordCheckIn(BOB, season, { date: "2026-09-10", day: 1, start: 3, end: 5 }))).toBe("MP409");
  });

  it("refuses a check-in based on an out-of-date pawn position", async () => {
    const season = await startSeason(BOB, "2026-09-20");
    await recordCheckIn(BOB, season, { date: "2026-09-20", day: 1, start: 1, end: 3 });
    expect(await errorCode(recordCheckIn(BOB, season, { date: "2026-09-21", day: 2, start: 1, end: 4 }))).toBe("MP412");
  });

  it("refuses habits from another board and seasons of other players", async () => {
    const aliceSeason = await startSeason(ALICE, "2026-10-01");
    const bobSeason = await startSeason(BOB, "2026-10-01");
    const [aliceHabit] = await habitsOf(aliceSeason);
    const foreign = [{ habit_id: aliceHabit.id, kind: "good", label: "x", done: false, applied: false, amount: 3, from_square: null, to_square: null }];
    expect(await errorCode(recordCheckIn(BOB, bobSeason, { date: "2026-10-01", day: 1, start: 1, end: 2, habits: foreign }))).toBe("MP422");
    expect(await errorCode(recordCheckIn(BOB, aliceSeason, { date: "2026-10-01", day: 1, start: 1, end: 2 }))).toBe("MP404");
  });

  it("wins the season on Moksha and then refuses more check-ins", async () => {
    const season = await startSeason(ALICE, "2026-11-01");
    await recordCheckIn(ALICE, season, { date: "2026-11-01", day: 1, start: 1, end: 100, moksha: true });
    const { rows } = await db.query<{ status: string; won_on_day: number }>(
      "select status, won_on_day from public.seasons where id = $1",
      [season],
    );
    expect(rows[0]).toEqual({ status: "won", won_on_day: 1 });
    expect(await errorCode(recordCheckIn(ALICE, season, { date: "2026-11-02", day: 2, start: 100, end: 100 }))).toBe(
      "MP412",
    );
  });

  it("cannot be called by players directly", async () => {
    const season = await startSeason(ALICE, "2026-12-01");
    const code = await errorCode(
      asPlayer(ALICE, "select public.record_check_in($1, $2, '2026-12-01', 1, 6, 1, 99, false, '[]')", [ALICE, season]),
    );
    expect(code).toBe("42501");
  });
});

describe("row-level security", () => {
  it("lets players read only their own rows", async () => {
    const { rows: mine } = await asPlayer<{ user_id: string }>(ALICE, "select distinct user_id from public.seasons");
    expect(mine).toEqual([{ user_id: ALICE }]);
    const { rows: habits } = await asPlayer<{ user_id: string }>(BOB, "select distinct user_id from public.habits");
    expect(habits).toEqual([{ user_id: BOB }]);
    const { rows: checkIns } = await asPlayer<{ user_id: string }>(BOB, "select distinct user_id from public.check_ins");
    expect(checkIns).toEqual([{ user_id: BOB }]);
  });

  it("stops players from writing directly, so squares and dice cannot be forged", async () => {
    expect(await errorCode(asPlayer(ALICE, "update public.seasons set current_square = 100"))).toBe("42501");
    expect(
      await errorCode(
        asPlayer(ALICE, "insert into public.check_ins (season_id, user_id, local_date, day_number, roll, start_square, end_square) select id, user_id, '2027-01-01', 99, 6, 1, 100 from public.seasons limit 1"),
      ),
    ).toBe("42501");
  });

  it("hides everything from signed-out visitors", async () => {
    await db.exec("reset role; set role anon;");
    try {
      expect(await errorCode(db.query("select * from public.seasons"))).toBe("42501");
    } finally {
      await db.exec("reset role;");
    }
  });
});

-- Moksha Patam: seasons, habits and daily check-ins.
--
-- Security model
--   * Players can READ their own rows (row-level security).
--   * Nobody writes from the browser. The Next.js server rolls the dice,
--     plays the day with the TypeScript game rules and saves the result
--     through the two functions below, which only the service role may run.
--     That keeps dice rolls and pawn positions from being forged.

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  number integer not null check (number > 0),
  status text not null default 'active' check (status in ('active', 'won', 'ended')),
  start_date date not null,
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  length_days integer not null check (length_days > 0),
  current_square integer not null default 1 check (current_square between 1 and 100),
  won_on_day integer check (won_on_day > 0),
  ended_at timestamptz,
  rules jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, number),
  check ((status = 'won') = (won_on_day is not null)),
  check ((status = 'ended') = (ended_at is not null))
);

-- At most one active season per player.
create unique index seasons_one_active_per_user on public.seasons (user_id) where status = 'active';

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('good', 'bad')),
  label text not null check (char_length(label) between 1 and 40),
  slot smallint not null check (slot between 0 and 5),
  created_at timestamptz not null default now(),
  unique (season_id, kind, slot)
);

create index habits_season_id_idx on public.habits (season_id);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  day_number integer not null check (day_number > 0),
  roll integer not null check (roll > 0),
  start_square integer not null check (start_square between 1 and 100),
  end_square integer not null check (end_square between 1 and 100),
  reached_moksha boolean not null default false,
  created_at timestamptz not null default now(),
  -- One check-in per day.
  unique (season_id, local_date),
  unique (season_id, day_number)
);

create index check_ins_user_id_idx on public.check_ins (user_id);

create table public.check_in_habits (
  check_in_id uuid not null references public.check_ins (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('good', 'bad')),
  -- The label on the day, so history stays readable.
  label text not null,
  done boolean not null,
  -- Whether the habit's ladder or snake moved the pawn.
  applied boolean not null,
  amount integer not null check (amount >= 0),
  from_square integer check (from_square between 1 and 100),
  to_square integer check (to_square between 1 and 100),
  primary key (check_in_id, habit_id),
  check (applied = (from_square is not null and to_square is not null)),
  check (done or not applied)
);

create index check_in_habits_habit_id_idx on public.check_in_habits (habit_id);
create index check_in_habits_user_id_idx on public.check_in_habits (user_id);

-- ─── Row-level security: players read only their own rows ───────────────────

alter table public.seasons enable row level security;
alter table public.habits enable row level security;
alter table public.check_ins enable row level security;
alter table public.check_in_habits enable row level security;

create policy "Players read their own seasons" on public.seasons
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Players read their own habits" on public.habits
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Players read their own check-ins" on public.check_ins
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Players read their own check-in habits" on public.check_in_habits
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.seasons, public.habits, public.check_ins, public.check_in_habits from anon;
revoke insert, update, delete, truncate on public.seasons, public.habits, public.check_ins, public.check_in_habits
  from authenticated;
grant select on public.seasons, public.habits, public.check_ins, public.check_in_habits to authenticated;
grant all on public.seasons, public.habits, public.check_ins, public.check_in_habits to service_role;

-- ─── Writes (service role only) ─────────────────────────────────────────────

-- Ends the player's active season (if any) and starts the next one with its habits.
-- p_habits: [{ "kind": "good" | "bad", "label": text, "slot": 0-5 }, …]
create function public.start_season(
  p_user_id uuid,
  p_start_date date,
  p_time_zone text,
  p_length_days integer,
  p_rules jsonb,
  p_habits jsonb
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_season_id uuid;
  v_number integer;
begin
  -- One season change at a time per player.
  perform pg_advisory_xact_lock(hashtextextended('moksha_patam.start_season:' || p_user_id::text, 0));

  update public.seasons
     set status = 'ended', ended_at = now()
   where user_id = p_user_id and status = 'active';

  select coalesce(max(number), 0) + 1 into v_number
    from public.seasons
   where user_id = p_user_id;

  insert into public.seasons (user_id, number, start_date, time_zone, length_days, rules)
  values (p_user_id, v_number, p_start_date, p_time_zone, p_length_days, p_rules)
  returning id into v_season_id;

  insert into public.habits (season_id, user_id, kind, label, slot)
  select v_season_id, p_user_id, h.kind, h.label, h.slot
    from jsonb_to_recordset(p_habits) as h(kind text, label text, slot smallint);

  return v_season_id;
end;
$$;

-- Saves a day's check-in and moves the pawn, all or nothing.
-- Errors: MP404 unknown season, MP409 already checked in that day,
--         MP412 the season changed since it was read, MP422 habit not on the board.
-- p_habits: [{ "habit_id", "kind", "label", "done", "applied", "amount", "from_square", "to_square" }, …]
create function public.record_check_in(
  p_user_id uuid,
  p_season_id uuid,
  p_local_date date,
  p_day_number integer,
  p_roll integer,
  p_start_square integer,
  p_end_square integer,
  p_reached_moksha boolean,
  p_habits jsonb
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_check_in_id uuid;
begin
  -- Lock the season so check-ins for it happen one at a time.
  perform 1 from public.seasons where id = p_season_id and user_id = p_user_id for update;
  if not found then
    raise exception 'season % not found', p_season_id using errcode = 'MP404';
  end if;

  if exists (
    select 1 from public.check_ins
     where season_id = p_season_id and (local_date = p_local_date or day_number = p_day_number)
  ) then
    raise exception 'already checked in on %', p_local_date using errcode = 'MP409';
  end if;

  update public.seasons
     set current_square = p_end_square,
         status = case when p_reached_moksha then 'won' else status end,
         won_on_day = case when p_reached_moksha then p_day_number else won_on_day end
   where id = p_season_id and status = 'active' and current_square = p_start_square;
  if not found then
    raise exception 'season % changed since it was read', p_season_id using errcode = 'MP412';
  end if;

  if exists (
    select 1
      from jsonb_to_recordset(p_habits) as h(habit_id uuid)
     where not exists (select 1 from public.habits x where x.id = h.habit_id and x.season_id = p_season_id)
  ) then
    raise exception 'habit is not on this board' using errcode = 'MP422';
  end if;

  insert into public.check_ins (season_id, user_id, local_date, day_number, roll, start_square, end_square, reached_moksha)
  values (p_season_id, p_user_id, p_local_date, p_day_number, p_roll, p_start_square, p_end_square, p_reached_moksha)
  returning id into v_check_in_id;

  insert into public.check_in_habits (check_in_id, habit_id, user_id, kind, label, done, applied, amount, from_square, to_square)
  select v_check_in_id, h.habit_id, p_user_id, h.kind, h.label, h.done, h.applied, h.amount, h.from_square, h.to_square
    from jsonb_to_recordset(p_habits) as h(
      habit_id uuid, kind text, label text, done boolean, applied boolean,
      amount integer, from_square integer, to_square integer
    );

  return v_check_in_id;
end;
$$;

revoke all on function public.start_season(uuid, date, text, integer, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.record_check_in(uuid, uuid, date, integer, integer, integer, integer, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function public.start_season(uuid, date, text, integer, jsonb, jsonb) to service_role;
grant execute on function public.record_check_in(uuid, uuid, date, integer, integer, integer, integer, boolean, jsonb)
  to service_role;

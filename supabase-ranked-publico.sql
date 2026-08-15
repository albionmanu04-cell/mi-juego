-- FORJA ETERNA · RANKING PÚBLICO RANKED V2 · TEMPORADA 1
-- Ejecutar en Supabase > SQL Editor > New query > Run.
-- Es idempotente y no modifica los guardados ni el ranking global anterior.
--
-- Seguridad:
-- · El cliente nunca escribe perfiles ni puntuaciones directamente.
-- · Supabase crea un recibo al comenzar y lo acepta una sola vez al terminar.
-- · Los PR se recalculan en PostgreSQL y se validan tiempo, sector, abatidos y botín.
-- · Las tablas no son legibles ni editables desde las claves públicas.

create extension if not exists pgcrypto;

create table if not exists public.ranked_public_profiles (
  player_id uuid references auth.users(id) on delete cascade,
  season_id text not null default 'season-1-frontera-quebrada',
  display_name text not null check (char_length(display_name) between 3 and 20),
  class_key text not null check (class_key in ('warrior','archer','mage','priest','assassin','tamer')),
  rating integer not null default 0 check (rating between 0 and 99999),
  peak_rating integer not null default 0 check (peak_rating between 0 and 99999),
  best_sector smallint not null default 0 check (best_sector between 0 and 5),
  extractions integer not null default 0 check (extractions between 0 and 1000000),
  failed_runs integer not null default 0 check (failed_runs between 0 and 1000000),
  mobs_defeated integer not null default 0 check (mobs_defeated between 0 and 5000000),
  loot_value bigint not null default 0 check (loot_value between 0 and 1000000000000),
  updated_at timestamptz not null default now()
);

create table if not exists public.ranked_public_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  season_id text not null default 'season-1-frontera-quebrada',
  character_id text not null check (char_length(character_id) between 1 and 90),
  display_name text not null check (char_length(display_name) between 3 and 20),
  class_key text not null check (class_key in ('warrior','archer','mage','priest','assassin','tamer')),
  status text not null default 'active' check (status in ('active','submitted','expired')),
  result text check (result in ('extracted','defeated')),
  sector smallint check (sector between 1 and 5),
  mobs_defeated smallint check (mobs_defeated between 0 and 5),
  loot_value integer check (loot_value between 0 and 4500),
  rank_delta integer check (rank_delta between -36 and 150),
  rating_after integer check (rating_after between 0 and 99999),
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

-- Al actualizar desde la pretemporada, las filas anteriores se archivan en su
-- propia temporada. Las instalaciones nuevas ya nacen en Temporada 1.
alter table public.ranked_public_profiles add column if not exists season_id text;
alter table public.ranked_public_runs add column if not exists season_id text;
update public.ranked_public_profiles set season_id='preseason-0' where season_id is null;
update public.ranked_public_runs set season_id='preseason-0' where season_id is null;
alter table public.ranked_public_profiles alter column season_id set default 'season-1-frontera-quebrada';
alter table public.ranked_public_profiles alter column season_id set not null;
alter table public.ranked_public_runs alter column season_id set default 'season-1-frontera-quebrada';
alter table public.ranked_public_runs alter column season_id set not null;

alter table public.ranked_public_profiles drop constraint if exists ranked_public_profiles_pkey;
alter table public.ranked_public_profiles add primary key(player_id,season_id);

drop index if exists public.ranked_public_one_active_run_idx;
create unique index ranked_public_one_active_run_idx
on public.ranked_public_runs(player_id,season_id) where status = 'active';

drop index if exists public.ranked_public_profiles_order_idx;
create index ranked_public_profiles_order_idx
on public.ranked_public_profiles(season_id,rating desc,peak_rating desc,best_sector desc,extractions desc);

create index if not exists ranked_public_runs_player_started_idx
on public.ranked_public_runs(player_id, started_at desc);

alter table public.ranked_public_profiles enable row level security;
alter table public.ranked_public_runs enable row level security;

revoke all on public.ranked_public_profiles from anon, authenticated;
revoke all on public.ranked_public_runs from anon, authenticated;

create or replace function public.start_ranked_run(
  p_character_id text,
  p_display_name text,
  p_class_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_season_id constant text := 'season-1-frontera-quebrada';
  v_season_start constant timestamptz := '2026-08-11 03:00:00+00';
  v_season_end constant timestamptz := '2026-10-06 03:00:00+00';
  v_name text;
  v_existing public.ranked_public_runs;
  v_created public.ranked_public_runs;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if now() < v_season_start or now() >= v_season_end then
    raise exception 'ranked season is not active';
  end if;

  v_name := trim(regexp_replace(coalesce(p_display_name,''), '[[:cntrl:]<>]', '', 'g'));
  if char_length(coalesce(p_character_id,'')) not between 1 and 90
     or char_length(v_name) not between 3 and 20
     or p_class_key not in ('warrior','archer','mage','priest','assassin','tamer') then
    raise exception 'invalid ranked identity';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  update public.ranked_public_runs
     set status = 'expired'
   where player_id = v_user_id
     and season_id = v_season_id
     and status = 'active'
     and started_at < now() - interval '4 hours';

  select * into v_existing
    from public.ranked_public_runs
   where player_id = v_user_id and season_id = v_season_id and status = 'active'
   for update;

  if found then
    if v_existing.character_id is distinct from left(p_character_id,90) then
      raise exception 'another ranked run is active';
    end if;
    return jsonb_build_object(
      'run_id', v_existing.id,
      'season_id', v_season_id,
      'started_at', v_existing.started_at,
      'resumed', true
    );
  end if;

  if (select count(*) from public.ranked_public_runs
       where player_id = v_user_id and season_id = v_season_id
         and started_at > now() - interval '10 minutes') >= 8 then
    raise exception 'ranked rate limit';
  end if;

  insert into public.ranked_public_runs(player_id, season_id, character_id, display_name, class_key)
  values (v_user_id, v_season_id, left(p_character_id,90), v_name, p_class_key)
  returning * into v_created;

  return jsonb_build_object(
      'run_id', v_created.id,
      'season_id', v_season_id,
    'started_at', v_created.started_at,
    'resumed', false
  );
end;
$$;

create or replace function public.submit_ranked_run(
  p_run_id uuid,
  p_result text,
  p_sector integer,
  p_mobs_defeated integer,
  p_loot_value integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_season_id constant text := 'season-1-frontera-quebrada';
  v_run public.ranked_public_runs;
  v_profile public.ranked_public_profiles;
  v_elapsed_seconds numeric;
  v_loot_limit integer;
  v_raw_delta integer;
  v_requested_delta integer;
  v_actual_delta integer;
  v_rating_after integer;
  v_division text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_result not in ('extracted','defeated')
     or p_sector not between 1 and 5
     or p_mobs_defeated not between greatest(0,p_sector-1) and p_sector
     or p_loot_value < 0 then
    raise exception 'invalid ranked result';
  end if;
  if p_result = 'extracted' and p_sector = 1 and p_mobs_defeated <> 1 then
    raise exception 'invalid extraction';
  end if;

  select * into v_run
    from public.ranked_public_runs
   where id = p_run_id and player_id = v_user_id and season_id = v_season_id
   for update;
  if not found then
    raise exception 'ranked run not found';
  end if;
  if v_run.status <> 'active' then
    raise exception 'ranked run already closed';
  end if;

  v_elapsed_seconds := extract(epoch from (now() - v_run.started_at));
  if v_elapsed_seconds < greatest(4,p_sector*4) or v_elapsed_seconds > 14400 then
    raise exception 'implausible ranked duration';
  end if;

  v_loot_limit := case p_sector
    when 1 then 450 when 2 then 900 when 3 then 1500
    when 4 then 2600 else 4500 end;
  if p_loot_value > v_loot_limit then
    raise exception 'implausible ranked loot';
  end if;

  v_raw_delta := case when p_result = 'extracted' then
    20 + p_sector*15 + p_mobs_defeated*8 + floor(p_loot_value*.025)::integer
  else
    -(12+p_sector*4) + least(8,p_mobs_defeated)
  end;
  v_requested_delta := greatest(-36,least(150,v_raw_delta));

  insert into public.ranked_public_profiles(player_id,season_id,display_name,class_key)
  values(v_user_id,v_season_id,v_run.display_name,v_run.class_key)
  on conflict (player_id,season_id) do nothing;

  select * into v_profile
    from public.ranked_public_profiles
   where player_id = v_user_id and season_id = v_season_id
   for update;

  v_rating_after := greatest(0,least(99999,v_profile.rating+v_requested_delta));
  v_actual_delta := v_rating_after-v_profile.rating;
  v_division := case
    when v_rating_after >= 2200 then 'eternal'
    when v_rating_after >= 1500 then 'obsidian'
    when v_rating_after >= 1000 then 'gold'
    when v_rating_after >= 600 then 'silver'
    when v_rating_after >= 250 then 'bronze'
    else 'iron' end;

  update public.ranked_public_profiles
     set display_name = v_run.display_name,
         class_key = v_run.class_key,
         rating = v_rating_after,
         peak_rating = greatest(peak_rating,v_rating_after),
         best_sector = greatest(best_sector,p_sector),
         extractions = extractions + case when p_result='extracted' then 1 else 0 end,
         failed_runs = failed_runs + case when p_result='defeated' then 1 else 0 end,
         mobs_defeated = mobs_defeated + p_mobs_defeated,
         loot_value = loot_value + case when p_result='extracted' then p_loot_value else 0 end,
         updated_at = now()
   where player_id = v_user_id and season_id = v_season_id;

  update public.ranked_public_runs
     set status='submitted', result=p_result, sector=p_sector,
         mobs_defeated=p_mobs_defeated, loot_value=p_loot_value,
         rank_delta=v_actual_delta, rating_after=v_rating_after,
         submitted_at=now()
   where id=p_run_id;

  return jsonb_build_object(
    'accepted', true,
    'season_id', v_season_id,
    'run_id', p_run_id,
    'rank_delta', v_actual_delta,
    'rating_after', v_rating_after,
    'division', v_division
  );
end;
$$;

create or replace function public.get_ranked_leaderboard(p_limit integer default 50)
returns table(
  rank_position bigint,
  display_name text,
  class_key text,
  rating integer,
  peak_rating integer,
  best_sector smallint,
  extractions integer,
  mobs_defeated integer,
  division text,
  is_current boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select ranked.rank_position, ranked.display_name, ranked.class_key,
         ranked.rating, ranked.peak_rating, ranked.best_sector,
         ranked.extractions, ranked.mobs_defeated,
         case
           when ranked.rating >= 2200 then 'eternal'
           when ranked.rating >= 1500 then 'obsidian'
           when ranked.rating >= 1000 then 'gold'
           when ranked.rating >= 600 then 'silver'
           when ranked.rating >= 250 then 'bronze'
           else 'iron' end as division,
         ranked.player_id = auth.uid() as is_current,
         ranked.updated_at
    from (
      select row_number() over (
               order by profile.rating desc, profile.peak_rating desc,
                        profile.best_sector desc, profile.extractions desc,
                        profile.updated_at asc
             ) as rank_position,
             profile.*
        from public.ranked_public_profiles profile
       where profile.season_id = 'season-1-frontera-quebrada'
    ) ranked
   order by ranked.rank_position
   limit greatest(1,least(100,coalesce(p_limit,50)));
$$;

revoke all on function public.start_ranked_run(text,text,text) from public, anon;
revoke all on function public.submit_ranked_run(uuid,text,integer,integer,integer) from public, anon;
revoke all on function public.get_ranked_leaderboard(integer) from public;

grant execute on function public.start_ranked_run(text,text,text) to authenticated;
grant execute on function public.submit_ranked_run(uuid,text,integer,integer,integer) to authenticated;
grant execute on function public.get_ranked_leaderboard(integer) to anon, authenticated;

-- FORJA ETERNA · guardado privado, versionado y resistente a conflictos.
-- Ejecutar en Supabase > SQL Editor > New query > Run.
-- Es idempotente: se puede volver a ejecutar al publicar una actualización.

create table if not exists public.player_saves (
  player_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  last_device_id text,
  updated_at timestamptz not null default now()
);

alter table public.player_saves
  add column if not exists revision bigint not null default 0,
  add column if not exists last_device_id text;

alter table public.player_saves enable row level security;

drop policy if exists "player_saves_select_own" on public.player_saves;
create policy "player_saves_select_own"
on public.player_saves for select
to authenticated
using (auth.uid() = player_id);

drop policy if exists "player_saves_insert_own" on public.player_saves;
drop policy if exists "player_saves_update_own" on public.player_saves;

-- Compare-and-swap: el cliente sólo puede guardar sobre la revisión que leyó.
-- Si otro dispositivo se adelantó, devuelve applied=false junto con la copia
-- vigente para que el cliente fusione y reintente sin perder progreso.
create or replace function public.sync_player_save(
  expected_revision bigint,
  next_payload jsonb,
  device_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_revision bigint;
  current_payload jsonb;
  next_revision bigint;
  saved_at timestamptz;
  inserted_rows integer;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  if next_payload is null
     or next_payload->>'ownerId' is distinct from current_user_id::text
     or next_payload->>'season' is distinct from 'temporada-2'
     or next_payload->>'version' is distinct from '3'
     or case
          when jsonb_typeof(next_payload->'roster') = 'array'
            then jsonb_array_length(next_payload->'roster') > 3
          else true
        end
     or octet_length(next_payload::text) > 2097152 then
    raise exception 'invalid cloud payload';
  end if;

  select ps.revision, ps.payload
    into current_revision, current_payload
    from public.player_saves ps
    where ps.player_id = current_user_id
    for update;

  if not found then
    if coalesce(expected_revision, 0) <> 0 then
      return jsonb_build_object(
        'applied', false,
        'revision', 0,
        'payload', null
      );
    end if;

    next_revision := 1;
    saved_at := now();
    insert into public.player_saves(player_id, payload, revision, last_device_id, updated_at)
    values (current_user_id, next_payload, next_revision, left(device_id, 120), saved_at)
    on conflict (player_id) do nothing;
    get diagnostics inserted_rows = row_count;
    if inserted_rows = 0 then
      select ps.revision, ps.payload
        into current_revision, current_payload
        from public.player_saves ps
        where ps.player_id = current_user_id;
      return jsonb_build_object(
        'applied', false,
        'revision', coalesce(current_revision, 0),
        'payload', current_payload
      );
    end if;
    return jsonb_build_object(
      'applied', true,
      'revision', next_revision,
      'payload', next_payload,
      'updated_at', saved_at
    );
  end if;

  if current_revision <> coalesce(expected_revision, 0) then
    return jsonb_build_object(
      'applied', false,
      'revision', current_revision,
      'payload', current_payload
    );
  end if;

  next_revision := current_revision + 1;
  saved_at := now();
  update public.player_saves
    set payload = next_payload,
        revision = next_revision,
        last_device_id = left(device_id, 120),
        updated_at = saved_at
    where player_id = current_user_id;

  return jsonb_build_object(
    'applied', true,
    'revision', next_revision,
    'payload', next_payload,
    'updated_at', saved_at
  );
end;
$$;

revoke all on public.player_saves from anon;
revoke insert, update, delete on public.player_saves from authenticated;
revoke all on function public.sync_player_save(bigint, jsonb, text) from public, anon;
grant select on public.player_saves to authenticated;
grant execute on function public.sync_player_save(bigint, jsonb, text) to authenticated;

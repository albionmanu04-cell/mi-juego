-- FORJA ETERNA · sesión única por cuenta.
-- Evita que la misma cuenta juegue en dos navegadores/dispositivos a la vez.
-- Ejecutar en Supabase > SQL Editor > New query > Run, DESPUÉS de
-- supabase-cloud-save.sql (usa la misma auth.users). Es idempotente: se
-- puede volver a ejecutar al publicar una actualización.
--
-- CÓMO FUNCIONA
-- --------------
-- Cada dispositivo conectado manda un "latido" cada ~25s. Si pasan más de
-- SESSION_TIMEOUT segundos sin latido, la sesión se considera abandonada
-- (se cerró la pestaña, se quedó sin señal, etc.) y cualquier dispositivo
-- puede reclamarla sin pedir confirmación. Si hay un latido reciente de OTRO
-- dispositivo, el cliente debe pedir confirmación antes de "forzar" la toma
-- de control (eso cierra la sesión vieja).

create table if not exists public.player_sessions (
  player_id uuid primary key references auth.users(id) on delete cascade,
  device_id text not null,
  started_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

alter table public.player_sessions enable row level security;

drop policy if exists "player_sessions_select_own" on public.player_sessions;
create policy "player_sessions_select_own"
on public.player_sessions for select
to authenticated
using (auth.uid() = player_id);

-- Intenta tomar la sesión para device_id. Devuelve claimed=true si lo logra.
-- Si otra sesión sigue "viva" (latido dentro de la ventana) y force=false,
-- devuelve claimed=false junto al device_id rival para que el cliente
-- pregunte "¿cerrar esa sesión y continuar acá?" antes de reintentar con
-- force=true.
create or replace function public.claim_player_session(
  device_id text,
  force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  session_timeout constant interval := interval '45 seconds';
  existing record;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;
  if device_id is null or length(device_id) = 0 then
    raise exception 'device_id required';
  end if;

  select ps.device_id, ps.last_seen into existing
    from public.player_sessions ps
    where ps.player_id = current_user_id
    for update;

  if not found then
    insert into public.player_sessions(player_id, device_id, started_at, last_seen)
    values (current_user_id, left(device_id, 120), now(), now());
    return jsonb_build_object('claimed', true);
  end if;

  if existing.device_id = device_id then
    update public.player_sessions set last_seen = now()
      where player_id = current_user_id;
    return jsonb_build_object('claimed', true);
  end if;

  if now() - existing.last_seen > session_timeout or force then
    update public.player_sessions
      set device_id = left(device_id, 120), started_at = now(), last_seen = now()
      where player_id = current_user_id;
    return jsonb_build_object('claimed', true, 'took_over', existing.device_id is distinct from device_id);
  end if;

  return jsonb_build_object(
    'claimed', false,
    'other_device', existing.device_id,
    'last_seen', existing.last_seen
  );
end;
$$;

-- Latido periódico. Devuelve active=false si otro dispositivo tomó la
-- sesión mientras tanto (el cliente debe dejar de jugar/guardar y avisar).
create or replace function public.heartbeat_player_session(
  device_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing record;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  select ps.device_id into existing
    from public.player_sessions ps
    where ps.player_id = current_user_id
    for update;

  if not found or existing.device_id <> device_id then
    return jsonb_build_object('active', false);
  end if;

  update public.player_sessions set last_seen = now()
    where player_id = current_user_id;
  return jsonb_build_object('active', true);
end;
$$;

-- Libera la sesión al cerrar sesión de forma prolija (permite reconectar
-- desde otro dispositivo al instante, sin esperar el timeout).
create or replace function public.release_player_session(
  device_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.player_sessions
    where player_id = auth.uid() and device_id = release_player_session.device_id;
end;
$$;

revoke all on public.player_sessions from anon;
revoke all on public.player_sessions from authenticated;
revoke all on function public.claim_player_session(text, boolean) from public, anon;
revoke all on function public.heartbeat_player_session(text) from public, anon;
revoke all on function public.release_player_session(text) from public, anon;
grant select on public.player_sessions to authenticated;
grant execute on function public.claim_player_session(text, boolean) to authenticated;
grant execute on function public.heartbeat_player_session(text) to authenticated;
grant execute on function public.release_player_session(text) to authenticated;

-- FORJA ETERNA · guardado privado por cuenta
-- Ejecutar una sola vez en Supabase > SQL Editor > New query > Run.

create table if not exists public.player_saves (
  player_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.player_saves enable row level security;

drop policy if exists "player_saves_select_own" on public.player_saves;
create policy "player_saves_select_own"
on public.player_saves for select
to authenticated
using (auth.uid() = player_id);

drop policy if exists "player_saves_insert_own" on public.player_saves;
create policy "player_saves_insert_own"
on public.player_saves for insert
to authenticated
with check (auth.uid() = player_id);

drop policy if exists "player_saves_update_own" on public.player_saves;
create policy "player_saves_update_own"
on public.player_saves for update
to authenticated
using (auth.uid() = player_id)
with check (auth.uid() = player_id);

revoke all on public.player_saves from anon;
grant select, insert, update on public.player_saves to authenticated;

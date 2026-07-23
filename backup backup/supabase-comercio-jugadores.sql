-- FORJA ETERNA · Comercio entre jugadores (Lonja de Aventureros)
-- Ejecutar UNA sola vez en Supabase > SQL Editor > New query > Run.
-- Usa Sellos del Gremio. El saldo se guarda dentro de cada partida, no en esta tabla.

create table if not exists public.trade_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  seller_name text not null check (char_length(seller_name) between 1 and 28),
  item jsonb not null,
  price integer not null check (price between 5 and 99999),
  status text not null default 'active' check (status in ('active','sold','cancelled')),
  buyer_id uuid references auth.users(id) on delete set null,
  seller_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists trade_listings_active_created_idx
on public.trade_listings(status, created_at desc);

alter table public.trade_listings enable row level security;

drop policy if exists "trade_read_active_or_own" on public.trade_listings;
create policy "trade_read_active_or_own" on public.trade_listings for select to authenticated
using (status = 'active' or seller_id = auth.uid() or buyer_id = auth.uid());

-- Las mutaciones pasan por las funciones de abajo. Nadie escribe filas directo.
revoke all on public.trade_listings from anon, authenticated;
grant select on public.trade_listings to authenticated;

create or replace function public.create_trade_listing(p_item jsonb, p_price integer, p_seller_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare listing public.trade_listings;
begin
  if auth.uid() is null then raise exception 'Debés iniciar sesión.'; end if;
  if p_price < 5 or p_price > 99999 then raise exception 'Precio inválido.'; end if;
  if coalesce(p_item->>'name','') = '' then raise exception 'La pieza no es válida.'; end if;
  insert into public.trade_listings(seller_id,seller_name,item,price)
  values(auth.uid(), left(coalesce(nullif(trim(p_seller_name),''),'Aventurero'),28), p_item, p_price)
  returning * into listing;
  return jsonb_build_object('id',listing.id,'item',listing.item,'price',listing.price);
end $$;

create or replace function public.buy_trade_listing(p_listing_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare listing public.trade_listings;
begin
  if auth.uid() is null then raise exception 'Debés iniciar sesión.'; end if;
  update public.trade_listings
  set status='sold', buyer_id=auth.uid(), sold_at=now()
  where id=p_listing_id and status='active' and seller_id<>auth.uid()
  returning * into listing;
  if not found then raise exception 'La pieza ya no está disponible.'; end if;
  return jsonb_build_object('id',listing.id,'item',listing.item,'price',listing.price,'seller_name',listing.seller_name);
end $$;

create or replace function public.cancel_trade_listing(p_listing_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare listing public.trade_listings;
begin
  if auth.uid() is null then raise exception 'Debés iniciar sesión.'; end if;
  update public.trade_listings set status='cancelled'
  where id=p_listing_id and seller_id=auth.uid() and status='active'
  returning * into listing;
  if not found then raise exception 'La publicación no se puede retirar.'; end if;
  return jsonb_build_object('id',listing.id,'item',listing.item);
end $$;

create or replace function public.claim_trade_sales()
returns jsonb language plpgsql security definer set search_path = public as $$
declare payout integer;
begin
  if auth.uid() is null then raise exception 'Debés iniciar sesión.'; end if;
  select coalesce(sum(price),0)::integer into payout
  from public.trade_listings where seller_id=auth.uid() and status='sold' and seller_claimed=false;
  update public.trade_listings set seller_claimed=true
  where seller_id=auth.uid() and status='sold' and seller_claimed=false;
  return jsonb_build_object('marks',payout);
end $$;

revoke all on function public.create_trade_listing(jsonb,integer,text) from public;
revoke all on function public.buy_trade_listing(uuid) from public;
revoke all on function public.cancel_trade_listing(uuid) from public;
revoke all on function public.claim_trade_sales() from public;
grant execute on function public.create_trade_listing(jsonb,integer,text) to authenticated;
grant execute on function public.buy_trade_listing(uuid) to authenticated;
grant execute on function public.cancel_trade_listing(uuid) to authenticated;
grant execute on function public.claim_trade_sales() to authenticated;

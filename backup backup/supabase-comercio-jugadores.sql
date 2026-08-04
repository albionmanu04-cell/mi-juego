-- FORJA ETERNA · COMERCIO SEGURO V2
-- Ejecutar UNA sola vez en Supabase > SQL Editor > New query > Run.
--
-- Esta migracion deja las publicaciones del sistema anterior congeladas y
-- crea un mercado nuevo. No borra filas antiguas. Las mutaciones V2 solo se
-- pueden hacer mediante funciones SECURITY DEFINER y cada compra liquida el
-- saldo, la pieza y la publicacion dentro de una misma transaccion.

create extension if not exists pgcrypto;

-- Cierra el acceso al protocolo anterior sin destruir su historial.
do $$
begin
  if to_regclass('public.trade_listings') is not null then
    execute 'revoke all on public.trade_listings from anon, authenticated';
  end if;
end $$;

drop function if exists public.create_trade_listing(jsonb, integer, text);
drop function if exists public.buy_trade_listing(uuid);
drop function if exists public.cancel_trade_listing(uuid);
drop function if exists public.claim_trade_sales();

create table if not exists public.trade_v2_wallets (
  player_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 30 check (balance between 0 and 100000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trade_v2_items (
  id uuid primary key default gen_random_uuid(),
  origin_id uuid not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  item jsonb not null,
  status text not null default 'inventory' check (status in ('inventory','listed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trade_v2_listings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.trade_v2_items(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete cascade,
  seller_name text not null check (char_length(seller_name) between 1 and 28),
  price integer not null check (price between 5 and 99999),
  status text not null default 'active' check (status in ('active','sold','cancelled')),
  buyer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sold_at timestamptz,
  cancelled_at timestamptz
);

create unique index if not exists trade_v2_one_active_listing_per_item_idx
on public.trade_v2_listings(item_id) where status = 'active';

create index if not exists trade_v2_active_created_idx
on public.trade_v2_listings(status, created_at desc);

create index if not exists trade_v2_seller_status_idx
on public.trade_v2_listings(seller_id, status, created_at desc);

create table if not exists public.trade_v2_ledger (
  id bigint generated always as identity primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  counterparty_id uuid references auth.users(id) on delete set null,
  listing_id uuid references public.trade_v2_listings(id) on delete set null,
  kind text not null check (kind in ('purchase','sale')),
  amount integer not null check (amount <> 0),
  created_at timestamptz not null default now()
);

alter table public.trade_v2_wallets enable row level security;
alter table public.trade_v2_items enable row level security;
alter table public.trade_v2_listings enable row level security;
alter table public.trade_v2_ledger enable row level security;

revoke all on public.trade_v2_wallets from anon, authenticated;
revoke all on public.trade_v2_items from anon, authenticated;
revoke all on public.trade_v2_listings from anon, authenticated;
revoke all on public.trade_v2_ledger from anon, authenticated;

-- Convierte un objeto del navegador en una representacion acotada y segura.
-- Los campos desconocidos se descartan y las rutas/colores nunca se aceptan
-- desde la red: se derivan de la rareza o se validan contra una ruta local.
create or replace function public.trade_v2_sanitize_item(p_item jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_id text;
  v_type text;
  v_name text;
  v_rarity_key text;
  v_rarity text;
  v_color text;
  v_glow text;
  v_image text;
  v_icon text;
  v_class text;
  v_subclass text;
  v_tier text;
  v_set_id text;
  v_set_label text;
  v_forge_outcome text;
  v_forge_label text;
  v_result jsonb;
  v_value numeric;
  v_key text;
begin
  if p_item is null or jsonb_typeof(p_item) <> 'object' or octet_length(p_item::text) > 12000 then
    raise exception 'La pieza no es valida.';
  end if;

  v_id := trim(coalesce(p_item->>'id',''));
  v_type := trim(coalesce(p_item->>'type',''));
  v_name := trim(coalesce(p_item->>'name',''));
  v_rarity_key := lower(trim(coalesce(p_item->>'rarityKey','common')));
  v_image := trim(coalesce(p_item->>'image',''));
  v_icon := left(coalesce(p_item->>'icon',''), 24);
  v_class := nullif(lower(trim(coalesce(p_item->>'classOnly',''))),'');
  v_subclass := nullif(lower(trim(coalesce(p_item->>'subclassOnly',''))),'');
  v_tier := nullif(lower(trim(coalesce(p_item->>'equipmentTier',''))),'');
  v_set_id := nullif(trim(coalesce(p_item->>'setId','')),'');
  v_set_label := nullif(left(trim(coalesce(p_item->>'setLabel','')),80),'');
  v_forge_outcome := nullif(lower(trim(coalesce(p_item->>'forgeOutcome',''))),'');
  v_forge_label := nullif(left(trim(coalesce(p_item->>'forgeLabel','')),60),'');

  if v_id !~ '^[A-Za-z0-9_-]{1,120}$' then raise exception 'Identificador de pieza invalido.'; end if;
  if v_type not in ('helmet','chest','gloves','boots','weapon','shield','ring') then raise exception 'Ranura de pieza invalida.'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 80 or v_name ~ '[<>\x00-\x1F]' then raise exception 'Nombre de pieza invalido.'; end if;
  if v_rarity_key not in ('common','uncommon','rare','epic','legendary','mythic','unique','ancestral') then raise exception 'Rareza invalida.'; end if;
  if v_image <> '' and (v_image !~ '^assets/images/[A-Za-z0-9 _./-]+\.(webp|png|jpg)$' or v_image like '%..%') then raise exception 'Imagen de pieza invalida.'; end if;
  if v_class is not null and v_class not in ('warrior','archer','mage','priest','assassin','tamer') then raise exception 'Clase de pieza invalida.'; end if;
  if v_subclass is not null and v_subclass !~ '^[a-z-]{1,32}$' then raise exception 'Subclase de pieza invalida.'; end if;
  if v_tier is not null and v_tier not in ('base','class','subclass','forge') then raise exception 'Tier de pieza invalido.'; end if;
  if v_set_id is not null and v_set_id !~ '^[A-Za-z0-9_-]{1,100}$' then raise exception 'Set de pieza invalido.'; end if;
  if v_forge_outcome is not null and v_forge_outcome not in ('stable','refined','masterwork','perfect') then raise exception 'Resultado de forja invalido.'; end if;
  if v_icon ~ '[<>&"''\x00-\x1F]' then v_icon := ''; end if;
  if v_set_label is not null and v_set_label ~ '[<>&"''\x00-\x1F]' then raise exception 'Nombre de set invalido.'; end if;
  if v_forge_label is not null and v_forge_label ~ '[<>&"''\x00-\x1F]' then raise exception 'Etiqueta de forja invalida.'; end if;

  select label, color, glow into v_rarity, v_color, v_glow
  from (values
    ('common','Comun','#a9b3bd','rgba(169,179,189,.24)'),
    ('uncommon','Poco comun','#75c977','rgba(76,181,88,.28)'),
    ('rare','Raro','#5bb6ff','rgba(67,150,242,.30)'),
    ('epic','Epico','#c77cff','rgba(184,88,240,.34)'),
    ('legendary','Legendario','#ffae42','rgba(246,161,45,.37)'),
    ('mythic','Mitico','#ff5d7a','rgba(240,65,101,.40)'),
    ('unique','Unico','#f6ecad','rgba(246,236,173,.48)'),
    ('ancestral','Ancestral','#7cf7ff','rgba(124,247,255,.50)')
  ) as rarity(key,label,color,glow)
  where key = v_rarity_key;

  v_result := jsonb_strip_nulls(jsonb_build_object(
    'id',v_id,
    'type',v_type,
    'name',v_name,
    'rarityKey',v_rarity_key,
    'rarity',v_rarity,
    'color',v_color,
    'glow',v_glow,
    'image',nullif(v_image,''),
    'icon',nullif(v_icon,''),
    'classOnly',v_class,
    'subclassOnly',v_subclass,
    'equipmentTier',v_tier,
    'setId',v_set_id,
    'setLabel',v_set_label,
    'forgeOutcome',v_forge_outcome,
    'forgeLabel',v_forge_label,
    'crafted',coalesce((p_item->>'crafted')::boolean,false),
    'forgeExclusive',coalesce((p_item->>'forgeExclusive')::boolean,false)
  ));

  foreach v_key in array array['bonusAtk','bonusDef','bonusHp','bonusMana','bonusCrit','bonusCritDmg','bonusSpeed'] loop
    if p_item ? v_key then
      begin
        v_value := (p_item->>v_key)::numeric;
      exception when others then
        raise exception 'Estadistica de pieza invalida.';
      end;
      if v_value < 0 or v_value > 2000 then raise exception 'Estadistica de pieza fuera de rango.'; end if;
      v_result := v_result || jsonb_build_object(v_key, round(v_value)::integer);
    end if;
  end loop;

  if p_item ? 'enhanceLevel' then
    begin v_value := (p_item->>'enhanceLevel')::numeric;
    exception when others then raise exception 'Nivel de mejora invalido.'; end;
    if v_value < 0 or v_value > 13 then raise exception 'Nivel de mejora fuera de rango.'; end if;
    v_result := v_result || jsonb_build_object('enhanceLevel',floor(v_value)::integer);
  end if;

  if p_item ? 'price' then
    begin v_value := (p_item->>'price')::numeric;
    exception when others then raise exception 'Valor de pieza invalido.'; end;
    if v_value < 0 or v_value > 100000 then raise exception 'Valor de pieza fuera de rango.'; end if;
    v_result := v_result || jsonb_build_object('price',floor(v_value)::integer);
  end if;

  return v_result;
exception
  when invalid_text_representation then
    raise exception 'La pieza contiene datos invalidos.';
end $$;

create or replace function public.trade_v2_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_balance integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  insert into public.trade_v2_wallets(player_id) values(auth.uid())
  on conflict (player_id) do nothing;
  select balance into v_balance from public.trade_v2_wallets where player_id=auth.uid();
  return jsonb_build_object('protocol',2,'balance',v_balance);
end $$;

create or replace function public.trade_v2_list_market()
returns table(id uuid, seller_id uuid, seller_name text, item jsonb, price integer, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select l.id, l.seller_id, l.seller_name,
         i.item || jsonb_build_object('tradeUid',i.origin_id::text),
         l.price, l.created_at
  from public.trade_v2_listings l
  join public.trade_v2_items i on i.id=l.item_id
  where auth.uid() is not null and l.status='active' and i.status='listed'
  order by l.created_at desc
  limit 60
$$;

create or replace function public.trade_v2_create_listing(
  p_origin_id uuid,
  p_item jsonb,
  p_price integer,
  p_seller_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.trade_v2_items;
  v_listing public.trade_v2_listings;
  v_safe_item jsonb;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  if p_origin_id is null then raise exception 'La pieza no tiene identidad de comercio.'; end if;
  if p_price < 5 or p_price > 99999 then raise exception 'Precio invalido.'; end if;
  v_name := left(coalesce(nullif(trim(p_seller_name),''),'Aventurero'),28);
  if v_name ~ '[<>\x00-\x1F]' then raise exception 'Nombre de vendedor invalido.'; end if;

  insert into public.trade_v2_wallets(player_id) values(auth.uid())
  on conflict (player_id) do nothing;

  select * into v_item from public.trade_v2_items where origin_id=p_origin_id for update;
  if found then
    if v_item.owner_id <> auth.uid() then raise exception 'La pieza pertenece a otra cuenta.'; end if;
    if v_item.status <> 'inventory' then raise exception 'La pieza ya esta publicada.'; end if;
    v_safe_item := v_item.item;
  else
    v_safe_item := public.trade_v2_sanitize_item(p_item);
    insert into public.trade_v2_items(origin_id,owner_id,item,status)
    values(p_origin_id,auth.uid(),v_safe_item,'inventory') returning * into v_item;
  end if;

  update public.trade_v2_items set status='listed',updated_at=now() where id=v_item.id;
  insert into public.trade_v2_listings(item_id,seller_id,seller_name,price)
  values(v_item.id,auth.uid(),v_name,p_price) returning * into v_listing;

  return jsonb_build_object('protocol',2,'id',v_listing.id,'item_id',v_item.id,'origin_id',v_item.origin_id,'price',v_listing.price);
end $$;

create or replace function public.trade_v2_buy_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.trade_v2_listings;
  v_item public.trade_v2_items;
  v_buyer_balance integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;

  select * into v_listing from public.trade_v2_listings
  where id=p_listing_id and status='active' for update;
  if not found then raise exception 'La pieza ya no esta disponible.'; end if;
  if v_listing.seller_id=auth.uid() then raise exception 'No puedes comprar tu propia pieza.'; end if;

  insert into public.trade_v2_wallets(player_id) values(auth.uid()) on conflict (player_id) do nothing;
  insert into public.trade_v2_wallets(player_id) values(v_listing.seller_id) on conflict (player_id) do nothing;

  -- El orden estable evita interbloqueos cuando dos cuentas compran a la vez.
  perform 1 from public.trade_v2_wallets
  where player_id in (auth.uid(),v_listing.seller_id)
  order by player_id for update;

  select balance into v_buyer_balance from public.trade_v2_wallets where player_id=auth.uid();
  if v_buyer_balance < v_listing.price then raise exception 'Sellos insuficientes.'; end if;

  select * into v_item from public.trade_v2_items
  where id=v_listing.item_id and owner_id=v_listing.seller_id and status='listed' for update;
  if not found then raise exception 'La pieza no esta disponible.'; end if;

  update public.trade_v2_wallets set balance=balance-v_listing.price,updated_at=now() where player_id=auth.uid();
  update public.trade_v2_wallets set balance=balance+v_listing.price,updated_at=now() where player_id=v_listing.seller_id;
  update public.trade_v2_items set owner_id=auth.uid(),status='inventory',updated_at=now() where id=v_item.id;
  update public.trade_v2_listings set status='sold',buyer_id=auth.uid(),sold_at=now() where id=v_listing.id;

  insert into public.trade_v2_ledger(player_id,counterparty_id,listing_id,kind,amount)
  values
    (auth.uid(),v_listing.seller_id,v_listing.id,'purchase',-v_listing.price),
    (v_listing.seller_id,auth.uid(),v_listing.id,'sale',v_listing.price);

  return jsonb_build_object(
    'protocol',2,
    'id',v_listing.id,
    'price',v_listing.price,
    'balance',v_buyer_balance-v_listing.price,
    'seller_name',v_listing.seller_name,
    'item',v_item.item || jsonb_build_object('tradeUid',v_item.origin_id::text)
  );
end $$;

create or replace function public.trade_v2_cancel_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.trade_v2_listings;
  v_item public.trade_v2_items;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  select * into v_listing from public.trade_v2_listings
  where id=p_listing_id and seller_id=auth.uid() and status='active' for update;
  if not found then raise exception 'La publicacion no se puede retirar.'; end if;
  select * into v_item from public.trade_v2_items
  where id=v_listing.item_id and owner_id=auth.uid() and status='listed' for update;
  if not found then raise exception 'La pieza no se puede recuperar.'; end if;

  update public.trade_v2_items set status='inventory',updated_at=now() where id=v_item.id;
  update public.trade_v2_listings set status='cancelled',cancelled_at=now() where id=v_listing.id;
  return jsonb_build_object('protocol',2,'id',v_listing.id,'item',v_item.item || jsonb_build_object('tradeUid',v_item.origin_id::text));
end $$;

revoke all on function public.trade_v2_sanitize_item(jsonb) from public;
revoke all on function public.trade_v2_account() from public;
revoke all on function public.trade_v2_list_market() from public;
revoke all on function public.trade_v2_create_listing(uuid,jsonb,integer,text) from public;
revoke all on function public.trade_v2_buy_listing(uuid) from public;
revoke all on function public.trade_v2_cancel_listing(uuid) from public;

grant execute on function public.trade_v2_account() to authenticated;
grant execute on function public.trade_v2_list_market() to authenticated;
grant execute on function public.trade_v2_create_listing(uuid,jsonb,integer,text) to authenticated;
grant execute on function public.trade_v2_buy_listing(uuid) to authenticated;
grant execute on function public.trade_v2_cancel_listing(uuid) to authenticated;

comment on table public.trade_v2_wallets is 'Saldo autoritativo de Sellos para comercio V2.';
comment on table public.trade_v2_items is 'Piezas admitidas al mercado; una sola cuenta es propietaria en cada instante.';
comment on table public.trade_v2_listings is 'Historial de publicaciones V2. Solo una publicacion activa por pieza.';
comment on table public.trade_v2_ledger is 'Libro contable inmutable de compras y ventas V2.';

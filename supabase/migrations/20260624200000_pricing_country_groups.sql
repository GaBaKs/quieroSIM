-- Fase 1 del nuevo modelo de precios (grupos de países, data-driven).
-- Esta migración SOLO crea el esquema + seed. NO recalcula precios ni cambia el
-- trigger calculate_plan_pricing (eso es Fase 2). El catálogo sigue intacto.
--
-- Modelo: cada país cae en un grupo (Default = catch-all, o LatAm). Cada grupo
-- tiene su tabla de precios de competencia por arquetipo (GB/días) + un piso %.
-- Precio auto = MAX(competencia×(1−desc%), costo×(1+piso%)); si uno está vacío,
-- manda el otro; si ninguno, márgenes por rango de costo; si nada, fallback.

-- ── 1) Grupos de países ──────────────────────────────────────────────────────
create table if not exists country_group (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  is_default boolean not null default false,
  floor_markup_pct numeric,                       -- piso % (null = sin candidato piso)
  competitor_discount_pct numeric default 10,     -- descuento sobre el precio de competencia
  use_competitor_table boolean not null default true, -- false = ignora la tabla de competencia
  feature_unlimited boolean not null default true,    -- ¿ilimitados de este grupo = estrella?
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
-- Un solo grupo default.
create unique index if not exists country_group_one_default on country_group (is_default) where is_default = true;

alter table country_group enable row level security;
drop policy if exists country_group_super_admin on country_group;
create policy country_group_super_admin on country_group
  for all using (is_super_admin()) with check (is_super_admin());

-- ── 2) Membresía país → grupo (cada país en UN grupo) ────────────────────────
create table if not exists country_group_member (
  iso_country text primary key,                   -- ISO2; unicidad = un grupo por país
  group_id uuid not null references country_group(id) on delete cascade
);
create index if not exists country_group_member_group on country_group_member(group_id);

alter table country_group_member enable row level security;
drop policy if exists country_group_member_super_admin on country_group_member;
create policy country_group_member_super_admin on country_group_member
  for all using (is_super_admin()) with check (is_super_admin());

-- ── 3) Tabla de competencia POR GRUPO (por arquetipo GB/días) ────────────────
-- Para ilimitados, data_amount = 'NaN' (igual que en plan.data_amount), así el
-- match es uniforme por (data_amount, duration_days).
create table if not exists group_competitor_price (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references country_group(id) on delete cascade,
  is_unlimited boolean not null default false,
  data_amount text not null,                      -- '0.49','1',... o 'NaN' (ilimitado)
  duration_days int not null,
  competitor_usd numeric,                         -- menor precio de la competencia (USD)
  label text,
  sort_order int not null default 0,
  unique (group_id, data_amount, duration_days)
);

alter table group_competitor_price enable row level security;
drop policy if exists group_competitor_price_super_admin on group_competitor_price;
create policy group_competitor_price_super_admin on group_competitor_price
  for all using (is_super_admin()) with check (is_super_admin());

-- ── 4) Márgenes por rango de COSTO (€), por grupo (red de seguridad) ──────────
create table if not exists group_margin_range (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references country_group(id) on delete cascade,
  min_cost_eur numeric not null default 0,
  max_cost_eur numeric,                           -- null = sin tope (último rango)
  margin_pct numeric not null,
  sort_order int not null default 0
);

alter table group_margin_range enable row level security;
drop policy if exists group_margin_range_super_admin on group_margin_range;
create policy group_margin_range_super_admin on group_margin_range
  for all using (is_super_admin()) with check (is_super_admin());

-- ── 5) Redondeo psicológico: umbral .50 (antes .49) ──────────────────────────
-- Reproduce la tabla del PDF: floor(x) + (decimales ≤ .50 ? .49 : .99).
-- Solo afecta cálculos FUTUROS (no dispara recalc).
create or replace function round_psych(x numeric) returns numeric
  language sql immutable as $$
  select floor(x) + case when (x - floor(x)) <= 0.50 then 0.49 else 0.99 end;
$$;

-- ── 6) Seed ──────────────────────────────────────────────────────────────────
-- Grupo Default (internacional, catch-all).
insert into country_group (name, slug, is_default, floor_markup_pct, competitor_discount_pct, use_competitor_table, feature_unlimited, sort_order)
select 'Internacional (default)', 'default', true, 40, 10, true, true, 0
where not exists (select 1 from country_group where is_default = true);

-- Grupo Latinoamérica (piso manda; ilimitados sin estrella).
insert into country_group (name, slug, is_default, floor_markup_pct, competitor_discount_pct, use_competitor_table, feature_unlimited, sort_order)
select 'Latinoamérica', 'latam', false, 40, 10, true, false, 1
where not exists (select 1 from country_group where slug = 'latam');

-- Miembros iniciales de LatAm (editables desde admin).
insert into country_group_member (iso_country, group_id)
select v.iso, g.id
from country_group g
cross join (values ('AR'),('BO'),('BR'),('CL'),('CO'),('CR'),('DO'),('EC'),('GT'),('HN'),('MX'),('NI'),('PA'),('PE'),('PY'),('SV'),('UY'),('VE')) as v(iso)
where g.slug = 'latam'
on conflict (iso_country) do nothing;

-- Tabla de competencia del Default (8 por-GB + 3 ilimitados, valores del PDF).
-- LatAm se deja vacía a propósito: con use_competitor_table=true pero sin filas,
-- A queda null y manda el piso (que es el comportamiento buscado en LatAm).
insert into group_competitor_price (group_id, is_unlimited, data_amount, duration_days, competitor_usd, label, sort_order)
select g.id, v.is_unl, v.da, v.dur, v.comp, v.lbl, v.so
from country_group g
cross join (values
  (false, '0.49', 1,  1.99::numeric, '0,49 GB / 1 día',  1),
  (false, '1',    7,  3.50,          '1 GB / 7 días',    2),
  (false, '3',    7,  8.95,          '3 GB / 7 días',    3),
  (false, '5',    15, 9.45,          '5 GB / 15 días',   4),
  (false, '10',   30, 17.95,         '10 GB / 30 días',  5),
  (false, '15',   30, 24.00,         '15 GB / 30 días',  6),
  (false, '20',   30, 33.95,         '20 GB / 30 días',  7),
  (false, '30',   30, 37.00,         '30 GB / 30 días',  8),
  (true,  'NaN',  7,  25.00,         'Ilimitado 7 días', 9),
  (true,  'NaN',  15, 45.00,         'Ilimitado 15 días',10),
  (true,  'NaN',  30, 55.00,         'Ilimitado 30 días',11)
) as v(is_unl, da, dur, comp, lbl, so)
where g.slug = 'default'
on conflict (group_id, data_amount, duration_days) do nothing;

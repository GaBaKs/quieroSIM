-- Política de precios automática: markup por tramos de costo + conversión EUR→USD
-- + redondeo psicológico (.49/.99). Reemplaza el margen flat anterior.
-- Editable desde el panel admin (pricing_tier + platform_settings).

-- 1) Config global en platform_settings
alter table platform_settings add column if not exists eur_usd_rate numeric not null default 1.135;
alter table platform_settings add column if not exists round_psychological boolean not null default true;

-- 2) Tramos de markup (editables). max_cost_eur = tope del tramo en €; null = último.
create table if not exists pricing_tier (
  id uuid primary key default uuid_generate_v4(),
  max_cost_eur numeric,            -- tope superior (€). null = sin tope (último tramo)
  multiplier numeric not null,     -- multiplicador sobre el costo mayorista
  sort_order int not null default 0
);

alter table pricing_tier enable row level security;
drop policy if exists pricing_tier_super_admin on pricing_tier;
create policy pricing_tier_super_admin on pricing_tier
  for all using (is_super_admin()) with check (is_super_admin());

-- Seed con la tabla de la política (solo si está vacía).
insert into pricing_tier (max_cost_eur, multiplier, sort_order)
select * from (values
  (1.50::numeric, 3.0::numeric, 1),
  (4.00, 2.6, 2),
  (9.00, 2.2, 3),
  (20.00, 1.9, 4),
  (null, 1.7, 5)
) as v(max_cost_eur, multiplier, sort_order)
where not exists (select 1 from pricing_tier);

-- 3) Redondeo psicológico: termina en .49 (si los centavos ≤ .49) o .99.
create or replace function round_psych(x numeric) returns numeric
  language sql immutable as $$
  select floor(x) + case when (x - floor(x)) <= 0.49 then 0.49 else 0.99 end;
$$;

-- 4) Motor de precio. SECURITY DEFINER para leer config/tramos sin chocar con RLS
--    cuando el trigger corre en la sesión de un admin.
create or replace function calculate_plan_pricing() returns trigger
  language plpgsql security definer set search_path to 'public' as $$
declare
  v_mult numeric;
  v_fx numeric;
  v_round boolean;
  v_raw numeric;
begin
  if NEW.use_fixed_price = true and NEW.price_fixed is not null then
    -- Override manual del admin: se respeta tal cual (ya en USD).
    NEW.price_final := NEW.price_fixed;
  else
    select eur_usd_rate, round_psychological into v_fx, v_round
      from platform_settings where id = 1;
    v_fx := coalesce(v_fx, 1.0);

    -- Tramo: el menor umbral cuyo tope cubre el costo (null = último).
    select multiplier into v_mult from pricing_tier
      where max_cost_eur is null or NEW.cost_provider_eur <= max_cost_eur
      order by max_cost_eur asc nulls last
      limit 1;
    -- Fallback al margen flat si no hay tramos cargados.
    v_mult := coalesce(v_mult, 1 + coalesce(NEW.margin_pct, 0) / 100.0);

    v_raw := coalesce(NEW.cost_provider_eur, 0) * v_fx * v_mult;
    NEW.price_final := case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;
    -- Guardamos el markup efectivo (para mostrarlo en el admin).
    NEW.margin_pct := round((v_mult - 1) * 100, 2);
  end if;
  return NEW;
end;
$$;

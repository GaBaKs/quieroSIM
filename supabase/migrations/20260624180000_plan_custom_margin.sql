-- 3er modo de precio por plan: "margen personalizado". Antes el trigger en modo
-- automático ignoraba margin_pct (usaba el tramo), así que solo el precio fijo
-- pegaba. Ahora hay 3 modos: fijo (price_fixed) · margen propio (use_custom_margin)
-- · automático (tramos de la política).
alter table plan_pricing add column if not exists use_custom_margin boolean not null default false;

create or replace function calculate_plan_pricing() returns trigger
  language plpgsql security definer set search_path to 'public' as $$
declare
  v_mult numeric;
  v_fx numeric;
  v_round boolean;
  v_raw numeric;
begin
  select eur_usd_rate, round_psychological into v_fx, v_round from platform_settings where id = 1;
  v_fx := coalesce(v_fx, 1.0);

  if NEW.use_fixed_price = true and NEW.price_fixed is not null then
    -- Precio fijo manual (ya en USD).
    NEW.price_final := NEW.price_fixed;
  elsif NEW.use_custom_margin = true then
    -- Margen propio del plan: costo€ × (1+margen%) × FX. margin_pct queda como lo puso el admin.
    v_raw := coalesce(NEW.cost_provider_eur, 0) * (1 + coalesce(NEW.margin_pct, 0) / 100.0) * v_fx;
    NEW.price_final := case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;
  else
    -- Automático: multiplicador del tramo según el costo.
    select multiplier into v_mult from pricing_tier
      where max_cost_eur is null or NEW.cost_provider_eur <= max_cost_eur
      order by max_cost_eur asc nulls last
      limit 1;
    v_mult := coalesce(v_mult, 1 + coalesce(NEW.margin_pct, 0) / 100.0);
    v_raw := coalesce(NEW.cost_provider_eur, 0) * v_fx * v_mult;
    NEW.price_final := case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;
    NEW.margin_pct := round((v_mult - 1) * 100, 2); -- markup efectivo (para mostrar)
  end if;
  return NEW;
end;
$$;

-- Fase 2: motor de precio por grupos de país. Reemplaza la lógica de tramos por
-- la cascada MAX(competencia×(1−desc%), costo×(1+piso%)) resuelta por grupo.
-- Reemplazar la función NO dispara recálculo: los precios existentes quedan
-- intactos hasta el recalc masivo de la Fase 3.
--
-- Cascada (modo automático):
--   A = competencia × (1−desc%)   (si el grupo usa la tabla y hay ancla)
--   B = costo_usd × (1+piso%)      (si el grupo tiene piso)
--   precio = MAX(A,B) · si falta uno, el otro · si faltan ambos, rango de margen
--            por costo · si tampoco, fallback costo×1.40.

create or replace function calculate_plan_pricing() returns trigger
  language plpgsql security definer set search_path to 'public' as $$
declare
  v_fx numeric;
  v_round boolean;
  v_raw numeric;
  v_cost_usd numeric;
  v_iso text;
  v_data text;
  v_dur int;
  v_grp country_group%rowtype;
  v_comp numeric;
  v_a numeric;
  v_b numeric;
  v_margin numeric;
begin
  select eur_usd_rate, round_psychological into v_fx, v_round from platform_settings where id = 1;
  v_fx := coalesce(v_fx, 1.0);

  -- Modo 1: precio fijo manual (ya en USD). Gana siempre.
  if NEW.use_fixed_price = true and NEW.price_fixed is not null then
    NEW.price_final := NEW.price_fixed;
    return NEW;
  end if;

  -- Modo 2: margen propio del plan (costo€ × (1+margen%) × FX).
  if NEW.use_custom_margin = true then
    v_raw := coalesce(NEW.cost_provider_eur, 0) * (1 + coalesce(NEW.margin_pct, 0) / 100.0) * v_fx;
    NEW.price_final := case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;
    return NEW;
  end if;

  -- Modo 3 (automático): política por grupo de país.
  v_cost_usd := coalesce(NEW.cost_provider_eur, 0) * v_fx;

  -- Arquetipo + país del plan (para ilimitados data_amount = 'NaN').
  select iso_country, data_amount, duration_days
    into v_iso, v_data, v_dur
    from plan where id = NEW.plan_id;

  -- Grupo del país, o el default (catch-all).
  select * into v_grp from country_group
    where id = (select group_id from country_group_member where iso_country = v_iso);
  if v_grp.id is null then
    select * into v_grp from country_group where is_default = true limit 1;
  end if;

  -- Candidato A: competencia (si el grupo usa la tabla y hay ancla para el arquetipo).
  v_a := null;
  if v_grp.id is not null and v_grp.use_competitor_table = true then
    select competitor_usd into v_comp from group_competitor_price
      where group_id = v_grp.id and data_amount = v_data and duration_days = v_dur;
    if v_comp is not null then
      v_a := v_comp * (1 - coalesce(v_grp.competitor_discount_pct, 0) / 100.0);
    end if;
  end if;

  -- Candidato B: piso de costo.
  v_b := null;
  if v_grp.id is not null and v_grp.floor_markup_pct is not null then
    v_b := v_cost_usd * (1 + v_grp.floor_markup_pct / 100.0);
  end if;

  -- Resolución: el mayor; si falta uno, el otro; si faltan ambos, rango de margen
  -- por costo; si tampoco hay, fallback +40%.
  if v_a is not null and v_b is not null then
    v_raw := greatest(v_a, v_b);
  elsif v_a is not null then
    v_raw := v_a;
  elsif v_b is not null then
    v_raw := v_b;
  else
    select margin_pct into v_margin from group_margin_range
      where group_id = v_grp.id
        and coalesce(NEW.cost_provider_eur, 0) >= min_cost_eur
        and (max_cost_eur is null or coalesce(NEW.cost_provider_eur, 0) <= max_cost_eur)
      order by sort_order, min_cost_eur
      limit 1;
    if v_margin is not null then
      v_raw := v_cost_usd * (1 + v_margin / 100.0);
    else
      v_raw := v_cost_usd * 1.40; -- fallback final
    end if;
  end if;

  NEW.price_final := case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;
  -- Markup efectivo (para mostrar en admin). null si no hay costo.
  NEW.margin_pct := round((NEW.price_final / nullif(v_cost_usd, 0) - 1) * 100, 2);
  return NEW;
end;
$$;

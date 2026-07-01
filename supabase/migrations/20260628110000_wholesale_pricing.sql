-- Mayorista M2: el trigger de precios ahora también puebla price_wholesale (margen global),
-- en TODOS los caminos (fijo/custom/cascada). El precio por-agencia se calcula en runtime
-- en la RPC wholesale_catalog() (gateada por agencia aprobada). NO se filtra a retail.
create or replace function public.calculate_plan_pricing()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_fx numeric; v_round boolean; v_raw numeric; v_cost_usd numeric;
  v_iso text; v_data text; v_dur int; v_grp country_group%rowtype;
  v_comp numeric; v_a numeric; v_b numeric; v_margin numeric; v_wmargin numeric;
begin
  select eur_usd_rate, round_psychological, wholesale_margin_pct into v_fx, v_round, v_wmargin from platform_settings where id = 1;
  v_fx := coalesce(v_fx, 1.0);

  -- Precio mayorista de lista (margen global) — independiente del modo de precio retail.
  v_raw := coalesce(NEW.cost_provider_eur, 0) * v_fx * (1 + coalesce(v_wmargin, 15) / 100.0);
  NEW.price_wholesale := case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;

  if NEW.use_fixed_price = true and NEW.price_fixed is not null then
    NEW.price_final := NEW.price_fixed;
    return NEW;
  end if;

  if NEW.use_custom_margin = true then
    v_raw := coalesce(NEW.cost_provider_eur, 0) * (1 + coalesce(NEW.margin_pct, 0) / 100.0) * v_fx;
    NEW.price_final := case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;
    return NEW;
  end if;

  v_cost_usd := coalesce(NEW.cost_provider_eur, 0) * v_fx;

  select iso_country, data_amount, duration_days into v_iso, v_data, v_dur from plan where id = NEW.plan_id;

  select * into v_grp from country_group where id = (select group_id from country_group_member where iso_country = v_iso);
  if v_grp.id is null then select * into v_grp from country_group where is_default = true limit 1; end if;

  v_a := null;
  if v_grp.id is not null and v_grp.use_competitor_table = true then
    select competitor_usd into v_comp from group_competitor_price where group_id = v_grp.id and data_amount = v_data and duration_days = v_dur;
    if v_comp is not null then v_a := v_comp * (1 - coalesce(v_grp.competitor_discount_pct, 0) / 100.0); end if;
  end if;

  v_b := null;
  if v_grp.id is not null and v_grp.floor_markup_pct is not null then v_b := v_cost_usd * (1 + v_grp.floor_markup_pct / 100.0); end if;

  if v_a is not null and v_b is not null then v_raw := greatest(v_a, v_b);
  elsif v_a is not null then v_raw := v_a;
  elsif v_b is not null then v_raw := v_b;
  else
    select margin_pct into v_margin from group_margin_range
      where group_id = v_grp.id and coalesce(NEW.cost_provider_eur, 0) >= min_cost_eur
        and (max_cost_eur is null or coalesce(NEW.cost_provider_eur, 0) <= max_cost_eur)
      order by sort_order, min_cost_eur limit 1;
    if v_margin is not null then v_raw := v_cost_usd * (1 + v_margin / 100.0); else v_raw := v_cost_usd * 1.40; end if;
  end if;

  NEW.price_final := case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;
  NEW.margin_pct := round((NEW.price_final / nullif(v_cost_usd, 0) - 1) * 100, 2);
  return NEW;
end;
$function$;

-- Recalc masivo para poblar price_wholesale en filas existentes.
update plan_pricing set updated_at = now();

-- Catálogo mayorista: SOLO agencias aprobadas. Precio por-agencia en runtime (custom_margin override).
create or replace function public.wholesale_catalog()
returns table(plan_id uuid, name text, iso_country text, country_region text, duration_days int, data_amount text, is_fup boolean, price_wholesale numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_aid uuid; v_cmargin numeric; v_fx numeric; v_wmargin numeric; v_round boolean;
begin
  select ap.id, ap.custom_margin_pct into v_aid, v_cmargin from agency_profile ap where ap.user_id = auth.uid() and ap.status = 'approved';
  if v_aid is null then raise exception 'not an approved agency' using errcode = '42501'; end if;
  select eur_usd_rate, round_psychological, wholesale_margin_pct into v_fx, v_round, v_wmargin from platform_settings where id = 1;
  v_fx := coalesce(v_fx, 1.0);
  return query
    select p.id, p.name, p.iso_country, p.country_region, p.duration_days, p.data_amount, p.is_fup,
           case when coalesce(v_round, true)
             then round_psych(coalesce(pp.cost_provider_eur, 0) * v_fx * (1 + coalesce(v_cmargin, v_wmargin, 15) / 100.0))
             else round(coalesce(pp.cost_provider_eur, 0) * v_fx * (1 + coalesce(v_cmargin, v_wmargin, 15) / 100.0), 2) end
    from plan p join plan_pricing pp on pp.plan_id = p.id
    where p.status = 'active';
end; $$;
revoke all on function public.wholesale_catalog() from public;
grant execute on function public.wholesale_catalog() to authenticated;

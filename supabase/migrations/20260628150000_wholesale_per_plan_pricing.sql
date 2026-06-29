-- Override de precio mayorista POR PLAN (espejo del retail: auto/margen/fijo) +
-- helper único de resolución usado por wholesale_catalog (lo que ve la agencia) y
-- create_wholesale_batch (lo que se cobra), para que nunca diverjan.

alter table plan_pricing
  add column if not exists use_wholesale_fixed_price boolean not null default false,
  add column if not exists wholesale_price_fixed numeric null,
  add column if not exists use_wholesale_custom_margin boolean not null default false,
  add column if not exists wholesale_margin_pct numeric null;

create or replace function public.calculate_plan_pricing()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_fx numeric; v_round boolean; v_raw numeric; v_cost_usd numeric;
  v_iso text; v_data text; v_dur int; v_grp country_group%rowtype;
  v_comp numeric; v_a numeric; v_b numeric; v_margin numeric; v_wmargin numeric;
begin
  select eur_usd_rate, round_psychological, wholesale_margin_pct into v_fx, v_round, v_wmargin from platform_settings where id = 1;
  v_fx := coalesce(v_fx, 1.0);

  -- Precio mayorista de LISTA (independiente del modo retail). Cascada espejo:
  -- precio fijo manual / margen propio del plan / margen global.
  if NEW.use_wholesale_fixed_price = true and NEW.wholesale_price_fixed is not null then
    NEW.price_wholesale := NEW.wholesale_price_fixed;
  elsif NEW.use_wholesale_custom_margin = true then
    v_raw := coalesce(NEW.cost_provider_eur, 0) * v_fx * (1 + coalesce(NEW.wholesale_margin_pct, 0) / 100.0);
    NEW.price_wholesale := case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;
  else
    v_raw := coalesce(NEW.cost_provider_eur, 0) * v_fx * (1 + coalesce(v_wmargin, 15) / 100.0);
    NEW.price_wholesale := case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;
  end if;

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

-- Helper ÚNICO de resolución de precio mayorista por (plan, agencia). SIN grant a
-- public/anon/authenticated → el precio mayorista no se filtra a retail.
create or replace function public.wholesale_price_for(p_plan_id uuid, p_custom_margin numeric)
 returns numeric
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_fx numeric; v_round boolean; v_cost numeric; v_pw numeric; v_fixed boolean; v_wfixed numeric; v_raw numeric;
begin
  select eur_usd_rate, round_psychological into v_fx, v_round from platform_settings where id = 1;
  v_fx := coalesce(v_fx, 1.0);
  select pp.cost_provider_eur, pp.price_wholesale, pp.use_wholesale_fixed_price, pp.wholesale_price_fixed
    into v_cost, v_pw, v_fixed, v_wfixed
  from plan_pricing pp where pp.plan_id = p_plan_id;
  -- 1) Precio fijo del plan: absoluto para TODAS las agencias.
  if v_fixed = true and v_wfixed is not null then return v_wfixed; end if;
  -- 2) Margen negociado de la agencia: recalcula sobre costo.
  if p_custom_margin is not null then
    v_raw := coalesce(v_cost, 0) * v_fx * (1 + p_custom_margin / 100.0);
    return case when coalesce(v_round, true) then round_psych(v_raw) else round(v_raw, 2) end;
  end if;
  -- 3) Precio de lista (margen propio o global, ya calculado por el trigger).
  return coalesce(v_pw, 0);
end;
$function$;

revoke execute on function public.wholesale_price_for(uuid, numeric) from public, anon, authenticated;

create or replace function public.wholesale_catalog()
 returns table(plan_id uuid, name text, iso_country text, country_region text, duration_days integer, data_amount text, is_fup boolean, price_wholesale numeric)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_aid uuid; v_cmargin numeric;
begin
  select ap.id, ap.custom_margin_pct into v_aid, v_cmargin from agency_profile ap where ap.user_id = auth.uid() and ap.status = 'approved';
  if v_aid is null then raise exception 'not an approved agency' using errcode = '42501'; end if;
  return query
    select p.id, p.name, p.iso_country, p.country_region, p.duration_days, p.data_amount, p.is_fup,
           wholesale_price_for(p.id, v_cmargin)
    from plan p join plan_pricing pp on pp.plan_id = p.id
    where p.status = 'active';
end; $function$;

create or replace function public.create_wholesale_batch(p_agency_id uuid, p_items jsonb, p_email text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_batch uuid; v_item jsonb; i int; v_total numeric := 0; v_count int := 0; v_qty int; v_price numeric;
  v_cmargin numeric; v_active text; v_pid uuid;
begin
  select custom_margin_pct into v_cmargin from agency_profile where id = p_agency_id and status = 'approved';
  if not found then return jsonb_build_object('ok', false, 'reason', 'Agencia no aprobada.'); end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(0, coalesce((v_item->>'qty')::int, 0));
    v_pid := (v_item->>'plan_id')::uuid;
    select p.status into v_active from plan p where p.id = v_pid;
    if v_active is null or v_active <> 'active' then return jsonb_build_object('ok', false, 'reason', 'Hay un plan no disponible en el carrito.'); end if;
    v_count := v_count + v_qty;
  end loop;
  if v_count = 0 then return jsonb_build_object('ok', false, 'reason', 'Carrito vacío.'); end if;
  if v_count > 200 then return jsonb_build_object('ok', false, 'reason', 'Máximo 200 eSIMs por lote.'); end if;

  insert into wholesale_batch (agency_profile_id, status, item_count, total_wholesale_usd)
  values (p_agency_id, 'pending', v_count, 0) returning id into v_batch;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(0, coalesce((v_item->>'qty')::int, 0));
    v_pid := (v_item->>'plan_id')::uuid;
    v_price := wholesale_price_for(v_pid, v_cmargin);
    for i in 1..v_qty loop
      insert into public."order" (agency_profile_id, batch_id, plan_id, guest_email, price_paid, currency_sale, channel, status, terms_accepted, terms_accepted_at)
      values (p_agency_id, v_batch, v_pid, p_email, v_price, 'USD', 'wholesale', 'pending', true, now());
    end loop;
    v_total := v_total + v_price * v_qty;
  end loop;

  update wholesale_batch set total_wholesale_usd = round(v_total, 2) where id = v_batch;
  return jsonb_build_object('ok', true, 'batchId', v_batch, 'total', round(v_total, 2), 'count', v_count);
end; $function$;

-- Recalcular price_wholesale de TODOS los planes con la nueva cascada.
update plan_pricing set updated_at = now();

-- create_wholesale_batch calcula el precio mayorista INTERNO (autoridad server-side);
-- la Edge solo pasa [{plan_id, qty}]. Valida que cada plan esté activo. Máx 200 eSIMs/lote.
create or replace function public.create_wholesale_batch(p_agency_id uuid, p_items jsonb, p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_batch uuid; v_item jsonb; i int; v_total numeric := 0; v_count int := 0; v_qty int; v_price numeric;
  v_cmargin numeric; v_fx numeric; v_wmargin numeric; v_round boolean; v_cost numeric; v_active text; v_pid uuid;
begin
  select custom_margin_pct into v_cmargin from agency_profile where id = p_agency_id and status = 'approved';
  if not found then return jsonb_build_object('ok', false, 'reason', 'Agencia no aprobada.'); end if;
  select eur_usd_rate, round_psychological, wholesale_margin_pct into v_fx, v_round, v_wmargin from platform_settings where id = 1;
  v_fx := coalesce(v_fx, 1.0);

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(0, coalesce((v_item->>'qty')::int, 0));
    v_pid := (v_item->>'plan_id')::uuid;
    select pp.cost_provider_eur, p.status into v_cost, v_active from plan p join plan_pricing pp on pp.plan_id = p.id where p.id = v_pid;
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
    select pp.cost_provider_eur into v_cost from plan_pricing pp where pp.plan_id = v_pid;
    v_price := case when coalesce(v_round, true)
      then round_psych(coalesce(v_cost, 0) * v_fx * (1 + coalesce(v_cmargin, v_wmargin, 15) / 100.0))
      else round(coalesce(v_cost, 0) * v_fx * (1 + coalesce(v_cmargin, v_wmargin, 15) / 100.0), 2) end;
    for i in 1..v_qty loop
      insert into public."order" (agency_profile_id, batch_id, plan_id, guest_email, price_paid, currency_sale, channel, status, terms_accepted, terms_accepted_at)
      values (p_agency_id, v_batch, v_pid, p_email, v_price, 'USD', 'wholesale', 'pending', true, now());
    end loop;
    v_total := v_total + v_price * v_qty;
  end loop;

  update wholesale_batch set total_wholesale_usd = round(v_total, 2) where id = v_batch;
  return jsonb_build_object('ok', true, 'batchId', v_batch, 'total', round(v_total, 2), 'count', v_count);
end; $$;
revoke all on function public.create_wholesale_batch(uuid, jsonb, text) from public;
grant execute on function public.create_wholesale_batch(uuid, jsonb, text) to service_role;

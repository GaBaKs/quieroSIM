-- Etapa 7: panel admin operativo. Métricas agregadas, auditoría desde Server
-- Actions, y endurecimiento de la escritura de precios a super_admin.

-- ── Métricas del dashboard ───────────────────────────────────────────────────
create or replace function public.admin_dashboard_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'sales_today', coalesce((select sum(price_paid) from "order"
        where status = 'fulfilled' and created_at::date = current_date), 0),
    'sales_month', coalesce((select sum(price_paid) from "order"
        where status = 'fulfilled' and date_trunc('month', created_at) = date_trunc('month', now())), 0),
    'revenue_total', coalesce((select sum(price_paid) from "order" where status = 'fulfilled'), 0),
    'orders_total', (select count(*) from "order"),
    'orders_today', (select count(*) from "order" where created_at::date = current_date),
    'pending_review', (select count(*) from "order" where status = 'failed_needs_review')
  ) into result;
  return result;
end;
$$;

-- ── Top planes por unidades vendidas (órdenes fulfilled) ─────────────────────
create or replace function public.admin_top_plans(p_limit int default 5)
returns table (plan_id uuid, name text, units bigint, revenue numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select p.id, p.name, count(o.id) as units, coalesce(sum(o.price_paid), 0) as revenue
    from "order" o
    join plan p on p.id = o.plan_id
    where o.status = 'fulfilled'
    group by p.id, p.name
    order by units desc, revenue desc
    limit greatest(p_limit, 1);
end;
$$;

-- ── Serie de ventas diaria para el gráfico ───────────────────────────────────
create or replace function public.admin_sales_series(p_days int default 30)
returns table (day date, total numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select d::date as day,
           coalesce((select sum(o.price_paid) from "order" o
             where o.status = 'fulfilled' and o.created_at::date = d::date), 0) as total
    from generate_series(current_date - (greatest(p_days, 1) - 1), current_date, interval '1 day') d
    order by day;
end;
$$;

-- ── Auditoría desde Server Actions (audit_log no acepta INSERT por RLS) ───────
create or replace function public.log_admin_action(p_action text, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into audit_log (action, actor_id, actor_type, payload)
  values (p_action, auth.uid(), 'admin', coalesce(p_payload, '{}'::jsonb));
end;
$$;

revoke all on function public.admin_dashboard_metrics() from public;
revoke all on function public.admin_top_plans(int) from public;
revoke all on function public.admin_sales_series(int) from public;
revoke all on function public.log_admin_action(text, jsonb) from public;
grant execute on function public.admin_dashboard_metrics() to authenticated;
grant execute on function public.admin_top_plans(int) to authenticated;
grant execute on function public.admin_sales_series(int) to authenticated;
grant execute on function public.log_admin_action(text, jsonb) to authenticated;

-- ── Endurecer precios: lectura admin, escritura SOLO super_admin ─────────────
-- (sync-catalog corre con service_role → no afectado por RLS)
drop policy if exists plan_prc_all on public.plan_pricing;
create policy plan_prc_sel on public.plan_pricing for select using (is_admin());
create policy plan_prc_write_super on public.plan_pricing for all
  using (is_super_admin()) with check (is_super_admin());

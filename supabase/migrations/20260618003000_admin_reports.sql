-- Fase 11 (parcial): reportes reales para el panel admin (ventas, finanzas,
-- reembolsos). Mismo patrón que admin_operations: SECURITY DEFINER + guard
-- is_admin() + search_path fijo. Sin costo/margen (no se congela por orden).

-- ── Ventas: por mes y por país (órdenes paid/fulfilled) ──────────────────────
create or replace function public.admin_sales_report(p_days int default 180)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  since date := current_date - (greatest(p_days, 1) - 1);
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'by_month', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.month)
      from (
        select to_char(date_trunc('month', o.created_at), 'YYYY-MM') as month,
               count(*) as units,
               coalesce(sum(o.price_paid), 0) as revenue
        from "order" o
        where o.status in ('paid', 'fulfilled') and o.created_at::date >= since
        group by 1
      ) m
    ), '[]'::jsonb),
    'by_country', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.revenue desc)
      from (
        select coalesce(nullif(p.iso_country, ''), '—') as country,
               count(*) as units,
               coalesce(sum(o.price_paid), 0) as revenue
        from "order" o
        join plan p on p.id = o.plan_id
        where o.status in ('paid', 'fulfilled') and o.created_at::date >= since
        group by 1
      ) c
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

-- ── Finanzas: ingresos / reembolsos / neto por mes (exacto, sin costo) ────────
create or replace function public.admin_finance_report(p_months int default 6)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  since date := (date_trunc('month', current_date) - ((greatest(p_months, 1) - 1) || ' months')::interval)::date;
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(f) order by f.month), '[]'::jsonb)
  into result
  from (
    select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
           coalesce(sum(price_paid) filter (where status in ('paid', 'fulfilled')), 0) as income,
           coalesce(sum(price_paid) filter (where status = 'refunded'), 0) as refunds,
           coalesce(sum(price_paid) filter (where status in ('paid', 'fulfilled')), 0)
             - coalesce(sum(price_paid) filter (where status = 'refunded'), 0) as net
    from "order"
    where created_at::date >= since
    group by 1
  ) f;
  return result;
end;
$$;

-- ── Reembolsos: lista real (sin "motivo" — no se captura) ─────────────────────
create or replace function public.admin_refunds_report(p_limit int default 50)
returns table (order_id uuid, customer text, amount numeric, refunded_at timestamptz, admin_email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select o.id,
           coalesce(o.guest_email, up_c.email, '—') as customer,
           o.price_paid as amount,
           coalesce(al.occurred_at, o.updated_at) as refunded_at,
           coalesce(up_a.email, '—') as admin_email
    from "order" o
    left join lateral (
      select a.occurred_at, a.actor_id
      from audit_log a
      where a.action = 'order_refund' and (a.payload->>'order_id') = o.id::text
      order by a.occurred_at desc
      limit 1
    ) al on true
    left join user_profile up_a on up_a.id = al.actor_id
    left join user_profile up_c on up_c.id = o.user_id
    where o.status = 'refunded'
    order by coalesce(al.occurred_at, o.updated_at) desc
    limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.admin_sales_report(int) from public;
revoke all on function public.admin_finance_report(int) from public;
revoke all on function public.admin_refunds_report(int) from public;
grant execute on function public.admin_sales_report(int) to authenticated;
grant execute on function public.admin_finance_report(int) to authenticated;
grant execute on function public.admin_refunds_report(int) to authenticated;

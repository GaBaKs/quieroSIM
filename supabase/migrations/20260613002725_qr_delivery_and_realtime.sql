-- Etapa 6: entrega del QR, claim de compras guest y Realtime del panel.

-- ── Idioma del comprador en la orden (guests no tienen user_profile.lang_pref) ──
alter table public."order"
  add column if not exists lang text not null default 'ES'
  check (lang = any (array['ES'::text, 'EN'::text, 'PT'::text]));

-- ── qr_delivery: trazabilidad del envío + upsert idempotente por canal ─────────
alter table public.qr_delivery add column if not exists last_error text;
alter table public.qr_delivery add column if not exists provider_message_id text;
create unique index if not exists uq_qr_delivery_esim_channel
  on public.qr_delivery (esim_id, channel);

-- Índices de soporte: claim por email y lecturas/Realtime del panel por dueño.
create index if not exists idx_esim_user on public.esim (user_id);
create index if not exists idx_order_guest_email_unclaimed
  on public."order" (lower(guest_email)) where user_id is null;

-- ── Realtime: el panel "Mis eSIMs" escucha cambios de la tabla esim ────────────
-- (postgres_changes respeta RLS: cada usuario solo recibe SUS eSIMs)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'esim'
  ) then
    alter publication supabase_realtime add table public.esim;
  end if;
end $$;

-- ── claim_my_orders(): vincula compras guest al usuario logueado ───────────────
-- SECURITY DEFINER: las órdenes guest tienen user_id null y el usuario no puede
-- verlas por RLS; el candado anti-robo es la VERIFICACIÓN del email (RF-AUTH-01):
-- solo se reclaman órdenes cuyo guest_email coincide con un email CONFIRMADO.
create or replace function public.claim_my_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
  v_confirmed timestamptz;
  v_count integer := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return 0;
  end if;

  select u.email, u.email_confirmed_at
    into v_email, v_confirmed
    from auth.users u
   where u.id = v_uid;

  if v_email is null or v_confirmed is null then
    return 0;
  end if;

  with claimed as (
    update public."order"
       set user_id = v_uid
     where user_id is null
       and lower(guest_email) = lower(v_email)
    returning id
  )
  select count(*) into v_count from claimed;

  update public.esim e
     set user_id = v_uid
    from public."order" o
   where e.order_id = o.id
     and o.user_id = v_uid
     and e.user_id is null;

  return v_count;
end;
$$;

revoke all on function public.claim_my_orders() from public;
grant execute on function public.claim_my_orders() to authenticated;

-- Mayorista M3: lote de compra + órdenes mayoristas + herencia de agencia en esim.

create sequence if not exists public.wholesale_invoice_seq;

create table if not exists public.wholesale_batch (
  id uuid primary key default gen_random_uuid(),
  agency_profile_id uuid not null references public.agency_profile(id),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  item_count int not null,
  total_wholesale_usd numeric not null,
  currency text not null default 'USD',
  stripe_payment_intent_id text unique,
  invoice_number text unique,
  created_at timestamptz default now(),
  paid_at timestamptz
);
alter table public.wholesale_batch enable row level security;
drop policy if exists wb_sel on public.wholesale_batch;
create policy wb_sel on public.wholesale_batch for select
  using (agency_profile_id in (select id from agency_profile where user_id = auth.uid()) or is_admin());

alter table public."order" add column if not exists agency_profile_id uuid references public.agency_profile(id);
alter table public."order" add column if not exists batch_id uuid references public.wholesale_batch(id);
create index if not exists order_batch_idx on public."order"(batch_id);
create index if not exists order_agency_idx on public."order"(agency_profile_id);
drop policy if exists ord_agency_sel on public."order";
create policy ord_agency_sel on public."order" for select
  using (agency_profile_id in (select id from agency_profile where user_id = auth.uid()));

-- esim hereda la agencia desde su order (para inventario por RLS, sin tocar la provisión).
create or replace function public.tg_esim_inherit_agency()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.agency_profile_id is null and NEW.order_id is not null then
    select agency_profile_id into NEW.agency_profile_id from public."order" where id = NEW.order_id;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_esim_inherit_agency on public.esim;
create trigger trg_esim_inherit_agency before insert on public.esim for each row execute function public.tg_esim_inherit_agency();

-- Número de factura correlativo (se asigna al pagarse el lote; idempotente).
create or replace function public.assign_invoice_number(p_batch_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update wholesale_batch set invoice_number = 'INV-' || lpad(nextval('wholesale_invoice_seq')::text, 6, '0')
  where id = p_batch_id and invoice_number is null;
end; $$;
revoke all on function public.assign_invoice_number(uuid) from public;
grant execute on function public.assign_invoice_number(uuid) to service_role;

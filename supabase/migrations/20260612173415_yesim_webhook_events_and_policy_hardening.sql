-- 1. Registro de eventos webhook de YeSim (EsimStatus / PackageUsage).
-- YeSim no firma sus webhooks: cada evento se guarda para auditoría/debug y el
-- receptor confirma el estado real contra /sim_info antes de aplicar cambios.
create table public.yesim_webhook_event (
  id uuid primary key default extensions.uuid_generate_v4(),
  event_type text not null, -- 'EsimStatus' | 'PackageUsage'
  iccid text,
  payload jsonb not null,
  processing_result text, -- 'processed' | 'ignored_unknown_iccid' | 'error: ...'
  received_at timestamptz default now()
);

create index idx_yesim_webhook_event_iccid on public.yesim_webhook_event using btree (iccid, received_at);

alter table public.yesim_webhook_event enable row level security;
create policy yesim_evt_admin on public.yesim_webhook_event for all using (is_admin());

-- 2. Endurecimiento de policies (coordinado con la decisión de arquitectura
-- 2026-06-12: toda escritura transaccional corre en Edge Functions con
-- service_role, que saltea RLS — estas puertas públicas ya no hacen falta y
-- permitían a cualquier visitante insertar órdenes/eventos falsos).
drop policy ord_ins on public."order";
drop policy stripe_ins on public.stripe_event;
drop policy coupon_redem_ins on public.coupon_redemption;
drop policy ord_upd on public."order";
create policy ord_upd on public."order" for update
  using ((user_id = auth.uid()) or is_admin());

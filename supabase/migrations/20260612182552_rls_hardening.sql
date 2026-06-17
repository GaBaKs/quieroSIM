-- Endurecimiento RLS (auditoría Etapa 3):
-- (a) plan_pricing exponía costo/margen/precio mayorista a cualquier visitante.
-- (b) coupon exponía TODOS los códigos de cupón a cualquier visitante.
-- (c) RF-ADM-07: el sub-rol support_agent no ve finanzas.

-- Helper: admin con sub-rol super_admin (finanzas).
create or replace function public.is_super_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.admin_profile
    where user_id = auth.uid() and sub_role = 'super_admin'
  );
end;
$$;

-- (a) plan_pricing: fuera del alcance público. El catálogo lee la vista
-- catalog_pricing (solo plan_id + price_final). El precio mayorista para
-- agencias se resuelve server-side en la Ola 3.
drop policy plan_prc_sel on public.plan_pricing;
revoke select on public.plan_pricing from anon;
-- (authenticated conserva el GRANT pero sin policy de select solo el admin
--  accede vía plan_prc_all; service_role saltea RLS.)

create view public.catalog_pricing as
  select plan_id, price_final from public.plan_pricing;
-- Vista security definer INTENCIONAL: expone únicamente 2 columnas seguras.
grant select on public.catalog_pricing to anon, authenticated;

-- (b) coupon: nadie lista cupones desde el cliente; la validación corre
-- server-side (Edge Function con service_role). El admin conserva coupon_all.
drop policy coupon_sel on public.coupon;

-- (c) Finanzas: solo super_admin.
drop policy prc_hist_all on public.price_history;
drop policy prc_hist_sel on public.price_history;
create policy prc_hist_super on public.price_history for all using (is_super_admin());

drop policy comm_sel on public.commission_movement;
create policy comm_sel on public.commission_movement for select using (
  (exists (
    select 1 from affiliate_profile
    where affiliate_profile.id = commission_movement.affiliate_profile_id
      and affiliate_profile.user_id = auth.uid()
  )) or is_super_admin()
);

drop policy withd_sel on public.withdrawal_request;
create policy withd_sel on public.withdrawal_request for select using (
  (exists (
    select 1 from affiliate_profile
    where affiliate_profile.id = withdrawal_request.affiliate_profile_id
      and affiliate_profile.user_id = auth.uid()
  )) or is_super_admin()
);

drop policy aff_cred_sel on public.affiliate_credit;
create policy aff_cred_sel on public.affiliate_credit for select using (
  (exists (
    select 1 from affiliate_profile
    where affiliate_profile.id = affiliate_credit.affiliate_profile_id
      and affiliate_profile.user_id = auth.uid()
  )) or is_super_admin()
);

-- audit_log: lectura solo super_admin; las escrituras las hacen triggers y
-- service_role; la inmutabilidad la garantiza tr_audit_log_immutable.
drop policy audit_all on public.audit_log;
create policy audit_sel on public.audit_log for select using (is_super_admin());

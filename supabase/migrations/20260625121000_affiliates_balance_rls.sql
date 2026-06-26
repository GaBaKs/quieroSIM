-- Afiliados A1: idempotencia del motor de comisiones, balance derivado y RLS.

-- Idempotencia: como mucho UNA comisión L1 y UNA L2 por orden (el motor de
-- comisiones hace upsert/insert sobre esta clave ante reintentos del webhook).
create unique index if not exists uq_commission_order_level
  on public.commission_movement (order_id, level);

-- Anti auto-aprobación: el afiliado NO puede editar su propio perfil (status,
-- referido, link). El alta es por RPC (register_affiliate) y la aprobación/cambio
-- de estado es solo admin. (Antes el UPDATE lo permitía el propio user_id.)
drop policy if exists aff_prof_upd on public.affiliate_profile;
create policy aff_prof_upd on public.affiliate_profile
  for update using (is_admin()) with check (is_admin());

-- Balance derivado del afiliado del usuario actual. NUNCA se edita: se deriva de
-- los asientos append-only (commission_movement + affiliate_credit).
--   available = comisiones liberadas (retirables) · pending = aún no liberadas
--   paid = ya pagadas/convertidas · credit = saldo de crédito de plataforma
create or replace function public.affiliate_my_balance()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_aff uuid;
begin
  select id into v_aff from affiliate_profile where user_id = auth.uid();
  if v_aff is null then
    return jsonb_build_object('affiliate', false);
  end if;
  return jsonb_build_object(
    'affiliate', true,
    'affiliateId', v_aff,
    'available', coalesce((select sum(amount) from commission_movement where affiliate_profile_id = v_aff and status = 'available'), 0),
    'pending',   coalesce((select sum(amount) from commission_movement where affiliate_profile_id = v_aff and status = 'pending'), 0),
    'paid',      coalesce((select sum(amount) from commission_movement where affiliate_profile_id = v_aff and status = 'paid'), 0),
    'credit',    coalesce((select sum(case when movement_type = 'spent' then -abs(amount) else amount end) from affiliate_credit where affiliate_profile_id = v_aff), 0)
  );
end;
$$;
revoke all on function public.affiliate_my_balance() from public;
grant execute on function public.affiliate_my_balance() to authenticated;

-- El balance del afiliado ahora expone 'withdrawnPending' = retiros solicitados
-- todavía no pagados (status pending/approved). Antes ese monto se restaba de
-- 'available' pero no se mostraba en ningún bucket, así que la plata "desaparecía"
-- de cara al afiliado hasta que el admin marcaba el retiro pagado.
create or replace function public.affiliate_my_balance()
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $$
declare
  v_aff uuid; v_gross numeric; v_converted numeric; v_withdrawn_paid numeric; v_withdrawn_open numeric; v_credit numeric;
begin
  select id into v_aff from affiliate_profile where user_id = auth.uid();
  if v_aff is null then return jsonb_build_object('affiliate', false); end if;
  select coalesce(sum(amount), 0) into v_gross from commission_movement where affiliate_profile_id = v_aff and status = 'available';
  select coalesce(sum(amount), 0) into v_converted from affiliate_credit where affiliate_profile_id = v_aff and movement_type = 'earned' and order_id is null;
  select coalesce(sum(amount), 0) into v_withdrawn_paid from withdrawal_request where affiliate_profile_id = v_aff and status = 'paid';
  select coalesce(sum(amount), 0) into v_withdrawn_open from withdrawal_request where affiliate_profile_id = v_aff and status in ('pending', 'approved');
  select coalesce(sum(case when movement_type = 'spent' then -abs(amount) else amount end), 0) into v_credit from affiliate_credit where affiliate_profile_id = v_aff;
  return jsonb_build_object('affiliate', true, 'affiliateId', v_aff,
    'available', greatest(v_gross - v_converted - v_withdrawn_paid - v_withdrawn_open, 0),
    'pending', coalesce((select sum(amount) from commission_movement where affiliate_profile_id = v_aff and status = 'pending'), 0),
    'withdrawnPending', v_withdrawn_open,
    'withdrawn', v_withdrawn_paid, 'converted', v_converted, 'credit', v_credit);
end; $$;

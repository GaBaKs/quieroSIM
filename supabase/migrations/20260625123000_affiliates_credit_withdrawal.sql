-- Afiliados A6: conversión a crédito, solicitud de retiro y pago (admin).
-- Modelo append-only sin tocar commission_movement (que es por-orden):
--   disponible = Σ comisiones 'available'  −  Σ conversiones  −  Σ retiros pagados  −  Σ retiros en curso
--   conversión: asiento affiliate_credit('earned', +X, order_id NULL)
--   retiro: withdrawal_request('pending') → admin marca 'paid'
--   crédito de plataforma = Σ affiliate_credit('earned')  −  Σ affiliate_credit('spent')

-- Balance derivado (redefine el de A1 con el modelo completo).
create or replace function public.affiliate_my_balance()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_aff uuid;
  v_gross numeric;
  v_converted numeric;
  v_withdrawn_paid numeric;
  v_withdrawn_open numeric;
  v_credit numeric;
begin
  select id into v_aff from affiliate_profile where user_id = auth.uid();
  if v_aff is null then
    return jsonb_build_object('affiliate', false);
  end if;

  select coalesce(sum(amount), 0) into v_gross from commission_movement where affiliate_profile_id = v_aff and status = 'available';
  select coalesce(sum(amount), 0) into v_converted from affiliate_credit where affiliate_profile_id = v_aff and movement_type = 'earned' and order_id is null;
  select coalesce(sum(amount), 0) into v_withdrawn_paid from withdrawal_request where affiliate_profile_id = v_aff and status = 'paid';
  select coalesce(sum(amount), 0) into v_withdrawn_open from withdrawal_request where affiliate_profile_id = v_aff and status in ('pending', 'approved');
  select coalesce(sum(case when movement_type = 'spent' then -abs(amount) else amount end), 0) into v_credit from affiliate_credit where affiliate_profile_id = v_aff;

  return jsonb_build_object(
    'affiliate', true,
    'affiliateId', v_aff,
    'available', greatest(v_gross - v_converted - v_withdrawn_paid - v_withdrawn_open, 0),
    'pending', coalesce((select sum(amount) from commission_movement where affiliate_profile_id = v_aff and status = 'pending'), 0),
    'withdrawn', v_withdrawn_paid,
    'converted', v_converted,
    'credit', v_credit
  );
end;
$$;

-- Saldo disponible (interno, reutilizado por las RPC de escritura).
create or replace function public.affiliate_available(p_aff uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce((select sum(amount) from commission_movement where affiliate_profile_id = p_aff and status = 'available'), 0)
    - coalesce((select sum(amount) from affiliate_credit where affiliate_profile_id = p_aff and movement_type = 'earned' and order_id is null), 0)
    - coalesce((select sum(amount) from withdrawal_request where affiliate_profile_id = p_aff and status in ('paid', 'pending', 'approved')), 0),
    0);
$$;

-- Convertir comisión disponible en crédito de plataforma (usable en checkout).
create or replace function public.affiliate_convert_to_credit(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aff uuid;
  v_avail numeric;
begin
  select id into v_aff from affiliate_profile where user_id = auth.uid();
  if v_aff is null then return jsonb_build_object('ok', false, 'reason', 'No sos afiliado.'); end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'reason', 'Monto inválido.'); end if;
  v_avail := affiliate_available(v_aff);
  if p_amount > v_avail then return jsonb_build_object('ok', false, 'reason', 'Saldo insuficiente.'); end if;

  insert into affiliate_credit (affiliate_profile_id, movement_type, amount, order_id)
  values (v_aff, 'earned', round(p_amount, 2), null);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.affiliate_convert_to_credit(numeric) from public;
grant execute on function public.affiliate_convert_to_credit(numeric) to authenticated;

-- Solicitar retiro (≥ mínimo). El admin paga por fuera y marca 'paid'.
create or replace function public.affiliate_request_withdrawal(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aff uuid;
  v_avail numeric;
  v_min numeric;
begin
  select id into v_aff from affiliate_profile where user_id = auth.uid();
  if v_aff is null then return jsonb_build_object('ok', false, 'reason', 'No sos afiliado.'); end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'reason', 'Monto inválido.'); end if;
  select coalesce(min_withdrawal_usd, 0) into v_min from platform_settings where id = 1;
  if p_amount < v_min then return jsonb_build_object('ok', false, 'reason', 'El mínimo de retiro es USD ' || v_min || '.'); end if;
  v_avail := affiliate_available(v_aff);
  if p_amount > v_avail then return jsonb_build_object('ok', false, 'reason', 'Saldo insuficiente.'); end if;

  insert into withdrawal_request (affiliate_profile_id, amount, status)
  values (v_aff, round(p_amount, 2), 'pending');
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.affiliate_request_withdrawal(numeric) from public;
grant execute on function public.affiliate_request_withdrawal(numeric) to authenticated;

-- Admin marca un retiro como pagado (el pago real es externo: Wise/transferencia).
create or replace function public.admin_mark_withdrawal_paid(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  if not is_admin() then return jsonb_build_object('ok', false, 'reason', 'Solo administradores.'); end if;
  update withdrawal_request set status = 'paid', paid_at = now()
    where id = p_id and status in ('pending', 'approved');
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', false, 'reason', 'El retiro no está pendiente.'); end if;
  insert into audit_log (action, actor_id, actor_type, payload)
  values ('affiliate_withdrawal_paid', auth.uid(), 'admin', jsonb_build_object('withdrawal_id', p_id));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_mark_withdrawal_paid(uuid) from public;
grant execute on function public.admin_mark_withdrawal_paid(uuid) to authenticated;

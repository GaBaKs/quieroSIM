-- Afiliados A2: alta del afiliado (RPC) + aprobación/estado por admin.
-- Las escrituras sensibles van por RPC SECURITY DEFINER (no por RLS de cliente):
-- el alta crea el perfil 'pending' del usuario actual; la aprobación genera el
-- link de referido + el cupón de afiliado y es solo admin.

-- Alta: el usuario logueado solicita ser afiliado (queda 'pending').
create or replace function public.register_affiliate(p_channel text, p_audience integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'No autenticado.');
  end if;
  if exists (select 1 from affiliate_profile where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'Ya tenés una solicitud de afiliado.');
  end if;
  insert into affiliate_profile (user_id, channel, estimated_audience, status, terms_accepted, terms_accepted_at)
  values (v_uid, nullif(btrim(coalesce(p_channel, '')), ''), p_audience, 'pending', true, now())
  returning id into v_id;
  return jsonb_build_object('ok', true, 'affiliateId', v_id);
end;
$$;
revoke all on function public.register_affiliate(text, integer) from public;
grant execute on function public.register_affiliate(text, integer) to authenticated;

-- Cambio de estado (solo admin). En la 1ra aprobación genera referral_link +
-- coupon_code y crea el cupón de afiliado (10% por defecto, editable luego desde
-- el panel de cupones). Idempotente: si ya tiene link, no lo regenera.
create or replace function public.admin_set_affiliate_status(p_affiliate_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_base text;
  v_code text;
  v_link text;
begin
  if not is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'Solo administradores.');
  end if;
  if p_status not in ('pending', 'approved', 'rejected', 'suspended') then
    return jsonb_build_object('ok', false, 'reason', 'Estado inválido.');
  end if;

  select ap.id, ap.referral_link, up.full_name, up.email
    into a
    from affiliate_profile ap
    join user_profile up on up.id = ap.user_id
    where ap.id = p_affiliate_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'Afiliado no encontrado.');
  end if;

  if p_status = 'approved' and a.referral_link is null then
    v_link := 'ref-' || substr(replace(p_affiliate_id::text, '-', ''), 1, 8);
    v_base := upper(regexp_replace(coalesce(a.full_name, split_part(a.email, '@', 1)), '[^A-Za-z0-9]', '', 'g'));
    v_code := substr(coalesce(nullif(v_base, ''), 'AFF'), 1, 6) || substr(replace(p_affiliate_id::text, '-', ''), 1, 4);
    update affiliate_profile
      set status = 'approved', referral_link = v_link, coupon_code = v_code
      where id = p_affiliate_id;
    -- Cupón propio del afiliado: atribuye la venta y da 10% al comprador.
    insert into coupon (code, discount_type, discount_value, affiliate_profile_id, is_active, non_stackable)
    values (v_code, 'percentage', 10, p_affiliate_id, true, true)
    on conflict (code) do nothing;
  else
    update affiliate_profile set status = p_status where id = p_affiliate_id;
  end if;

  insert into audit_log (action, actor_id, actor_type, payload)
  values ('affiliate_status_' || p_status, auth.uid(), 'admin', jsonb_build_object('affiliate_id', p_affiliate_id));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_set_affiliate_status(uuid, text) from public;
grant execute on function public.admin_set_affiliate_status(uuid, text) to authenticated;

-- Gestión de afiliados desde el admin:
-- 1) descuento configurable de los cupones de afiliado,
-- 2) crear afiliado aprobado directo para un usuario,
-- 3) renombrar el código del cupón + cambiar su descuento por afiliado.

-- 1) Descuento default de los cupones de afiliado (editable en Configuración).
alter table platform_settings add column if not exists affiliate_coupon_discount_pct numeric not null default 10;

-- Helper interno: genera referral_link + cupón para un afiliado aprobado (idempotente).
-- Usa el descuento configurado. Reutilizado por aprobar y por crear-directo.
create or replace function public._affiliate_provision(p_affiliate_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a record; v_disc numeric; v_base text; v_code text; v_link text;
begin
  select ap.id, ap.referral_link, up.full_name, up.email into a
    from affiliate_profile ap join user_profile up on up.id = ap.user_id
    where ap.id = p_affiliate_id;
  if not found or a.referral_link is not null then return; end if;
  select coalesce(affiliate_coupon_discount_pct, 10) into v_disc from platform_settings where id = 1;
  v_link := 'ref-' || substr(replace(p_affiliate_id::text, '-', ''), 1, 8);
  v_base := upper(regexp_replace(coalesce(a.full_name, split_part(a.email, '@', 1)), '[^A-Za-z0-9]', '', 'g'));
  v_code := substr(coalesce(nullif(v_base, ''), 'AFF'), 1, 6) || substr(replace(p_affiliate_id::text, '-', ''), 1, 4);
  update affiliate_profile set referral_link = v_link, coupon_code = v_code where id = p_affiliate_id;
  insert into coupon (code, discount_type, discount_value, affiliate_profile_id, is_active, non_stackable)
  values (v_code, 'percentage', coalesce(v_disc, 10), p_affiliate_id, true, true)
  on conflict (code) do nothing;
end; $$;

-- 2) admin_set_affiliate_status ahora delega la provisión al helper.
create or replace function public.admin_set_affiliate_status(p_affiliate_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if not is_admin() then return jsonb_build_object('ok', false, 'reason', 'Solo administradores.'); end if;
  if p_status not in ('pending','approved','rejected','suspended') then
    return jsonb_build_object('ok', false, 'reason', 'Estado inválido.'); end if;
  select ap.id into a from affiliate_profile ap where ap.id = p_affiliate_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'Afiliado no encontrado.'); end if;
  update affiliate_profile set status = p_status where id = p_affiliate_id;
  if p_status = 'approved' then perform _affiliate_provision(p_affiliate_id); end if;
  insert into audit_log (action, actor_id, actor_type, payload)
  values ('affiliate_status_' || p_status, auth.uid(), 'admin', jsonb_build_object('affiliate_id', p_affiliate_id));
  return jsonb_build_object('ok', true);
end; $$;

-- 3) Crear un afiliado APROBADO directo para un usuario existente (idempotente).
create or replace function public.admin_create_affiliate(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then return jsonb_build_object('ok', false, 'reason', 'Solo administradores.'); end if;
  if not exists (select 1 from user_profile where id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'Usuario no encontrado.'); end if;
  select id into v_id from affiliate_profile where user_id = p_user_id;
  if v_id is null then
    insert into affiliate_profile (user_id, status, terms_accepted, terms_accepted_at)
    values (p_user_id, 'approved', true, now()) returning id into v_id;
  else
    update affiliate_profile set status = 'approved' where id = v_id;
  end if;
  perform _affiliate_provision(v_id);
  insert into audit_log (action, actor_id, actor_type, payload)
  values ('affiliate_created_by_admin', auth.uid(), 'admin', jsonb_build_object('affiliate_id', v_id, 'user_id', p_user_id));
  return jsonb_build_object('ok', true, 'affiliateId', v_id);
end; $$;
revoke all on function public.admin_create_affiliate(uuid) from public;
grant execute on function public.admin_create_affiliate(uuid) to authenticated;

-- 4) Renombrar el código del cupón del afiliado + cambiar su descuento.
create or replace function public.admin_update_affiliate_coupon(p_affiliate_id uuid, p_code text, p_discount_pct numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old text; v_new text;
begin
  if not is_admin() then return jsonb_build_object('ok', false, 'reason', 'Solo administradores.'); end if;
  v_new := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_new) < 3 or length(v_new) > 24 then
    return jsonb_build_object('ok', false, 'reason', 'El código debe tener 3 a 24 caracteres alfanuméricos.'); end if;
  if p_discount_pct is null or p_discount_pct < 0 or p_discount_pct > 100 then
    return jsonb_build_object('ok', false, 'reason', 'Descuento inválido (0 a 100).'); end if;
  select coupon_code into v_old from affiliate_profile where id = p_affiliate_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'Afiliado no encontrado.'); end if;
  if v_new <> coalesce(v_old, '') and exists (select 1 from coupon where code = v_new) then
    return jsonb_build_object('ok', false, 'reason', 'Ya existe un cupón con ese código.'); end if;
  if v_old is not null and exists (select 1 from coupon where code = v_old and affiliate_profile_id = p_affiliate_id) then
    update coupon set code = v_new, discount_value = p_discount_pct, discount_type = 'percentage'
      where code = v_old and affiliate_profile_id = p_affiliate_id;
  else
    insert into coupon (code, discount_type, discount_value, affiliate_profile_id, is_active, non_stackable)
    values (v_new, 'percentage', p_discount_pct, p_affiliate_id, true, true)
    on conflict (code) do update set discount_value = p_discount_pct, affiliate_profile_id = p_affiliate_id, is_active = true;
  end if;
  update affiliate_profile set coupon_code = v_new where id = p_affiliate_id;
  insert into audit_log (action, actor_id, actor_type, payload)
  values ('affiliate_coupon_update', auth.uid(), 'admin', jsonb_build_object('affiliate_id', p_affiliate_id, 'code', v_new, 'discount', p_discount_pct));
  return jsonb_build_object('ok', true, 'code', v_new, 'discount', p_discount_pct);
end; $$;
revoke all on function public.admin_update_affiliate_coupon(uuid, text, numeric) from public;
grant execute on function public.admin_update_affiliate_coupon(uuid, text, numeric) to authenticated;

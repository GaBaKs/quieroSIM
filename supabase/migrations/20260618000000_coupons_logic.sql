-- Etapa 8A: validación y redención de cupones. Toda la lógica server-side.
-- La tabla coupon es admin-only por RLS, así que estas funciones SECURITY
-- DEFINER son el único camino para que el checkout (anon) valide un código sin
-- exponer el catálogo de cupones.

-- ── validate_coupon: valida y calcula el descuento (NO redime) ───────────────
-- Devuelve { valid, coupon_id, discount, reason }. Apto preview y checkout/create.
create or replace function public.validate_coupon(
  p_code text,
  p_plan_id uuid,
  p_subtotal numeric,
  p_user_id uuid default null,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_uses integer;
  v_discount numeric;
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  if v_code = '' then
    return jsonb_build_object('valid', false, 'reason', 'Ingresá un código.');
  end if;

  select * into c from coupon where upper(code) = v_code;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'El cupón no existe.');
  end if;

  -- Vigencia
  if c.starts_at is not null and now() < c.starts_at then
    return jsonb_build_object('valid', false, 'reason', 'El cupón todavía no está vigente.');
  end if;
  if c.expires_at is not null and now() > c.expires_at then
    return jsonb_build_object('valid', false, 'reason', 'El cupón está vencido.');
  end if;

  -- Monto mínimo
  if c.min_purchase_amount is not null and p_subtotal < c.min_purchase_amount then
    return jsonb_build_object('valid', false,
      'reason', 'Este cupón requiere una compra mínima de USD ' || c.min_purchase_amount || '.');
  end if;

  -- Planes aplicables (null o [] = todos)
  if c.applicable_plan_ids is not null
     and jsonb_typeof(c.applicable_plan_ids) = 'array'
     and jsonb_array_length(c.applicable_plan_ids) > 0
     and not (c.applicable_plan_ids ? p_plan_id::text) then
    return jsonb_build_object('valid', false, 'reason', 'El cupón no aplica a este plan.');
  end if;

  -- Límite global de usos
  if c.single_use_global or c.max_uses_global is not null then
    select count(*) into v_uses from coupon_redemption where coupon_id = c.id;
    if c.single_use_global and v_uses >= 1 then
      return jsonb_build_object('valid', false, 'reason', 'El cupón ya fue utilizado.');
    end if;
    if c.max_uses_global is not null and v_uses >= c.max_uses_global then
      return jsonb_build_object('valid', false, 'reason', 'El cupón alcanzó su límite de usos.');
    end if;
  end if;

  -- Uso único por cuenta (logueado por user_id; guest por email de la orden)
  if c.single_use_per_account then
    if p_user_id is not null and exists (
      select 1 from coupon_redemption where coupon_id = c.id and user_id = p_user_id
    ) then
      return jsonb_build_object('valid', false, 'reason', 'Ya usaste este cupón.');
    end if;
    if p_user_id is null and p_email is not null and exists (
      select 1 from coupon_redemption cr
      join "order" o on o.id = cr.order_id
      where cr.coupon_id = c.id and lower(o.guest_email) = lower(p_email)
    ) then
      return jsonb_build_object('valid', false, 'reason', 'Ya usaste este cupón.');
    end if;
  end if;

  -- Cálculo del descuento, clamp [0, subtotal]
  if c.discount_type = 'percentage' then
    v_discount := round(p_subtotal * c.discount_value / 100.0, 2);
  else
    v_discount := c.discount_value;
  end if;
  v_discount := least(greatest(v_discount, 0), p_subtotal);

  return jsonb_build_object('valid', true, 'coupon_id', c.id, 'discount', v_discount, 'reason', '');
end;
$$;

-- ── redeem_coupon: registra la redención de forma ATÓMICA ────────────────────
-- La llama el webhook al confirmar el pago (service_role). Lock sobre el cupón
-- para que el último uso no se pase por concurrencia. Idempotente por orden.
create or replace function public.redeem_coupon(p_coupon_id uuid, p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  o record;
  v_uses integer;
begin
  -- Idempotencia: si ya se redimió para esta orden, listo.
  if exists (select 1 from coupon_redemption where coupon_id = p_coupon_id and order_id = p_order_id) then
    return true;
  end if;

  select * into c from coupon where id = p_coupon_id for update; -- lock
  if not found then return false; end if;

  select user_id, guest_email into o from "order" where id = p_order_id;

  -- Re-chequear límite global bajo el lock.
  if c.single_use_global or c.max_uses_global is not null then
    select count(*) into v_uses from coupon_redemption where coupon_id = c.id;
    if c.single_use_global and v_uses >= 1 then return false; end if;
    if c.max_uses_global is not null and v_uses >= c.max_uses_global then return false; end if;
  end if;

  -- Re-chequear uso por cuenta/email.
  if c.single_use_per_account then
    if o.user_id is not null and exists (
      select 1 from coupon_redemption where coupon_id = c.id and user_id = o.user_id
    ) then return false; end if;
    if o.user_id is null and o.guest_email is not null and exists (
      select 1 from coupon_redemption cr join "order" ord on ord.id = cr.order_id
      where cr.coupon_id = c.id and lower(ord.guest_email) = lower(o.guest_email)
    ) then return false; end if;
  end if;

  insert into coupon_redemption (coupon_id, order_id, user_id)
  values (c.id, p_order_id, o.user_id);
  return true;
end;
$$;

-- Segunda línea de defensa para single_use_per_account de usuarios logueados.
create unique index if not exists uq_coupon_redemption_coupon_user
  on coupon_redemption (coupon_id, user_id) where user_id is not null;

revoke all on function public.validate_coupon(text, uuid, numeric, uuid, text) from public;
revoke all on function public.redeem_coupon(uuid, uuid) from public;
grant execute on function public.validate_coupon(text, uuid, numeric, uuid, text) to anon, authenticated;
-- redeem_coupon: solo service_role (Edge Functions). No grant a anon/authenticated.

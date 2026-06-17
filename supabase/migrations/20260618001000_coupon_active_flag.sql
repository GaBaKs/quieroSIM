-- Flag de activación manual del cupón (además de la vigencia por fechas).
-- Recrea validate_coupon/redeem_coupon agregando el check de is_active.
alter table public.coupon add column if not exists is_active boolean not null default true;

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

  if not c.is_active then
    return jsonb_build_object('valid', false, 'reason', 'El cupón no está disponible.');
  end if;

  if c.starts_at is not null and now() < c.starts_at then
    return jsonb_build_object('valid', false, 'reason', 'El cupón todavía no está vigente.');
  end if;
  if c.expires_at is not null and now() > c.expires_at then
    return jsonb_build_object('valid', false, 'reason', 'El cupón está vencido.');
  end if;

  if c.min_purchase_amount is not null and p_subtotal < c.min_purchase_amount then
    return jsonb_build_object('valid', false,
      'reason', 'Este cupón requiere una compra mínima de USD ' || c.min_purchase_amount || '.');
  end if;

  if c.applicable_plan_ids is not null
     and jsonb_typeof(c.applicable_plan_ids) = 'array'
     and jsonb_array_length(c.applicable_plan_ids) > 0
     and not (c.applicable_plan_ids ? p_plan_id::text) then
    return jsonb_build_object('valid', false, 'reason', 'El cupón no aplica a este plan.');
  end if;

  if c.single_use_global or c.max_uses_global is not null then
    select count(*) into v_uses from coupon_redemption where coupon_id = c.id;
    if c.single_use_global and v_uses >= 1 then
      return jsonb_build_object('valid', false, 'reason', 'El cupón ya fue utilizado.');
    end if;
    if c.max_uses_global is not null and v_uses >= c.max_uses_global then
      return jsonb_build_object('valid', false, 'reason', 'El cupón alcanzó su límite de usos.');
    end if;
  end if;

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

  if c.discount_type = 'percentage' then
    v_discount := round(p_subtotal * c.discount_value / 100.0, 2);
  else
    v_discount := c.discount_value;
  end if;
  v_discount := least(greatest(v_discount, 0), p_subtotal);

  return jsonb_build_object('valid', true, 'coupon_id', c.id, 'discount', v_discount, 'reason', '');
end;
$$;

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
  if exists (select 1 from coupon_redemption where coupon_id = p_coupon_id and order_id = p_order_id) then
    return true;
  end if;

  select * into c from coupon where id = p_coupon_id for update;
  if not found then return false; end if;
  if not c.is_active then return false; end if;

  select user_id, guest_email into o from "order" where id = p_order_id;

  if c.single_use_global or c.max_uses_global is not null then
    select count(*) into v_uses from coupon_redemption where coupon_id = c.id;
    if c.single_use_global and v_uses >= 1 then return false; end if;
    if c.max_uses_global is not null and v_uses >= c.max_uses_global then return false; end if;
  end if;

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

-- Cupón gratuito: nuevo discount_type 'free' = cubre el 100% del precio y NO pasa
-- por Stripe (el checkout emite la eSIM directo). El control de abuso usa los
-- flags ya existentes del cupón (single_use_per_account, single_use_global,
-- max_uses_global, applicable_plan_ids), configurables por el admin.

-- 1) Permitir 'free' en el CHECK de discount_type.
alter table public.coupon drop constraint if exists coupon_discount_type_check;
alter table public.coupon add constraint coupon_discount_type_check
  check (discount_type = any (array['percentage'::text, 'fixed'::text, 'free'::text]));

-- 2) validate_coupon: caso 'free' (descuento = subtotal) + flag is_free en el retorno.
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

  if c.discount_type = 'free' then
    v_discount := p_subtotal;                         -- cubre el 100%
  elsif c.discount_type = 'percentage' then
    v_discount := round(p_subtotal * c.discount_value / 100.0, 2);
  else
    v_discount := c.discount_value;                    -- fijo
  end if;
  v_discount := least(greatest(v_discount, 0), p_subtotal);

  return jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'discount', v_discount,
    'is_free', (c.discount_type = 'free'),
    'reason', ''
  );
end;
$$;
